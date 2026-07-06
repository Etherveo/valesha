import fs from 'fs'
import path from 'path'
import { extractUniversal } from './extracter.js'

const DB_PATH = path.resolve('./src/database/extract-queue.json')

let isProcessing = false
let queue = []

// ============================
// Load & Save
// ============================

function loadQueue() {
    if (!fs.existsSync(DB_PATH)) return []
    try {
        const data = JSON.parse(fs.readFileSync(DB_PATH))
        // Validasi agar data selalu array
        return Array.isArray(data) ? data : []
    } catch {
        return []
    }
}

function saveQueue() {
    // onComplete/onError adalah function (gak bisa di-JSON.stringify), jadi
    // pas disimpan ke disk otomatis "hilang" dan cuma data plain yang
    // persist. Itu gak masalah: callback ini cuma relevan buat proses yang
    // masih hidup di memory (lihat komentar di addToExtractQueue).
    fs.writeFileSync(DB_PATH, JSON.stringify(queue, null, 2))
}

function delay(ms) {
    return new Promise(res => setTimeout(res, ms))
}

// ============================
// Resolve lokasi hasil ekstrak yang SEBENARNYA
// ============================
//
// extracter.js (unrar/unzip) selalu extract ke path.dirname(filePath) alias
// jobDir (folder yang sama dgn archive-nya) dan PRESERVE struktur internal
// archive apa adanya. Rilis batch (kayak fansub) sering dibungkus 1 folder
// di root archive-nya -- kalau gitu, hasil ekstrak yang BENERAN nangkring
// di `jobDir/<folder-pembungkus>/...`, BUKAN langsung di jobDir.
//
// Tanpa resolve ini, jobDir cuma berisi 2 hal: archive aslinya (file) dan
// folder pembungkus (folder). syncFolderOneLevel cuma nemu si archive
// (lolos isFile()), sementara folder pembungkus -- yang isinya semua file
// hasil ekstrak -- di-skip total karena dia bukan file. Makanya yang
// keupload cuma archive-nya sendiri (Uploaded: 1), bukan hasil ekstrak.
//
// Helper ini "turun" selama folder cuma punya 1 entry dan entry itu folder,
// supaya extractDir yang dipakai onComplete/notifikasi selalu nunjuk ke
// folder yang BENERAN isinya file-file hasil ekstrak. `archivePath`
// di-exclude dari hitungan biar archive asli (sibling di jobDir) gak
// dianggap "entry ke-2" yang bikin proses berhenti turun lebih awal.
function resolveRealExtractDir(dir, archivePath) {
    let current = dir
    while (true) {
        let entries
        try {
            entries = fs.readdirSync(current).filter(e => path.join(current, e) !== archivePath)
        } catch {
            break
        }

        if (entries.length !== 1) break

        const onlyPath = path.join(current, entries[0])
        if (!fs.statSync(onlyPath).isDirectory()) break

        current = onlyPath
    }
    return current
}

// ============================
// Tambah ke Queue
// ============================

// NOTE: parameter `onComplete` & `onError` BARU ditambahkan untuk kebutuhan
// .download (lib/downloader) — supaya proses lain (misal upload folder hasil
// ekstrak ke Drive) bisa dijalankan begitu ekstraksi selesai, tanpa harus
// polling. Keduanya OPSIONAL, jadi caller lama (owner-exter.js / plugin
// `.exter`) yang gak pernah mengisinya tetap berjalan sama persis seperti
// sebelumnya.
export async function addToExtractQueue({ filePath, fileSize, chatId, conn, onComplete, onError }) {
    // Reload queue terbaru untuk menghindari race condition data lama
    queue = loadQueue()

    // Cek file duplikat di antrian (berdasarkan path)
    const duplicate = queue.find(q => q.filePath === filePath)
    if (duplicate) {
        return { duplicate: true, position: queue.indexOf(duplicate) + 1 }
    }

    // Push data baru
    queue.push({ filePath, fileSize, chatId, onComplete, onError })
    saveQueue()

    const position = queue.length

    // Trigger proses (jangan await ini agar return position langsung jalan)
    processQueue(conn)

    return { position }
}

// ============================
// Proses Queue
// ============================

async function processQueue(conn) {
    if (isProcessing) return
    if (!queue.length) return

    isProcessing = true

    // Loop selama antrian masih ada
    while (queue.length > 0) {
        // Ambil item pertama tanpa menghapusnya dulu (peek)
        const current = queue[0]
        const fileName = path.basename(current.filePath)

        try {
            // Notifikasi Mulai
            await conn.sendMessage(current.chatId, {
                text: `🏗️ *Mengekstrak...*\n📦 File: ${fileName}\n⏳ Mohon tunggu sebentar.`
            })
            
            await delay(2000)

            // Proses Ekstraksi Universal (RAR/ZIP)
            await extractUniversal(current.filePath)

            // Baru DI SINI extractDir dihitung -- harus setelah ekstraksi
            // selesai karena resolveRealExtractDir baca isi disk yang
            // sebenarnya, bukan nebak path dari nama file.
            const extractDir = resolveRealExtractDir(
                path.dirname(current.filePath),
                current.filePath
            )

            // Notifikasi Sukses
            await conn.sendMessage(current.chatId, {
                text: `✅ *Ekstraksi Selesai!*\n📂 Lokasi: ${extractDir}`
            })

            // Hook opsional: dijalankan TANPA di-await (fire-and-forget) supaya
            // proses lanjutan (misal upload folder ke Drive) gak ngeblok antrian
            // ekstrak file lain. Error di callback ditangkap sendiri di sini
            // agar gak bikin antrian crash.
            if (typeof current.onComplete === 'function') {
                Promise.resolve()
                    .then(() => current.onComplete({ filePath: current.filePath, extractDir, fileName }))
                    .catch(err => console.error('[extract-queue] onComplete error:', err))
            }

        } catch (err) {
            console.error(err)
            // Notifikasi Gagal
            await conn.sendMessage(current.chatId, {
                text: `❌ *Gagal Ekstraksi*\nFile: ${fileName}\nError: ${err.message || err}`
            })

            if (typeof current.onError === 'function') {
                Promise.resolve()
                    .then(() => current.onError(err))
                    .catch(e => console.error('[extract-queue] onError error:', e))
            }
        }

        // Hapus item yang sudah selesai diproses dari array & save
        queue.shift()
        saveQueue()

        // Jeda sedikit agar CPU nafas
        await delay(2000)

        // Notifikasi ke antrian berikutnya (jika ada)
        if (queue.length > 0) {
            const next = queue[0]
            await conn.sendMessage(next.chatId, {
                text: `🔔 *Giliran Anda!* \nSistem mulai memproses file Anda sekarang.`
            })
        }
        await delay(2000)
    }

    isProcessing = false
}

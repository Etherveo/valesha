// lib/downloader/engines/pixeldrain.js
//
// Engine murni untuk Pixeldrain: cuma tau cara ambil metadata & cara
// ngunduh filenya. Gak tau apa-apa soal WhatsApp/conn/m.reply — itu kerjaan
// interface controller di plugins/.
//
// Konsolidasi dari opixeldrain3 + opixeldrain4 (versi 4 superset: dukung
// /u/, /d/, dan /l/#item=N).

import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'
import cheerio from 'cheerio'
import { buildFileName } from '../mime.js'

export const id = 'pixeldrain'

export function match(url = '') {
	return /pixeldrain\.com/i.test(url)
}

function parseItemIndex(url = '') {
	try {
		const hash = url.split('#')[1] || ''
		const m = hash.match(/item=(\d+)/i)
		return m ? parseInt(m[1], 10) : null
	} catch {
		return null
	}
}

/**
 * Ambil metadata file TANPA mengunduh body filenya (cepat, cuma API/HTML
 * metadata). Mengembalikan { fileName, size, fileUrl }.
 */
export async function getInfo(url) {
	let id, apiUrl, fileUrl, fileName, size

	try {
		if (url.includes('/l/')) {
			id = url.split('/l/')[1].split(/[?#]/)[0]
			const itemIndex = parseItemIndex(url)

			const listInfoUrl = `https://pixeldrain.com/api/list/${id}`
			const res = await fetch(listInfoUrl)
			if (!res.ok) throw new Error(`Gagal ambil info folder/list (${res.status})`)

			const listInfo = await res.json()
			if (!listInfo?.files || !Array.isArray(listInfo.files) || listInfo.files.length === 0) {
				throw new Error('Folder/list kosong atau format API berubah.')
			}

			const selectedIndex = itemIndex ?? 1
			if (selectedIndex < 1 || selectedIndex > listInfo.files.length) {
				throw new Error(
					`Item tidak valid. Total item: ${listInfo.files.length}. Gunakan #item=1 s/d #item=${listInfo.files.length}`
				)
			}

			const file = listInfo.files[selectedIndex]
			if (!file?.id) throw new Error('File id tidak ditemukan di list.')

			return {
				fileName: file.name || 'unknown.bin',
				size: file.size || 0,
				fileUrl: `https://pixeldrain.com/api/file/${file.id}`
			}
		}

		if (url.includes('/u/')) {
			id = url.split('/u/')[1].split(/[?#]/)[0]
			apiUrl = `https://pixeldrain.com/api/file/${id}/info`
			fileUrl = `https://pixeldrain.com/api/file/${id}`
		} else if (url.includes('/d/')) {
			id = url.split('/d/')[1].split(/[?#]/)[0]

			const html = await fetch(url).then(r => r.text())
			cheerio.load(html) // dipertahankan agar parsing tetap konsisten dgn versi awal

			fileUrl = `https://pixeldrain.com/api/filesystem/${id}`

			const scriptData = html.match(/window\.initial_node\s*=\s*(\{.*?\});/s)
			if (scriptData) {
				const meta = JSON.parse(scriptData[1])
				const fileData = meta.path?.[0]
				fileName = fileData?.name || 'unknown.bin'
				size = fileData?.file_size || 0
			}
		} else {
			throw new Error('URL tidak valid untuk Pixeldrain.')
		}

		if (!fileName && apiUrl) {
			const infoRes = await fetch(apiUrl)
			if (!infoRes.ok) throw new Error(`Gagal ambil info file (${infoRes.status})`)
			const info = await infoRes.json()
			fileName = info.name
			size = info.size
		}

		if (!fileUrl) throw new Error('File URL tidak ditemukan.')

		return { fileName, size, fileUrl }
	} catch (err) {
		throw new Error('Gagal mengambil informasi file Pixeldrain: ' + err.message)
	}
}

/**
 * Unduh file ke disk. Mimetype baru ketauan begitu response stream-nya
 * mulai (dari header), jadi nama final file (base + ekstensi) ditentukan
 * di sini, bukan di getInfo().
 */
export async function download(url, info, { destDir, baseName }) {
	const response = await fetch(info.fileUrl)
	if (!response.ok) throw new Error(`Gagal mengunduh file (${response.status})`)

	const mimetype = response.headers.get('content-type') || 'application/octet-stream'
	const fileName = buildFileName(baseName, { mimetype, fileName: info.fileName })
	const filePath = path.join(destDir, fileName)

	await new Promise((resolve, reject) => {
		const writer = fs.createWriteStream(filePath)
		response.body.pipe(writer)
		response.body.on('error', reject)
		writer.on('error', reject)
		writer.on('finish', resolve)
	})

	return { filePath, fileName, mimetype }
}
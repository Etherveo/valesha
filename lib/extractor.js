import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'

/**
 * Helper untuk mengekstrak RAR menggunakan binary tukang_rar
 * @param {String} filePath - Path lengkap file RAR
 * @returns {Promise}
 */
export function unrarHelper(filePath) {
    return new Promise((resolve, reject) => {
        const binaryPath = path.join(process.cwd(), 'lib', 'tukang_rar')
        if (!fs.existsSync(binaryPath)) return reject('Binary tukang_rar tidak ditemukan.')

        fs.chmodSync(binaryPath, 0o755)
        const targetDir = path.dirname(filePath)
        const destPath = targetDir.endsWith('/') ? targetDir : targetDir + '/'
        
        // Perintah unrar asli 
        const args = ['x', '-o+', filePath, destPath]
        const processExtract = spawn(binaryPath, args)

        processExtract.on('close', (code) => {
            if (code === 0) resolve(targetDir)
            else reject(`Gagal dengan kode keluar: ${code}`)
        })
    })
}

// Placeholder untuk ZIP (bisa kamu isi nanti)
export function unzipHelper(filePath) {
    return new Promise((resolve, reject) => {
        const targetDir = path.dirname(filePath)
        const args = ['-o', filePath, '-d', targetDir]
        const processExtract = spawn('unzip', args)
        processExtract.on('close', (code) => {
            if (code === 0) resolve(targetDir)
            else reject(`Gagal unzip: ${code}`)
        })
    })
}
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'

/**
 * Helper untuk mengekstrak RAR menggunakan binary local
 */
export function unrarHelper(filePath, destPath) {
    return new Promise((resolve, reject) => {
        // Sesuaikan path binary jika perlu
        const binaryPath = path.join(process.cwd(), 'lib', 'tukang_rar') 
        
        // Fallback ke command global 'unrar' jika binary local tidak ada
        const executable = fs.existsSync(binaryPath) ? binaryPath : 'unrar'
        
        if (executable === binaryPath) fs.chmodSync(binaryPath, 0o755)

        // Argument: x (extract full path), -o+ (overwrite), file, destination
        const args = ['x', '-o+', filePath, destPath]
        
        const processExtract = spawn(executable, args)

        processExtract.on('close', (code) => {
            if (code === 0) resolve(destPath)
            else reject(`Unrar gagal dengan kode: ${code}`)
        })

        processExtract.on('error', (err) => reject(`Error Unrar: ${err.message}`))
    })
}

/**
 * Helper untuk mengekstrak ZIP
 */
export function unzipHelper(filePath, destPath) {
    return new Promise((resolve, reject) => {
        // Argument: -o (overwrite), file, -d (destination)
        const args = ['-o', filePath, '-d', destPath]
        
        const processExtract = spawn('unzip', args)

        processExtract.on('close', (code) => {
            if (code === 0) resolve(destPath)
            else reject(`Unzip gagal dengan kode: ${code}`)
        })

        processExtract.on('error', (err) => reject(`Error Unzip: ${err.message}`))
    })
}

/**
 * Wrapper pintar untuk menentukan jenis ekstraksi
 */
export async function extractUniversal(filePath) {
    if (!fs.existsSync(filePath)) throw new Error('File tidak ditemukan')

    const ext = path.extname(filePath).toLowerCase()
    const destPath = path.dirname(filePath) // Ekstrak di folder yang sama

    if (ext === '.rar') {
        return await unrarHelper(filePath, destPath)
    } else if (ext === '.zip') {
        return await unzipHelper(filePath, destPath)
    } else {
        throw new Error('Format tidak didukung. Hanya .rar dan .zip')
    }
}
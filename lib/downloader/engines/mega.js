// lib/downloader/engines/mega.js
//
// Konsolidasi dari omega2. Perubahan penting dibanding versi asli: versi
// asli pakai `file.downloadBuffer()` yang nampung SELURUH isi file di RAM
// dulu sebelum ditulis ke disk — beresiko untuk file besar. Di sini diganti
// `file.download()` yang balikin Node.js stream, langsung di-pipe ke disk
// (sesuai rekomendasi resmi megajs utk file besar).
//
// Konsekuensinya, deteksi mimetype via fileTypeFromBuffer (yg butuh buffer
// penuh) jadi tidak dipakai lagi — gantinya ekstensi diambil dari nama asli
// file di Mega (file.name), yang memang sudah termasuk ekstensinya. Fallback
// ini sudah ditangani otomatis oleh resolveExtension() di mime.js.

import { File } from 'megajs'
import fs from 'fs'
import path from 'path'
import { buildFileName } from '../mime.js'

export const id = 'mega'

export function match(url = '') {
	return /mega\.nz/i.test(url)
}

export async function getInfo(url) {
	let file = File.fromURL(url)
	file = await file.loadAttributes()

	if (!file?.name) throw new Error('Gagal membaca metadata file Mega (link mungkin sudah tidak valid).')

	return { fileName: file.name, size: file.size || null, _megaFile: file }
}

export async function download(url, info, { destDir, baseName }) {
	const file = info._megaFile || (await File.fromURL(url).loadAttributes())

	// Mega gak ngasih mimetype dari API-nya — andalkan ekstensi dari nama
	// file asli (file.name) lewat fallback resolveExtension.
	const fileName = buildFileName(baseName, { mimetype: '', fileName: info.fileName })
	const filePath = path.join(destDir, fileName)

	await new Promise((resolve, reject) => {
		const stream = file.download()
		const writer = fs.createWriteStream(filePath)

		stream.on('error', reject)
		writer.on('error', reject)
		writer.on('finish', resolve)

		stream.pipe(writer)
	})

	return { filePath, fileName, mimetype: 'application/octet-stream' }
}
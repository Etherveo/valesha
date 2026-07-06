// lib/downloader/engines/mediafire.js
//
// Engine murni untuk MediaFire. Scraping link langsungnya tetap pakai
// lib/mediafire.js (scrapeMediaFire) yang sudah ada & gak disentuh — engine
// ini cuma membungkusnya supaya punya kontrak yang sama dgn engine lain
// (match / getInfo / download).

import fs from 'fs'
import path from 'path'
import axios from 'axios'
import { scrapeMediaFire } from '../../mediafire.js'
import { buildFileName } from '../mime.js'

export const id = 'mediafire'

export function match(url = '') {
	return /mediafire\.com/i.test(url)
}

/**
 * Ambil link unduhan langsung + (kalau bisa) ukuran filenya lewat HEAD
 * request. Tidak menarik body filenya sama sekali.
 */
export async function getInfo(url) {
	const result = await scrapeMediaFire(url)
	if (!result?.success || !result?.downloadUrl) {
		throw new Error('Gagal mendapatkan link unduhan dari MediaFire (link mungkin sudah tidak valid).')
	}

	const downloadUrl = result.downloadUrl
	const fileName = result.fileName || path.basename(downloadUrl.split('?')[0]) || 'unknown.bin'

	let size = result.size || null
	let mimetype = null

	try {
		const head = await axios.head(downloadUrl)
		size = size || parseInt(head.headers['content-length'] || '0', 10) || null
		mimetype = head.headers['content-type'] || null
	} catch {
		// Beberapa link MediaFire menolak HEAD, gak fatal — lanjut tanpa size pasti.
	}

	return { fileName, size, downloadUrl, mimetype }
}

export async function download(url, info, { destDir, baseName }) {
	const response = await axios.get(info.downloadUrl, { responseType: 'stream' })

	const mimetype = response.headers['content-type'] || info.mimetype || 'application/octet-stream'
	const fileName = buildFileName(baseName, { mimetype, fileName: info.fileName })
	const filePath = path.join(destDir, fileName)

	await new Promise((resolve, reject) => {
		const writer = fs.createWriteStream(filePath)
		response.data.pipe(writer)
		response.data.on('error', reject)
		writer.on('error', reject)
		writer.on('finish', resolve)
	})

	return { filePath, fileName, mimetype }
}
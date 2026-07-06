// lib/downloader/engines/gdrive.js
//
// Konsolidasi dari ogdrive / ogdrive2 / ogdrive3 — dipilih logic ogdrive2
// (confirm-token handling + koreksi mimetype mkv/pdf/mp4) sebagai acuan
// karena paling matang.
//
// Catatan perbaikan kecil dibanding versi asli: di versi lama, link
// `downloadUrl` di-fetch DUA KALI — sekali di dalam GDriveDl() cuma buat
// ngecek status/mimetype (hasilnya dibuang), lalu sekali lagi di handler
// buat stream ke disk (tapi pakai URL yang BELUM di-resolve confirm-token,
// jadi kalau butuh confirm token, fetch kedua ini sebenarnya bisa salah ambil
// halaman HTML konfirmasi). Di engine ini cuma 1x fetch akhir yang dipakai
// buat dua hal: baca mimetype DAN stream ke disk.

import fetch from 'node-fetch'
import fs from 'fs'
import path from 'path'
import { buildFileName, getExtFromMime } from '../mime.js'

export const id = 'gdrive'

export function match(url = '') {
	return /drive\.google\.com/i.test(url) || /googleusercontent\.com\/download/i.test(url)
}

function extractAndCreateLink(url) {
	const userContentRegex = /download\?id=([^&]+)/
	const googleDriveRegex = /drive\.google\.com\/file\/d\/([^/?]+)/
	const exportDownloadRegex = /drive\.google\.com\/uc\?(?:export=download&)?id=([^&]+)/

	const userContentMatch = url.match(userContentRegex)
	const googleDriveMatch = url.match(googleDriveRegex)
	const exportDownloadMatch = url.match(exportDownloadRegex)

	if (userContentMatch?.[1]) return `https://drive.google.com/file/d/${userContentMatch[1]}/view`
	if (googleDriveMatch?.[1]) return `https://drive.google.com/file/d/${googleDriveMatch[1]}/view`
	if (exportDownloadMatch?.[1]) return `https://drive.google.com/file/d/${exportDownloadMatch[1]}/view`

	throw new Error('URL Google Drive tidak valid.')
}

async function fetchMetaJson(url) {
	if (!(url && url.match(/drive\.google/i))) throw new Error('URL Tidak Valid')

	const id = (url.match(/\/?id=([^&]+)/i) || url.match(/\/d\/(.*?)\//))?.[1]
	if (!id) throw new Error('ID Tidak Ditemukan')

	const res = await fetch(`https://drive.google.com/uc?id=${id}&authuser=0&export=download`, {
		method: 'post',
		headers: {
			'accept-encoding': 'gzip, deflate, br',
			'content-length': 0,
			'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
			origin: 'https://drive.google.com',
			'user-agent':
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36',
			'x-client-data': 'CKG1yQEIkbbJAQiitskBCMS2yQEIqZ3KAQioo8oBGLeYygE=',
			'x-drive-first-party': 'DriveWebUi',
			'x-json-requested': 'true'
		}
	})

	const { fileName, sizeBytes, downloadUrl } = JSON.parse((await res.text()).slice(4))
	if (!downloadUrl) throw new Error('Link Download Limit! (kuota harian Google Drive untuk file ini habis)')

	return { fileName, sizeBytes, downloadUrl }
}

/**
 * Metadata only — gak nyentuh body file sama sekali (cuma 1 request POST
 * ringan ke endpoint uc?id=...).
 */
export async function getInfo(url) {
	const canonical = extractAndCreateLink(url)
	const meta = await fetchMetaJson(canonical)

	return {
		fileName: meta.fileName,
		size: meta.sizeBytes ? parseInt(meta.sizeBytes, 10) : null,
		downloadUrl: meta.downloadUrl
	}
}

/**
 * Resolve confirm-token (kalau Google ngebalikin halaman HTML konfirmasi
 * dulu) lalu return response final yang udah siap di-pipe ke disk.
 */
async function fetchFinalResponse(downloadUrl) {
	let res = await fetch(downloadUrl)

	const contentType = res.headers.get('content-type') || ''
	if (contentType.includes('text/html')) {
		const text = await res.text()
		const confirm = text.match(/confirm=([0-9A-Za-z_]+)&/)
		if (confirm) {
			res = await fetch(`${downloadUrl}&confirm=${confirm[1]}`)
		}
	}

	if (res.status !== 200) throw new Error(res.statusText || `HTTP ${res.status}`)
	return res
}

export async function download(url, info, { destDir, baseName }) {
	const res = await fetchFinalResponse(info.downloadUrl)

	let mimetype = res.headers.get('content-type') || 'application/octet-stream'
	if (mimetype === 'application/octet-stream') mimetype = 'application/x-rar-compressed'

	// Koreksi heuristik: Drive sering ngebalikin mimetype generik utk file besar.
	if (info.fileName?.endsWith('.mkv') && mimetype === 'application/x-rar-compressed') mimetype = 'video/x-matroska'
	if (info.fileName?.endsWith('.pdf') && mimetype === 'application/x-rar-compressed') mimetype = 'application/pdf'
	if (info.fileName?.endsWith('.mp4') && mimetype === 'text/html') mimetype = 'video/mp4'

	const fileName = buildFileName(baseName, { mimetype, fileName: info.fileName })
	const filePath = path.join(destDir, fileName)

	await new Promise((resolve, reject) => {
		const writer = fs.createWriteStream(filePath)
		res.body.pipe(writer)
		res.body.on('error', reject)
		writer.on('error', reject)
		writer.on('finish', resolve)
	})

	return { filePath, fileName, mimetype }
}

export { getExtFromMime }
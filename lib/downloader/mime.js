// lib/downloader/mime.js
//
// Tabel MIME -> ekstensi yang sebelumnya diduplikasi di hampir setiap file
// plugin downloader (pixeldrain3/4, mediafire2, gdrive/2, mega2, dll).
// Sekarang jadi satu sumber kebenaran yang dipakai oleh semua engine di
// lib/downloader/engines/*.

import path from 'path'

export const mimeMap = {
	// Gambar
	'image/jpeg': 'jpg',
	'image/jpg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
	'image/gif': 'gif',
	'image/bmp': 'bmp',
	'image/svg+xml': 'svg',
	'image/tiff': 'tiff',
	'image/heic': 'heic',
	'image/x-icon': 'ico',
	'image/vnd.microsoft.icon': 'ico',

	// Video
	'video/mp4': 'mp4',
	'video/x-matroska': 'mkv',
	'video/webm': 'webm',
	'video/quicktime': 'mov',
	'video/x-msvideo': 'avi',
	'video/x-flv': 'flv',
	'video/3gpp': '3gp',
	'video/x-ms-wmv': 'wmv',
	'video/mpeg': 'mpeg',

	// Audio
	'audio/mpeg': 'mp3',
	'audio/mp3': 'mp3',
	'audio/ogg': 'ogg',
	'audio/wav': 'wav',
	'audio/x-wav': 'wav',
	'audio/x-m4a': 'm4a',
	'audio/mp4': 'm4a',
	'audio/x-flac': 'flac',
	'audio/flac': 'flac',
	'audio/aac': 'aac',
	'audio/webm': 'weba',
	'audio/3gpp': '3gp',
	'audio/opus': 'opus',

	// Dokumen
	'application/pdf': 'pdf',
	'text/plain': 'txt',
	'text/html': 'html',
	'text/markdown': 'md',
	'application/msword': 'doc',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
	'application/vnd.ms-excel': 'xls',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
	'application/vnd.ms-powerpoint': 'ppt',
	'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
	'application/rtf': 'rtf',
	'application/xml': 'xml',
	'text/csv': 'csv',
	'application/json': 'json',

	// Arsip & Installer
	'application/zip': 'zip',
	'application/x-rar-compressed': 'rar',
	'application/vnd.rar': 'rar',
	'application/x-7z-compressed': '7z',
	'application/x-tar': 'tar',
	'application/gzip': 'gz',
	'application/x-bzip2': 'bz2',
	'application/vnd.android.package-archive': 'apk',
	'application/x-msdownload': 'exe',
	'application/x-sh': 'sh',
	'application/x-dosexec': 'exe',
	'application/x-iso9660-image': 'iso',

	// Ebook
	'application/epub+zip': 'epub',
	'application/x-mobipocket-ebook': 'mobi',
	'application/vnd.amazon.ebook': 'azw',

	// Font
	'font/ttf': 'ttf',
	'font/otf': 'otf',
	'application/font-woff': 'woff',
	'application/font-woff2': 'woff2',

	// Lain-lain
	'application/octet-stream': 'bin',
	'application/x-bittorrent': 'torrent',
	'chemical/x-pdb': 'pdb'
}

/**
 * Ambil ekstensi dari mimetype. Balikin 'bin' kalau gak ketemu/gak ada.
 */
export function getExtFromMime(mimetype = '') {
	if (!mimetype) return 'bin'
	if (mimeMap[mimetype]) return mimeMap[mimetype]
	const match = mimetype.match(/\/([a-z0-9\-+.]+)/i)
	return match ? match[1].replace(/[^a-z0-9]/gi, '') : 'bin'
}

/**
 * Tentukan ekstensi "asli" file berdasarkan prioritas:
 *   1. Mapping mimetype (kalau mimetype-nya informatif, bukan octet-stream/bin)
 *   2. Ekor nama file asli dari info provider (fileName)
 *   3. Fallback terakhir: hasil getExtFromMime apa adanya (termasuk 'bin')
 *
 * Dipakai supaya nama file custom (yang gak boleh ditulis pakai ekstensi
 * oleh user) tetap dapat ekstensi yang benar.
 */
export function resolveExtension({ mimetype = '', fileName = '' } = {}) {
	if (mimetype) {
		const fromMime = getExtFromMime(mimetype)
		if (fromMime && fromMime !== 'bin') return fromMime
	}

	if (fileName) {
		const fromName = path.extname(fileName).replace(/^\./, '')
		if (fromName) return fromName.toLowerCase()
	}

	return getExtFromMime(mimetype)
}

/**
 * Gabungin baseName (tanpa ekstensi, hasil input custom atau nama asli)
 * dengan ekstensi yang udah diresolve. Satu titik tunggal supaya semua
 * engine konsisten.
 */
export function buildFileName(baseName, { mimetype = '', fileName = '' } = {}) {
	const ext = resolveExtension({ mimetype, fileName })
	return `${baseName}.${ext}`
}
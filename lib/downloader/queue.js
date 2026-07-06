// lib/downloader/queue.js
//
// Queue khusus untuk upload FOLDER (bukan single-file) ke Google Drive.
// syncFolderOneLevel() bisa dipanggil dari banyak job .download yang
// berjalan bersamaan (misal beberapa orang nge-extract barengan) — kalau
// semuanya langsung hit Drive API secara paralel, bisa spam/rate-limit dan
// notifikasi antar-job jadi acak. Queue ini menyerialkan proses upload
// folder jadi satu-satu (FIFO), terpisah dari antrian ekstrak
// (lib/extract-queue.js) yang sudah ada.

import { syncFolderOneLevel } from '../gdrive-uploader-folder.js'

let queue = []
let isProcessing = false

/**
 * @param {{ localFolderPath: string, targetFolderId: string }} job
 * @returns {Promise<{ uploaded: number, skipped: number, folderName: string }>}
 */
export function enqueueFolderUpload({ localFolderPath, targetFolderId }) {
	return new Promise((resolve, reject) => {
		queue.push({ localFolderPath, targetFolderId, resolve, reject })
		processNext()
	})
}

export function getFolderUploadQueueLength() {
	return queue.length
}

async function processNext() {
	if (isProcessing) return
	const job = queue.shift()
	if (!job) return

	isProcessing = true
	try {
		const result = await syncFolderOneLevel(job.localFolderPath, job.targetFolderId)
		job.resolve(result)
	} catch (err) {
		job.reject(err)
	} finally {
		isProcessing = false
		// lanjut ke job berikutnya (kalau ada) tanpa nunggu caller
		processNext()
	}
}
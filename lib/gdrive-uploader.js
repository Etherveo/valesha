import fs from 'fs'
import path from 'path'
import { drive } from './gdrive-auth.js'

const DEFAULT_RANDOM = '1UlNS_oNETfczk1jLC0nndxN1M8BX0AiB'

// === helper: cek file sudah ada di folder target ===
async function fileExists(name, parentId) {
	const safeName = name.replace(/'/g, "\\'")
	
	const q = [
		`name='${safeName}'`,
		`'${parentId}' in parents`,
		'trashed=false'
	].join(' and ')

	const res = await drive.files.list({
		q,
		supportsAllDrives: true,
		includeItemsFromAllDrives: true,
		fields: 'files(id)'
	})

	return res.data.files.length > 0
}

// === helper: validasi folder ID ===
async function assertFolderExists(folderId) {
	try {
		const res = await drive.files.get({
			fileId: folderId,
			supportsAllDrives: true,
			fields: 'id, mimeType'
		})
		
		if (res.data.mimeType !== 'application/vnd.google-apps.folder') {
			throw new Error('Target ID bukan folder')
		}
	} catch (e) {
		throw new Error(`${e}`)
	}
}

// === FUNGSI UTAMA: UPLOAD 1 FILE ===
export async function syncFileToDrive(localFilePath, targetFolderId) {
	console.log('[GDRIVE] Upload request:', {
		localFilePath,
		exists: fs.existsSync(localFilePath),
		cwd: process.cwd()
	})

	if (!localFilePath || !fs.existsSync(localFilePath)) throw new Error('File lokal tidak ditemukan')

	if (!targetFolderId) {
		targetFolderId = DEFAULT_RANDOM
	}

	// validasi folder tujuan
	// await assertFolderExists(targetFolderId)

	const fileName = path.basename(localFilePath)

	// cek duplicate
	if (await fileExists(fileName, targetFolderId)) {
		return {
			status: 'skipped',
			reason: 'File dengan nama sama sudah ada',
			fileName
		}
	}

	// upload
	await drive.files.create({
		supportsAllDrives: true,
		requestBody: {
			name: fileName,
			parents: [targetFolderId]
		},
		media: {
			body: fs.createReadStream(localFilePath)
		}
	})

	return {
		status: 'uploaded',
		fileName
	}
}
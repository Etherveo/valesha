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

async function getOrCreateDriveFolder(name, parentId) {
	const safeName = name.replace(/'/g, "\\'")
	const q = [
		`name='${safeName}'`,
		`mimeType='application/vnd.google-apps.folder'`,
		`'${parentId}' in parents`,
		'trashed=false'
	].join(' and ')

	const res = await drive.files.list({
		q,
		supportsAllDrives: true,
		includeItemsFromAllDrives: true,
		fields: 'files(id, name)'
	})

	if (res.data.files.length) {
		return res.data.files[0].id
	}

	const folder = await drive.files.create({
		supportsAllDrives: true,
		requestBody: {
			name,
			mimeType: 'application/vnd.google-apps.folder',
			parents: [parentId]
		},
		fields: 'id'
	})

	return folder.data.id
}

export async function syncFolderRecursive(localFolderPath, parentFolderId) {
	if (!fs.existsSync(localFolderPath)) {
		throw new Error('Folder lokal tidak ditemukan')
	}

	if (!fs.statSync(localFolderPath).isDirectory()) {
		throw new Error('Target bukan folder')
	}

	const folderName = path.basename(localFolderPath)

	// buat / ambil folder di Drive untuk folder saat ini
	const driveFolderId = await getOrCreateDriveFolder(folderName, parentFolderId)

	const entries = fs.readdirSync(localFolderPath, { withFileTypes: true })

	let uploaded = 0
	let skipped = 0
	let createdFolders = 0

	for (const entry of entries) {
		const fullPath = path.join(localFolderPath, entry.name)

		// kalau subfolder -> rekursif
		if (entry.isDirectory()) {
			createdFolders++

			const res = await syncFolderRecursive(fullPath, driveFolderId)
			uploaded += res.uploaded
			skipped += res.skipped
			createdFolders += res.createdFolders
			continue
		}

		// kalau file -> upload seperti biasa
		if (entry.isFile()) {
			const res = await syncFileToDrive(fullPath, driveFolderId)
			if (res.status === 'uploaded') uploaded++
			else skipped++
		}
	}

	return {
		uploaded,
		skipped,
		createdFolders,
		folderName,
		driveFolderId
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

export async function syncFolderOneLevel(localFolderPath, parentFolderId) {
	return await syncFolderRecursive(localFolderPath, parentFolderId)
}

export async function LEGACYsyncFolderOneLevel(localFolderPath, parentFolderId) {
	if (!fs.existsSync(localFolderPath)) {
		throw new Error('Folder lokal tidak ditemukan')
	}

	if (!fs.statSync(localFolderPath).isDirectory()) {
		throw new Error('Target bukan folder')
	}

	const folderName = path.basename(localFolderPath)

	// buat folder di Drive
	const driveFolderId = await getOrCreateDriveFolder(
		folderName,
		parentFolderId
	)

	const entries = fs.readdirSync(localFolderPath)

	let uploaded = 0
	let skipped = 0

	for (const entry of entries) {
		const fullPath = path.join(localFolderPath, entry)

		if (!fs.statSync(fullPath).isFile()) {
			continue // skip subfolder
		}

		const res = await syncFileToDrive(fullPath, driveFolderId)
		if (res.status === 'uploaded') uploaded++
		else skipped++
	}

	return { uploaded, skipped, folderName }
}
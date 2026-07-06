// lib/index.js
//
// Satu pintu masuk tunggal untuk semua plugin di plugins/. Sesuai spek:
// "lib/index.js -> di sini juga export lagi, sehingga seluruh plugins/
// hanya perlu membaca dari 1 file tunggal saja untuk mengakses engine
// mereka masing-masing."
//
// Jadi plugin cukup nulis:
//   import { detectProvider, getEngine, syncFileToDrive, addToExtractQueue, enqueueFolderUpload } from '../lib/index.js'
//
// File-file lib/gdrive-uploader-folder.js, lib/gdrive-auth.js,
// lib/extracter.js, lib/mediafire.js TIDAK diubah sama sekali — barrel ini
// cuma numpang re-export.

// --- Downloader engine (lib/downloader/index.js) ---
export {
	engines,
	detectProvider,
	getEngine,
	supportedProviders,
	resolveExtension,
	getExtFromMime,
	buildFileName,
	mimeMap,
	enqueueFolderUpload,
	getFolderUploadQueueLength
} from './downloader/index.js'

// --- Google Drive uploader (file tunggal & folder) ---
export { syncFileToDrive, syncFolderOneLevel } from './gdrive-uploader-folder.js'

// --- Antrian ekstrak ZIP/RAR (sudah ada, diperluas dgn onComplete/onError) ---
export { addToExtractQueue } from './extract-queue.js'

// --- Helper ekstraksi mentah (kalau ada plugin lain yg butuh manual) ---
export { extractUniversal } from './extracter.js'
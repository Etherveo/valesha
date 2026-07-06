// lib/downloader/index.js
//
// Barrel KHUSUS untuk engine downloader. Ini yang dimaksud di spek:
// "lib/downloader/ -> export ke index.js (khusus engine downloader)".
//
// lib/index.js (satu level di atas) re-export lagi isi file ini supaya
// plugins/ cukup baca dari SATU file (lib/index.js) untuk semua kebutuhan
// (downloader + drive uploader + extract queue).

export { engines, detectProvider, getEngine, supportedProviders } from './detect.js'
export { resolveExtension, getExtFromMime, buildFileName, mimeMap } from './mime.js'
export { enqueueFolderUpload, getFolderUploadQueueLength } from './queue.js'
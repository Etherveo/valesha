import fs from 'fs'
import path from 'path'
import { File } from 'megajs'
import { fileURLToPath } from 'url'
import { getExtFromMime } from './extension-detector.js'
import { syncFileToDrive } from './gdrive-uploader.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DEFAULT_TEMP_DIR = path.join(__dirname, '../src/public/mega')
const DEFAULT_GDRIVE_FOLDER = '1R_JIYXtZehPubsLVYaAxwsmFUxJf0kuw'

/* ======================
   PUBLIC API
====================== */
export async function downloadMega({
  url,
  customName,
  upload = false,
  tempDir = DEFAULT_TEMP_DIR
}) {
  if (!url) throw new Error('URL Mega kosong')

  if (!fs.existsSync(tempDir))
    fs.mkdirSync(tempDir, { recursive: true })

  // === init file ===
  let file = File.fromURL(url)
  file = await file.loadAttributes()

  const mimetype = file.type || 'application/octet-stream'
  const ext = getExtFromMime(mimetype)

  const finalName = customName
    ? `${customName}.${ext}`
    : file.name

  const localPath = path.join(tempDir, finalName)

  // === STREAM DOWNLOAD ===
  await new Promise((resolve, reject) => {
    const stream = file.download()
    const out = fs.createWriteStream(localPath)

    stream.pipe(out)
    stream.on('error', reject)
    out.on('finish', resolve)
    out.on('error', reject)
  })

  if (upload) {
    syncFileToDrive(localPath, DEFAULT_GDRIVE_FOLDER)
      .catch(() => {})
  }

  return {
    success: true,
    provider: 'mega',
    file: {
      name: finalName,
      size: file.size,
      mimetype,
      ext,
      path: localPath,
      sourceUrl: url
    }
  }
}
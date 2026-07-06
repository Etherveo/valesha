import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'
import { fileURLToPath } from 'url'
import { getExtFromMime } from './extension-detector.js'
import { syncFileToDrive } from './gdrive-uploader.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DEFAULT_TEMP_DIR = path.join(__dirname, '../src/public/gdrive')
const DEFAULT_GDRIVE_FOLDER = '1R_JIYXtZehPubsLVYaAxwsmFUxJf0kuw'

/* ======================
   UTIL
====================== */
function extractId(url) {
  const match =
    url.match(/\/d\/([^/]+)/) ||
    url.match(/[?&]id=([^&]+)/)

  if (!match) throw new Error('GDrive ID tidak ditemukan')
  return match[1]
}

/* ======================
   GDRIVE v3
====================== */
async function gdrive(id) {
  const res = await fetch(
    `https://drive.google.com/uc?id=${id}&authuser=0&export=download`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'x-json-requested': 'true',
        'user-agent': 'Mozilla/5.0'
      }
    }
  )

  const text = await res.text()
  const json = JSON.parse(text.slice(4))

  if (!json.downloadUrl) throw new Error('gdrive limit')

  return {
    downloadUrl: json.downloadUrl,
    fileName: json.fileName,
    size: json.sizeBytes
  }
}

/* ======================
   GDRIVE v4 (fallback)
====================== */
async function gdrive2(id) {
  const res = await fetch(
    `https://drive.google.com/uc?id=${id}&export=download`,
    { redirect: 'follow' }
  )

  if (!res.ok) throw new Error('gdrive2 gagal')

  const disposition = res.headers.get('content-disposition') || ''
  const nameMatch = disposition.match(/filename\*=UTF-8''(.+)/)

  const fileName = nameMatch
    ? decodeURIComponent(nameMatch[1])
    : `gdrive-${id}`

  return {
    downloadUrl: res.url,
    fileName,
    size: parseInt(res.headers.get('content-length') || 0),
    mimetype: res.headers.get('content-type')
  }
}

/* ======================
   PUBLIC API
====================== */
export async function downloadGDrive({
  url,
  customName,
  upload = false,
  tempDir = DEFAULT_TEMP_DIR
}) {
  if (!url) throw new Error('URL Google Drive kosong')

  if (!fs.existsSync(tempDir))
    fs.mkdirSync(tempDir, { recursive: true })

  const id = extractId(url)

  let meta
  try {
    meta = await gdrive(id)
  } catch {
    meta = await gdrive2(id)
  }

  const response = await fetch(meta.downloadUrl)
  if (!response.ok) throw new Error('Download stream gagal')

  const mimetype =
    meta.mimetype ||
    response.headers.get('content-type') ||
    'application/octet-stream'

  const ext = getExtFromMime(mimetype)
  const finalName = customName
    ? `${customName}.${ext}`
    : meta.fileName

  const localPath = path.join(tempDir, finalName)

  await new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(localPath)
    response.body.pipe(stream)
    response.body.on('error', reject)
    stream.on('finish', resolve)
  })

  if (upload) {
    syncFileToDrive(localPath, DEFAULT_GDRIVE_FOLDER)
      .catch(() => {})
  }

  return {
    success: true,
    provider: 'gdrive',
    file: {
      name: finalName,
      size: meta.size,
      mimetype,
      ext,
      path: localPath,
      sourceUrl: meta.downloadUrl
    }
  }
}
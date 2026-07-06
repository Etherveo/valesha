import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'
import cheerio from 'cheerio'
import { fileURLToPath } from 'url'
import { syncFileToDrive } from './gdrive-uploader.js'
import { getExtFromMime } from './extension-detector.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DEFAULT_TEMP_DIR = path.join(__dirname, '../src/public/pixeldrain')
const DEFAULT_GDRIVE_FOLDER = '1R_JIYXtZehPubsLVYaAxwsmFUxJf0kuw'

/* =======================
   URL PARSER
======================= */
function parseItemIndex(url = '') {
  const hash = url.split('#')[1] || ''
  const m = hash.match(/item=(\d+)/i)
  return m ? parseInt(m[1], 10) : null
}

/* =======================
   METADATA RESOLVER
======================= */
async function resolvePixeldrain(url) {
  let id, fileUrl, fileName, size

  // === LIST / FOLDER
  if (url.includes('/l/')) {
    id = url.split('/l/')[1].split(/[?#]/)[0]
    const index = parseItemIndex(url) ?? 1

    const res = await fetch(`https://pixeldrain.com/api/list/${id}`)
    if (!res.ok) throw new Error('Gagal ambil list pixeldrain')

    const json = await res.json()
    if (!json.files?.length) throw new Error('Folder kosong')

    if (index < 1 || index > json.files.length)
      throw new Error(`Item invalid (1-${json.files.length})`)

    const file = json.files[index - 1]
    fileName = file.name
    size = file.size
    fileUrl = `https://pixeldrain.com/api/file/${file.id}`

    return { fileUrl, fileName, size }
  }

  // === SINGLE FILE
  if (url.includes('/u/')) {
    id = url.split('/u/')[1].split(/[?#]/)[0]
    const info = await fetch(`https://pixeldrain.com/api/file/${id}/info`).then(r => r.json())

    return {
      fileUrl: `https://pixeldrain.com/api/file/${id}`,
      fileName: info.name,
      size: info.size
    }
  }

  // === FILESYSTEM SHARE
  if (url.includes('/d/')) {
    id = url.split('/d/')[1].split(/[?#]/)[0]
    const html = await fetch(url).then(r => r.text())

    const match = html.match(/window\.initial_node\s*=\s*(\{.*?\});/s)
    if (!match) throw new Error('Metadata filesystem tidak ditemukan')

    const meta = JSON.parse(match[1])
    const file = meta.path?.[0]

    return {
      fileUrl: `https://pixeldrain.com/api/filesystem/${id}`,
      fileName: file?.name ?? 'unknown.bin',
      size: file?.file_size ?? 0
    }
  }

  throw new Error('URL Pixeldrain tidak dikenali')
}


/* =======================
   MAIN PUBLIC FUNCTION
======================= */
export async function downloadPixeldrain({
  url,
  customName,
  upload = false,
  tempDir = DEFAULT_TEMP_DIR
}) {
  if (!url) throw new Error('URL kosong')

  if (!fs.existsSync(tempDir))
    fs.mkdirSync(tempDir, { recursive: true })

  const meta = await resolvePixeldrain(url)

  const res = await fetch(meta.fileUrl)
  if (!res.ok) throw new Error('Gagal download file')

  const mimetype = res.headers.get('content-type') || 'application/octet-stream'
  const ext = getExtFromMime(mimetype)

  const finalName = customName
    ? `${customName}.${ext}`
    : meta.fileName

  const filePath = path.join(tempDir, finalName)
  const stream = fs.createWriteStream(filePath)

  await new Promise((resolve, reject) => {
    res.body.pipe(stream)
    res.body.on('error', reject)
    stream.on('finish', resolve)
  })

  if (upload) {
    syncFileToDrive(filePath, DEFAULT_GDRIVE_FOLDER)
      .catch(() => {})
  }

  return {
    success: true,
    provider: 'pixeldrain',
    file: {
      name: finalName,
      size: meta.size,
      mimetype,
      ext,
      path: filePath,
      sourceUrl: meta.fileUrl
    }
  }
}
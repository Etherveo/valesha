import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'
import axios from 'axios'
import { JSDOM } from 'jsdom'
import { fileURLToPath } from 'url'
import { getExtFromMime } from './extension-detector.js'
import { syncFileToDrive } from './gdrive-uploader.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DEFAULT_TEMP_DIR = path.join(__dirname, '../src/public/mediafire')
const DEFAULT_GDRIVE_FOLDER = '1R_JIYXtZehPubsLVYaAxwsmFUxJf0kuw'

/* ======================
   SCRAPER
====================== */
async function resolveMediafire(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  })

  const html = await res.text()
  const dom = new JSDOM(html)
  const document = dom.window.document

  const btn = document.querySelector('#downloadButton')
  if (!btn) throw new Error('Download button tidak ditemukan')

  let downloadUrl =
    btn.getAttribute('href') ||
    btn.getAttribute('data-href')

  const scrambled = btn.getAttribute('data-scrambled-url')
  if (scrambled) {
    downloadUrl = Buffer.from(scrambled, 'base64').toString('utf-8')
  }

  if (!downloadUrl) throw new Error('Download URL MediaFire gagal diambil')

  return downloadUrl
}

/* ======================
   HEAD INFO
====================== */
async function fetchFileInfo(url) {
  const res = await axios.head(url, {
    maxRedirects: 5,
    headers: { 'User-Agent': 'Mozilla/5.0' }
  })

  const size = parseInt(res.headers['content-length'] || 0)
  const mimetype = res.headers['content-type'] || 'application/octet-stream'

  const fileName = decodeURIComponent(
    url.split('/').pop().replace(/\+/g, ' ')
  )

  return { size, mimetype, fileName }
}

/* ======================
   PUBLIC API
====================== */
export async function downloadMediafire({
  url,
  customName,
  upload = false,
  tempDir = DEFAULT_TEMP_DIR
}) {
  if (!url) throw new Error('URL MediaFire kosong')

  if (!fs.existsSync(tempDir))
    fs.mkdirSync(tempDir, { recursive: true })

  const downloadUrl = await resolveMediafire(url)
  const meta = await fetchFileInfo(downloadUrl)

  const ext = getExtFromMime(meta.mimetype)
  const finalName = customName
    ? `${customName}.${ext}`
    : meta.fileName

  const localPath = path.join(tempDir, finalName)

  const response = await axios.get(downloadUrl, {
    responseType: 'stream',
    maxRedirects: 5,
    headers: { 'User-Agent': 'Mozilla/5.0' }
  })

  await new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(localPath)
    response.data.pipe(stream)
    stream.on('finish', resolve)
    stream.on('error', reject)
  })

  if (upload) {
    syncFileToDrive(localPath, DEFAULT_GDRIVE_FOLDER)
      .catch(() => {})
  }

  return {
    success: true,
    provider: 'mediafire',
    file: {
      name: finalName,
      size: meta.size,
      mimetype: meta.mimetype,
      ext,
      path: localPath,
      sourceUrl: downloadUrl
    }
  }
}
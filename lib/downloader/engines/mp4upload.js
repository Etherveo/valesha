// lib/downloader/engines/mp4upload.js
//
// Konsolidasi dari omp4upload. mp4upload butuh 2x request form-post
// (download1 lalu download2) sebelum dapat link CDN langsungnya — semua itu
// masih tergolong "metadata phase" (gak narik body videonya), jadi semua
// masuk getInfo(). Body videonya baru ditarik di download().

import axios from 'axios'
import cheerio from 'cheerio'
import { wrapper } from 'axios-cookiejar-support'
import { CookieJar } from 'tough-cookie'
import fs from 'fs'
import path from 'path'
import https from 'https'
import { buildFileName } from '../mime.js'

export const id = 'mp4upload'

export function match(url = '') {
	return /mp4upload\.com/i.test(url)
}

const jar = new CookieJar()

const client = wrapper(
	axios.create({
		jar,
		withCredentials: true
	})
)

const cdnClient = axios.create({
	httpsAgent: new https.Agent({ rejectUnauthorized: false })
})

async function scrapeMp4Upload(url) {
	const { data: html } = await client.get(url, {
		headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://www.mp4upload.com/' }
	})

	const $ = cheerio.load(html)
	const fileName = $('input[name="fname"]').val() || $('h4').first().text().trim()
	const fileId = $('input[name="id"]').val()

	if (!fileId || !fileName) throw new Error('Gagal mengambil metadata mp4upload (link mungkin sudah tidak valid).')

	return { fileId, fileName }
}

async function triggerFreeDownload(url, meta) {
	const form = new URLSearchParams()
	form.append('op', 'download1')
	form.append('id', meta.fileId)
	form.append('fname', meta.fileName)
	form.append('method_free', 'Free Download')

	await client.post(url, form, {
		headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0', Referer: url }
	})
}

async function getMp4UploadDirect(url, meta) {
	const form = new URLSearchParams()
	form.append('op', 'download2')
	form.append('id', meta.fileId)
	form.append('method_free', 'Free Download')
	form.append('referer', url)

	const res = await client.post(url, form, {
		headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0', Referer: url },
		maxRedirects: 0,
		validateStatus: s => s === 302 || s === 200
	})

	if (res.headers.location) return res.headers.location
	throw new Error('Gagal mendapatkan redirect link mp4.')
}

export async function getInfo(url) {
	const meta = await scrapeMp4Upload(url)
	await triggerFreeDownload(url, meta) // wajib sebelum download2
	const directUrl = await getMp4UploadDirect(url, meta)

	let size = null
	try {
		const head = await cdnClient.head(directUrl, {
			headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://www.mp4upload.com/' }
		})
		size = parseInt(head.headers['content-length'] || '0', 10) || null
	} catch {
		// gak semua CDN mp4upload ngasih respon ke HEAD, gak fatal
	}

	return { fileName: meta.fileName, size, directUrl }
}

export async function download(url, info, { destDir, baseName }) {
	const response = await cdnClient.get(info.directUrl, {
		responseType: 'stream',
		headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://www.mp4upload.com/' }
	})

	const mimetype = response.headers['content-type'] || 'video/mp4'
	const fileName = buildFileName(baseName, { mimetype, fileName: info.fileName })
	const filePath = path.join(destDir, fileName)

	await new Promise((resolve, reject) => {
		const writer = fs.createWriteStream(filePath)
		response.data.pipe(writer)
		response.data.on('error', reject)
		writer.on('error', reject)
		writer.on('finish', resolve)
	})

	return { filePath, fileName, mimetype }
}
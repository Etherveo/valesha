// lib/downloader/detect.js
//
// Satu tempat untuk nentuin engine mana yang harus dipakai berdasarkan
// domain URL. Plugin interface (.download) cuma perlu panggil
// detectProvider(url) lalu getEngine(id) — gak perlu tau detail tiap servis.

import * as pixeldrain from './engines/pixeldrain.js'
import * as mediafire from './engines/mediafire.js'
import * as mega from './engines/mega.js'
import * as gdrive from './engines/gdrive.js'
import * as mp4upload from './engines/mp4upload.js'

// Urutan dicek sesuai urutan object ini didefinisikan.
export const engines = {
	pixeldrain,
	mediafire,
	mega,
	gdrive,
	mp4upload
}

/**
 * @param {string} url
 * @returns {string|null} id provider (key di `engines`) atau null kalau gak ada yg cocok
 */
export function detectProvider(url = '') {
	for (const [providerId, engine] of Object.entries(engines)) {
		if (engine.match(url)) return providerId
	}
	return null
}

/**
 * @param {string} providerId
 * @returns engine module ({ id, match, getInfo, download }) atau undefined
 */
export function getEngine(providerId) {
	return engines[providerId]
}

export const supportedProviders = Object.keys(engines)
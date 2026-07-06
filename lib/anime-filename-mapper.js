import fs from 'fs'
import path from 'path'
import { loadAnimeMap } from '../lib/anime-crud-mapper.js'

const MAP_PATH = path.resolve('./src/database/animeMap.json')

function loadMapping() {
	if (!fs.existsSync(MAP_PATH)) return {}
	try {
		return JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'))
	} catch {
		return {}
	}
}

/**
 * Generate nama file baru berdasarkan mapping JSON
 * @param {string} filename
 * @returns {string|null}
 */
export function mapAnimeFilename(filename = '') {
	const map = loadAnimeMap()

	const entry = Object.entries(map)
		.sort((a, b) => b[0].length - a[0].length)
		.find(([key]) => {
			const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
			const regex = new RegExp(`(?:^|[-_. ])${escapedKey}(?:[-_. ]|$)`, 'i')
			return regex.test(filename)
		})

	if (!entry) return null

	const [, config] = entry
	const ext = path.extname(filename)

	// Episode (01, 02, dst)
	const epMatch = filename.match(
		/(?:^|[\s\-_])(?:ep|episode)?\s*(\d{1,3})(?=[\s\-_\.]|$)/i
	)

	// === DETEKSI TIPE KHUSUS ===
	const specialMatch = filename.match(
		/(?:^|[\s\-_\.])(ova|oad|special|sp|movie|mov|film)(?=[\s\-_\.]|$)/i
	)

	let label = null

	if (epMatch) {
		label = `Episode ${epMatch[1].padStart(2, '0')}`
	} else if (specialMatch) {
		const type = specialMatch[1].toLowerCase()

		if (type === 'ova' || type === 'oad') label = 'OVA'
		else if (type === 'sp' || type === 'special') label = 'Special'
		else if (type === 'mov' || type === 'movie' || type === 'film') label = 'Movie'
	}

	// Kalau bukan episode & bukan special → tolak
	if (!label) return null

	const isEnd = filename.toLowerCase().includes('/[-_]{1,2}end[-_]{1,2}')

	let title = config.title
	if (config.season) {
		title += ` ${config.season}`
	}
	
	if (isEnd && label.startsWith('Episode')) label += ' [END]'

	let result = `${title} - ${label}`

	if (config.subtitle) {
		result += ` (${config.subtitle})`
	}

	return result + ext
}
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
		.find(([key]) => filename.includes(key))

	if (!entry) return null

	const [, config] = entry
	const ext = path.extname(filename)

	// Episode (01, 02, dst)
	const epMatch = filename.match(/[-_](\d{2})/)
	if (!epMatch) return null
	const episode = epMatch[1]

	const isEnd = filename.includes('END')

	let title = config.title
	if (config.season) {
		title += ` ${config.season}`
	}

	let epText = `Episode ${episode}`
	if (isEnd) epText += ' [END]'

	let result = `${title} - ${epText}`

	if (config.subtitle) {
		result += ` (${config.subtitle})`
	}

	return result + ext
}
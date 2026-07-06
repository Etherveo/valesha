import fs from 'fs'
import path from 'path'

const MAP_PATH = path.resolve('./src/database/animeMap.json')

/**
 * Load seluruh mapping
 * @returns {Object}
 */
export function loadAnimeMap() {
	if (!fs.existsSync(MAP_PATH)) return {}
	try {
		return JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'))
	} catch (e) {
		console.error('[animeMap] Failed to parse JSON:', e)
		return {}
	}
}

/**
 * Simpan mapping ke file
 * @param {Object} map
 */
export function saveAnimeMap(map) {
	fs.mkdirSync(path.dirname(MAP_PATH), { recursive: true })
	fs.writeFileSync(MAP_PATH, JSON.stringify(map, null, 2))
}

/**
 * Tambah / overwrite mapping
 * @param {string} key
 * @param {Object} data
 */
export function addAnimeMapping(key, data) {
	const map = loadAnimeMap()
	map[key] = data
	saveAnimeMap(map)
	return map[key]
}

/**
 * Hapus mapping berdasarkan key
 * @param {string} key
 * @returns {boolean} true jika terhapus
 */
export function deleteAnimeMapping(key) {
	const map = loadAnimeMap()
	if (!(key in map)) return false
	delete map[key]
	saveAnimeMap(map)
	return true
}
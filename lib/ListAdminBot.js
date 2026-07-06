import fs from 'fs'
import path from 'path'

const dbBA = path.join(process.cwd(), 'src/database/adminBot.json')

if (!fs.existsSync(path.dirname(dbBA))) {
	fs.mkdirSync(path.dirname(dbBA), { recursive: true })
}
if (!fs.existsSync(dbBA)) {
	fs.writeFileSync(dbBA, '[]')
}

export function matchId(v, id) {
	return v.id === id || v.lid === id
}

export function muatLAB() {
	return JSON.parse(fs.readFileSync(dbBA, 'utf8'))
}

export function simpanLAB(list) {
	fs.writeFileSync(dbBA, JSON.stringify(list, null, 2))
}

export function isAdminBot(id) {
	return muatLAB().find(v => v.id === id || v.lid === id)
}

export function isRAB(id) {
	const found = muatLAB().find(v => v.id === id || v.lid === id)
	return found?.canGrant === true
}
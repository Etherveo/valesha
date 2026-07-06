import fs from 'fs'
import path from 'path'

const dbGrupFile = path.join(process.cwd(), 'src/database/grupFile.json')

if (!fs.existsSync(path.dirname(dbGrupFile)))
	fs.mkdirSync(path.dirname(dbGrupFile), { recursive: true })

if (!fs.existsSync(dbGrupFile))
	fs.writeFileSync(dbGrupFile, '[]')

export function muatGF() {
	try {
		return JSON.parse(fs.readFileSync(dbGrupFile))
	} catch {
		return []
	}
}

export function simpanGF(list) {
    fs.writeFileSync(dbGrupFile, JSON.stringify(list, null, 2))
}
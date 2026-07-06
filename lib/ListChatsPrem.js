import fs from 'fs'
import path from 'path'

const dbPrmCht = path.join(process.cwd(), 'src/database/allowedChats.json')

if (!fs.existsSync(path.dirname(dbPrmCht))) fs.mkdirSync(path.dirname(dbPrmCht), { recursive: true })
if (!fs.existsSync(dbPrmCht)) fs.writeFileSync(dbPrmCht, '[]')

export function muatPremium() {
    return fs.existsSync(dbPrmCht) ? JSON.parse(fs.readFileSync(dbPrmCht)) : []
}

export function simpanDaftarPrem(list) {
    fs.writeFileSync(dbPrmCht, JSON.stringify(list, null, 2))
}
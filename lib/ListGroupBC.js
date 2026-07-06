import fs from 'fs'
import path from 'path'

const dbFileGrup = path.join(process.cwd(), 'src/database/allowedGroups.json')

// Buat folder dan filenya kalo belum ada
if (!fs.existsSync(path.dirname(dbFileGrup))) fs.mkdirSync(path.dirname(dbFileGrup), { recursive: true })
if (!fs.existsSync(dbFileGrup)) fs.writeFileSync(dbFileGrup, '[]')

export function muatDaftarGrup() {
    return fs.existsSync(dbFileGrup) ? JSON.parse(fs.readFileSync(dbFileGrup)) : []
}

export function simpanDaftarGrup(list) {
    fs.writeFileSync(dbFileGrup, JSON.stringify(list, null, 2))
}
import fs from 'fs'
import path from 'path'

const dbFLawan = path.join(process.cwd(), 'src/database/lawan.json')

// Pastikan folder dan file-nya ada
if (!fs.existsSync(path.dirname(dbFLawan))) fs.mkdirSync(path.dirname(dbFLawan), { recursive: true })
if (!fs.existsSync(dbFLawan)) fs.writeFileSync(dbFLawan, '[]')

export function muatLawan() {
    return fs.existsSync(dbFLawan) ? JSON.parse(fs.readFileSync(dbFLawan)) : []
}

export function simpanLawan(list) {
    fs.writeFileSync(dbFLawan, JSON.stringify(list, null, 2))
}
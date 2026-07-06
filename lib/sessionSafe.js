import fs from 'fs'
import path from 'path'

export function cleanNumber(value = '') {
  return String(value || '').replace(/[^0-9]/g, '')
}

export function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

export function safeSessionPath(baseDir, name) {
  const cleaned = cleanNumber(name)
  const fallback = String(name || 'unknown').replace(/[^a-zA-Z0-9_.-]/g, '_')
  return path.join(baseDir, cleaned || fallback)
}

export function makeSessionSaver(saveCreds, label = 'auth') {
  let saving = false
  let rerun = false
  let lastErrorAt = 0

  const run = async () => {
    if (saving) {
      rerun = true
      return
    }

    saving = true
    do {
      rerun = false
      try {
        await saveCreds()
      } catch (err) {
        const now = Date.now()
        if (now - lastErrorAt > 2000) {
          console.error(`[SESSION] Gagal menyimpan session ${label}: ${err?.message || err}`)
          lastErrorAt = now
        }
      }
    } while (rerun)
    saving = false
  }

  return () => {
    run().catch(err => {
      console.error(`[SESSION] Save queue error ${label}: ${err?.message || err}`)
    })
  }
}

export function clearTimerMap(map, key) {
  const timer = map.get(key)
  if (timer) clearTimeout(timer)
  map.delete(key)
}

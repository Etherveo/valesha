import { downloadPixeldrain } from './pixeldrain.js'
import { downloadMediafire } from './mediafire-new.js'
import { downloadGDrive } from './gdrive.js'
import { downloadMega } from './mega.js'

function detectProvider(url) {
  if (/pixeldrain\.com/i.test(url)) return 'pixeldrain'
  if (/mediafire\.com/i.test(url)) return 'mediafire'
  if (/drive\.google\.com/i.test(url)) return 'gdrive'
  if (/mega\.nz|mega\.co\.nz/i.test(url)) return 'mega'
  return null
}

export async function downloadUniversal({
  url,
  customName,
  upload = false,
  tempDir
}) {
  if (!url) throw new Error('URL kosong')

  const provider = detectProvider(url)
  if (!provider) throw new Error('Provider tidak didukung!\nHanya support: gdrive, pixeldrain, mediafire, mega.')

  switch (provider) {
    case 'pixeldrain':
      return downloadPixeldrain({ url, customName, upload, tempDir })

    case 'mediafire':
      return downloadMediafire({ url, customName, upload, tempDir })

    case 'gdrive':
      return downloadGDrive({ url, customName, upload, tempDir })

    case 'mega':
      return downloadMega({ url, customName, upload, tempDir })

    default:
      throw new Error('Downloader tidak ditemukan')
  }
}
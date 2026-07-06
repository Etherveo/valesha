import puppeteer from 'puppeteer'

export async function mp4uploadScrape(url) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  const page = await browser.newPage()
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
  )

  await page.goto(url, {
    waitUntil: 'networkidle2',
    timeout: 60000
  })

  const data = await page.evaluate(() => {
    // === ambil judul ===
    let title =
      document.querySelector('h1')?.innerText ||
      document.title ||
      'mp4upload-video'

    title = title
      .replace(/[-–|].*$/i, '')     // buang junk
      .replace(/[\\/:*?"<>|]/g, '') // sanitize Windows
      .trim()

    // === ambil video url ===
    const video = document.querySelector('video')
    if (video?.src) {
      return { title, url: video.src }
    }

    const scripts = [...document.scripts].map(s => s.innerText).join('\n')
    const match = scripts.match(/https?:\/\/[^"' ]+\.mp4/)
    if (match) {
      return { title, url: match[0] }
    }

    return null
  })

  await browser.close()

  if (!data?.url) {
    throw new Error('Direct video URL tidak ditemukan')
  }

  return {
    videoUrl: data.url,
    fileName: `${data.title}.mp4`
  }
}
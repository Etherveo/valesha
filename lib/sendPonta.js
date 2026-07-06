import fs from 'fs'
import sharp from 'sharp'

async function resize(imageBuffer, width, height) {
  return await sharp(imageBuffer)
    .resize(width, height, { fit: 'cover' })
    .jpeg()
    .toBuffer()
}

export async function sendPonta(chat, caption, m, quoted) {
  let mentionedJid = [m.sender]

  this.sendMessage(chat, {
    document: fs.readFileSync("./thumbnail.jpg"),
    fileName: `- ${global.namebot} By ${global.author} -`,
    fileLength: '1',
    mimetype: 'application/msword',
    jpegThumbnail: await resize(fs.readFileSync('./src/bahan/ytta.jpg'), 350, 190),
    caption,
    contextInfo: {
      mentionedJid,
      forwardingScore: 99999999,
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: '120363199602506586@newsletter',
        serverMessageId: null,
        newsletterName: `© ${global.namebot} || ${global.author}`
      }
    }
  }, { quoted })
}

export default function setupPonta(conn) {
  conn.sendPonta = sendPonta.bind(conn)
}
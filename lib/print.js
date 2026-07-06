import { WAMessageStubType } from '@whiskeysockets/baileys'
import PhoneNumber from 'awesome-phonenumber'
import chalk from 'chalk'
import moment from 'moment-timezone'
import { watchFile } from 'fs'

const terminalImage = global.opts['img'] ? global.__require('terminal-image') : ''
const urlRegex = (await import('url-regex-safe')).default({ strict: false })

export default async function (m, conn = { user: {} }) {
  const _name = await conn.getName(m.sender)
  const sender = PhoneNumber('+' + m.sender.replace('@s.whatsapp.net', '')).getNumber('international') + (_name ? ' ~ ' + _name : '')
  const chat = await conn.getName(m.chat)
  const me = PhoneNumber('+' + (conn.user?.jid).replace('@s.whatsapp.net', '')).getNumber('international')
  const user = global.DATABASE.data.users[m.sender]
  let img

  try {
    if (global.opts['img'])
      img = /sticker|image/gi.test(m.mtype) ? await terminalImage.buffer(await m.download()) : false
  } catch (e) {
    console.error(e)
  }

  const filesize = calculateFileSize(m)
  const msgText = formatMessageContent(m)

  const gray = chalk.gray

  console.log(gray('\n╭─[ 📨 NEW MESSAGE LOG ]───────────────────────────'))
  console.log(`${gray('├─')} 🆔 Type       : ${m.mtype}`)
  console.log(`${gray('├─')} 👤 Sender     : ${sender}`)
  console.log(`${gray('├─')} 💬 Chat       : ${chat || 'Unknown'}`)
  console.log(`${gray('├─')} ⏰ Time       : ${formatTimestamp(m.messageTimestamp)}`)
  console.log(`${gray('├─')} 📦 Size       : ${filesize} (${formatFileSize(filesize)})`)
  console.log(`${gray('├─')} 🧪 Exp/Level  : ${user?.exp ?? '?'} / ${user?.level ?? '?'}`)
  console.log(`${gray('├─')} 🤖 Bot        : ${me} ~ ${conn.user.name}`)

  if (msgText) console.log(`${gray('├─')} 💌 Message    : ${msgText}`)

  if (m.isGroup && Array.isArray(m.messageStubParameters) && m.messageStubParameters.length) {
    const mentions = m.messageStubParameters.map(jid => {
      jid = conn.decodeJid(jid)
      const name = conn.getName(jid)
      return name ? PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international') + ' ~ ' + name : null
    }).filter(Boolean).join(', ')
    if (mentions) console.log(`${gray('├─')} 🧑‍🤝‍🧑 Mentioned  : ${mentions}`)
  }

  // Ekstrak pesan asli kalau terbungkus viewOnce dkk
  const realMsg = m.msg?.documentMessage || m.msg?.audioMessage || m.msg?.contactMessage || m.msg

  if (/document/i.test(m.mtype))
    console.log(`${gray('├─')} 📄 Document   : ${realMsg?.fileName || realMsg?.title || 'Unknown document'}`)
  else if (/contact/i.test(m.mtype))
    console.log(`${gray('├─')} 👥 Contact    : ${realMsg?.displayName || 'Unnamed Contact'}`)
  else if (/audio/i.test(m.mtype)) {
    const duration = realMsg?.seconds || 0
    console.log(`${gray('├─')} 🔉 ${realMsg?.ptt ? 'Voice Note ' : 'Audio'} : Duration ${formatDuration(duration)}`)
  }

  // PREV-LEGACY
  // if (/document/i.test(m.mtype))
  //   console.log(`${gray('├─')} 📄 Document   : ${m.msg.fileName || m.msg.displayName || 'Unknown document'}`)
  // else if (/contact/i.test(m.mtype))
  //   console.log(`${gray('├─')} 👥 Contact    : ${m.msg.displayName || 'Unnamed Contact'}`)
  // else if (/audio/i.test(m.mtype)) {
  //   const duration = m.msg.seconds
  //   console.log(`${gray('├─')} 🔉 ${m.msg.ptt ? 'Voice Note ' : 'Audio'} : Duration ${formatDuration(duration)}`)
  // }

  console.log(gray('╰────────────────────────────────────────────────'))

  if (img) console.log('\n' + img.trimEnd())
}

// PREV-LEGACY
// function calculateFileSize(m) {
//   return m.msg ?
//     m.msg.vcard?.length ??
//     m.msg.fileLength?.low ??
//     m.msg.fileLength ??
//     m.msg.axolotlSenderKeyDistributionMessage?.length ??
//     m.text?.length ??
//     0 :
//     m.text?.length ?? 0
// }

function calculateFileSize(m) {
  const msg = m.msg?.documentMessage || m.msg?.audioMessage || m.msg?.videoMessage || m.msg?.imageMessage || m.msg
  return msg ?
    msg.vcard?.length ??
    msg.fileLength?.low ??
    msg.fileLength ??
    msg.axolotlSenderKeyDistributionMessage?.length ??
    m.text?.length ??
    0 :
    m.text?.length ?? 0
}

function formatTimestamp(timestamp) {
  const time = timestamp?.low ?? timestamp ?? Math.floor(Date.now() / 1000)
  return moment.unix(time).tz('Asia/Jakarta').format('HH:mm')
}

function formatMessageType(type) {
  return type ? type.replace(/message$/i, '').replace(/^./, v => v.toUpperCase()) : ''
}

function formatFileSize(size) {
  return size === 0 ? '0 B' :
    (size / Math.pow(1000, Math.floor(Math.log(size) / Math.log(1000)))).toFixed(1) +
    ['', 'K', 'M', 'G', 'T'][Math.floor(Math.log(size) / Math.log(1000))] + 'B'
}

function formatMessageContent(m) {
  let text = m.text || m.caption || ''
  if (!text) return ''
  text = text.replace(/\u200e+/g, '')
  text = text.replace(urlRegex, url => url)

  const mdRegex = /(?<=(?:^|[\s\n])\S?)(?:([*_~])(.+?)\1|``````)(?=\S?(?:[\s\n]|$))/g
  text = text.replace(mdRegex, (_, type, txt, mono) => txt || mono)

  return text
}

function formatDuration(seconds) {
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
}

let file = global.__filename(import.meta.url)
watchFile(file, () => {
  console.log(chalk.gray("🔁 'lib/print.js' updated"))
})
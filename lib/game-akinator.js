import { Akinator } from "@aqul/akinator-api"

const getText = (m) =>
  m.text ||
  m.message?.conversation ||
  m.message?.extendedTextMessage?.text ||
  ""

const normalize = (text = "") =>
  text.toLowerCase().replace(/[^a-z0-9]/g, "").trim()

const answerMap = {
  ya: 0,
  yes: 0,
  y: 0,
  1: 0,

  tidak: 1,
  no: 1,
  n: 1,
  2: 1,

  tidaktahu: 2,
  dontknow: 2,
  idk: 2,
  3: 2,

  mungkin: 3,
  probably: 3,
  4: 3,

  mungkintidak: 4,
  probablynot: 4,
  5: 4,
}

const footer =
  `Reply pesan ini:\n` +
  `1 = Ya\n` +
  `2 = Tidak\n` +
  `3 = Tidak Tahu\n` +
  `4 = Mungkin\n` +
  `5 = Mungkin Tidak\n\n` +
  `> Sebutin Angka Nya!`

const sessions = new Map()

const handler = async (m, { conn, text }) => {
  const user = m.sender
  const command = normalize(text)

  if (command === "start") {
    if (sessions.has(user)) {
      return m.reply("⚠️ Masih ada sesi berjalan. Ketik *.akinator stop* dulu.")
    }

    const api = new Akinator({ region: "id", childMode: false })
    await api.start()

    sessions.set(user, api)

    return m.reply(
      `🤖 *Akinator Dimulai!*\n\n` +
      `❓ ${api.question}\n` +
      `📊 Progress: ${api.progress}%\n\n` +
      footer
    )
  }

  if (command === "stop") {
    sessions.delete(user)
    return m.reply("🛑 Game dihentikan.")
  }

  return m.reply("🎮 Ketik *.akinator start* untuk bermain.")
}

handler.before = async (m, { conn }) => {
  if (m.isBaileys) return
  if (/^[.\#!\/\\]/.test(getText(m))) return

  const user = m.sender
  if (!sessions.has(user)) return
  if (!m.quoted || m.quoted.sender !== conn.user.jid) return

  const api = sessions.get(user)
  const raw = getText(m)
  const input = normalize(raw)

  const answer = answerMap[input]

  if (answer === undefined) {
    return m.reply(`❌ Jawaban tidak valid.\n\n> Sebutin Angka 1-5 ya!`)
  }

  try {
    await api.answer(answer)

    if (api.isWin) {
      const name = api.sugestion_name
      const desc = api.sugestion_desc || ""
      const photo = api.sugestion_photo

      sessions.delete(user)

      if (!name) {
        return m.reply("❌ Aku belum bisa menebak karakternya.")
      }

      const result =
        `🎉 *Aku Tahu!* 🎉\n\n` +
        `👤 ${name}\n` +
        `📝 ${desc}`

      if (photo) {
        return conn.sendMessage(
          m.chat,
          { image: { url: photo }, caption: result },
          { quoted: m }
        )
      }

      return m.reply(result)
    }

    return m.reply(
      `❓ ${api.question}\n` +
      `📊 Progress: ${api.progress}%\n\n` +
      footer
    )
  } catch (e) {
    console.error(e)
    sessions.delete(user)
    return m.reply("❌ Terjadi kesalahan. Mulai ulang dengan .akinator start")
  }
}

handler.command = ["akinator"]
handler.help = ["akinator start", "akinator stop"]
handler.tags = ["game"]
handler.limit = true
handler.register = true

export default handler
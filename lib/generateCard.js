import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas'
import fetch from 'node-fetch'
import { xpRange } from './levelling.js'

// Load profile pic (URL or local path)
async function loadAvatar(src) {
  try {
    if (/^https?:\/\//.test(src)) {
      const res = await fetch(src)
      const buf = Buffer.from(await res.arrayBuffer())
      return await loadImage(buf)
    }
    return await loadImage(src)
  } catch {
    return await loadImage('./src/bahan/default.jpg')
  }
}

/**
 * Generate level-up card image
 * @param {object} opts
 * @param {string} opts.name        - Display name
 * @param {string} opts.role        - Rank/role string
 * @param {number} opts.level       - Current level
 * @param {number} opts.exp         - Current exp
 * @param {number} opts.eris        - Money/asset
 * @param {number} opts.limit       - Limit command (or -1 for unlimited)
 * @param {boolean} opts.premium    - Is premium user
 * @param {number} opts.premiumTime - Unix ms premium expire (0 = permanent if premium)
 * @param {string} opts.bio         - User bio text
 * @param {string} opts.wa          - WA number (without @s.whatsapp.net)
 * @param {string} opts.avatarSrc   - Avatar URL or path
 * @param {number} opts.multiplier  - XP multiplier
 * @returns {Promise<Buffer>}       - PNG buffer
 */
export async function generateLevelCard({
  name = 'User',
  role = 'Newbie',
  level = 1,
  exp = 0,
  eris = 0,
  limit = 10,
  premium = false,
  premiumTime = 0,
  bio = 'Tidak ada bio.',
  wa = '',
  avatarSrc = './src/bahan/default.jpg',
  multiplier = 1,
} = {}) {
  const W = 980, H = 490
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext('2d')

  // ── Background ───────────────────────────────────────────────────────────────
  ctx.fillStyle = '#0d1117'
  ctx.fillRect(0, 0, W, H)

  // Subtle grid lines
  ctx.strokeStyle = 'rgba(0,255,180,0.04)'
  ctx.lineWidth = 1
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }

  // Glow blobs
  const addGlow = (x, y, r, color) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, color)
    g.addColorStop(1, 'transparent')
    ctx.fillStyle = g
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }
  addGlow(200, 490, 220, 'rgba(0,255,180,0.07)')
  addGlow(750, 0, 260, 'rgba(0,120,255,0.06)')

  // Card border
  ctx.strokeStyle = 'rgba(0,255,180,0.15)'
  ctx.lineWidth = 1.5
  roundRect(ctx, 20, 20, W - 40, H - 40, 18, false, true)

  // ── Avatar (left panel) ───────────────────────────────────────────────────────
  const AX = 48, AY = 52, AW = 270, AH = 270
  const avatar = await loadAvatar(avatarSrc)

  // Avatar border glow
  ctx.shadowColor = 'rgba(0,255,180,0.4)'
  ctx.shadowBlur = 16
  ctx.strokeStyle = 'rgba(0,255,180,0.5)'
  ctx.lineWidth = 2
  roundRect(ctx, AX, AY, AW, AH, 14, false, true)
  ctx.shadowBlur = 0

  // Clip & draw avatar
  ctx.save()
  roundRect(ctx, AX, AY, AW, AH, 14, true, false)
  ctx.clip()
  ctx.drawImage(avatar, AX, AY, AW, AH)
  ctx.restore()

  // ── Asset Keuangan (bottom-left) ──────────────────────────────────────────────
  const BX = AX, BY = AY + AH + 22, BW = AW, BH = 90
  ctx.fillStyle = 'rgba(255,255,255,0.04)'
  roundRect(ctx, BX, BY, BW, BH, 10, true, false)
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 1
  roundRect(ctx, BX, BY, BW, BH, 10, false, true)

  ctx.fillStyle = '#8b9cb0'
  ctx.font = '500 13px monospace'
  ctx.fillText('ASSET KEUANGAN', BX + 18, BY + 24)

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 28px monospace'
  ctx.fillText(`Rp ${eris.toLocaleString('id-ID')}`, BX + 18, BY + 62)

  // ── Right Panel ───────────────────────────────────────────────────────────────
  const RX = AX + AW + 38
  const RW = W - RX - 48

  // Name
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 36px monospace'
  ctx.fillText(name.toUpperCase(), RX, 100)

  // Rank
  ctx.fillStyle = '#00e5a0'
  ctx.font = '500 16px monospace'
  ctx.fillText(`RANK: ${role}`, RX, 128)

  // Badge (top-right)
  const badgeLabel = premium ? 'SYS_ADMIN' : 'USER'
  const dotColor = premium ? '#ff3c78' : '#00bfff'
  const badgeW = 140, badgeH = 34, badgeX = W - 48 - badgeW, badgeY = 52
  ctx.fillStyle = 'rgba(255,255,255,0.06)'
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 20, true, false)
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'
  ctx.lineWidth = 1
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 20, false, true)
  ctx.fillStyle = '#aab4c0'
  ctx.font = '600 13px monospace'
  ctx.fillText(badgeLabel, badgeX + 14, badgeY + 22)
  ctx.fillStyle = dotColor
  ctx.shadowColor = dotColor
  ctx.shadowBlur = 8
  ctx.beginPath()
  ctx.arc(badgeX + badgeW - 16, badgeY + badgeH / 2, 7, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0

  // ── Level Ring + Stats row ────────────────────────────────────────────────────
  const ROW_Y = 160
  const RING_R = 52, RING_CX = RX + RING_R + 10, RING_CY = ROW_Y + RING_R + 10

  // XP progress
  const { min, xp, max } = xpRange(level, multiplier)
  const currentXp = exp - min
  const neededXp = xp
  const progress = Math.min(currentXp / Math.max(neededXp, 1), 1)

  // Ring background
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 10
  ctx.beginPath()
  ctx.arc(RING_CX, RING_CY, RING_R, 0, Math.PI * 2)
  ctx.stroke()

  // Ring progress arc (blue-to-cyan gradient)
  const startAngle = -Math.PI / 2
  const endAngle = startAngle + progress * Math.PI * 2
  const arcGrad = ctx.createLinearGradient(
    RING_CX - RING_R, RING_CY,
    RING_CX + RING_R, RING_CY
  )
  arcGrad.addColorStop(0, '#00bfff')
  arcGrad.addColorStop(1, '#a855f7')
  ctx.strokeStyle = arcGrad
  ctx.lineWidth = 10
  ctx.lineCap = 'round'
  ctx.shadowColor = '#00bfff'
  ctx.shadowBlur = 12
  ctx.beginPath()
  ctx.arc(RING_CX, RING_CY, RING_R, startAngle, endAngle)
  ctx.stroke()
  ctx.shadowBlur = 0
  ctx.lineCap = 'butt'

  // Level text inside ring
  ctx.fillStyle = '#8b9cb0'
  ctx.font = '500 12px monospace'
  ctx.textAlign = 'center'
  ctx.fillText('LEVEL', RING_CX, RING_CY - 8)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 28px monospace'
  ctx.fillText(level, RING_CX, RING_CY + 18)
  ctx.textAlign = 'left'

  // ── Stat Cards (right of ring) ────────────────────────────────────────────────
  const SC_X = RING_CX + RING_R + 28
  const SC_W = RX + RW - SC_X
  const SC_H = 58

  // LIMIT COMMAND
  drawStatCard(ctx, SC_X, ROW_Y, SC_W, SC_H, 'LIMIT COMMAND',
    limit <= 0 ? 'Unlimited' : String(limit),
    limit <= 0 ? '#00e5a0' : '#ffffff')

  // WAKTU AKSES
  let aksesVal = 'Free'
  let aksesColor = '#8b9cb0'
  if (premium) {
    if (premiumTime === 0 || premiumTime > Date.now() + 365 * 10 * 86400000) {
      aksesVal = 'Permanent'; aksesColor = '#00e5a0'
    } else {
      aksesVal = clockString(premiumTime - Date.now()); aksesColor = '#00bfff'
    }
  }
  drawStatCard(ctx, SC_X, ROW_Y + SC_H + 12, SC_W, SC_H, 'WAKTU AKSES', aksesVal, aksesColor)

  // ── DATA BIO ──────────────────────────────────────────────────────────────────
  const BIO_Y = ROW_Y + (RING_R + 10) * 2 + 28
  const BIO_H = 110
  ctx.fillStyle = 'rgba(255,255,255,0.04)'
  roundRect(ctx, RX, BIO_Y, RW, BIO_H, 10, true, false)
  ctx.strokeStyle = 'rgba(0,255,180,0.15)'
  ctx.lineWidth = 1
  roundRect(ctx, RX, BIO_Y, RW, BIO_H, 10, false, true)

  ctx.fillStyle = '#00e5a0'
  ctx.font = '600 12px monospace'
  ctx.fillText('DATA BIO', RX + 18, BIO_Y + 22)

  ctx.fillStyle = '#c9d4df'
  ctx.font = '500 15px monospace'
  const bioDisplay = bio.length > 80 ? bio.slice(0, 78) + '…' : bio
  ctx.fillText(`"${bioDisplay}"`, RX + 18, BIO_Y + 52)

  // Bottom row: hit count + wa link
  ctx.fillStyle = 'rgba(255,255,255,0.07)'
  roundRect(ctx, RX + 18, BIO_Y + 68, 100, 28, 6, true, false)
  ctx.fillStyle = '#aab4c0'
  ctx.font = '500 13px monospace'
  ctx.fillText(`${exp} HIT`, RX + 30, BIO_Y + 87)

  if (wa) {
    ctx.fillStyle = '#5a6c7d'
    ctx.font = '500 13px monospace'
    ctx.fillText(`NET: wa.me/${wa}`, RX + 140, BIO_Y + 87)
  }

  return canvas.toBuffer('image/png')
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function drawStatCard(ctx, x, y, w, h, label, value, valueColor) {
  ctx.fillStyle = 'rgba(255,255,255,0.04)'
  roundRect(ctx, x, y, w, h, 10, true, false)
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 1
  roundRect(ctx, x, y, w, h, 10, false, true)

  ctx.fillStyle = '#5a6c7d'
  ctx.font = '500 11px monospace'
  ctx.fillText(label, x + 16, y + 20)

  ctx.fillStyle = valueColor
  ctx.font = 'bold 20px monospace'
  ctx.fillText(value, x + 16, y + 46)
}

function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
  if (fill) ctx.fill()
  if (stroke) ctx.stroke()
}

function clockString(ms) {
  if (ms <= 0) return 'Expired'
  let d = Math.floor(ms / 86400000)
  let h = Math.floor(ms / 3600000) % 24
  let m = Math.floor(ms / 60000) % 60
  if (d > 0) return `${d}D ${h}H`
  if (h > 0) return `${h}H ${m}M`
  return `${m}M`
}
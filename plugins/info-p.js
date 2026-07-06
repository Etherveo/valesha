import { performance } from 'perf_hooks'
import { sizeFormatter } from 'human-readable'

let format = sizeFormatter({
  std: 'JEDEC',
  decimalPlaces: 2,
  keepTrailingZeroes: false,
  render: (literal, symbol) => `${literal} ${symbol}B`,
})

let handler = async (m, { conn }) => {
  let old = performance.now()
  let neww = performance.now()
  let speed = neww - old

  let msg = `🚩 Responds in ${speed} milliseconds`
  m.reply(msg)
}

handler.command = /^(p)$/i

export default handler
import moment from 'moment-timezone'

export async function generateMenu(conn, m, tagInput) {
	const tagAliasMap = { // Input user т tag plugin valid
		users: 'users',
		anime: 'anime',
		wibu: 'anime',
		ai: 'ai',
		audio: 'audio',
		cai: 'cai',
		clan: 'clan',
		downloader: 'downloader',
		unduhan: 'downloader',
		unduh: 'downloader',
		download: 'downloader',
		fun: 'fun',
		group: 'group',
		grup: 'group',
		game: 'game',
		gem: 'game',
		info: 'info',
		internet: 'internet',
		main: 'main',
		maker: 'maker',
		nsfw: 'nsfw',
		sange: 'nsfw',
		birahi: 'nsfw',
		own: 'owner',
		owner: 'owner',
		vip: 'premium',
		premium: 'premium',
		prefixless: 'prefixless',
		rpg: 'rpg',
		random: 'random',
		sticker: 'sticker',
		stiker: 'sticker',
		store: 'store',
		tools: 'tools',
		alat: 'tools',
		user: 'user',
		quotes: 'quotes',
	}

	const tagDisplayMap = { // Tag plugin т Display label di menu
		users: 'Users',
		anime: 'Anime',
		ai: 'AI',
		audio: 'Audio',
		cai: 'C-AI',
		clan: 'Clan',
		downloader: 'Downloader',
		fun: 'Fun',
		group: 'Group',
		game: 'Game',
		info: 'Info',
		internet: 'Internet',
		main: 'Main',
		maker: 'Maker',
		nsfw: 'NSFW',
		owner: 'Owner',
		premium: 'Premium',
		prefixless: 'Tanpa Prefix',
		rpg: 'RPG',
		random: 'Random',
		sticker: 'Sticker',
		store: 'Store',
		tools: 'Tools',
		user: 'User',
		quotes: 'Quotes',
	}
	
	const tagNumberMap = {
		1: 'ai',
		2: 'anime',
		3: 'audio',
		4: 'cai',
		5: 'clan',
		6: 'downloader',
		7: 'fun',
		8: 'game',
		9: 'group',
		10: 'info',
		11: 'internet',
		12: 'main',
		13: 'maker',
		14: 'nsfw',
		15: 'owner',
		16: 'prefixless',
		17: 'premium',
		18: 'quotes',
		19: 'random',
		20: 'rpg',
		21: 'sticker',
		22: 'store',
		23: 'tools',
		24: 'user',
		25: 'users'
	}
	
	const Sailoxmenu = `🐢 \`「Quick Navigation」\` 🐢

| • Anime (2)
| • Wibu (2)
| • AI (1)
| • Alat (23)
| • Audio (3)
| • Birahi (14)
| • CAI (4)
| • Clan (5)
| • Download (6)
| • Downloader (6)
| • Fun (7)
| • Game (8)
| • Gem (8)
| • Group (9)
| • Grup (9)
| • Info (10)
| • Internet (11)
| • Main (12)
| • Maker (13)
| • NSFW (14)
| • Own (15)
| • Owner (15)
| • Prefixless (16)
| • Premium (17)
| • Quotes (18)
| • Random (19)
| • RPG (20)
| • Sange (14)
| • Sticker (21)
| • Stiker (21)
| • Store (22)
| • Tools (23
| • Unduh (6)
| • Unduhan (6)
| • User (24)
| • Users (25)
| • VIP (17)
\nContoh:\n.menu anime\n.menu 2\n\n> Simple Navigation by Sailox`

	let selectedTag = ''
	if (!isNaN(tagInput)) {
		selectedTag = tagNumberMap[tagInput]
	} else {
		selectedTag = tagAliasMap[tagInput?.toLowerCase?.()]
	}

	const tagPlugin = selectedTag // nyari handler.tags
	const tagLabel = tagDisplayMap[tagPlugin]  // untuk ditampilkan ke user

	if (!tagPlugin || !tagLabel || tagInput === 'list') {
		return await conn.sendMessage(m.chat, {
			text: `${Sailoxmenu}`,
			contextInfo: {
				externalAdReply: {
					title: `Daftar Menu`,
					body: 'Selamat menikmati pelayanan kami',
					thumbnailUrl: global.slxthumb,
					sourceUrl: ``,
					mediaType: 1,
					renderLargerThumbnail: false
				}
			}
		}, { quoted: flox })
	}

	const help = Object.values(global.plugins).filter(p => !p.disabled).map(plugin => ({
		help: Array.isArray(plugin.help) ? plugin.help : [plugin.help],
		tags: Array.isArray(plugin.tags) ? plugin.tags : [plugin.tags],
		prefix: 'customPrefix' in plugin,
		limit: plugin.limit,
		premium: plugin.premium,
	}))

	const grub = help.filter(p => p.tags.includes(tagPlugin)).flatMap(p => p.help.map(cmd => `• ❳ ${cmd}`))

	const time = moment.tz('Asia/Jakarta').format('HH')
	let greet = time >= 18 ? 'Malam, kak' : time >= 15 ? 'Sore, kak' : time >= 10 ? 'Siang, kak' : time >= 4 ? 'Pagi, kak' : 'Udah boleh tidur, kak'
	const name = await conn.getName(m.sender)
	const more = String.fromCharCode(8206)
	const readMore = more.repeat(4001)
	
	const template = [
	`┈╌──┄── \`⌜ ${global.namebot} ⌟\` ──┄──╌┈`,
	`\n*%greet %name* 👋\nHari ini mau ngapain?`,
	`\n*Expand →* %readmore`,
	`\n ❆─❲ _*%category*_ ❳`,
	...grub,
	'╾─͙─͙─͙─͙─͙▢\n',
	global.wm
	].join('\n')

	const replace = {
		'%': '%',
		greet,
		name,
		category: tagLabel,
		readmore: readMore
	}

	const text = template.replace(new RegExp(`%(${Object.keys(replace).join('|')})`, 'g'), (_, key) => '' + replace[key])

	return text
}
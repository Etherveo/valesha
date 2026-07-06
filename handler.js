import { smsg } from './lib/simple.js'
import setupPonta from './lib/sendPonta.js'
import setupSailox from './lib/sendSailox.js'
import { muatGF } from './lib/ListGroupFile.js'
import { format } from 'util'
import { fileURLToPath } from 'url'
import path, { join } from 'path'
import { unwatchFile, watchFile, readFileSync } from 'fs'
import chalk from 'chalk'
import fs from 'fs'
import fetch from 'node-fetch'
import moment from 'moment-timezone'

const { proto, generateWAMessageFromContent } = await import('@whiskeysockets/baileys');
const isNumber = x => typeof x === 'number' && !isNaN(x)
const delay = ms => isNumber(ms) && new Promise(resolve => setTimeout(resolve, ms))

export async function handler(chatUpdate) {
    this.msgqueque = this.msgqueque || []
    if (!chatUpdate)
        return
    this.pushMessage(chatUpdate.messages).catch(console.error)
    let m = chatUpdate.messages[chatUpdate.messages.length - 1]
    
    global.img = 'https://files.catbox.moe/bu4mtb.jpg' 
    setupPonta(conn)
    setupSailox(conn)
    
    function checkPremiumAccess(m, isPrems, isGroup, conn) {
        const now = moment().tz('Asia/Jakarta');
        const hour = now.hour();
        const isRestrictedTime = hour >= 18 || hour < 6; // 18.00 WIB - 06.00 WIB
        const user = global.db.data.users[m.sender];

        // Inisialisasi kentanggoreng jika belum ada
        if (!isNumber(user.kentanggoreng)) {
            user.kentanggoreng = 0;
        }

        if (!isGroup && !isPrems && isRestrictedTime) {
            const lastWarning = user.kentanggoreng;
            const sixHoursInMs = 6 * 60 * 60 * 1000; // 6 jam dalam milidetik
            const currentTime = now.valueOf();

            // Cek apakah sudah lewat 6 jam sejak pesan terakhir
            if (currentTime - lastWarning < sixHoursInMs) {
                return { allowed: false }; // Tolak tanpa pesan jika belum 6 jam
            }

            // Reset kentanggoreng jika sudah lewat 6 jam
            user.kentanggoreng = currentTime;

            const teks = `Yah, Senpai! 😎 Yue cuma bisa dipake di private chat jam 18:00–06:00 WIB buat user premium.\nMau lanjut? Join grup atau upgrade premium, yuk! 🚀`;
            const msg = generateWAMessageFromContent(m.chat, {
                viewOnceMessage: {
                    message: {
                        interactiveMessage: {
                            body: { text: teks },
                            footer: { text: '🌟 Powered by PontaFly' },
                            nativeFlowMessage: {
                                buttons: [
                                    {
                                        name: 'cta_url',
                                        buttonParamsJson: `{"display_text":"💎 Buy Premium","url":"https://wa.me/6283857182374","merchant_url":"https://wa.me/6283857182374"}`
                                    },
                                    {
                                        name: 'cta_url',
                                        buttonParamsJson: `{"display_text":"🚀 Join Group","url":"https://chat.whatsapp.com/CZy0SzJKnfoLib7ICMjS4e","merchant_url":"https://chat.whatsapp.com/CZy0SzJKnfoLib7ICMjS4e"}`
                                    },
                                ]
                            }
                        }
                    }
                }
            }, { userJid: m.sender, quoted: m });

            return {
                allowed: false,
                sendMessage: async () => {
                    try {
                        await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id });
                    } catch (e) {
                        console.error(`[ERROR] Gagal kirim pesan interaktif: ${e.message}`);
                        await conn.sendMessage(m.chat, {
                            text: `${teks}\n\nJoin grup: https://chat.whatsapp.com/CZy0SzJKnfoLib7ICMjS4e\nBuy premium: https://wa.me/6283857182374`
                        }, { quoted: m });
                    }
                }
            };
        }

        return { allowed: true };
    }
    
    if (!m)
        return
    if (global.db.data == null)
        await global.loadDatabase()
    try {
        m = smsg(this, m) || m
        if (!m)
            return
        m.exp = 0
        m.limit = false
        try {
            let user = global.db.data.users[m.sender]
            if (typeof user !== "object")
                global.db.data.users[m.sender] = {}
            if (user) {
                if (!("myJid" in user)) user.myJid = ""
                if (!("myLid" in user)) user.myLid = ""
                if (!("gojekRegistered" in user)) user.gojekRegistered = false
                if (!("registered" in user)) user.registered = false
                if (!("sewa" in user)) user.sewa = false
                if (!isNumber(user.afk)) user.afk = -1
                if (!("autolevelup" in user)) user.autolevelup = false
                if (!isNumber(user.banExpires)) user.banExpires = 0
                if (!("banned" in user)) user.banned = false
                if (!("BannedReason" in user)) user.BannedReason = ""
                if (!("premium" in user)) user.premium = false
                if (!(user.premium)) user.premiumTime = 0
                if (!isNumber(user.regTime)) user.regTime = -1
                if (!isNumber(user.warning)) user.warning = 0
                if (!isNumber(user.warn)) user.warn = 0
                if (!isNumber(user.warn2)) user. warn2 = 0

                if (!("afkReason" in user)) user.afkReason = ""
                if (!("email" in user)) user.email = ""
                if (!("gojekName" in user)) user.gojekName = ""
                if (!("job" in user)) user.job = ""
                if (!("instagramName" in user)) user.instagramName = ""
                if (!("pasangan" in user)) user.pasangan = ""
                if (!("role" in user)) user.role = "Beginner"
                if (!("skill" in user)) user.skill = ""
                if (!("title" in user)) user.title = ""
                if (!("titles" in user)) user.titles = ""
                if (!("title2" in user)) user.title2 = ""
                if (!("title3" in user)) user.title3 = "Pemula"
                if (!("title4" in user)) user.title4 = ""
                if (!("twitterName" in user)) user.twitterName = ""
                if (!("waifu" in user)) user.waifu = ""
                if (!("youtubeName" in user)) user.youtubeName = ""

                if (!user.registered) {
                    if (!("name" in user)) user.name = m.name
                    if (!isNumber(user.age)) user.age = -1
                    if (!isNumber(user.regTime)) user.regTime = -1
                }
                
                if (!isNumber(user.atm)) user.atm = 0
                if (!isNumber(user.atmmasuk)) user.atmmasuk = 0
                if (!isNumber(user.atmout)) user.atmout = 0
                if (!isNumber(user.balance)) user.balance = 0
                if (!isNumber(user.bank)) user.bank = 0
                if (!isNumber(user.code)) user.code = 0
                if (!isNumber(user.coin)) user.coin = 0
                if (!isNumber(user.duit)) user.duit = 0
                if (!isNumber(user.erich)) user.erich = 0
                if (!isNumber(user.evax)) user.evax = 0
                if (!isNumber(user.fullatm)) user.fullatm = Infinity
                if (!isNumber(user.glimit)) user.glimit = 0
                if (!isNumber(user.money)) user.money = 0
                if (!isNumber(user.plimit)) user.plimit = 0
                if (!isNumber(user.saldo)) user.saldo = 0
                if (!isNumber(user.uang)) user.uang = 0
                if (!isNumber(user.vias)) user.vias = 0
                if (!isNumber(user.viney)) user.viney = 0
                if (!isNumber(user.wallet)) user.wallet = 0

                if (!isNumber(user.exp)) user.exp = 0
                if (!isNumber(user.health)) user.health = 500
                if (!isNumber(user.level)) user.level = 0
                if (!isNumber(user.limit)) user.limit = 100
                if (!isNumber(user.stamina)) user.stamina = 100
                if (!isNumber(user.intelligence)) user.intelligence = 0
                if (!isNumber(user.skill)) user.skill = 0
                if (!isNumber(user.skillrank)) user.skillrank = 0
                if (isNumber(user.strength)) user.strength = 0
                if (!user.premium) user.premiumTime = 0

                if (!isNumber(user.coal)) user.coal = 0
                if (!isNumber(user.clay)) user.clay = 0
                if (!isNumber(user.crystal)) user.crystal = 0
                if (!isNumber(user.diamond)) user.diamond = 0
                if (!isNumber(user.emerald)) user.emerald = 0
                if (!isNumber(user.gold)) user.gold = 0
                if (!isNumber(user.iron)) user.iron = 0
                if (!isNumber(user.rock)) user.rock = 0
                if (!isNumber(user.string)) user.string = 0
                if (!isNumber(user.trash)) user.trash = 0
                if (!isNumber(user.wood)) user.wood = 0

                if (!isNumber(user.aerozine)) user.aerozine = 0
                if (!isNumber(user.boxs)) user.boxs = 0
                if (!isNumber(user.common)) user.common = 0
                if (!isNumber(user.uncommon)) user.uncommon = 0
                if (!isNumber(user.cupon)) user.cupon = 0
                if (!isNumber(user.gardenboxs)) user.gardenboxs = 0
                if (!isNumber(user.legendary)) user.legendary = 0
                if (!isNumber(user.mythic)) user.mythic = 0
                if (!isNumber(user.petbox)) user.petbox = 0
                if (!isNumber(user.tiket)) user.tiket = 0
                if (!isNumber(user.tiketcn)) user.tiketcn = 1
                if (!isNumber(user.tiketcoin)) user.tiketcoin = 0

                if (!isNumber(user.attack)) user.attack = 0
                if (!isNumber(user.armor)) user.armor = 0
                if (!isNumber(user.armordurability)) user.armordurability = 0
                if (!isNumber(user.axe)) user.axe = 0
                if (!isNumber(user.axedurability)) user.axedurability = 0
                if (!isNumber(user.damage)) user.damage = 0
                if (!isNumber(user.katana)) user.katana = 0
                if (!isNumber(user.katanadurability)) user.katanadurability = 0
                if (!isNumber(user.mana)) user.mana = 0
                if (!isNumber(user.magicalitem)) user.magicalitem = 0
                if (!isNumber(user.magicalitemdurability)) user.magicalitemdurability = 0
                if (!isNumber(user.pancingan)) user.pancingan = 0
                if (!isNumber(user.pancingandurability)) user.pancingandurability = 0
                if (!isNumber(user.pistol)) user.pistol = 0
                if (!isNumber(user.peluru)) user.peluru = 0
                if (!isNumber(user.pickaxe)) user.pickaxe = 0
                if (!isNumber(user.pickaxedurability)) user.pickaxedurability = 0
                if (!isNumber(user.shield)) user.shield = 0
                if (!isNumber(user.shieldDurability)) user.shieldDurability= 0 
                if (!isNumber(user.sword)) user.sword = 0
                if (!isNumber(user.sworddurability)) user.sworddurability = 0
                if (!isNumber(user.umpan)) user.umpan = 0
                if (!isNumber(user.weapon)) user.weapon = 0
                if (!isNumber(user.weapondurability)) user.weapondurability = 0

                if (!isNumber(user.comments)) user.comments = 0
                if (!isNumber(user.lastLive)) user.lastLive = 0
                if (!isNumber(user.likes)) user.likes = 0
                if (!isNumber(user.livesTotal)) user.livesTotal = 0
                if (!isNumber(user.perangkat)) user.perangkat = 0
                if (!isNumber(user.playButton)) user.playButton = 0
                if (!isNumber(user.shares)) user.shares = 0
                if (!isNumber(user.subscribers)) user.subscribers = 0
                if (!isNumber(user.viewers)) user.viewers = 0
                if (!user.lives) user.lives = []

                if (!isNumber(user.commentsIG)) user.commentsIG = 0
                if (!isNumber(user.followers)) user.followers = 0
                if (!isNumber(user.lastPost)) user.lastPost = 0
                if (!isNumber(user.likesIG)) user.likesIG = 0
                if (!isNumber(user.postings)) user.postings = 0
                if (!isNumber(user.sharesIG)) user.sharesIG = 0
                if (!user.posts) user.posts = []

                if (!isNumber(user.followersTwt)) user.followersTwt = 0
                if (!isNumber(user.lastTweet)) user.lastTweet = 0
                if (!isNumber(user.likesTwt)) user.likesTwt = 0
                if (!isNumber(user.replies)) user.replies = 0
                if (!isNumber(user.retweets)) user.retweets = 0
                if (!isNumber(user.tweetings)) user.tweetings = 0
                if (!user.tweets) user.tweets = []

                if (!isNumber(user.armorpet)) user.armorpet = 0
                if (!isNumber(user.cat)) user.cat = 0
                if (!isNumber(user.catexp)) user.catexp = 0
                if (!isNumber(user.dog)) user.dog = 0
                if (!isNumber(user.dogexp)) user.dogexp = 0
                if (!isNumber(user.dragon)) user.dragon = 0
                if (!isNumber(user.dragonexp)) user.dragonexp = 0
                if (!isNumber(user.fox)) user.fox = 0
                if (!isNumber(user.foxexp)) user.foxexp = 0
                if (!isNumber(user.horse)) user.horse = 0
                if (!isNumber(user.horseexp)) user.horseexp = 0
                if (!isNumber(user.healthpet)) user.healthpet = 0
                if (!isNumber(user.pet)) user.pet = 0
                if (!isNumber(user.petfood)) user.petfood = 0
                if (!isNumber(user.rabbit)) user.rabbit = 0
                if (!isNumber(user.rabbitexp)) user.rabbitexp = 0
                if (!isNumber(user.ramuan)) user.ramuan = 0
                if (!isNumber(user.wolf)) user.wolf = 0
                if (!isNumber(user.wolfexp)) user.wolfexp = 0

                if (!isNumber(user.aqua)) user.aqua = 0
                if (!isNumber(user.ayambakar)) user.ayambakar = 0
                if (!isNumber(user.esteh)) user.esteh = 0
                if (!isNumber(user.feathers)) user.feathers = 0
                if (!isNumber(user.gadodado)) user.gadodado = 0
                if (!isNumber(user.herbal)) user.herbal = 0
                if (!isNumber(user.honey)) user.honey = 0
                if (!isNumber(user.ikanbakar)) user.ikanbakar = 0
                if (!isNumber(user.lelebakar)) user.lelebakar = 0
                if (!isNumber(user.mushrooms)) user.mushrooms = 0
                if (!isNumber(user.potion)) user.potion = 0
                if (!isNumber(user.steak)) user.steak = 0
                if (!isNumber(user.sushi)) user.sushi = 0

                if (!isNumber(user.anggur)) user.anggur = 0
                if (!isNumber(user.apel)) user.apel = 0
                if (!isNumber(user.jeruk)) user.jeruk = 0
                if (!isNumber(user.mangga)) user.mangga = 0
                if (!isNumber(user.pisang)) user.pisang = 0

                if (!isNumber(user.bibitanggur)) user.bibitanggur = 0
                if (!isNumber(user.bibitapel)) user.bibitapel = 0
                if (!isNumber(user.bibitjeruk)) user.bibitjeruk = 0
                if (!isNumber(user.bibitmangga)) user.bibitmangga = 0
                if (!isNumber(user.bibitpisang)) user.bibitpisang = 0
                if (!isNumber(user.ganja)) user.ganja = 0

                if (!isNumber(user.ayam)) user.ayam = 0
                if (!isNumber(user.babi)) user.babi = 0
                if (!isNumber(user.banteng)) user.banteng = 0
                if (!isNumber(user.beruang)) user.beruang = 0
                if (!isNumber(user.buaya)) user.buaya = 0
                if (!isNumber(user.gajah)) user.gajah = 0
                if (!isNumber(user.harimau)) user.harimau = 0
                if (!isNumber(user.kambing)) user.kambing = 0
                if (!isNumber(user.kerbau)) user.kerbau = 0
                if (!isNumber(user.monyet)) user.monyet = 0
                if (!isNumber(user.panda)) user.panda = 0
                if (!isNumber(user.sapi)) user.sapi = 0

                if (!isNumber(user.buntal)) user.buntal = 0
                if (!isNumber(user.cumi)) user.cumi = 0
                if (!isNumber(user.dory)) user.dory = 0
                if (!isNumber(user.gurita)) user.gurita = 0
                if (!isNumber(user.hiu)) user.hiu = 0
                if (!isNumber(user.ikan)) user.ikan = 0
                if (!isNumber(user.kepiting)) user.kepiting = 0
                if (!isNumber(user.lele)) user.lele = 0
                if (!isNumber(user.lobster)) user.lobster = 0
                if (!isNumber(user.lumba)) user.lumba = 0
                if (!isNumber(user.orca)) user.orca = 0
                if (!isNumber(user.paus)) user.paus = 0
                if (!isNumber(user.udang)) user.udang = 0

                if (!isNumber(user.plastik)) user.plastik = 0
                if (!isNumber(user.gelas)) user.gelas = 0
                if (!isNumber(user.botol)) user.botol = 0
                if (!isNumber(user.kaleng)) user.kaleng = 0
                if (!isNumber(user.kardus)) user.kardus = 0

                if (!isNumber(user.exphero)) user.exphero = 0
                if (!isNumber(user.hero)) user.hero = 0
                if (!isNumber(user.hp)) user.hp = 0
                if (!isNumber(user.joinlimit)) user.joinlimit = 0
                if (!isNumber(user.judilast)) user.judilast = 0
                if (!isNumber(user.laptop)) user.laptop = 0
                if (!isNumber(user.limitjoinfree)) user.limitjoinfree = 1
                if (!isNumber(user.lotre)) user.lotre = 0
                if (!isNumber(user.titles2)) user.titles2 = 0
                if (!isNumber(user.titles3)) user.titles3 = 0
                if (!isNumber(user.titles4)) user.titles4 = 0
                if (!isNumber(user.titles5)) user.titles5 = 0
                if (!isNumber(user.bouken)) user.bouken = 0
                if (!isNumber(user.pc)) user.pc = 0
                if (!isNumber(user.pointxp)) user.pointxp = 0
                if (!isNumber(user.trofi)) user.trofi = 0
                if (!isNumber(user.misi)) user.misi = 0

                if (!isNumber(user.gojekCooldown)) user.gojekCooldown = 0
                if (!isNumber(user.gojekBalance)) user.gojekBalance = 0
                if (!isNumber(user.gojekExp)) user.gojekExp = 0
                if (!isNumber(user.gojekLast)) user.gojekLast = 0
                if (!isNumber(user.gojekLevel)) user.gojekLevel = 1
                if (!isNumber(user.gojekProgress)) user.gojekProgress = 0

                if (!isNumber(user.pemburuLast)) user.pemburuLast = 0
                if (!isNumber(user.pemburuLevel)) user.pemburuLevel = 1
                if (!isNumber(user.pemburuProgres)) user.pemburuProgres = 0
                if (!isNumber(user.pemburuTargetKilled)) user.pemburuTargetKilled = 0
                if (!isNumber(user.pemburuTargetLoss)) user.pemburuTargetLoss = 0

                if (!isNumber(user.lastMaling)) user.lastMaling = 0
                if (!isNumber(user.lastadventure)) user.lastadventure = 0
                if (!isNumber(user.lastAirdrop)) user.lastAirdrop = 0
                if (!isNumber(user.lastAstronot)) user.lastAstronot = 0
                if (!isNumber(user.lastExploring)) user.lastExploring = 0
                if (!isNumber(user.lastbansos)) user.lastbansos = 0
                if (!isNumber(user.lastberbru)) user.lastberbru = 0
                if (!isNumber(user.lastbunuhi)) user.lastbunuhi = 0
                if (!isNumber(user.lastngewe)) user.lastngewe = 0
                if (!isNumber(user.lastberburu)) user.lastberburu = 0
                if (!isNumber(user.lastbunga)) user.lastbunga = 0
                if (!isNumber(user.lastberkebon)) user.lastberkebon = 0
                if (!isNumber(user.lastReset2)) user.lastReset2 = 0
                if (!isNumber(user.lastyoutuber)) user.lastyoutuber = 0
                if (!isNumber(user.lastduel)) user.lastduel = 0
                if (!isNumber(user.lastdagang)) user.lastdagang = 0
                if (!isNumber(user.lastbossbattle)) user.lastbossbattle = 0
                if (!isNumber(user.lastcodereg)) user.lastcodereg = 0
                if (!isNumber(user.lastTrade)) user.lastTrade = 0
                if (!isNumber(user.lastcode)) user.lastcode = 0
                if (!isNumber(user.lastclaim)) user.lastclaim = 0
                if (!isNumber(user.lastdungeon)) user.lastdungeon = 0
                if (!isNumber(user.lastdungeon1)) user.lastdungeon1 = 0
                if (!isNumber(user.lastdungeon2)) user.lastdungeon2 = 0
                if (!isNumber(user.lastdungeon3)) user.lastdungeon3 = 0
                if (!isNumber(user.lastdungeon4)) user.lastdungeon = 0
                if (!isNumber(user.lasteasy)) user.lasteasy = 0
                if (!isNumber(user.lastfight)) user.lastfight = 0
                if (!isNumber(user.lastfishing)) user.lastfishing = 0
                if (!isNumber(user.lastgift)) user.lastgift = 0
                if (!isNumber(user.lastgojek)) user.lastgojek = 0
                if (!isNumber(user.lasthourly)) user.lasthourly = 0
                if (!isNumber(user.lasthunt)) user.lasthunt = 0
                if (!isNumber(user.lastIstigfar)) user.lastIstigfar = 0
                if (!isNumber(user.lastjb)) user.lastjb = 0
                if (!isNumber(user.lastkill)) user.lastkill = 0
                if (!isNumber(user.lastlink)) user.lastlink = 0
                if (!isNumber(user.lastlumber)) user.lastlumber = 0
                if (!isNumber(user.lastmancingeasy)) user.lastmancingeasy = 0
                if (!isNumber(user.lastAstronot)) user.lastAstronot = 0
                if (!isNumber(user.lastmancingextreme)) user.lastmancingextreme = 0
                if (!isNumber(user.lastmancinghard)) user.lastmancinghard = 0
                if (!isNumber(user.lastmancingnormal)) user.lastmancingnormal = 0
                if (!isNumber(user.lastmining)) user.lastmining = 0
                if (!isNumber(user.lastmisi)) user.lastmisi = 0
                if (!isNumber(user.lastmission)) user.lastmission = 0
                if (!isNumber(user.lastmonthly)) user.lastmonthly = 0
                if (!isNumber(user.lastmulung)) user.lastmulung = 0
                if (!isNumber(user.lastbisnis)) user.lastbisnis = 0
                if (!isNumber(user.lastnambang)) user.lastnambang = 0
                if (!isNumber(user.lastnebang)) user.lastnebang = 0
                if (!isNumber(user.lastPolisi)) user.lastPolisi = 0
                if (!isNumber(user.lastopen)) user.lastopen = 0
                if (!isNumber(user.lastpekerjaan)) user.lastpekerjaan = 0
                if (!isNumber(user.lastpotionclaim)) user.lastpotionclaim = 0
                if (!isNumber(user.lastrampok)) user.lastrampok = 0
                if (!isNumber(user.lastramuanclaim)) user.lastramuanclaim = 0
                if (!isNumber(user.lastrob)) user.lastrob = 0
                if (!isNumber(user.lastroket)) user.lastroket = 0
                if (!isNumber(user.lastsda)) user.lastsda = 0
                if (!isNumber(user.lastseen)) user.lastseen = 0
                if (!isNumber(user.lastSetStatus)) user.lastSetStatus = 0
                if (!isNumber(user.lastsmancingclaim)) user.lastsmancingclaim = 0
                if (!isNumber(user.laststringclaim)) user.laststringclaim = 0
                if (!isNumber(user.lastswordclaim)) user.lastswordclaim = 0
                if (!isNumber(user.lastwar)) user.lastwar = 0
                if (!isNumber(user.lastwarpet)) user.lastwarpet = 0
                if (!isNumber(user.lastweaponclaim)) user.lastweaponclaim = 0
                if (!isNumber(user.lastweekly)) user.lastweekly = 0
                if (!isNumber(user.lastwork)) user.lastwork = 0
            } else global.db.data.users[m.sender] = {
                myJid: "",
                myLid: "",
                afk: -1,
                age: -1,
                registered: false,
                autolevelup: false,
                banExpires: 0,
                banned: false,
                BannedReason: "",
                name: m.name,
                premium: false,
                premiumTime: 0,
                regTime: -1,
                warning: 0,
                warn: 0,
                warn2: 0,
                gojekRegistered: false,
                sewa: false,

                afkReason: "",
                email: "",
                gojekName: "",
                job: "",
                instagramName: "",
                pasangan: "",
                role: "Beginner",
                skill: "",
                title: "",
                titles: "",
                title2: "",
                title3: "Pemula",
                title4: "",
                twitterName: "",
                waifu: "",
                youtubeName: "",

                atm: 0,
                atmmasuk: 0,
                atmout: 0,
                balance: 0,
                bank: 0,
                code: 0,
                coin: 0,
                duit: 0,
                evax: 0,
                erich: 0,
                fullatm: Infinity,
                glimit: 0,
                money: 0,
                plimit: 0,
                saldo: 0,
                uang: 0,
                vias: 0,
                viney: 0,
                wallet: 0,

                exp: 0,
                health: 500,
                level: 0,
                limit: 100,
                stamina: 100,
                intelligence: 0,
                skill: 0,
                skillrank: 0,
                strength: 0,

                coal: 0,
                clay: 0,
                crystal: 0,
                diamond: 0,
                emerald: 0,
                gold: 0,
                iron: 0,
                rock: 0,
                string: 0,
                trash: 0,
                wood: 0,

                aerozine: 0,
                boxs: 0,
                common: 0,
                uncommon: 0,
                cupon: 0,
                gardenboxs: 0,
                legendary: 0,
                mythic: 0,
                petbox: 0,
                tiket: 0,
                tiketcn: 1,
                tiketcoin: 0,

                attack: 0,
                armor: 0,
                armordurability :0,
                axe: 0,
                axedurability: 0,
                damage: 0,
                katana: 0,
                katanadurability: 0,
                mana: 0,
                magicalitem: 0,
                magicalitemdurability: 0,
                pancingan: 0,
                pancingandurability: 0,
                pistol: 0,
                peluru: 0,
                pickaxe: 0,
                pickaxedurability: 0,
                shield: 0,
                shieldDurability: 0,
                sword: 0,
                sworddurability: 0,
                umpan: 0,
                weapon: 0,
                weapondurability: 0,

                comments: 0,
                lastLive: 0,
                likes: 0,
                livesTotal: 0,
                perangkat: 0,
                playButton: 0,
                shares: 0,
                subscribers: 0,
                viewers: 0,
                lives: [],

                commentsIG: 0,
                followers: 0,
                lastPost: 0,
                likesIG: 0,
                postings: 0,
                sharesIG: 0,
                posts: [],

                followersTwt: 0,
                lastTweet: 0,
                likesTwt: 0,
                replies: 0,
                retweets: 0,
                tweetings: 0,
                tweets: [],

                armorpet: 0,
                cat: 0,
                catexp: 0,
                dog: 0,
                dogexp: 0,
                dragon: 0,
                dragonexp: 0,
                fox: 0,
                foxexp: 0,
                horse: 0,
                horseexp: 0,
                healthpet: 0,
                pet: 0,
                petfood: 0,
                rabbit: 0,
                rabbitexp: 0,
                ramuan: 0,
                wolf: 0,
                wolfexp: 0,

                aqua: 0,
                ayambakar: 0,
                esteh: 0,
                feathers: 0,
                gadodado: 0,
                herbal: 0,
                honey: 0,
                ikanbakar: 0,
                lelebakar: 0,
                mushrooms: 0,
                potion: 0,
                steak: 0,
                sushi: 0,

                anggur: 0,
                apel: 0,
                jeruk: 0,
                mangga: 0,
                pisang: 0,

                bibitanggur: 0,
                bibitapel: 0,
                bibitjeruk: 0,
                bibitmangga: 0,
                bibitpisang: 0,
                ganja: 0,

                ayam: 0,
                babi: 0,
                banteng: 0,
                beruang: 0,
                buaya: 0,
                gajah: 0,
                harimau: 0,
                kambing: 0,
                kerbau: 0,
                monyet: 0,
                panda: 0,
                sapi: 0,

                buntal: 0,
                cumi: 0,
                dory: 0,
                gurita: 0,
                hiu: 0,
                ikan: 0,
                kepiting: 0,
                lele: 0,
                lobster: 0,
                lumba: 0,
                orca: 0,
                paus: 0,
                udang: 0,

                plastik: 0,
                gelas: 0,
                botol: 0,
                kaleng: 0,
                kardus: 0,

                exphero: 0,
                hero: 0,
                hp: 0,
                joinlimit: 0,
                judilast: 0,
                laptop: 0,
                limitjoinfree: 1,
                lotre: 0,
                titles2: 0,
                titles3: 0,
                titles4: 0,
                titles5: 0,
                bouken: 0,
                pc: 0,
                pointxp: 0,
                trofi: 0,
                misi: 0,

                gojekCooldown: 0,
                gojekBalance: 0,
                gojekExp: 0,
                gojekLast: 0,
                gojekLevel: 1,
                gojekProgress: 0,

                pemburuLast: 0,
                pemburuLevel: 1,
                pemburuProgres: 0,
                pemburuTargetKilled: 0,
                pemburuTargetLoss: 0,

                lastMaling: 0,
                lastadventure: 0,
                lastAirdrop: 0,
                lastAstronot: 0,
                lastExploring: 0,
                lastbansos: 0,
                lastberbru: 0,
                lastbunuhi: 0,
                lastngewe: 0,
                lastberburu: 0,
                lastbunga: 0,
                lastberkebon: 0,
                lastReset2: 0,
                lastyoutuber: 0,
                lastduel: 0,
                lastdagang: 0,
                lastbossbattle: 0,
                lastcodereg: 0,
                lastTrade: 0,
                lastcode: 0,
                lastclaim: 0,
                lastdungeon: 0,
                lastdungeon1: 0,
                lastdungeon2: 0,
                lastdungeon3: 0,
                lastdungeon: 0,
                lasteasy: 0,
                lastfight: 0,
                lastfishing: 0,
                lastgift: 0,
                lastgojek: 0,
                lasthourly: 0,
                lasthunt: 0,
                lastIstigfar: 0,
                lastjb: 0,
                lastkill: 0,
                lastlink: 0,
                lastlumber: 0,
                lastmancingeasy: 0,
                lastAstronot: 0,
                lastmancingextreme: 0,
                lastmancinghard: 0,
                lastmancingnormal: 0,
                lastmining: 0,
                lastmisi: 0,
                lastmission: 0,
                lastmonthly: 0,
                lastmulung: 0,
                lastbisnis: 0,
                lastnambang: 0,
                lastnebang: 0,
                lastPolisi: 0,
                lastopen: 0,
                lastpekerjaan: 0,
                lastpotionclaim: 0,
                lastrampok: 0,
                lastramuanclaim: 0,
                lastrob: 0,
                lastroket: 0,
                lastsda : 0,
                lastseen: 0,
                lastSetStatus: 0,
                lastsmancingclaim: 0,
                laststringclaim: 0,
                lastswordclaim: 0,
                lastwar: 0,
                lastwarpet: 0,
                lastweaponclaim: 0,
                lastweekly: 0,
                lastwork: 0
            }

            let chat = global.db.data.chats[m.chat]
            if (typeof chat !== "object")
                global.db.data.chats[m.chat] = {}
            if (chat) {
                if (!('animeupdate' in chat))
                    chat.animeupdate = false
                if (!('isBanned' in chat))
                    chat.isBanned = true
                if (!('backupsc' in chat))
                    chat.backupsc = false
                if (!('myanime' in chat))
                    chat.myanime = false
                if (!('antiwame' in chat))
                    chat.antiwame = false         
                if (!('antiLink' in chat))
                    chat.antiLink = false
                if (!('antiLinkAll' in chat))
                    chat.antiLinkAll = false
                if (!('antiTagStatus' in chat))
                    chat.antiTagStatus = false
                if (!('antiLottie' in chat))
                    chat.antiLottie = false
                if (!('antiCallGroup' in chat))
                    chat.antiCallGroup = false
                if (!('autolevelup' in chat))
                    chat.autolevelup = false
                if (!('antiBokep' in chat))
                    chat.antiBokep = false
                if (!('antiLinkGc' in chat))           
                    chat.antiLinkGc = false
                if (!('antiLinkYt' in chat))
                    chat.antiLinkYt = false
                if (!('antiLinkTik' in chat))
                    chat.antiLinkTik = false
                if (!('antiLinkIg' in chat)) 
                    chat.antiLinkIg = false
                if (!('antiLinkTel' in chat)) 
                    chat.antiLinkTel = false
                if (!('antiLinkFb' in chat)) 
                    chat.antiLinkFb = false
                if (!('antiLinkHttp' in chat)) 
                    chat.antiLinkHttp = false
                if (!('antiSpam' in chat)) 
                    chat.antiSpam = false
                if (!('antiVirtex' in chat)) 
                    chat.antiVirtex = false
                if (!('antiStiker' in chat)) 
                    chat.antiSticker = false
                if (!('virtex' in chat ))
                    chat.virtex = false 
                if (!('antiToxic' in chat)) 
                    chat.antiToxic = false
                if (!('anticall' in chat))
                    chat.anticall = false
                if (!('welcome' in chat))
                    chat.welcome = false
                if (!('autoJoin' in chat))
                    chat.autoJoin = false
                if (!('detect' in chat))
                    chat.detect = false
                if (!('sWelcome' in chat))
                    chat.sWelcome = ''
                if (!('sBye' in chat))
                    chat.sBye = ''
                if (!('sPromote' in chat))
                    chat.sPromote = ''
                if (!('sDemote' in chat))
                    chat.sDemote = ''
                if (!('delete' in chat))
                    chat.delete = false
                if (!('viewonce' in chat))
                    chat.viewonce = false
                if (!('simi' in chat))
                    chat.simi = false
                if (!('autoread' in chat)) 
                    chat.autoread = false
                if (!('nsfw' in chat))
                    chat.nsfw = false
                if (!('game' in chat))
                    chat.game = false
                if (!('rpg' in chat))
                    chat.rpg = false
                if (!('premnsfw' in chat))
                    chat.premnsfw = false
                if (!isNumber(chat.expired))
                    chat.expired = 0
            } else
                global.db.data.chats[m.chat] = {
                    animeupdate: false,
                    isBanned: true,
                    backupsc: false,
                    myanime: false,
                    antiwame: false,
                    antiLink: false,
                    antiLinkAll: false,
                    antitagStatus: false,
                    antiLottie: false,
                    antiCallGroup: false,
                    autolevelup: false,
                    antiBokep: false,
                    antiLinkGc: false,
	                antiLinkTik: false,          
	                antiLinkTel: false,
	                antiLinkIg: false,
	                antiLinkFb: false,
	                antiLinkHttp: false,
	                antiLinkYt: false,
	                antiSpam: false,
	                antiStiker: false,
	                antiVirtex: false,
                    virtex: false,
                    autoJoin: false,
                    autoread: false,
	                antiToxic: false,
	                anticall: false,
                    welcome: false,
                    autornsfw: false,
                    detect: false,
                    sWelcome: '',
                    sBye: '',
                    sPromote: '',
                    sDemote: '',
                    delete: false,
                    viewonce: false,
                    simi: false,
                    expired: 0,
                    nsfw: false,
                    game: false,
                    rpg: false,
                    premnsfw: false,
                }
                let akinator = global.db.data.users[m.sender].akinator
			if (typeof akinator !== 'object')
				global.db.data.users[m.sender].akinator = {}
			if (akinator) {
				if (!('sesi' in akinator))
					akinator.sesi = false
				if (!('server' in akinator))
					akinator.server = null
				if (!('frontaddr' in akinator))
					akinator.frontaddr = null
				if (!('session' in akinator))
					akinator.session = null
				if (!('signature' in akinator))
					akinator.signature = null
				if (!('question' in akinator))
					akinator.question = null
				if (!('progression' in akinator))
					akinator.progression = null
				if (!('step' in akinator))
					akinator.step = null
				if (!('soal' in akinator))
					akinator.soal = null
			} else
				global.db.data.users[m.sender].akinator = {
					sesi: false,
					server: null,
					frontaddr: null,
					session: null,
					signature: null,
					question: null,
					progression: null,
					step: null, 
					soal: null
				}
            let settings = global.db.data.settings[this.user.jid]
            if (typeof settings !== "object") global.db.data.settings[this.user.jid] = {}
            if (settings) {
                if (!("self" in settings)) settings.self = false
                if (!("autoread" in settings)) settings.autoread = false
                if (!("restrict" in settings)) settings.restrict = false
                if (!("jadibot" in settings)) settings.jadibot = false
                if (!("autorestart" in settings)) settings.autorestart = true
                if (!("cleartmp" in settings)) settings.lastcleartmp = 0
                if (!("clearmedia" in settings)) settings.lastclearmedia = 0
                if (!("restartDB" in settings)) settings.restartDB = 0
                if (!("status" in settings)) settings.status = 0
                if (!("backupsc" in settings)) settings.backupsc= false
             
            } else global.db.data.settings[this.user.jid] = {
                self: false,
                autoread: false,
                jadibot: false,
                restrict: false,
                autorestart: true,
                restartDB: 0,
                lastcleartmp: 0,
                lastclearmedia: 0,
                backupsc: false,
                status: 0
            }
        } catch (e) {
            console.error(e)
        }
        if (opts['autoread']) await this.readMessages([m.key])
        if (opts['nyimak'])
            return
        // Pengecekan khusus mode self
        const isSailox = global.owner
        .map(([number]) => number.replace(/[^0-9]/g, '') + '@s.whatsapp.net') 
        .includes(m.sender)

        if (!isSailox && !m.fromMe && opts['self']) 
            return
        if (opts['pconly'] && m.chat.endsWith('g.us'))
            return
        if (opts['gconly'] && !m.chat.endsWith('g.us'))
            return
        if (opts['swonly'] && m.chat !== 'status@broadcast')
            return
        if (typeof m.text !== 'string')
            m.text = ''
        
        if (m.isBaileys) return
        
        // Converter ke JID WA biasa
        const jidS = (v) => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
        // Converter ke JID LID
        const jidLid = (v) => v.replace(/[^0-9]/g, '') + '@lid'

        const isFounder = (global.founder || []).some(([n]) => m.sender === n.replace(/\D/g, '') + '@lid') || m.fromMe

        // ROwner (Real Owner)
        const isROwner = isFounder || [
        conn.decodeJid(global.conn.user.id),
        ...global.rowner.map(([number]) => jidS(number)),
        ...global.founder.map(([number]) => jidLid(number))
        ].includes(m.sender)

        const isOwner = isROwner || [
            conn.decodeJid(global.conn.user.id),
            ...global.owner.map(([number]) => jidS(number)),
            ...global.ownerLid.map(([number]) => jidLid(number))
            ].includes(m.sender) || m.fromMe

        // Mods (Moderator)
        const isMods = isOwner || global.mods
        .map(v => jidS(Array.isArray(v) ? v[0] : v)) // Mods default pakai nomor WA aja
        .includes(m.sender)
        const isPrems = isROwner || isOwner || isMods || db.data.users[m.sender].premiumTime > 0

        let grupKhusus = muatGF()
        
        if (m.isGroup && grupKhusus.includes(m.chat) && !isROwner)
            return

        if (opts['queque'] && m.text && !(isMods || isPrems)) {
            let queque = this.msgqueque, time = 1000 * 5
            const previousID = queque[queque.length - 1]
            queque.push(m.id || m.key.id)
            setInterval(async function () {
                if (queque.indexOf(previousID) === -1) clearInterval(this)
                await delay(time)
            }, time)
        }

        if (m.isBaileys)
            return
        m.exp += Math.ceil(Math.random() * 10)

        let usedPrefix
        let _user = global.db.data && global.db.data.users && global.db.data.users[m.sender]

        const groupMetadata = m.isGroup 
        ? await conn.groupMetadata(m.chat).catch(_ => ({})) 
        : {}

        const participants = m.isGroup ? groupMetadata.participants || [] : []

        function isAdminRole(role) {
        return role === 'admin' || role === 'superadmin'
        }

        const user = participants.find(u => 
        [u.id, u.jid, u.lid].includes(m.sender)
        ) || {}

        const bot = participants.find(u => 
        [u.id, u.jid, u.lid].includes(conn.decodeJid(conn.user.id))
        ) || {}

        const isRAdmin   = user?.admin === 'superadmin'
        const isAdmin    = isAdminRole(user?.admin)
        const isBotAdmin = isAdminRole(bot?.admin)

        const ___dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), './plugins')
        for (let name in global.plugins) {
            let plugin = global.plugins[name]
            if (!plugin)
                continue
            if (plugin.disabled)
                continue
            const __filename = join(___dirname, name)
            if (typeof plugin.all === 'function') {
                try {
                    await plugin.all.call(this, m, {
                        chatUpdate,
                        __dirname: ___dirname,
                        __filename
                    })
                } catch (e) {
                   
                    console.error(e)
                    for (let [jid] of global.owner.filter(([number, _, isDeveloper]) => isDeveloper && number)) {
                        let data = (await conn.onWhatsApp(jid))[0] || {}
                        if (data.exists)
                            m.reply(`*🗂️ Plugin:* ${name}\n*👤 Sender:* ${m.sender}\n*💬 Chat:* ${m.chat}\n*💻 Command:* ${m.text}\n\n\${format(e)}`.trim(), data.jid)
                    }
                }
            }
            if (!opts['restrict'])
                if (plugin.tags && plugin.tags.includes('admin')) {

                    continue
                }
            const str2Regex = str => str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
            let _prefix = plugin.customPrefix ? plugin.customPrefix : conn.prefix ? conn.prefix : global.prefix
            let match = (_prefix instanceof RegExp ? 
                [[_prefix.exec(m.text), _prefix]] :
                Array.isArray(_prefix) ? 
                    _prefix.map(p => {
                        let re = p instanceof RegExp ? 
                            p :
                            new RegExp(str2Regex(p))
                        return [re.exec(m.text), re]
                    }) :
                    typeof _prefix === 'string' ? 
                        [[new RegExp(str2Regex(_prefix)).exec(m.text), new RegExp(str2Regex(_prefix))]] :
                        [[[], new RegExp]]
            ).find(p => p[1])
            if (typeof plugin.before === 'function') {
                if (await plugin.before.call(this, m, {
                    match,
                    conn: this,
                    participants,
                    groupMetadata,
                    user,
                    bot,
                    isROwner,
                    isOwner,
                    isRAdmin,
                    isAdmin,
                    isBotAdmin,
                    isPrems,
                    chatUpdate,
                    __dirname: ___dirname,
                    __filename
                }))
                    continue
            }
            if (typeof plugin !== 'function')
                continue
            if ((usedPrefix = (match[0] || '')[0])) {
                let noPrefix = m.text.replace(usedPrefix, '')
                let [command, ...args] = noPrefix.trim().split` `.filter(v => v)
                args = args || []
                let _args = noPrefix.trim().split` `.slice(1)
                let text = _args.join` `
                
                command = (command || '').toLowerCase()
                let fail = plugin.fail || global.dfail 
                let isAccept = plugin.command instanceof RegExp ? 
                    plugin.command.test(command) :
                    Array.isArray(plugin.command) ? 
                        plugin.command.some(cmd => cmd instanceof RegExp ? 
                            cmd.test(command) :
                            cmd === command
                        ) :
                        typeof plugin.command === 'string' ? 
                            plugin.command === command :
                            false

                if (!isAccept)
                    continue
                m.plugin = name
                // Pengecekan apakah pengirim adalah owner
                const isOwner = global.owner
                .map(([number]) => number.replace(/[^0-9]/g, '') + '@s.whatsapp.net')
                .includes(m.sender);

                // Pengecekan akses fitur
                if (m.chat in global.db.data.chats || m.sender in global.db.data.users) {
                    let chat = global.db.data.chats[m.chat];
                    let user = global.db.data.users[m.sender];
                    if (!isOwner) { // Hanya cek banned untuk non-owner
                        if (name != 'owner-unbanchat.js' && name != 'owner-exec.js' && name != 'owner-exec2.js' && name != 'tool-delete.js' && chat?.isBanned) {
                            return;
                        }
                        if (name != 'owner-unbanuser.js' && user?.banned) {
                            return;
                        }
                    }
                }
                const jidS = number => `${number}@s.whatsapp.net`
                const jidLid = number => `${number}@lid`

                const isSailox = [
                conn.decodeJid(global.conn.user.id),
                ...global.ownerv2.flatMap(num => {
                    const digits = String(num).replace(/\D/g, '')
                    if (!digits) return []
                    return digits.length > 13 
                    ? [jidS(digits), jidLid(digits)] 
                    : [jidS(digits)]
                })
                ].includes(m.sender)

                let finalOwner = Boolean(isOwner) || isSailox
                let finalROwner = Boolean(isROwner) || isSailox

                if (plugin.rowner && plugin.owner && !(finalROwner || finalOwner)) { 
                fail('owner', m, this)
                continue
                }
                if (plugin.rowner && !finalROwner) { 
                fail('rowner', m, this)
                continue
                }
                if (plugin.owner && !finalOwner) { 
                fail('owner', m, this)
                continue
                }
                if (plugin.maintenance && !isOwner) { 
                    fail('maintenance', m, this)
                    continue
                }
                if (plugin.mods && !isMods) { 
                    fail('moderator', m, this)
                    continue
                }
                if (plugin.premium && !isPrems) {
                    fail('premium', m, this)
                    continue
                }
                if (plugin.group && !m.isGroup) { 
                    fail('group', m, this)
                    continue
                } else if (plugin.botAdmin && !isBotAdmin) { 
                    fail('botAdmin', m, this)
                    continue
                } else if (plugin.admin && !isAdmin) { 
                    fail('admin', m, this)
                    continue
                }
                if (plugin.private && m.isGroup) { 
                    fail('private', m, this)
                    continue
                }
                if (plugin.register == true && _user.registered == false && !isOwner) {
                    fail('unreg', m, this)
                    continue
                }
                if (plugin.rpg == true) {
                    if (!global.db.data.chats[m.chat].rpg) {
                        fail('rpg', m, this)
                        continue
                    }
                    if (_user.registered == false) {
                        fail('unreg', m, this)
                        continue
                    }
                    if (!m.isGroup) {
                        fail('group', m, this)
                        continue
                    }
                }
                if (plugin.game == true && !global.db.data.chats[m.chat].game) {
                    if (m.isGroup) {
                        fail('game', m, this)
                        continue
                    }
                }
                if (plugin.nsfw == true && !global.db.data.chats[m.chat].nsfw) {
                    if (m.isGroup) {
                        fail('nsfw', m, this)
                        continue
                    }
                }
                m.isCommand = true
                let xp = "exp" in plugin ? parseInt(plugin.exp) : 17 
                if (xp > 200)
                    this.reply(m.chat, `[🚩] *Looks Like You're Cheating Using a Calculator*\n\n • .shop buy limit\n • .buylimit\n\nCheat Limit /ngechit`, )
                else 
                m.exp += xp
                if (!isPrems && plugin.limit && global.db.data.users[m.sender].limit < plugin.limit * 1) {
                let limitabis = `🔑 *Limit kamu habis. Sebagian fitur terkunci*\n\nKamu bisa beli premium untuk bermain bot tanpa limit\n.premium\n> untuk membeli premium\n\nKamu bisa ambil limit gratis dengan cara\n.freelimit\n> untuk mendapatkan limit gratis`;

                conn.sendMessage(m.chat, {
                    text: limitabis,
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363417728417511@newsletter',
                            serverMessageId: null,
                            newsletterName: 'VeLoX Official'
                        }
                    }
                }, { quoted: m });

                continue;
        }
                if (plugin.level > _user.level) {
                    this.reply(m.chat, `*${plugin.level}* level required to use this command. Your level *${_user.level}*`,)
                    continue 
                }
                let extra = {
                    match,
                    usedPrefix,
                    noPrefix,
                    _args,
                    args,
                    command,
                    text,
                    conn: this,
                    participants,
                    groupMetadata,
                    user,
                    bot,
                    isROwner,
                    isOwner,
                    isRAdmin,
                    isAdmin,
                    isBotAdmin,
                    isPrems,
                    chatUpdate,
                    __dirname: ___dirname,
                    __filename
                }
                try {
                    await plugin.call(this, m, extra)
                    if (!isPrems)
                        m.limit = m.limit || plugin.limit || false
                } catch (e) {
                   
                    m.error = e
                    console.error(e)
                    if (e) {
                        let text = format(e)
                        for (let key of Object.values(global.APIKeys))
                            text = text.replace(new RegExp(key, "g"), "#HIDDEN#")
                        if (e.name)
                            for (let [jid] of global.rowner.filter(([number, _]) => number)) {
                                let data = (await conn.onWhatsApp(jid))[0] || {}
                                if (data.exists)
                                    return m.reply(`*🗂️ Plugins:* ${m.plugin}\n*👤 Sender:* ${m.sender}\n*💬 Chat:* ${m.chat}\n*💻 Command:* ${usedPrefix}${command} ${args.join(" ")}\n📄 *Error Logs:*\n\n${text}`.trim(), data.jid)
                            }
                        m.reply(text)
                    }
                } finally {
                  
                    if (typeof plugin.after === "function") {
                        try {
                            await plugin.after.call(this, m, extra)
                        } catch (e) {
                            console.error(e)
                        }
                    }
                }
                break
            }
        }
    } catch (e) {
        console.error(e)
    } finally {
        if (opts['queque'] && m.text) {
            const quequeIndex = this.msgqueque.indexOf(m.id || m.key.id)
            if (quequeIndex !== -1)
                this.msgqueque.splice(quequeIndex, 1)
        }
     
        let user, stats = global.db.data.stats
        if (m) {
            if (m.sender && (user = global.db.data.users[m.sender])) {
                user.exp += m.exp
                user.limit -= m.limit * 1
            }

            let stat
            if (m.plugin) {
                let now = +new Date
                if (m.plugin in stats) {
                    stat = stats[m.plugin]
                    if (!isNumber(stat.total))
                        stat.total = 1
                    if (!isNumber(stat.success))
                        stat.success = m.error != null ? 0 : 1
                    if (!isNumber(stat.last))
                        stat.last = now
                    if (!isNumber(stat.lastSuccess))
                        stat.lastSuccess = m.error != null ? 0 : now
                } else
                    stat = stats[m.plugin] = {
                        total: 1,
                        success: m.error != null ? 0 : 1,
                        last: now,
                        lastSuccess: m.error != null ? 0 : now
                    }
                stat.total += 1
                stat.last = now
                if (m.error == null) {
                    stat.success += 1
                    stat.lastSuccess = now
                }
            }
        }

        try {
            if (!opts['noprint']) await (await import(`./lib/print.js`)).default(m, this)
        } catch (e) {
            console.log(m, m.quoted, e)
        }
        if (opts['autoread'])
            await this.chatRead(m.chat, m.isGroup ? m.sender : undefined, m.id || m.key.id).catch(() => { })
    }
}

export async function participantsUpdate({ id, participants, action }) {
    if (opts['self'])
        return
    if (this.isInit)
        return
    if (global.db.data == null)
        await loadDatabase()
    let chat = global.db.data.chats[id] || {}
    let text = ''
    let mentionedJid = [id]
    switch (action) {
    case 'add':
    case 'remove':
        if (chat.welcome) {
            let groupMetadata = await this.groupMetadata(id) || (conn.chats[id] || {}).metadata
            for (let user of participants) {
                let nickgc = await conn.getName(id)
                let pp = 'https://cloud.codeteam.my.id/files/U8GOOZV5P.jpg'
                let ppgc = 'https://cloud.codeteam.my.id/files/U8GOOZV5P.jpg'
                try {
                    pp = await this.profilePictureUrl(user, 'image')
                    ppgc = await this.profilePictureUrl(id, 'image')
                } catch (e) {
                } finally {
                    // Format teks welcome atau goodbye
                    text = (action === 'add' ? 
                        (chat.sWelcome || this.welcome || conn.welcome || 'Welcome, @user!').replace('@subject', await this.getName(id)).replace('@desc', groupMetadata.desc?.toString() || 'unknow') :
                        (chat.sBye || this.bye || conn.bye || 'Bye, @user!')).replace('@user', '@' + user.split('@')[0])
                    
                    // Kirim pesan teks dengan thumbnail
                    await this.sendMessage(id, {
                        text: text,
                        thumbnail: await (await this.getFile(ppgc)).data,
                        contextInfo: {
                            mentionedJid: [user],
                            externalAdReply: {
                                showAdAttribution: false,
                                title: '✨ Group Notifications',
                                body: 'Whatsapp',
                                // thumbnail: await (await fetch(ppgc)).buffer(), // PREV-LEGACY
                                thumbnail: Buffer.from(await (await fetch(ppgc)).arrayBuffer()),
                                sourceUrl: ``,
                                mediaType: 1,
                                renderLargerThumbnail: true
                            }
                        }
                    })
                }
            }
        }
        break
    case 'promote':
        text = (chat.sPromote || this.spromote || conn.spromote || '@user ```is now Admin```')
    case 'demote':
        if (!text)
            text = (chat.sDemote || this.sdemote || conn.sdemote || '@user ```is no longer Admin```')
        text = text.replace('@user', '@' + participants[0].split('@')[0])
        if (chat.detect)
            this.sendMessage(id, { text, mentions: this.parseMention(text) })
        break
}
}

export async function groupsUpdate(groupsUpdate) {
    if (opts['self'])
        return
    for (const groupUpdate of groupsUpdate) {
        const id = groupUpdate.id
        if (!id) continue
        let chats = global.db.data.chats[id], text = ''
        if (!chats?.detect) continue
        if (groupUpdate.desc) text = (chats.sDesc || this.sDesc || conn.sDesc || '```Description has been changed to```\n@desc').replace('@desc', groupUpdate.desc)
        if (groupUpdate.subject) text = (chats.sSubject || this.sSubject || conn.sSubject || '```Subject has been changed to```\n@subject').replace('@subject', groupUpdate.subject)
        if (groupUpdate.icon) text = (chats.sIcon || this.sIcon || conn.sIcon || '```Icon has been changed to```').replace('@icon', groupUpdate.icon)
        if (groupUpdate.revoke) text = (chats.sRevoke || this.sRevoke || conn.sRevoke || '```Group link has been changed to```\n@revoke').replace('@revoke', groupUpdate.revoke)
        if (!text) continue
        await this.sendMessage(id, { text, mentions: this.parseMention(text) })
    }
}

export async function deleteUpdate(message) {
    try {
        const { fromMe, id, participant } = message
        if (!fromMe)
            return
        let msg = this.serializeM(this.loadMessage(id))
        if (!msg)
            return
        let chat = global.db.data.chats[msg.chat] || {}
        if (chat.delete || !chat.delete)
            return
// conn.sendMessage('147368951459939@lid', {
// text: `🚩 Detected *@${participant.split`@`[0]}* has deleted the message.`,
// contextInfo: {
// externalAdReply: {
// title: 'Anti-Delete',
// thumbnailUrl: global.thumb,
// sourceUrl: null,
// mediaType: 1,
// renderLargerThumbnail: true
// }}}, { quoted: msg}) 
//         this.copyNForward(msg.chat, msg, false).catch(e => console.log(e, msg))
    } catch (e) {
        console.error(e)
    }
}

global.dfail = async (type, m, mufar) => {
	const userTag = `👋 Hai @${m.sender.split("@")[0]}\n`
	const emoji = {
		general: '⚙️',
        rowner : '👑',
		owner: '👑',
		moderator: '🛡️',
		premium: '💎',
		group: '👥',
		maintenance: '🧑‍💻',
		private: '📱',
		admin: '👤',
		botAdmin: '🤖',
		unreg: '🔒',
		nsfw: '🔞',
		rpg: '🎮',
		restrict: '⛔',
	}

	const msg = {
        rowner: `_*Access Denied.*_`,
		owner: `*${emoji.owner} Owner Only.*`,
		moderator: `${userTag} Perintah ini hanya dapat digunakan oleh *Moderator*.`,
		premium: `${userTag} Perintah ini hanya untuk member *Premium*!\n\nMau beli premium?\nketik: .premium`,
		group: `*Group Only.*`,
		private: `${userTag} Perintah ini hanya dapat digunakan di Chat Pribadi.`,
		admin: `*Admin Only.*`,
		botAdmin: `${userTag} Jadikan bot sebagai *Admin* untuk menggunakan perintah ini!`,
		nsfw: `${userTag} NSFW tidak aktif, ketik *.on nsfw* untuk mengaktifkannya!`,
        rpg: `${userTag} RPG tidak aktif, ketik *.on rpg* untuk mengaktifkannya!`,
        game: `${userTag} Game tidak aktif, ketik *.on game* untuk mengaktifkannya!`,
		maintenance: `*${userTag}* Maaf, fitur ini sedang dalam mode pemeliharaan.\n\nSilakan coba lagi nanti atau hubungi Team Bot Discussion untuk info lebih lanjut!`,
		restrict: `*${userTag} Fitur ini di *disable* !`,
	} [type]
    if (msg) return mufar.reply(
		m.chat,
		msg,
		m, {
		}
	)
  let daftar = {
  unreg: `Daftar dulu, bang.
  \`Caranya\`
  .daftar nama.umur
  
 *Contoh: .daftar Sailox.111*

Kalau kurang paham, hubungi Owner
Ketik: *.owner*`}[type]
  
  if (daftar) return conn.sendMessage(m.chat, {
        text: daftar,
        contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: "120363417728417511@newsletter",
                newsletterName: 'Sailox Official',
            },
        },
    }, { quoted: m });
}

let file = global.__filename(import.meta.url, true)
watchFile(file, async () => {
	unwatchFile(file)
	console.log(chalk.redBright("Update handler.js"))
	if (global.reloadHandler) console.log(await global.reloadHandler())
})
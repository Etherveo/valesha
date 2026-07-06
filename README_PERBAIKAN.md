# Laporan Audit & Patch — bot-wa

Analisis komprehensif atas seluruh file di `bot-wa.zip` (Baileys `@whiskeysockets/baileys@7.0.0-rc13`), dicek langsung terhadap source code & dokumentasi resmi Baileys (`baileys.wiki`, `github.com/WhiskeySockets/Baileys`), plus repo referensi `github.com/Tederby/wa-bot` untuk masalah #4.

**14 file diubah.** Semua sudah lolos `node --check` (validasi sintaks) dan direview manual baris-per-baris untuk urutan eksekusi/logika.

---

## Temuan Kritis Tambahan (di luar 3 masalah yang dilaporkan)

### `conn.reply()` — SELALU throw error

Di `lib/simple.js`, `conn.reply()` (dipanggil oleh `m.reply()` yang dipakai HAMPIR SEMUA plugin) berisi:

```js
contextInfo: global.adReply.contextInfo,
```

`global.adReply` **tidak pernah didefinisikan di file manapun** yang ada di ZIP ini (beda dengan `conn.adReply` — method terpisah dengan nama mirip). Baris ini selalu `TypeError: Cannot read properties of undefined (reading 'contextInfo')`.

Ini kemungkinan besar berkontribusi ke gejala yang dirasakan campur aduk dengan masalah delay — command yang gagal total (throw sebelum sempat kirim apa-apa) bisa terasa mirip "tidak merespons" tergantung bagaimana error ditangani di titik pemanggilan lain. Sudah diperbaiki (lihat Bagian #3).

---

## Bagian #1 — Respons Lambat (30 detik–1 menit)

### Akar masalah (dua lapis, saling memperparah)

**Lapis 1 — `handler.js`:**
```js
const groupMetadata = m.isGroup
? await conn.groupMetadata(m.chat).catch(_ => ({}))
: {}
```
Ini jalan di **setiap pesan masuk di grup**, dan `conn.groupMetadata()` selalu query fresh ke server (`w:g2` IQ) — dikonfirmasi langsung dari source `src/Socket/groups.ts`: fungsi ini cuma `groupQuery(jid, 'get', ...)`, tidak pernah baca cache apa pun.

**Lapis 2 — `lib/simple.js` (`makeWASocket`):**
`connectionOptions` yang dikirim ke `_makeWaSocket()` tidak pernah mengisi `cachedGroupMetadata`. Dokumentasi resmi Baileys (`baileys.wiki/docs/socket/configuration`) menyebut eksplisit:

> *"When sending messages to a group, the sendMessage function will try to get the group participant list... This is a problem and causes a ratelimit and potential bans from WhatsApp. To counter this, you should provide the socket with a `cachedGroupMetadata` cache."*

Tanpa itu, **setiap kali bot MEMBALAS ke grup**, Baileys sendiri (secara internal, di luar kontrol `handler.js`) query ulang daftar peserta grup buat keperluan enkripsi.

**Hasilnya:** satu siklus command → balasan di grup = minimal 2 query `w:g2` ke server WhatsApp. Grup yang aktif → puluhan/ratusan query berulang → WhatsApp men-throttle. Ini pola classic penyebab delay yang naik seiring waktu/trafik, persis seperti yang dilaporkan.

**Kenapa "diri sendiri cepat, orang lain lambat":** pengetesan sendiri kemungkinan besar lewat chat pribadi (`m.isGroup` false → cabang ini tidak pernah jalan sama sekali, jadi selalu instan), sementara interaksi user lain mayoritas terjadi di grup (satu-satunya jalur yang kena kedua lapis masalah di atas).

### Perbaikan

**`lib/simple.js`** — `makeWASocket()`:
- `conn.chats` sekarang dibuat **sebelum** `_makeWaSocket()` dipanggil, lalu dipakai sebagai isi `cachedGroupMetadata` yang diinjeksikan ke `connectionOptions`. Objek yang sama ini juga yang dipelihara `lib/store.js` (event `groups.update`/`group-participants.update`/`messaging-history.set`) dan dibaca `handler.js` — satu cache, tiga konsumen, tidak ada resolver baru.
- Ditambahkan `getMessage` (di-backing cache pesan in-memory kecil, terisi dari `messages.upsert`) — dipakai Baileys buat memenuhi permintaan retry pengiriman & decode poll vote (disebut wajib di dokumentasi resmi `SocketConfig.getMessage`, sebelumnya kosong).

**`handler.js`** — baca `conn.chats[m.chat]?.metadata` dulu; `conn.groupMetadata()` fresh cuma jalan sekali untuk grup yang belum pernah tercatat, hasilnya langsung disimpan ke cache.

**`plugins/group-kick.js`, `group-getlid.js`, `group-add.js`, `main-daftar.js`** — semua punya `conn.groupMetadata()`/fetch fresh sendiri-sendiri yang REDUNDAN (data yang sama sudah disediakan `handler.js` lewat parameter `participants`/`groupMetadata`). Dihapus, pakai yang sudah ada.

---

## Bagian #2 — LID/JID: Admin/Owner Tidak Terdeteksi, `.getlid` Gagal

### Akar masalah

Dicek langsung ke source `extractGroupMetadata` (`src/Socket/groups.ts`) dan `baileys.wiki/docs/migration/to-v7.0.0`:

```js
participants: getBinaryNodeChildren(group, 'participant').map(({ attrs }) => ({
  id: attrs.jid!,
  phoneNumber: isLidUser(attrs.jid) && isPnUser(attrs.phone_number) ? attrs.phone_number : undefined,
  lid: isPnUser(attrs.jid) && isLidUser(attrs.lid) ? attrs.lid : undefined,
  admin: ...
}))
```

**`GroupParticipant` TIDAK PUNYA field `.jid`.** Field yang benar cuma `id` (identitas utama — bisa `@lid` atau `@s.whatsapp.net` tergantung *addressing mode* grup itu), `phoneNumber` (padanan PN, cuma ada kalau `id` adalah `@lid`), dan `lid` (padanan lid, cuma ada kalau `id` adalah `@s.whatsapp.net`).

Di seluruh codebase yang di-upload, kode mengecek `[u.id, u.jid, u.lid]` — `u.jid` selalu `undefined`, jadi kalau kebetulan `u.id` juga tidak cocok (karena grup pakai addressing mode yang beda dari yang diharapkan), pencocokan gagal total → admin asli tidak pernah kedetect, target `.kick` tidak pernah ketemu, `.getlid` selalu "User tidak ditemukan".

Ditambah: `m.sender` (di `lib/simple.js`) cuma `decodeJid()` mentah, tidak pernah mencoba mencocokkan bentuk lid/PN — beda dengan getter `m.chat` di file yang sama yang **sudah** memakai `key.remoteJidAlt`. Dokumentasi migrasi resmi Baileys menyebut eksplisit field simetrisnya untuk sender:

> *"6.8.0 Introduces the following fields to the MessageKey: `remoteJidAlt` (untuk DM), `participantAlt` (untuk grup) — Alternate JID untuk user, jadi kalau participant adalah LID, Alt-nya adalah PN."*

`key.participantAlt` ini ada tapi tidak pernah dipakai di mana pun.

### Kenapa TIDAK dibuat resolver/wrapper baru

Sesuai arahan: perbaikan di bawah **murni memakai field yang Baileys sendiri sudah sediakan** di message key (`participantAlt`/`remoteJidAlt`) dan di participant grup (`id`/`phoneNumber`/`lid`) — bukan menebak (mis. heuristik "lid kalau digit > 13" yang sebelumnya ada di `isSailox`, sudah dihapus) dan bukan scan/fetch tambahan. Satu-satunya "baru" adalah `conn.resolveJid()`, itu pun cuma pass-through **async** ke store bawaan Baileys sendiri (`conn.signalRepository.lidMapping.getPNForLID`, resmi didokumentasikan di migration guide, dan bukan panggilan jaringan — baca store lokal), dipakai sebagai fallback terakhir, hanya di jalur yang memang sudah `async` (bukan di getter sinkron).

### Perbaikan

**`lib/simple.js`:**
- **`senderAlt` (baru, getter)** — expose `key.participantAlt`/`key.remoteJidAlt` yang di-decode, persis pola yang sudah dipakai getter `chat`. `m.sender` sendiri **sengaja tidak diubah** (tetap apa adanya dari Baileys) supaya plugin lain yang belum di-review tidak berubah perilaku diam-diam.
- **`resolveJid()` (baru)** — fallback async: coba `getJid()` (cache lokal) dulu, kalau masih gagal baru tanya `signalRepository.lidMapping` bawaan Baileys.
- `getJid()` sendiri **tidak diubah logikanya** (field yang dicek di situ — `.lid`/`.id`/`.phoneNumber` — sudah benar sejak awal, cuma dead-reference `.jid` yang harmless karena selalu di-skip `||`).

**`handler.js`:**
- Deteksi admin/bot-admin: `[u.id, u.jid, u.lid]` → `[u.id, u.phoneNumber, u.lid]`, dicocokkan terhadap `m.sender` **dan** `m.senderAlt` sekaligus. Bot-admin juga sekarang ikut cek `conn.user.lid` (identitas LID bot sendiri, field ini dikonfirmasi ada di `sock.user.lid` per Baileys — sebelumnya cuma cek `conn.user.id`).
- Konsolidasi `isOwner`/`isROwner`: dulu ada **tiga implementasi berbeda** yang saling tidak konsisten — satu di scope luar (sudah lumayan benar), satu di-shadow ulang di dalam loop plugin (`const isOwner = global.owner.map(...).includes(m.sender)` — cuma cek bentuk PN, menutupi versi yang lebih benar di atasnya, dipakai buat ban-check/maintenance/register), dan `isSailox` dengan heuristik digit-length yang rapuh. Sekarang satu jalur (`matchesAny` terhadap `m.sender` + `m.senderAlt`) dipakai konsisten di semua tempat.
  - ⚠️ **Catatan teknis:** saat menyatukan ini saya sempat salah taruh urutan (`finalOwner` dipakai sebelum didefinisikan → `ReferenceError`), ketahuan & diperbaiki sebelum finalisasi. Disebutkan di sini supaya kalau suatu saat Anda re-review diff-nya, urutannya (isSailox → finalOwner/finalROwner → ban-check → sisanya) memang harus persis begitu.

**`plugins/group-kick.js`** — `.jid` → `id`/`phoneNumber`/`lid`. Proteksi "jangan kick owner" sebelumnya hardcode nomor **`6283857182374`** yang tidak cocok dengan owner manapun di `config.js` Anda (`6282348181097`/`6289528749986`) — jadi proteksi itu tidak pernah benar-benar jalan. Diganti cek terhadap semua daftar owner (`owner`/`rowner`/`founder`/`ownerLid`) yang sebenarnya.

**`plugins/group-getlid.js`** — field diperbaiki, ditambah pencocokan lewat `m.senderAlt`, output sekarang jelas mana ID yang dipakai grup, mana PN, mana LID (sebelumnya field "JID" selalu tampil kosong karena baca `.jid`).

**`plugins/group-add.js`** — filter "sudah ada di grup" sekarang cek `id` **dan** `phoneNumber`, tidak cuma satu bentuk.

**`plugins/owner-addrowner.js` / `owner-delrowner.js` / `owner-listrowner.js`** — `.addrowner` sekarang coba resolve ke PN dulu lewat `conn.resolveJid()`; kalau identitasnya memang murni LID (belum ada padanan PN yang diketahui Baileys), dicatat ke `founder`/`ownerLid` (bukan `rowner`) supaya **benar-benar bisa match** nanti (sebelumnya nomor LID bisa ke-push ke `rowner` yang selalu dicek dalam bentuk `@s.whatsapp.net` — tidak akan pernah cocok dengan siapa pun). `.delrowner` & `.listrowner` disimetriskan supaya bisa hapus/tampilkan entry LID itu juga.

**`plugins/main-daftar.js`** — `resolveIdentity()` diperbaiki field-nya + sekarang pakai `participants` yang sudah tersedia dari `handler.js` (tidak fetch grup lagi).

---

## Bagian #3 — `conn.reply()` Selalu Gagal (lihat "Temuan Kritis" di atas)

`lib/simple.js` — baris `contextInfo: global.adReply.contextInfo` dihapus. Sekalian dibersihkan: pemanggilan `conn.profilePictureUrl(conn.user.jid, 'image')` yang tidak di-`await` dan hasilnya tidak pernah dipakai (request jaringan sia-sia di **setiap** balasan bot, menambah beban ke soket yang sama yang juga lagi dipakai `groupMetadata`/`sendMessage` — kemungkinan turut menyumbang delay di Bagian #1).

---

## Bagian #4 — `externalAdReply` Tidak Muncul di WhatsApp Business

### Analisis

Dicek `github.com/Tederby/wa-bot` (termasuk command `ytsearch`) — repo itu **tidak memakai `externalAdReply` sama sekali di manapun**, walau ada banyak command yang mengirim gambar/link. Pendekatan mereka: tetap kirim caption/teks biasa atau gambar sungguhan, bukan trik "kartu ad-reply" lewat `contextInfo`.

Ditemukan juga pola berisiko spesifik di kode Anda: di `conn.adReply()` (`lib/simple.js`) dan pesan "limit habis" (`handler.js`), `externalAdReply` digabung dengan `forwardedNewsletterMessageInfo` **palsu** (newsletter/JID hardcode, bukan channel asli) **dan** `serverMessageId: null` di `contextInfo` yang sama. `null` bukan nilai valid untuk field int64 protobuf. WhatsApp Business memvalidasi `contextInfo` lebih ketat dari WhatsApp reguler (dipakai juga buat fitur Ads/Klik-ke-WhatsApp di sisi Business) — kombinasi field yang tidak valid ini kandidat kuat penyebab WA Business menolak me-render **seluruh pesan**, bukan cuma kartunya.

### Perbaikan (dua strategi, sesuai jenis pesan)

1. **Pesan teks/menu biasa** (`lib/menulox.js`, `plugins/_yue-menulox.js`, `_yue-allmenu.js`, `_yue-allmenu2.js`, pesan welcome/goodbye & sukses-daftar di `handler.js`/`main-daftar.js`) — diganti kirim **gambar sungguhan + caption** (`image: {...}, caption: text`) memakai thumbnail yang sama. Jenis pesan ini didukung semua klien WhatsApp tanpa terkecuali, persis semangat yang dipakai `Tederby/wa-bot`. Konsekuensi: kartu "ad-style" (title/body terpisah) hilang, tapi isi pesan **dijamin sampai**.
2. **Pesan interaktif/tombol** (`plugins/_yue-menuawal.js`, menu utama dengan native-flow buttons) — konversi ke gambar akan menghilangkan tombolnya juga, jadi cukup **`externalAdReply` dihapus** dari `contextInfo`-nya, struktur tombol dibiarkan utuh.
3. **`conn.adReply()`** (helper opt-in di `lib/simple.js`, dipakai plugin lain di luar ZIP ini) — dibersihkan dari `forwardedNewsletterMessageInfo`+`serverMessageId: null`, `externalAdReply`-nya sendiri dibiarkan (opt-in, bukan default global) untuk kasus yang memang butuh kartu preview.

---

## File yang Dirujuk tapi Tidak Ada di ZIP (bukan bug dari saya — cuma catatan)

`handler.js` meng-`import` tiga file yang tidak ada di arsip ini:
- `./lib/sendPonta.js`
- `./lib/sendSailox.js`
- `./lib/ListGroupFile.js`

`lib/index.js` (ada di ZIP, tapi tidak di-`import` oleh file manapun yang disertakan) meng-`import` empat file lain yang juga tidak ada:
- `./downloader/index.js`, `./gdrive-uploader-folder.js`, `./extract-queue.js`, `./extracter.js`

Kemungkinan besar ini memang bagian dari project Anda yang di luar cakupan 3 masalah yang diminta sehingga tidak disertakan saat membuat ZIP. Disebutkan di sini murni supaya tidak ada yang terlewat — tidak menyentuh/mengubah apa pun terkait file-file ini.

---

## Daftar Lengkap File yang Diubah

| File | Kenapa |
|---|---|
| `lib/simple.js` | `cachedGroupMetadata`+`getMessage` (delay), `senderAlt`+`resolveJid` (lid/jid), fix `conn.reply` (crash), fix `conn.adReply` (WA Business) |
| `handler.js` | Baca cache group metadata (delay), konsolidasi isOwner/isAdmin dgn lid-aware matching, fix welcome message (WA Business) |
| `plugins/group-kick.js` | Field `.jid`→`id/phoneNumber/lid`, hapus fetch redundan, fix proteksi owner yang salah nomor |
| `plugins/group-getlid.js` | Field `.jid`→field benar, hapus fetch redundan |
| `plugins/group-add.js` | Cek `id`+`phoneNumber` utk deteksi participant existing, hapus fetch redundan |
| `plugins/owner-addrowner.js` | Resolve lid→PN via Baileys native store, routing ke daftar yang tepat |
| `plugins/owner-delrowner.js` | Simetris dengan addrowner |
| `plugins/owner-listrowner.js` | Tampilkan juga owner berbasis LID |
| `plugins/main-daftar.js` | Field `.jid`→field benar, pakai participants yang sudah ada |
| `lib/menulox.js` | externalAdReply → image+caption |
| `plugins/_yue-menulox.js` | externalAdReply → image+caption |
| `plugins/_yue-allmenu.js` | externalAdReply → image+caption |
| `plugins/_yue-allmenu2.js` | externalAdReply → image+caption (+ hapus field tidak valid `matchedText`/`description`) |
| `plugins/_yue-menuawal.js` | Hapus externalAdReply dari pesan tombol (tombol tetap utuh) |

File lain (`main.js`, `lib/store.js`, `config.js`, dll) **tidak diubah** — sudah cukup benar untuk isu yang dilaporkan, atau perubahan di file lain sudah cukup mengatasi akar masalahnya tanpa perlu menyentuhnya.

---

## Yang Perlu Diverifikasi Sendiri

Saya tidak punya akses ke WhatsApp/Baileys sungguhan untuk test langsung, jadi mohon dicek:

1. **Delay**: pantau jumlah query `w:g2` (biasanya kelihatan di log kalau `logger` level debug) sebelum/sesudah patch di grup yang sama.
2. **Admin/owner LID**: test `.kick`/`.add`/`.getlid`/`.addrowner` dengan akun yang Anda tahu tampil sebagai `@lid` di grup tsb.
3. **WA Business**: kirim `.menu`/`.allmenu` ke akun yang bukanya pakai WhatsApp Business, cek apakah sekarang muncul.
4. File yang hilang dari ZIP (`sendPonta.js`, dst.) — pastikan tetap ada di project asli Anda; ZIP patch ini tidak menyentuhnya sama sekali.

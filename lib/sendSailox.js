import fs from 'fs';

export async function sendSailox(chat, caption, m, quoted) {
    let mentionedJid = [m.sender]; 
    
    this.sendMessage(chat, {
        document: fs.readFileSync("./thumbnail.jpg"),
        fileName: `- ${global.namebot} by ${global.author} -`,
        fileLength: '1',
        mimetype: 'application/msword',
        jpegThumbnail: await this.resize(fs.readFileSync('./src/bahan/yueaja.jpg'), 350, 190),
        caption,
        contextInfo: {
            mentionedJid,
            forwardingScore: 99999999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: '120363417728417511@newsletter',
                serverMessageId: null,
                newsletterName: `© ${global.namebot} || ${global.author}`
            }
        }
    }, { quoted });
}

export default function setupSailox(conn) {
    conn.sendSailox = sendSailox.bind(conn);
}
export async function getSenderData(conn, m) {
  // Fungsi untuk mendapatkan data pengirim berdasarkan message object
  const getSenderFromMessage = async (messageObj) => {
    if (!messageObj) return null;
    
    if (messageObj.isGroup) {
      const metadata = await conn.groupMetadata(messageObj.chat);
      const senderData = metadata.participants.find(p => 
        p.jid === messageObj.sender || p.lid === messageObj.sender
      );
      return senderData || { jid: messageObj.sender, lid: null, admin: null };
    } else {
      return { jid: messageObj.sender, lid: null, admin: null };
    }
  };

  // Data pengirim pesan utama
  const mainSender = await getSenderFromMessage(m);
  
  // Data pengirim pesan yang di-quote (jika ada)
  let quotedSender = null;
  if (m.quoted) {
    quotedSender = await getSenderFromMessage(m.quoted);
  }

  return {
    sender: mainSender,
    quoted: quotedSender
  };
}
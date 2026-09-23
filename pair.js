console.log("🚀 Starting Pairing Code Generator...");

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');

const PHONE_NUMBER = "94740196225"; // ඔයාගේ WhatsApp අංකය

async function generateSession() {
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: ['Ubuntu', 'Chrome', '20.0.0.4']
    });

    sock.ev.on('creds.update', saveCreds);

    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let num = PHONE_NUMBER.replace(/[^0-9]/g, '');
                let code = await sock.requestPairingCode(num);
                console.log(`\n==================================`);
                console.log(`🔐 YOUR PAIRING CODE: ${code?.match(/.{1,4}/g)?.join('-') || code}`);
                console.log(`==================================\n`);
            } catch (err) {
                console.error("❌ Error requesting code:", err.message);
            }
        }, 3000);
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'open') {
            console.log("\n✅ WhatsApp connected successfully!");
            console.log("📤 Sending creds.json file to your WhatsApp...");

            const userJid = `${PHONE_NUMBER.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
            
            // Wait 2 seconds to make sure creds.json is written to disk
            await new Promise(r => setTimeout(r, 2000));

            if (fs.existsSync('./session/creds.json')) {
                try {
                    await sock.sendMessage(userJid, {
                        document: fs.readFileSync('./session/creds.json'),
                        mimetype: 'application/json',
                        fileName: 'creds.json',
                        caption: '✅ *SARA MOVIE BOT - CREDENTIALS*\n\nමෙම `creds.json` ෆයිල් එක Download කරගෙන Main Bot Repo එකේ `session/` Folder එක ඇතුලට දාන්න.'
                    });
                    console.log("🎉 creds.json sent to WhatsApp! You can stop this script now.\n");
                } catch (e) {
                    console.error("❌ Error sending file:", e.message);
                }
            } else {
                console.log("❌ creds.json file not found in ./session folder!");
            }
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            if (statusCode !== DisconnectReason.loggedOut) {
                generateSession();
            }
        }
    });
}

generateSession();


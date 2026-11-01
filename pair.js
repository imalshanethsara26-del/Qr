console.log("🚀 Starting Pairing Code Generator...");

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');

const PHONE_NUMBER = "94740196225"; // ඔයාගේ WhatsApp අංකය මෙතැනට දෙන්න

async function generateSession() {
    const sessionDir = './session';

    // සෑම වතාවකම ස්ක්‍රිප්ට් එක පටන් ගන්නකොට පැරණි session ෆයිල්ස් තිබේ නම් ඩිලීට් කර දමයි
    if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
        console.log("🧹 Cleaned old session files.");
    }
    
    fs.mkdirSync(sessionDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    
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
        }, 4000);
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'open') {
            console.log("\n✅ WhatsApp connected successfully!");
            console.log("📤 Sending creds.json file to your WhatsApp...");

            const userJid = `${PHONE_NUMBER.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
            
            // සෙෂන් එක සම්පූර්ණයෙන්ම ස්ථාවර වීමට තත්පර 5ක් ඉඩ දෙන්න
            await new Promise(r => setTimeout(r, 5000));

            const credsPath = path.join(sessionDir, 'creds.json');

            if (fs.existsSync(credsPath)) {
                try {
                    await sock.sendMessage(userJid, {
                        document: fs.readFileSync(credsPath),
                        mimetype: 'application/json',
                        fileName: 'creds.json',
                        caption: '✅ *SARA MOVIE BOT - CREDENTIALS*\n\nමෙම `creds.json` ෆයිල් එක Download කරගෙන Main Bot Repo එකේ `session/` Folder එක ඇතුලට දාන්න.'
                    });
                    console.log("🎉 creds.json sent to WhatsApp successfully! You can stop this script now.\n");
                } catch (e) {
                    console.error("❌ Error sending file:", e.message);
                }
            } else {
                console.log("❌ creds.json file not found in session folder!");
            }
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            console.log(`⚠️ Connection closed with status: ${statusCode}`);
            if (statusCode !== DisconnectReason.loggedOut) {
                generateSession();
            } else {
                console.log("❌ Device logged out.");
            }
        }
    });
}

generateSession();

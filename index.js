const pino = require('pino');
const fs = require('fs');
const chalk = require('chalk');
const readline = require("readline");
const { makeWASocket, useMultiFileAuthState, PHONENUMBER_MCC, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const NodeCache = require("node-cache");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

const generateCustomSessionId = () => {
    // Custom function to generate a session ID
    return `AbraXas~${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
};

async function startWhatsAppBot() {
    let { version, isLatest } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState(`./session`);
    const msgRetryCounterCache = new NodeCache();

    const socket = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false, // Disable QR code display
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        auth: state,
        msgRetryCounterCache,
        defaultQueryTimeoutMs: undefined,
    });

    socket.ev.on('creds.update', saveCreds);

    if (state.creds.registered) {
        console.log("Already registered!");
        return;
    }

    let phoneNumber = "916909137213"; // Example phone number
    const pairingCode = true; // We want to use the pairing code

    if (pairingCode) {
        if (phoneNumber) {
            phoneNumber = phoneNumber.replace(/[^0-9]/g, '');

            if (!Object.keys(PHONENUMBER_MCC).some(v => phoneNumber.startsWith(v))) {
                console.log(chalk.bgBlack(chalk.redBright("Start with the country code of your WhatsApp Number, Example: +916909137213")));
                process.exit(0);
            }
        } else {
            phoneNumber = await question(chalk.bgBlack(chalk.greenBright(`Please type your WhatsApp number 😍\nFor example: +916909137213 : `)));
            phoneNumber = phoneNumber.replace(/[^0-9]/g, '');

            if (!Object.keys(PHONENUMBER_MCC).some(v => phoneNumber.startsWith(v))) {
                console.log(chalk.bgBlack(chalk.redBright("Start with the country code of your WhatsApp Number, Example: +916909137213")));
                process.exit(0);
            }
        }

        setTimeout(async () => {
            let code = await socket.requestPairingCode(phoneNumber);
            code = code?.match(/.{1,4}/g)?.join("-") || code;
            console.log(chalk.black(chalk.bgGreen(`Your Pairing Code : `)), chalk.black(chalk.white(code)));

            // Send the pairing code to the connected WhatsApp number
            await socket.sendMessage(phoneNumber, { text: `Your Pairing Code is: ${code}` });
        }, 3000);
    }

    // Event listener for connection success
    socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
            console.log('Connection successful!');

            // Generate a custom session ID
            const customSessionId = generateCustomSessionId();
            const message = `Your custom session ID is: ${customSessionId}`;
            
            // Send the custom session ID to the WhatsApp number
            await socket.sendMessage(phoneNumber, { text: message });

            console.log('Custom Session ID sent to WhatsApp number:', customSessionId);
        }

        if (lastDisconnect && lastDisconnect.error) {
            console.log('Connection error:', lastDisconnect.error);
        }
    });

    await question(chalk.bgBlack(chalk.greenBright(`\nPress any key to exit!\n`)));
    process.exit(0);
}

startWhatsAppBot().catch(err => {
    console.error('Error starting WhatsApp bot:', err);
});

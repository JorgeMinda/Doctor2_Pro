/**
 * wa-server.js - Microservicio WhatsApp Gateway con soporte para Pairing Code (Código de 8 dígitos)
 * Permite vincular WhatsApp ingresando un código en el teléfono sin necesidad de cámara/QR.
 */
const express = require('express');
const cors = require('cors');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;
let sock = null;
let currentStatus = 'disconnected';
let connectedNumber = '';
let currentPairingCode = null;

async function startWhatsApp(phoneToPair = null) {
  const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['Doctor2 Enterprise', 'Chrome', '1.0.0']
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      currentStatus = 'disconnected';
      connectedNumber = '';
      currentPairingCode = null;
      if (shouldReconnect) {
        console.log('🔄 Reconectando WhatsApp...');
        startWhatsApp();
      }
    } else if (connection === 'open') {
      currentStatus = 'connected';
      connectedNumber = sock.user?.id?.split(':')[0] || '';
      currentPairingCode = null;
      console.log(`✅ WhatsApp conectado exitosamente al número: +${connectedNumber}`);
    }
  });

  // Si se solicitó vinculación con número de teléfono
  if (phoneToPair && !sock.authState.creds.registered) {
    setTimeout(async () => {
      try {
        const cleanPhone = phoneToPair.replace(/\D/g, '');
        const code = await sock.requestPairingCode(cleanPhone);
        currentPairingCode = code;
        console.log(`🔑 Código de vinculación generado para +${cleanPhone}: ${code}`);
      } catch (err) {
        console.error('Error al generar pairing code:', err);
      }
    }, 3000);
  }
}

// Endpoint: Estado de Conexión
app.get('/api/whatsapp/status', (req, res) => {
  res.json({
    status: currentStatus,
    number: connectedNumber ? `+${connectedNumber}` : '',
    pairingCode: currentPairingCode
  });
});

// Endpoint: Solicitar Código de Vinculación de 8 dígitos
app.post('/api/whatsapp/pair-code', async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'Número de teléfono requerido' });
  }

  const cleanPhone = phone.replace(/\D/g, '');
  try {
    if (!sock) {
      await startWhatsApp(cleanPhone);
    } else if (!sock.authState.creds.registered) {
      const code = await sock.requestPairingCode(cleanPhone);
      currentPairingCode = code;
    }

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (currentPairingCode || attempts > 15) {
        clearInterval(interval);
        if (currentPairingCode) {
          res.json({ success: true, pairingCode: currentPairingCode, phone: cleanPhone });
        } else {
          res.status(500).json({ error: 'No se pudo generar el código. Verifica el número de teléfono.' });
        }
      }
    }, 500);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint: Enviar Mensaje Automatizado
app.post('/api/whatsapp/send', async (req, res) => {
  const { phone, message } = req.body;
  if (currentStatus !== 'connected' || !sock) {
    return res.status(400).json({ error: 'WhatsApp no está conectado' });
  }

  try {
    let cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone.includes('@s.whatsapp.net')) {
      cleanPhone = `${cleanPhone}@s.whatsapp.net`;
    }
    await sock.sendMessage(cleanPhone, { text: message });
    res.json({ success: true, status: 'sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint: Desconectar
app.post('/api/whatsapp/disconnect', async (req, res) => {
  try {
    if (sock) {
      await sock.logout();
      sock = null;
    }
    currentStatus = 'disconnected';
    connectedNumber = '';
    currentPairingCode = null;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Microservicio WhatsApp activo en http://localhost:${PORT}`);
  startWhatsApp();
});

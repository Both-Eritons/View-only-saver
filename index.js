const {makeWASocket, useMultiFileAuthState, downloadMediaMessage, DisconnectReason} = require('@whiskeysockets/baileys');
const {Boom} = require('@hapi/boom');
const fs = require('fs/promises');
const {
  v4: uuidv4,
} = require('uuid');



//YOUE NUMBER
const myNumber = 'NUMBER';

//CREATE FOLDER: /sdcard/Download/viewonly/imagem
//CREATE FOLDER: /sdcard/Download/viewonly/video

async function connectionUpdate(update) {
  const {connection, lastDisconnect} = update

    if (connection === 'close') {

      const shouldReconnect =
        (lastDisconnect.error ?? new Boom('Ocorreu algum erro'))
          ?.output?.statusCode !== DisconnectReason.loggedOut

      console.log('Conexão fechada pelo Erro: ', lastDisconnect.error);
      console.log('\n Reconectando', shouldReconnect);

      if (shouldReconnect) {
        connectToWhatsApp()
      }

    } else if (connection === 'open') {
      console.log('Conectado!')
    }

}
async function viewOnlyImage(sock, msg, viewOnly, imgPath, OwnerJid) {
  if (viewOnly?.message?.imageMessage) {
      viewOnly.message.imageMessage.viewOnce = false;
      viewOnly.message.imageMessage.contextInfo = {
        forwardingScore: 1,
        isForwarded: true,
        remoteJid: msg.key.remoteJid
      };

      try {
        const midiaBuffer = await downloadMediaMessage({
          message: {imageMessage: viewOnly?.message?.imageMessage},
          key: msg.key
        });

        await fs.writeFile(`${imgPath}`, midiaBuffer);
        //await sock.sendMessage(OwnerJid, {text: 'sucesso ao baixar imagem'});
        //await sock.relayMessage(OwnerJid, viewOnly?.message, {});
        await sock.relayMessage(OwnerJid, viewOnly?.message, {});
        console.log('sucesso ao baixar imagem');
      } catch (error) {
        await sock.sendMessage(OwnerJid, {text: 'Erro ao baixar imagem'});
        console.log('ocorreu algum erro ao baixar imagem ', error);
      }

    }

}

async function viewOnlyVid(sock, msg, viewOnly, vidPath, OwnerJid) {
  if (viewOnly?.message?.videoMessage) {
      viewOnly.message.videoMessage.viewOnce = false;
      viewOnly.message.videoMessage.contextInfo = {
        forwardingScore: 1,
        isForwarded: true,
        remoteJid: msg.key.remoteJid
      };

      try {
        const midiaBuffer = await downloadMediaMessage({
          message: {videoMessage: viewOnly?.message?.videoMessage},
          key: msg.key
        });

        await fs.writeFile(`${vidPath}`, midiaBuffer);
        //await sock.sendMessage(OwnerJid, {text: 'sucesso ao baixar video'});
        //await sock.relayMessage(OwnerJid, viewOnly?.message, {});
        await sock.relayMessage(OwnerJid, viewOnly?.message, {});
        console.log('sucesso ao baixar video');
      } catch (error) {
        await sock.sendMessage(OwnerJid, {text: 'Erro ao baixar video'});
        console.log('ocorreu algum erro ao baixar video ', error);
      }

    }

}
async function connectToWhatsApp(botphone) {
  
  const {state, saveCreds} = await useMultiFileAuthState('./auth');

  const sock = makeWASocket({
    printQRInTerminal: true,
    auth: state,
  });

  const OwnerJid = botphone+'@s.whatsapp.net';
  if (!sock?.authState?.creds?.registered) {
    await sock.waitForConnectionUpdate((update) => !!update.qr);
    const code = await sock.requestPairingCode(botphone);

    console.log('Code', code);
  }


  sock.ev.on('connection.update', (update) => {
    connectionUpdate(update);
  });

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', async (m) => {
    
    const msg = m.messages[0];
    const msgContent = m.messages[0].message;
    const ctxInfo = msgContent?.extendedTextMessage?.contextInfo;
    const mention = ctxInfo?.quotedMessage;
    
    let path = `/sdcard/Download/viewonly`;
    let imgPath = `${path}/imagem/${uuidv4()}.jpeg`;
    let vidPath = `${path}/video/${uuidv4()}.mp4`;
    const viewOnly = msgContent?.viewOnceMessageV2;
    const viewOnlyQuoted = ctxInfo?.quotedMessage?.viewOnceMessageV2;


    await viewOnlyVid(sock, msg, viewOnly, vidPath, OwnerJid)
    await viewOnlyImage(sock, msg, viewOnlyQuoted, imgPath, OwnerJid);
  });

}


connectToWhatsApp(myNumber);

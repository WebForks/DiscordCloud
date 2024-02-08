import fs from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';
import path from 'path';
import { Client, GatewayIntentBits } from 'discord.js';
import Database from 'better-sqlite3';
import {DISCORD_TOKEN,CHANNEL_ID,DB_PATH } from '$env/static/private';

console.log(DISCORD_TOKEN);
console.log(CHANNEL_ID);
console.log(DB_PATH);


const db = new Database(DB_PATH);
const pipe = promisify(pipeline);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

async function ensureUploadDir(filePath) {
  const dirName = path.dirname(filePath);
  if (!fs.existsSync(dirName)) {
    await fs.promises.mkdir(dirName, { recursive: true });
  }
}

async function uploadToDiscord(filePath, channelId) {
    try {
        console.log(client.isReady());
      if (!client.isReady()) {
        await client.login(DISCORD_TOKEN);
        console.log("Logged in successfully.");
      }
  
      const channel = await client.channels.fetch(channelId);
      if (!channel) throw new Error('Channel not found');
  
      const message = await channel.send({ files: [filePath] });
      const fileURL = message.attachments.first().url;
      console.log(`Uploaded ${filePath} to Discord. File URL: ${fileURL}`);
  
      await fs.promises.unlink(filePath);
      return fileURL;
    } catch (error) {
      console.error("Failed to upload to Discord:", error);
      throw error;
    }
}

async function Split(originalFilePath, partSize = 25165824) {
  const fileSize = fs.statSync(originalFilePath).size;
  const readStream = fs.createReadStream(originalFilePath);
  let partNum = 0;
  let DiscordLink = [];
  let fileSplitNames = [];
  let timeUploaded = null;

  console.log("Splitting file");
  for await (const chunk of readStream) {
    if (partNum * partSize >= fileSize) {
      break;
    }
    const partPath = `${originalFilePath}-${++partNum}.txt`;
    await fs.promises.writeFile(partPath, chunk);
    console.log(`Writing part ${partNum}`);

    const fileURL = await uploadToDiscord(partPath, CHANNEL_ID);
    DiscordLink.push(fileURL);
    fileSplitNames.push(partPath);
    //if (!timeUploaded) timeUploaded = new Date().toISOString();
    if (!timeUploaded) {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const hourIn12 = hours % 12 || 12; // Convert 24h to 12h format
        const month = (now.getMonth() + 1).toString().padStart(2, '0'); // JS months are 0-indexed
        const day = now.getDate().toString().padStart(2, '0');
        const year = now.getFullYear();
        timeUploaded = `${hourIn12}:${minutes} ${ampm} ${month}/${day}/${year}`;
    }
    
  }

  console.log(`File has been split into ${partNum} parts.`);
  await fs.promises.unlink(originalFilePath);
  console.log(`Original file ${originalFilePath} has been deleted.`);

  insertFileData(path.basename(originalFilePath), timeUploaded, fileSize, DiscordLink, partNum, fileSplitNames);
}

function insertFileData(fileName, timeUploaded, fileSize, DiscordLink, fileSplitAmount, fileSplitNames) {
    // Process each DiscordLink to remove "?ex" and everything after it, while keeping ".txt"
    const processedLinks = DiscordLink.map(link => {
        return link.replace(/\?ex[^\s]*/, ''); // Updated regex
    });
    const processedFileSplitNames = fileSplitNames.map(name => name.replace(/^uploads\\/, ''));

    const insert = db.prepare(`INSERT INTO files (fileName, timeUploaded, fileSize, DiscordLink, fileSplitAmount, fileSplitNames) VALUES (?, ?, ?, ?, ?, ?)`);
    insert.run(fileName, timeUploaded, fileSize, JSON.stringify(processedLinks), fileSplitAmount, JSON.stringify(processedFileSplitNames));
}


export async function POST({ request }) {
  const formData = await request.formData();
  const file = formData.get('file');
  console.log("Got file");

  if (file) {
    const uploadPath = path.join('./uploads', file.name);
    await ensureUploadDir(uploadPath);

    await pipe(file.stream(), fs.createWriteStream(uploadPath));
    console.log(`File saved to ${uploadPath}`);

    await Split(uploadPath);
    console.log('File split and uploaded to Discord.');

    return new Response('File uploaded and processed successfully.', { status: 200 });
  }

  return new Response('No file uploaded.', { status: 400 });
}

client.login(DISCORD_TOKEN).catch(console.error);

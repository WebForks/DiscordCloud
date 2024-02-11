import fs from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';
import path from 'path';
import { Client, GatewayIntentBits } from 'discord.js';
import Database from 'better-sqlite3';
import {DISCORD_TOKEN,CHANNEL_ID,DB_PATH } from '$env/static/private';
import { spawn } from 'child_process';

//console.log(DISCORD_TOKEN);
//console.log(CHANNEL_ID);
//console.log(DB_PATH);

// 25165824
const db = new Database(DB_PATH);
const pipe = promisify(pipeline);


const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  rest: { timeout: 50_000 }
});

async function ensureUploadDir(filePath) {
  const dirName = path.dirname(filePath);
  if (!fs.existsSync(dirName)) {
    await fs.promises.mkdir(dirName, { recursive: true });
  }
}
const discordClientReady = new Promise((resolve, reject) => {
  client.once('ready', () => {
      console.log('Discord client is ready!');
      resolve();
  });
});

// Log in to the Discord client
client.login(DISCORD_TOKEN).catch(console.error);

async function uploadToDiscord(filePath, channelId) {
  try {
      //console.log("is client ready?", client.isReady());
      await discordClientReady;

      const channel = await client.channels.fetch(channelId);
      if (!channel) throw new Error('Channel not found');

      const message = await channel.send({ files: [filePath] });
      const fileURL = message.attachments.first().url; // This gets the file attachment URL.

      // Construct the message URL. Check if it's a guild message to construct the URL.
      let messageURL = "Direct Message - no URL available"; // Default message.
      if (message.guild) {
          messageURL = `https://discord.com/channels/${message.guild.id}/${channelId}/${message.id}`;
      } else {
          console.log("Message sent in a DM, no URL can be constructed for the message.");
      }

      console.log(`Uploaded ${filePath} to Discord. File URL: ${fileURL}`);
      console.log(`Message URL: ${messageURL}`);

      // Return both URLs
      //return { fileURL, messageURL };
      return messageURL;
  } catch (error) {
      console.error("Failed to upload to Discord:", error);
      throw error;
  }
}

async function Split(originalFilePath, partSize = 25165824 ) {
  return new Promise((resolve, reject) => {
      const pythonExecutable = 'python'; // or 'python3', depending on your environment
      const scriptPath = './src/routes/api/upload/split_file.py'; // Adjust to the actual location of your Python script

      // Execute the Python script with the file path and part size as arguments
      const process = spawn(pythonExecutable, [scriptPath, originalFilePath, partSize.toString()]);

      let dataString = '';
      process.stdout.on('data', (data) => {
          dataString += data.toString();
      });

      process.stderr.on('data', (data) => {
          console.error(`stderr: ${data.toString()}`);
      });

      process.on('close', (code) => {
          if (code === 0) {
              console.log('Python script finished successfully');
              try {
                  const fileSplitNames = JSON.parse(dataString); // Parse the JSON output from the Python script
                  resolve(fileSplitNames);
              } catch (error) {
                  reject(error);
              }
          } else {
              reject(new Error(`Python script exited with code ${code}`));
          }
      });
  });
}

async function processAndUpload(originalFilePath, channelId) {
  // Step 1: Split the file using the Python script
  const fileSplitNames = await Split(originalFilePath, 25165824); // Adjust the part size as needed

  // Initialize variables for Discord uploads
  const DiscordLink = [];
  const fileSize = fs.statSync(originalFilePath).size; // Get the original file size
  //const timeUploaded = new Date().toISOString(); // ISO format for the upload time
  const timeUploaded = null; // Use null to let the function generate the time
  let partNum = fileSplitNames.length; // The number of parts split by the Python script

  // Step 2: Delete the original file
  await fs.promises.unlink(originalFilePath);
  console.log(`Original file ${originalFilePath} has been deleted.`);
  

  // Step 3: Upload split parts to Discord
  for (const filePath of fileSplitNames) {
      try {
          const fileURL = await uploadToDiscord(filePath, channelId);
          DiscordLink.push(fileURL);
          console.log("DiscordLink: ", DiscordLink);
          console.log(`Uploaded ${filePath} to Discord. File URL: ${fileURL}`);

          // Optionally, delete the part file after successful upload
          await fs.promises.unlink(filePath);
          console.log(`Deleted part file ${filePath}.`);
      } catch (error) {
          console.error(`Failed to upload ${filePath} to Discord:`, error);
          // Optionally handle upload failure, like retrying
      }
  }
  console.log("Final DiscordLink: ", DiscordLink);
  // Step 4: Insert file data into SQLite
  insertFileData(path.basename(originalFilePath), timeUploaded, fileSize, DiscordLink, partNum, fileSplitNames);
}



function insertFileData(fileName, timeUploaded, fileSize, DiscordLink, fileSplitAmount, fileSplitNames) {
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
    // Process each DiscordLink to remove "?ex" and everything after it, while keeping ".txt"
    //const processedLinks = DiscordLink.map(link => {
    //    return link.replace(/\?ex[^\s]*/, ''); // Updated regex
    //});
    const processedFileSplitNames = fileSplitNames.map(name => name.replace(/^uploads\\/, ''));

    const insert = db.prepare(`INSERT INTO files (fileName, timeUploaded, fileSize, DiscordLink, fileSplitAmount, fileSplitNames) VALUES (?, ?, ?, ?, ?, ?)`);
    insert.run(fileName, timeUploaded, fileSize, JSON.stringify(DiscordLink), fileSplitAmount, JSON.stringify(processedFileSplitNames));
}


export async function POST({ request }) {
  client.login(DISCORD_TOKEN).catch(console.error);
  const formData = await request.formData();
  const file = formData.get('file');
  console.log("Got file");

  if (file) {
    const uploadPath = path.join('./uploads', file.name);
    await ensureUploadDir(uploadPath);

    await pipe(file.stream(), fs.createWriteStream(uploadPath));
    console.log(`File saved to ${uploadPath}`);

    await processAndUpload(uploadPath, CHANNEL_ID);
    console.log('File split and uploaded to Discord.');

    return new Response('File uploaded and processed successfully.', { status: 200 });
  }

  return new Response('No file uploaded.', { status: 400 });
}



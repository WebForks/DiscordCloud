import { error } from '@sveltejs/kit';
import Database from 'better-sqlite3';
import { pipeline } from 'stream';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path'; // Import the path module
import { DB_PATH, DISCORD_TOKEN } from '$env/static/private';
import { spawn } from 'child_process';
import { Client, GatewayIntentBits } from 'discord.js';

const streamPipeline = promisify(pipeline);
const discordClient = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
discordClient.login(DISCORD_TOKEN);

const dbPath = DB_PATH; // Ensure this is correctly set in your environment variables
const downloadsDir = './downloads'; // Define the downloads directory path

function clearDownloadsDirectory() {
    try {
        const files = fs.readdirSync(downloadsDir);
        for (const file of files) {
            fs.unlinkSync(path.join(downloadsDir, file));
        }
        console.log('Downloads directory cleared successfully.');
    } catch (err) {
        console.error(`Failed to clear downloads directory: ${err.message}`);
    }
}

// Ensure the downloads folder exists
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
}

function getFileInfo(fileName, timeUploaded) {
    const db = new Database(dbPath);
    // Prepare a SQL statement to select the file based on FileName and TimeUploaded
    // Assuming TimeUploaded is stored in a format that allows direct comparison (e.g., as a UNIX timestamp or ISO string)
    const stmt = db.prepare('SELECT * FROM Files WHERE FileName = ? AND TimeUploaded = ?');
    const fileInfo = stmt.get(fileName, timeUploaded);
    db.close();
    console.log("fileInfo: ", fileInfo);
    return fileInfo;
}
// Create a promise that resolves when the Discord client is ready
const discordClientReady = new Promise((resolve, reject) => {
    discordClient.once('ready', () => {
        console.log('Discord client is ready!');
        resolve();
    });
    // Consider adding a timeout to reject the promise if it takes too long for the client to become ready
});

async function ensureDiscordClientReady() {
    await discordClientReady;
}
async function fetchAttachmentUrls(messageUrl) {
    try {
        // Ensure the Discord client is ready before proceeding
        await ensureDiscordClientReady();

        // Once the client is confirmed to be ready, proceed with fetching
        const attachmentUrls = await getAttachmentUrlFromMessageUrl(messageUrl);
        return attachmentUrls;
    } catch (error) {
        console.error("Error in fetchAttachmentUrls:", error);
        throw error;
    }
}


async function getAttachmentUrlFromMessageUrl(messageUrl) {
    try {
        const urlParts = messageUrl.match(/channels\/(\d+)\/(\d+)\/(\d+)/);
        if (!urlParts) throw new Error("Invalid Discord message URL");

        const [, , channelId, messageId] = urlParts;
        const channel = await discordClient.channels.fetch(channelId);
        if (!channel) throw new Error(`Channel with ID ${channelId} could not be fetched.`);

        const message = await channel.messages.fetch(messageId);
        if (!message) throw new Error(`Message with ID ${messageId} could not be fetched.`);
        
        const attachmentUrls = message.attachments.map(attachment => attachment.url);
        console.log("Attachment URLs:", attachmentUrls);
        return attachmentUrls;
    } catch (error) {
        console.error("Error fetching attachment URLs:", error);
        throw error; // Rethrow or handle as needed
    }
}



async function downloadAndCombineFiles(discordLinks, fileName) {
    // Step 1: Convert each Discord message URL to its corresponding attachment URLs.
    const attachmentUrls = (await Promise.all(discordLinks.map(link => fetchAttachmentUrls(link)))).flat();

    // Step 2: Download each attachment.
    const partFileNames = await Promise.all(attachmentUrls.map(async (url, index) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to download file from ${url}`);

        const tempFileName = path.join(downloadsDir, `${fileName}-${index + 1}.txt`);
        await streamPipeline(response.body, fs.createWriteStream(tempFileName));
        return tempFileName;
    }));

    // Step 3: Combine the downloaded files.
    const pythonExecutable = 'python'; // Adjust as necessary for your environment.
    const combineScriptPath = './src/routes/api/download/combine_file.py'; // Ensure this path is correct.
    const combinedFileName = path.join(downloadsDir, fileName);

    // Step 4: Execute the Python script to combine the downloaded files.
    return new Promise((resolve, reject) => {
        const process = spawn(pythonExecutable, [combineScriptPath, JSON.stringify(partFileNames), combinedFileName]);

        process.stdout.on('data', (data) => {
            console.log(`stdout: ${data.toString()}`);
        });

        process.stderr.on('data', (data) => {
            console.error(`stderr: ${data.toString()}`);
        });

        process.on('close', (code) => {
            if (code === 0) {
                console.log('Python script finished successfully');
                resolve(combinedFileName);
            } else {
                reject(new Error(`Python script exited with code ${code}`));
            }
        });
    });
}


export async function GET({ url }) {
    const fileName = url.searchParams.get('fileName');
    const timeUploaded = url.searchParams.get('timeUploaded');
    if (!fileName) throw error(400, 'FileName is required');

    try {
        const fileInfo = getFileInfo(fileName, timeUploaded);
        if (!fileInfo) throw error(404, 'File not found');

        console.log("preparing to combineFile");
        const combinedFileName = await downloadAndCombineFiles(JSON.parse(fileInfo.DiscordLink), fileName);
        console.log("file combined");

        const file = fs.readFileSync(combinedFileName);
       // fs.unlinkSync(combinedFileName); // Optionally remove the combined file after serving it
       
        const response = new Response(file, {
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${path.basename(fileName)}"`, // Use path.basename to ensure the filename is correct
            }
        });
        // Optionally remove the combined file after serving it
        fs.unlinkSync(combinedFileName);
        console.log("removed file");

        // Call the cleanup function
        clearDownloadsDirectory();
        console.log("cleared downloads directory");

        return response;
    } catch (err) {
        throw error(500, `Server error: ${err.message}`);
    }
}


import { json } from '@sveltejs/kit';
import Database from 'better-sqlite3';
import { Client, GatewayIntentBits } from 'discord.js';
import { DB_PATH, DISCORD_TOKEN } from '$env/static/private';

const discordClient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
    ],
    rest: { timeout: 50_000 },
});

const DISCORD_BOT_TOKEN = DISCORD_TOKEN; // Replace with your Discord bot token
const discordClientReady = new Promise((resolve, reject) => {
    discordClient.once('ready', () => {
        console.log('Discord client is ready!');
        resolve();
    });
});
// Ensure the Discord client is logged in
discordClient.login(DISCORD_BOT_TOKEN).catch(console.error);

export async function POST({ request }) {
    const { FileName, TimeUploaded, FileSize } = await request.json();
    const db = new Database(DB_PATH, { verbose: console.log });

    try {
        await discordClientReady;
        console.log("is client ready?", discordClient.isReady());
        const row = db.prepare('SELECT * FROM files WHERE FileName = ? AND TimeUploaded = ? AND FileSize = ?').get(FileName, TimeUploaded, FileSize);
        
        if (!row) {
            return json({ error: 'File not found' }, { status: 404 });
        }

        const discordLinks = JSON.parse(row.DiscordLink);
        
        // Delete messages from Discord
        for (const link of discordLinks) {
            try {
                // Assuming the link includes the channel ID and message ID
                const [channelId, messageId] = link.split('/').slice(-2);
                const channel = await discordClient.channels.fetch(channelId);
                if (channel) {
                    await channel.messages.delete(messageId);
                }
            } catch (error) {
                console.error('Failed to delete Discord message:', error);
                // Consider how you want to handle partial failure
            }
        }

        // Delete the row from the database
        db.prepare('DELETE FROM files WHERE FileName = ? AND TimeUploaded = ? AND FileSize = ?').run(FileName, TimeUploaded, FileSize);

        return json({ message: 'File and Discord messages deleted successfully' });
    } catch (error) {
        console.error('Error deleting file:', error);
        return json({ error: 'Internal server error' }, { status: 500 });
    } finally {
        db.close();
    }
}

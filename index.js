const { Client, GatewayIntentBits } = require('discord.js');
const { Low, JSONFile } = require('lowdb');
const path = require('path');
const config = require('./config');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const db = new Low(new JSONFile(path.join(__dirname, 'db.json')));

async function initDB() {
    await db.read();
    db.data ||= { allTime: {}, weekly: {}, history: {} };
    await db.write();
}
initDB();

function getWeekKey(date) {
    const year = date.getFullYear();
    const week = Math.ceil((((date - new Date(year, 0, 1)) / 86400000) + new Date(year, 0, 1).getDay() + 1) / 7);
    return `${year}-W${week}`;
}

async function formatLeaderboard(data, client) {
    const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const result = await Promise.all(sorted.map(async ([userId, count], index) => {
        try {
            const user = await client.users.fetch(userId);
            return `**${index + 1}.** ${user.username} - ${count}`;
        } catch {
            return `**${index + 1}.** Unknown (${userId}) - ${count}`;
        }
    }));
    return result.join('\n');
}

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    const userId = message.author.id;

    await db.read();
    const weekKey = getWeekKey(new Date());

    if (message.channel.id === config.trackedChannelId) {
        db.data.allTime[userId] = (db.data.allTime[userId] || 0) + 1;
        db.data.weekly[userId] = (db.data.weekly[userId] || 0) + 1;

        if (!db.data.history[weekKey]) db.data.history[weekKey] = {};
        db.data.history[weekKey][userId] = (db.data.history[weekKey][userId] || 0) + 1;

        await db.write();
    }

    if (message.content.startsWith('!leaderboard')) {
        const args = message.content.split(' ');
        if (args[1] === 'week') {
            const key = args[2] || weekKey;
            const data = db.data.history[key];
            if (!data) return message.reply(`❌ No data for ${key}`);
            const lb = await formatLeaderboard(data, client);
            message.channel.send(`📅 **Week: ${key}**\n\n${lb}`);
        }
        if (args[1] === 'all') {
            const lb = await formatLeaderboard(db.data.allTime, client);
            message.channel.send(`🏆 **All-Time Leaderboard**\n\n${lb}`);
        }
    }

    if (message.content.startsWith('!stats')) {
        const mention = message.mentions.users.first() || message.author;
        const all = db.data.allTime[mention.id] || 0;
        const week = db.data.weekly[mention.id] || 0;
        message.channel.send(`📊 Stats for **${mention.username}**\nWeekly: ${week} msgs\nAll-Time: ${all} msgs`);
    }

    if (message.content === '!resetweek') {
        if (!config.adminIds.includes(userId)) {
            return message.reply("❌ You don't have permission.");
        }
        db.data.weekly = {};
        await db.write();
        message.channel.send('✅ Weekly stats reset.');
    }
});

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

client.login('YOUR_BOT_TOKEN'); // ← Replace this

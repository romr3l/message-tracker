import { Client, GatewayIntentBits } from 'discord.js';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName, options, user } = interaction;

    await db.read();
    const weekKey = getWeekKey(new Date());

    if (commandName === 'leaderboard') {
        const type = options.getSubcommand();
        const data = type === 'all' ? db.data.allTime : db.data.history[weekKey];
        if (!data) {
            return interaction.reply({ content: '❌ No data available for that leaderboard.', ephemeral: true });
        }

        const sorted = Object.entries(data).sort(([, a], [, b]) => b - a).slice(0, 10);
        const leaderboard = await Promise.all(sorted.map(async ([userId, count], i) => {
            try {
                const u = await client.users.fetch(userId);
                return `**${i + 1}.** ${u.username} — ${count}`;
            } catch {
                return `**${i + 1}.** Unknown (${userId}) — ${count}`;
            }
        }));

        await interaction.reply({
            embeds: [{
                title: type === 'all' ? '🏆 All-Time Leaderboard' : `📅 Weekly Leaderboard (${weekKey})`,
                description: leaderboard.join('\n') || 'No messages yet.',
                color: 0x00BFFF
            }]
        });
    }

    if (commandName === 'stats') {
        const target = options.getUser('user') || user;
        const all = db.data.allTime[target.id] || 0;
        const week = db.data.weekly[target.id] || 0;

        await interaction.reply({
            embeds: [{
                title: `📊 Stats for ${target.username}`,
                fields: [
                    { name: 'Weekly Messages', value: `${week}`, inline: true },
                    { name: 'All-Time Messages', value: `${all}`, inline: true }
                ],
                color: 0x5865F2
            }]
        });
    }

    if (commandName === 'resetweek') {
        if (!config.adminIds.includes(user.id)) {
            return interaction.reply({ content: '❌ You do not have permission to reset the week.', ephemeral: true });
        }

        db.data.weekly = {};
        await db.write();
        await interaction.reply('✅ Weekly message stats have been reset.');
    }
});

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

client.login(process.env.BOT_TOKEN);

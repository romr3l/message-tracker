import { Client, GatewayIntentBits } from 'discord.js';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ────── Discord client ──────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ────── LowDB setup ──────
const file     = path.join(__dirname, 'db.json');
const adapter  = new JSONFile(file);
const db       = new Low(adapter, {
  defaultData: { allTime: {}, weekly: {}, history: {} }
});

await db.read();
if (!db.data.allTime) {
  db.data = { allTime: {}, weekly: {}, history: {} };
  await db.write();
}

// ────── Helpers ──────
function getWeekKey(date = new Date()) {
  const year = date.getFullYear();
  const week = Math.ceil((((date - new Date(year, 0, 1)) / 86400000) +
                           new Date(year, 0, 1).getDay() + 1) / 7);
  return `${year}-W${week}`;
}

// ──────────────────────────────────────────────────────────────
// 1) Count messages
// ──────────────────────────────────────────────────────────────
client.on('messageCreate', async msg => {
  if (msg.author.bot) return;
  if (msg.channel.id !== config.trackedChannelId) return;

  const uid     = msg.author.id;
  const weekKey = getWeekKey();

  db.data.allTime[uid]  = (db.data.allTime[uid]  || 0) + 1;
  db.data.weekly[uid]   = (db.data.weekly[uid]   || 0) + 1;
  db.data.history[weekKey] ??= {};
  db.data.history[weekKey][uid] =
        (db.data.history[weekKey][uid] || 0) + 1;

  await db.write();
});

// ──────────────────────────────────────────────────────────────
// 2) Slash commands
// ──────────────────────────────────────────────────────────────
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  await db.read();
  const currentWeekKey = getWeekKey();

  switch (interaction.commandName) {
    case 'leaderboard': {
      const type = interaction.options.getSubcommand();
      const inputWeek = interaction.options.getString('number');
      const inputYear = interaction.options.getInteger('year');

      let weekKey = currentWeekKey;
      if (type === 'week' && inputWeek) {
        const week = inputWeek.toUpperCase().startsWith('W') ? inputWeek.toUpperCase() : `W${inputWeek}`;
        const year = inputYear || new Date().getFullYear();
        weekKey = `${year}-${week}`;
      }

      const data = type === 'all'
        ? db.data.allTime
        : db.data.history[weekKey] ?? {};

      const sorted = Object.entries(data)
                           .sort(([, a], [, b]) => b - a)
                           .slice(0, 10);

      const lines = sorted.map(
        ([id, count], i) => `${i + 1}. <@${id}> • ${count} messages sent.`
      );

      return interaction.reply({
        embeds: [{
          title: type === 'all'
            ? 'Messages Leaderboard (All-Time)'
            : `Messages Leaderboard (Weekly – ${weekKey})`,
          description: `The delay between messages being counted is **0** seconds.\n\n` +
                       (lines.join('\n') || '*No messages yet.*'),
          color: 0x5865F2
        }]
      });
    }

    case 'stats': {
      const target = interaction.options.getUser('user') || interaction.user;
      const week   = db.data.weekly[target.id]   || 0;
      const all    = db.data.allTime[target.id]  || 0;

      return interaction.reply({
        embeds: [{
          title: `Messages for ${target.username}`,
          fields: [
            { name: 'Weekly', value: String(week), inline: true },
            { name: 'All-Time', value: String(all), inline: true }
          ],
          color: 0x5865F2
        }]
      });
    }

    case 'resetweek': {
      if (!config.adminIds.includes(interaction.user.id))
        return interaction.reply({ content: '❌ No permission.', ephemeral: true });

      db.data.weekly = {};
      await db.write();
      return interaction.reply('✅ Weekly stats reset.');
    }
  }
});

client.once('ready', () => console.log(`✅ Logged in as ${client.user.tag}`));
client.login(process.env.BOT_TOKEN);

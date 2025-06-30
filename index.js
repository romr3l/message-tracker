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
  defaultData: {
    allTime: {},
    weekly: {},
    history: {},
    currentWeek: getWeekKey()  // 🆕 initialize current week on first run
  }
});

await db.read();

// ✅ Safe fallback: Only set missing keys, avoid overwriting valid data
db.data.allTime     ||= {};
db.data.weekly      ||= {};
db.data.history     ||= {};
db.data.currentWeek ||= getWeekKey();

await db.write();

// ────── Helpers ──────
function getWeekKey(date = new Date()) {
  // Convert to EST (UTC-4)
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const est = new Date(utc - (4 * 60 * 60000));

  // If it's before 12 PM on Sunday, treat it as part of the previous week
  const day = est.getDay(); // Sunday = 0
  const hour = est.getHours();

  // If it's Sunday and before noon, subtract one day so it counts as last week
  if (day === 0 && hour < 12) {
    est.setDate(est.getDate() - 1);
  }

  // Set Jan 1 of the year and calculate week number
  const year = est.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const diff = est - jan1;
  const dayOfYear = Math.floor(diff / 86400000);

  const week = Math.floor(dayOfYear / 7) + 1;
  return `${year}-W${week}`;
}


// ──────────────────────────────────────────────────────────────
// 1) Count messages (auto-rollover)
// ──────────────────────────────────────────────────────────────
client.on('messageCreate', async msg => {
  if (msg.author.bot) return;
  if (msg.channel.id !== config.trackedChannelId) return;

  const thisWeek = getWeekKey();          // e.g. 2025-W27

  /* 📅 1. If the calendar week has changed, archive + reset */
  if (thisWeek !== db.data.currentWeek) {
    // Snapshot the finished week
    db.data.history[db.data.currentWeek] = { ...db.data.weekly };

    // Clear weekly counters and advance pointer
    db.data.weekly = {};
    db.data.currentWeek = thisWeek;
  }

  /* 📝 2. Normal counting logic */
  const uid = msg.author.id;

  db.data.allTime[uid]  = (db.data.allTime[uid]  || 0) + 1;
  db.data.weekly[uid]   = (db.data.weekly[uid]   || 0) + 1;

  db.data.history[thisWeek] ??= {};
  db.data.history[thisWeek][uid] =
        (db.data.history[thisWeek][uid] || 0) + 1;

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

    case 'addmessages': {
      if (!config.adminIds.includes(interaction.user.id))
        return interaction.reply({ content: '❌ No permission.', ephemeral: true });

      const target = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');

      if (!target || !amount || amount <= 0)
        return interaction.reply({ content: '❌ Invalid user or amount.', ephemeral: true });

      const uid = target.id;
      const thisWeek = getWeekKey();

      db.data.allTime[uid]  = (db.data.allTime[uid]  || 0) + amount;
      db.data.weekly[uid]   = (db.data.weekly[uid]   || 0) + amount;

      db.data.history[thisWeek] ??= {};
      db.data.history[thisWeek][uid] =
        (db.data.history[thisWeek][uid] || 0) + amount;

      await db.write();

      return interaction.reply(`✅ Added **${amount}** messages to <@${uid}>.`);
    }
  }
});



client.once('ready', () => console.log(`✅ Logged in as ${client.user.tag}`));
client.login(process.env.BOT_TOKEN);

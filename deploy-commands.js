import { REST, Routes } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';

const commands = [
  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show message leaderboards')
    .addSubcommand(s => s.setName('week').setDescription('Current week'))
    .addSubcommand(s => s.setName('all').setDescription('All-time')),
  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Show user stats')
    .addUserOption(o => o.setName('user').setDescription('User').setRequired(false)),
  new SlashCommandBuilder()
    .setName('resetweek')
    .setDescription('Reset weekly stats (admin only)')
].map(c => c.toJSON());

//  <<< PUT YOUR IDs HERE >>>
const CLIENT_ID = '1365422315642556457';
const GUILD_ID  = '1365422315642556457';

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

try {
  console.log('Deploying slash commands...');
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
  console.log('✅ Commands deployed.');
} catch (err) {
  console.error(err);
}

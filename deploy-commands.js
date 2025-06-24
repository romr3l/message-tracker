import 'dotenv/config';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import { SlashCommandBuilder } from '@discordjs/builders';

const commands = [
  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show message leaderboards')
    .addSubcommand(s =>
      s.setName('week').setDescription('Current week')
       .addIntegerOption(o =>
         o.setName('top').setDescription('Top how many?')
         .setMinValue(1).setMaxValue(100).setRequired(false)))
    .addSubcommand(s =>
      s.setName('all').setDescription('All-time')
       .addIntegerOption(o =>
         o.setName('top').setDescription('Top how many?')
         .setMinValue(1).setMaxValue(100).setRequired(false))),
  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Show user stats')
    .addUserOption(o =>
      o.setName('user').setDescription('User').setRequired(false)),
  new SlashCommandBuilder()
    .setName('resetweek')
    .setDescription('Reset weekly stats')
    .setDefaultMemberPermissions(0)
    .setDMPermission(false)
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

try {
  console.log('📤 Deploying slash commands...');
  await rest.put(
    Routes.applicationGuildCommands(process.env.APP_ID, process.env.GUILD_ID),
    { body: commands }
  );
  console.log('✅ Commands deployed.');
} catch (err) {
  console.error('❌ Failed to deploy commands:', err);
}


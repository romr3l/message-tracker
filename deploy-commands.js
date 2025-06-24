// deploy-commands.js
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import { SlashCommandBuilder } from '@discordjs/builders';
import dotenv from 'dotenv';
dotenv.config();

const commands = [
  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show message leaderboards')
    .addSubcommand(sub =>
      sub.setName('week')
         .setDescription('Current week')
         .addIntegerOption(o =>
           o.setName('top')
            .setDescription('How many users to show (1–100)')
            .setMinValue(1)
            .setMaxValue(100)
            .setRequired(false)))
    .addSubcommand(sub =>
      sub.setName('all')
         .setDescription('All-time')
         .addIntegerOption(o =>
           o.setName('top')
            .setDescription('How many users to show (1–100)')
            .setMinValue(1)
            .setMaxValue(100)
            .setRequired(false))),

  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Show message stats for a user')
    .addUserOption(o =>
      o.setName('user')
       .setDescription('Leave empty to view your own stats')
       .setRequired(false)),

  new SlashCommandBuilder()
    .setName('resetweek')
    .setDescription('Reset weekly stats (admin only)')
    .setDefaultMemberPermissions(0) // blocks all users unless whitelisted in code
    .setDMPermission(false)
].map(command => command.toJSON());

// Read from Railway environment
const CLIENT_ID = process.env.APP_ID;
const GUILD_ID  = process.env.GUILD_ID;

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

try {
  console.log('📤 Deploying slash commands...');
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
  console.log('✅ Slash commands deployed successfully.');
} catch (err) {
  console.error('❌ Error de


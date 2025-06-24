// deploy-commands.js
import { REST }               from '@discordjs/rest';
import { Routes }             from 'discord-api-types/v10';
import { SlashCommandBuilder } from '@discordjs/builders';

const commands = [
  /* /leaderboard week|all [top] */
  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show message leaderboards')
    .addSubcommand(sc =>
      sc.setName('week')
        .setDescription('Current week')
        .addIntegerOption(o =>
          o.setName('top')
           .setDescription('How many users to show (1-100)')
           .setMinValue(1)
           .setMaxValue(100)
           .setRequired(false)))
    .addSubcommand(sc =>
      sc.setName('all')
        .setDescription('All-time')
        .addIntegerOption(o =>
          o.setName('top')
           .setDescription('How many users to show (1-100)')
           .setMinValue(1)
           .setMaxValue(100)
           .setRequired(false))),

  /* /stats [user] */
  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Show message stats for a user')
    .addUserOption(o =>
      o.setName('user')
       .setDescription('Leave empty for yourself')
       .setRequired(false)),

  /* /resetweek (admin only) */
  new SlashCommandBuilder()
    .setName('resetweek')
    .setDescription('Reset weekly stats')
    .setDefaultMemberPermissions(0)          // block everyone at Discord level
    .setDMPermission(false)
].map(c => c.toJSON());


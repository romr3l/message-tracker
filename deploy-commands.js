import { REST, Routes } from '@discordjs/rest';
import { SlashCommandBuilder } from '@discordjs/builders';

const commands = [
  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show leaderboard')
    .addSubcommand(sub =>
      sub.setName('week').setDescription('Show this week\'s leaderboard')
    )
    .addSubcommand(sub =>
      sub.setName('all').setDescription('Show all-time leaderboard')
    ),
  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Show your message stats')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('User to show stats for')
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName('resetweek')
    .setDescription('Reset the current weekly message stats'),
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

// replace with your app and guild ID:
const CLIENT_ID = 'YOUR_BOT_CLIENT_ID';
const GUILD_ID = 'YOUR_GUILD_ID';

try {
  console.log('Deploying slash commands...');
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
  console.log('✅ Slash commands deployed.');
} catch (err) {
  console.error(err);
}

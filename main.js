const { Client, MessageEmbed } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const tcpp = require('tcp-ping');
const async = require('async');
const { TOKEN, GUILD_ID, CLIENT_ID, IPs } = require('./config.json');
const client = new Client({
  intents: [
    'GUILDS',
    'GUILD_MESSAGES'
  ]
});

client.on('ready', async () => {
  console.log(`Connecté en tant que ${client.user.tag}!`);
  console.log(`Bot démarré avec succès!`);

  const commands = [{
    name: 'status',
    description: 'Envoie l\'embed du status.',
  }];

  const rest = new REST({ version: '9' }).setToken(TOKEN);

  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands },
    );
    console.log('Les commandes d\'application ont été enregistrées avec succès.');
  } catch (error) {
    console.error(error);
  }
});

function createEmbed(status) {
  const embed = new MessageEmbed()
    .setColor('#46a7f2')
    .setTitle('Status de StarHeberg')
    .addFields(
      { 
        name: '**WEB**', 
        value: `Web-01: ${status[0]}`,
        inline: true 
      },
      { 
        name: '\u200B', 
        value: '\u200B', 
        inline: true 
      },
      { 
        name: '**GAMES**', 
        value: `Node-01: ${status[1]}\nNode-02: ${status[2]}`, 
        inline: true 
      }
    )
    .setTimestamp()
    .setFooter({ text: 'Dernière mise à jour' });

  return embed;
}

async function performAllPings(nodes, status) {
  const promises = Object.keys(nodes).map(key => {
    return new Promise((resolve) => {
      try {
        tcpp.ping({ address: nodes[key] }, function(err, data) {
          if (err || data.max === undefined) {
            status[key] = '🔴 Hors Ligne';
          } else {
            let ping = data.avg.toFixed(0);
            status[key] = `🟢 En Ligne  (${ping}ms)`;
          }
          resolve();
        });
      } catch (error) {
        status[key] = '🔴 Hors Ligne';
        resolve();
      }
    });
  });

  await Promise.all(promises);
}

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'status') {
    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
      return interaction.reply('Tu n\'as pas la permission...');
    }

    const loading = '🕒 Ping en cours ...';
    const nodes = {
      0: IPs.WEB,
      1: IPs["Node-01"],
      2: IPs["Node-02"],
    };

    const status = {
      0: loading,
      1: loading,
      2: loading,
    };

    const embed = createEmbed(status);
    const sentMessage = await interaction.reply({ embeds: [embed], fetchReply: true });

    async function updatePings() {
      await performAllPings(nodes, status);
      await sentMessage.edit({ embeds: [createEmbed(status)] });
    }

    updatePings();

    setInterval(updatePings, 10000);
  }
});

client.login(TOKEN);

const { Events, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const bot_creator_id = '224490278478675968';

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (interaction.isButton()) {
			if (interaction.customId.startsWith('idB')) { return interaction.reply({ content: interaction.customId.slice(3), ephemeral: true }).catch((err) => console.log('ERROR IN BUTTONS JS', err)); }
			if (interaction.customId.startsWith('coop-delete')) {
				if (interaction.user.id !== interaction.customId.slice(11)) {
					return interaction.reply({ content: 'You can\'t interact with it, because you are not the one who used the command!', ephemeral: true }).catch((err) => console.log('ERROR IN BUTTONS JS', err));
				}
				return interaction.message.delete();
			}
			if (interaction.customId === 'help-kofi') {
				const member = interaction.guild.members.cache.find(m => m.id === bot_creator_id);
				const supEmbed = new EmbedBuilder()
					.setTitle('Tips')
					.setColor('#ff5c62')
					.setThumbnail(`${member.user.displayAvatarURL()}`)
					.setDescription('Hi, it\'s Pasha. If you enjoy using my bot and would like to support me, you can visit my Ko-fi. Any tip would be highly appreciated. <3');
				const linkButton = new ButtonBuilder()
					.setLabel('Pasha on Ko-fi')
					.setEmoji('1102315230094163968')
					.setURL('https://ko-fi.com/pashaomni')
					.setStyle(ButtonStyle.Link);
				const row = new ActionRowBuilder().addComponents(linkButton);
				return interaction.reply({
					embeds: [supEmbed],
					components: [row],
					ephemeral: true,
				}).catch((err) => console.log('ERROR IN BUTTONS JS', err));
			}
		}
	},
};
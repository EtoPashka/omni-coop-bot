const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const bot_creator_id = '224490278478675968';
const coopChannel = '<#1042837815752396811>';

module.exports = {
	cooldown: 3,
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('Shows the information about the bot'),
	async execute(interaction) {
		const member = interaction.guild.members.cache.find(m => m.id === bot_creator_id);
		const helpEmbed = new EmbedBuilder()
			.setTitle('Bot information')
			.setDescription(`**NOTE**: use commands in ${coopChannel}!\n\nFor more detailed information about the bot and its commands check **[this article](https://telegra.ph/Omni-Coop-Bot-Guide-05-17)**\n\nList of commands:`)
			.addFields(
				{ name: '/account', value:
                '**/account create** — gently creates your account.\n\n' +
                '**/account update** — gently updates your account.\n\n' +
                '**/account delete** — deletes your account to the oblivion.\n' },
				{ name: '/recycle', value:
				'Check or update your Recycling Room levels via this command.\n' },
				{ name: '/character', value:
                '**/character add** — adds selected Nikke to your account (inventory).\n\n' +
                '**/character update** — updates selected Nikke in your account.\n\n' +
                '**/character remove** — removes selected Nikke from your account.\n' },
				{ name: '/inventory', value:
				'Allows you to check your Nikkes and manage their equipment.\n' },
				{ name: '/profile', value:
				'Shows your or someone else\'s profile card and allows you to edit your own profile (theme, characters displayed).\n' },
				{ name: '/top', value:
                'Shows the top for selected Nikke.\n' },
			)
			.setFooter({ text: `Created by ${member.user.tag}`, iconURL: member.user.displayAvatarURL() });
		const supButton = new ButtonBuilder()
			.setCustomId('help-kofi')
			.setEmoji('1102315230094163968')
			.setStyle(ButtonStyle.Secondary);
		const row = new ActionRowBuilder().addComponents(supButton);
		return interaction.reply({
			embeds: [helpEmbed],
			components: [row],
			ephemeral: true,
		});
	},
};
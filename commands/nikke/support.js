const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const bot_creator_id = '224490278478675968';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('support')
		.setDescription('You can support me if you wish.'),
	async execute(interaction) {
		const member = interaction.guild.members.cache.find(m => m.id === bot_creator_id);
		const supEmbed = new EmbedBuilder()
			.setTitle('Tips')
			.setColor('#ff5c62')
			.setThumbnail(`${member.user.displayAvatarURL()}`)
			.setDescription('Hi, it\'s Pasha. If you enjoy using my bot and would like to support me, you can visit my Ko-fi. Any tip would be highly appreciated. Maybe it will help me to get rid of my Scarletless curse... \nAnyway, if my current cheap bot hosting server turns out to be bad, I\'ll try to find a better one using those funds. But I think it will be fine.');
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
		});
	},
};
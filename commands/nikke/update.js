const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const userInfo = require('./db/database.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('update')
		.setDescription('Updates your in-game name or/and in-game ID')
		.addSubcommand(subcommand =>
			subcommand
				.setName('profile')
				.setDescription('Updates your in-game name or/and in-game ID')
				.addStringOption(option =>
					option
						.setName('name')
						.setDescription('Enter your in-game name')
						.setMinLength(1)
						.setMaxLength(8))
				.addStringOption(option =>
					option
						.setName('id')
						.setDescription('Enter your in-game ID')
						.setMinLength(8)
						.setMaxLength(8))),
	async execute(interaction) {
		if (!interaction.options.getString('name') && !interaction.options.getString('id')) {
			return interaction.reply({ content: 'You have to enter at least 1 parameter that you want to update.', ephemeral: true });
		}
		const userData = await userInfo.findOne({ _id: interaction.user.id });
		if (!userData) {
			return interaction.reply({ content: 'You don\'t have a profile! Create one via `create profile` command.', ephemeral: true });
		}
		const name = interaction.options.getString('name') ?? userData.name;
		const ID = interaction.options.getString('id') ?? userData.ID;
		await userInfo.findOneAndUpdate({
			_id: interaction.user.id,
		}, {
			username: interaction.user.tag,
			name: name,
			ID: ID,
		}, {});
		const replyEmbed = new EmbedBuilder()
			.setFields(
				{ name: 'In-game name', value: name, inline: true },
				{ name: 'In-game ID', value: ID, inline: true },
			);
		await interaction.reply({ content: 'Your profile has been updated successfully.', embeds: [replyEmbed], ephemeral: true });
	},
};
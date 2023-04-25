const { SlashCommandBuilder } = require('discord.js');
const userInfo = require('./db/database.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('delete')
		.setDescription('Deletes your profile from the database')
		.addSubcommand(subcommand =>
			subcommand
				.setName('profile')
				.setDescription('Deletes your profile from the database')),
	async execute(interaction) {
		const userData = await userInfo.findOne({ _id: interaction.user.id });
		if (!userData) {
			return interaction.reply({ content: 'You don\'t have a profile!', ephemeral: true });
		}
		await userInfo.findOneAndDelete({ _id: interaction.user.id });
		return interaction.reply({ content: 'Your profile was successully deleted.', ephemeral: true });
	},
};

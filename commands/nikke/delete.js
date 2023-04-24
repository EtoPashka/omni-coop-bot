const { SlashCommandBuilder } = require('discord.js');
const userInfo = require('./db/database.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('delete')
		.setDescription('Deletes your profile from the database')
		.addSubcommand(subcommand =>
			subcommand
				.setName('pofile')
				.setDescription('Deletes your profile from the database')),
	async execute(interaction) {
		const userData = await userInfo.findOne({ _id: interaction.user.id });
		if (!userData) {
			return interaction.reply({ content: 'You don\'t have a profile! Add a character to have one.', ephemeral: true });
		}
		await userInfo.findOneAndDelete({ _id: interaction.user.id });
		await interaction.reply({ content: `<@${interaction.user.id}>, your profile was deleted.`, ephemeral: true });
	},
};

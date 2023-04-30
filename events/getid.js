const { Events } = require('discord.js');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (interaction.isButton()) {
			if (interaction.customId.startsWith('idB')) { return interaction.reply({ content: interaction.customId.slice(3), ephemeral: true }); }
		}
	},
};
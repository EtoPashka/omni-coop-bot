const { SlashCommandBuilder } = require('discord.js');
const { themes } = require('./themes.json');
const userInfo = require('./db/database.js');


module.exports = {
	cooldown: 5,
	data: new SlashCommandBuilder()
		.setName('set')
		.setDescription('Set a fancy theme to your profile')
		.addSubcommand(subcommand =>
			subcommand
				.setName('theme')
				.setDescription('Set a fancy theme to your profile')
				.addStringOption(option =>
					option
						.setName('style')
						.setDescription('Choose a theme')
						.setRequired(true)
						.setAutocomplete(true))),
	async autocomplete(interaction) {
		const focusedOption = interaction.options.getFocused(true);
		const themeNames = themes.map(t => t.name);
		const filtered = themeNames.filter(choice => choice.toLowerCase().startsWith(focusedOption.value.toLowerCase()));
		await interaction.respond(filtered.map(choice => ({ name: choice, value: choice })));
	},
	async execute(interaction) {
		const themeName = interaction.options.getString('style');
		const theme = themes.find(t => t.name === themeName);
		if (!(await userInfo.findOneAndUpdate({
			_id: interaction.user.id,
		}, {
			username: interaction.user.tag,
			theme: {
				bg: theme.bg,
				stroke: theme.stroke,
				text: theme.text,
			},
		}, {}))) {
			return interaction.reply({ content: `<@${interaction.user.id}>, you don't have a profile!`, ephemeral: true });
		}
		await interaction.reply({ content: `<@${interaction.user.id}>, theme **${themeName}** has been set successfully!`, ephemeral: true });
	},
};
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const userInfo = require('./db/database.js');
const { themes } = require('./themes.json');
const defaultTheme = 'Guillotine (Purple)';
const num_alph = '0123456789';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('create')
		.setDescription('Creates your profile')
		.addSubcommand(subcommand =>
			subcommand
				.setName('profile')
				.setDescription('Creates your profile')
				.addStringOption(option =>
					option
						.setName('name')
						.setDescription('Enter your in-game name')
						.setRequired(true)
						.setMinLength(1)
						.setMaxLength(8))
				.addStringOption(option =>
					option
						.setName('id')
						.setDescription('Enter your in-game ID')
						.setRequired(true)
						.setMinLength(8)
						.setMaxLength(8))),
	async execute(interaction) {
		if (await userInfo.findOne({ _id: interaction.user.id })) {
			return interaction.reply({ content: 'You already have a profile!', ephemeral: true });
		}
		const name = interaction.options.getString('name');
		const ID = interaction.options.getString('id');
		for (let i = 0; i < 8; i++) {
			if (!num_alph.includes(ID[i])) {
				return interaction.reply({ content: 'The ID should be 8-digit numeric code.', ephemeral: true });
			}
		}
		const theme = themes.find(t => t.name === defaultTheme);
		await userInfo.findOneAndUpdate({
			_id: interaction.user.id,
		}, {
			_id: interaction.user.id,
			username: interaction.user.tag,
			name: name,
			ID: ID,
			theme: {
				bg: theme.bg,
				stroke: theme.stroke,
				text: theme.text,
			},
			characters: [],
		}, { upsert: true });
		const replyEmbed = new EmbedBuilder()
			.setFields(
				{ name: 'In-game name', value: name, inline: true },
				{ name: 'In-game ID', value: ID, inline: true },
			);
		await interaction.reply({ content: 'Your profile has been created successfully.', embeds: [replyEmbed], ephemeral: true });
	},
};
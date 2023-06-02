const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ComponentType, ActionRowBuilder } = require('discord.js');
const userInfo = require('./data/database.js');
const { themes } = require('./data/themes.json');
const defaultTheme = 'Guillotine (Purple)';
const num_alph = '0123456789';

module.exports = {
	cooldown: 3,
	data: new SlashCommandBuilder()
		.setName('account')
		.setDescription('Manage your Co-Op Bot account')
		.addSubcommand(subcommand =>
			subcommand
				.setName('create')
				.setDescription('Create your Co-Op Bot account')
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
						.setMaxLength(8))
				.addStringOption(option =>
					option
						.setName('server')
						.setDescription('Choose your server')
						.setRequired(true)
						.addChoices(
							{ name: 'Global', value: 'Global' },
							{ name: 'SEA', value: 'SEA' },
						)))
		.addSubcommand(subcommand =>
			subcommand
				.setName('update')
				.setDescription('Update your account name, ID or profile theme')
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
						.setMaxLength(8))
				.addStringOption(option =>
					option
						.setName('server')
						.setDescription('Choose your server')
						.addChoices(
							{ name: 'Global', value: 'Global' },
							{ name: 'SEA', value: 'SEA' },
						)))
		.addSubcommand(subcommand =>
			subcommand
				.setName('delete')
				.setDescription('Delete your account')),
	async autocomplete(interaction) {
		// autocomplete for themes
		const focusedOption = interaction.options.getFocused(true);
		const themeNames = themes.map(t => t.name);
		const filtered = themeNames.filter(choice => choice.toLowerCase().startsWith(focusedOption.value.toLowerCase()));
		await interaction.respond(filtered.map(choice => ({ name: choice, value: choice })));
	},
	async execute(interaction) {
		// await interaction.deferReply({ ephemeral: true });
		// stuff for create subcommand
		if (interaction.options.getSubcommand() === 'create') {
			await interaction.deferReply({ ephemeral: true });
			if (await userInfo.findOne({ _id: interaction.user.id })) {
				return interaction.editReply({ content: 'You already have an account!' }).catch((err) => console.log('ERROR IN ACCOUNT JS', err));
			}
			// getting and checking name
			const name = interaction.options.getString('name');
			let bad = false;
			let str = 'You can\'t use';
			for (let i = 0; i < name.length; i++) {
				if (!RegExp(/^\p{L}/, 'u').test(name[i]) && !num_alph.includes(name[i])) {
					if (!str.includes(name[i])) { str += ` \`${name[i]}\`,`; }
					bad = true;
				}
			}
			if (bad) {
				str = str.slice(0, -1) + '.';
				return interaction.editReply({ content: str }).catch((err) => console.log('ERROR IN ACCOUNT JS', err));
			}
			// getting and checking id
			const ID = interaction.options.getString('id');
			for (let i = 0; i < 8; i++) {
				if (!num_alph.includes(ID[i])) {
					return interaction.editReply({ content: 'The ID should be 8-digit numeric code.' }).catch((err) => console.log('ERROR IN ACCOUNT JS', err));
				}
			}
			const server = interaction.options.getString('server');
			// theme
			const theme = defaultTheme;
			// creating new document
			await userInfo.findOneAndUpdate({
				_id: interaction.user.id,
			}, {
				_id: interaction.user.id,
				edit_profile: false,
				inventory: false,
				name: name,
				ID: ID,
				server: server,
				theme: theme,
				rr_general_lvl: 0,
				rr_class: [{ name: 'Attacker', lvl: 0 }, { name: 'Supporter', lvl: 0 }, { name: 'Defender', lvl: 0 }],
				rr_manu: [
					{ name: 'Elysion', lvl: 0 },
					{ name: 'Tetra', lvl: 0 },
					{ name: 'Missilis', lvl: 0 },
					{ name: 'Pilgrim', lvl: 0 },
					{ name: 'Abnormal', lvl: 0 },
				],
				profileNikkes: [],
				characters: [],
			}, { upsert: true });
			// consctrcting embed for reply and then reply
			const replyEmbed = new EmbedBuilder()
				.setTitle('Account info')
				.setFields(
					{ name: 'In-game name', value: name, inline: true },
					{ name: 'In-game ID', value: ID, inline: true },
					{ name: 'Server', value: server, inline: true },
				);
			return interaction.editReply({ content: 'Your account has been created successfully.', embeds: [replyEmbed] }).catch((err) => console.log('ERROR IN ACCOUNT JS', err));
		}
		// stuff for update subcommand
		if (interaction.options.getSubcommand() === 'update') {
			await interaction.deferReply({ ephemeral: true });
			const userData = await userInfo.findOne({ _id: interaction.user.id });
			if (!userData) {
				return interaction.editReply({ content: 'You don\'t have an account! Create one via **/account create** command.' }).catch((err) => console.log('ERROR IN ACCOUNT JS', err));
			}
			// getting and checking name
			if (!interaction.options.getString('name') && !interaction.options.getString('id') && !interaction.options.getString('server')) {
				return interaction.editReply({ content: 'Enter at least 1 parameter you want to update.' }).catch((err) => console.log('ERROR IN ACCOUNT JS', err));
			}
			const name = interaction.options.getString('name') ?? userData.name;
			let bad = false;
			let str = 'You can\'t use';
			for (let i = 0; i < name.length; i++) {
				if (!RegExp(/^\p{L}/, 'u').test(name[i]) && !num_alph.includes(name[i])) {
					if (!str.includes(name[i])) { str += ` \`${name[i]}\`,`; }
					bad = true;
				}
			}
			if (bad) {
				str = str.slice(0, -1) + '.';
				return interaction.editReply({ content: str }).catch((err) => console.log('ERROR IN ACCOUNT JS', err));
			}
			// getting and checking id
			const ID = interaction.options.getString('id') ?? userData.ID;
			for (let i = 0; i < 8; i++) {
				if (!num_alph.includes(ID[i])) {
					return interaction.editReply({ content: 'The ID should be 8-digit numeric code.' }).catch((err) => console.log('ERROR IN ACCOUNT JS', err));
				}
			}
			const server = interaction.options.getString('server') ?? userData.server;
			// creating new document
			await userInfo.findOneAndUpdate({
				_id: interaction.user.id,
			}, {
				name: name,
				ID: ID,
				server: server,
			}, {});
			// consctrcting embed for reply and then reply
			const replyEmbed = new EmbedBuilder()
				.setTitle('Account info')
				.setFields(
					{ name: 'In-game name', value: name, inline: true },
					{ name: 'In-game ID', value: ID, inline: true },
					{ name: 'Server', value: server, inline: true },
				);
			return interaction.editReply({ content: 'Your account info has been updated successfully.', embeds: [replyEmbed] }).catch((err) => console.log('ERROR IN ACCOUNT JS', err));
		}
		// stuff for delete subcommand
		if (interaction.options.getSubcommand() === 'delete') {
			const userData = await userInfo.findOne({ _id: interaction.user.id });
			if (!userData) {
				return interaction.reply({ content: 'You don\'t have an account!', ephemeral: true }).catch((err) => console.log('ERROR IN ACCOUNT JS', err));
			}
			// creating menu to confirm account deletion
			const confirmButton = new ButtonBuilder()
				.setCustomId('account-delete-confirm')
				.setLabel('Confirm')
				.setStyle(ButtonStyle.Danger);
			const cancelButton = new ButtonBuilder()
				.setCustomId('account-delete-cancel')
				.setLabel('Cancel')
				.setStyle(ButtonStyle.Secondary);
			const warningRow = new ActionRowBuilder().addComponents(cancelButton, confirmButton);
			const warningEmbed = new EmbedBuilder()
				.setTitle('WARNING')
				.setColor('#ed4245')
				.setDescription('You are going to delete your account. There is __no way back__ after that.')
				.setFooter({ text: 'Please, reply within 15 seconds.' });
			// sending menu and getting the response
			const response = await interaction.reply({ content: `<@${interaction.user.id}>`, embeds: [warningEmbed], components: [warningRow], ephemeral: true }).catch((err) => console.log('ERROR IN ACCOUNT JS', err));
			const buttonCollector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 15_000 });
			let inactive = true;
			buttonCollector.on('end', async () => {
				if (inactive) { return response.edit({ content: 'Account deletion expired.', embeds: [], components: [] }).catch((err) => console.log('ERROR IN ACCOUNT JS WITH EDITING MANAGE MESSAGE WHEN DELETING ACC', err)); }
			});
			buttonCollector.on('collect', async i => {
				if (i.customId === 'account-delete-cancel') {
					inactive = false;
					buttonCollector.stop();
					return i.update({ content: 'Account deletion has been cancelled.', embeds: [], components: [] }).catch((err) => console.log('ERROR IN ACCOUNT JS', err));
				}
				if (i.customId === 'account-delete-confirm') {
					await userInfo.findOneAndDelete({ _id: interaction.user.id });
					inactive = false;
					buttonCollector.stop();
					return i.update({ content: 'Your account has been deleted succesfully.', embeds: [], components: [] }).catch((err) => console.log('ERROR IN ACCOUNT JS', err));
				}
			});
		}
	},

};
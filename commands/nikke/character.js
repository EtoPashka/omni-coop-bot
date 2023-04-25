const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { nikkeList } = require('./nikkedata.json');
// array of nikkes names
const nikkeNames = nikkeList.map(char => char.name);
const userInfo = require('./db/database.js');


module.exports = {
	data: new SlashCommandBuilder()
		.setName('character')
		.setDescription('Add or remove a character or update its info!')
		// add
		.addSubcommand(subcommand =>
			subcommand
				.setName('add')
				.setDescription('Add a character to your profile!')
				.addStringOption(option =>
					option
						.setName('name')
						.setDescription('Start typing to pick a character by name!')
						.setAutocomplete(true)
						.setRequired(true))
				.addIntegerOption(option =>
					option
						.setName('s1')
						.setDescription('Enter the Skill 1 level of the selected character')
						.setMinValue(1)
						.setMaxValue(10)
						.setRequired(true))
				.addIntegerOption(option =>
					option
						.setName('s2')
						.setDescription('Enter the Skill 2 level of the selected character')
						.setMinValue(1)
						.setMaxValue(10)
						.setRequired(true))
				.addIntegerOption(option =>
					option
						.setName('burst')
						.setDescription('Enter the Burst level of the selected character')
						.setMinValue(1)
						.setMaxValue(10)
						.setRequired(true))
				.addIntegerOption(option =>
					option
						.setName('overload')
						.setDescription('Enter the nubmer of OL gear on the selected character')
						.setMinValue(0)
						.setMaxValue(4)
						.setRequired(true)))
		// remove
		.addSubcommand(subcommand =>
			subcommand
				.setName('remove')
				.setDescription('Remove a character from your profile!')
				.addStringOption(option =>
					option
						.setName('name')
						.setDescription('Start typing to pick a character by name!')
						.setAutocomplete(true)
						.setRequired(true)))
		// update
		.addSubcommand(subcommand =>
			subcommand
				.setName('update')
				.setDescription('Update character info in your profile!')
				.addStringOption(option =>
					option
						.setName('name')
						.setDescription('Start typing to pick a character by name!')
						.setAutocomplete(true)
						.setRequired(true))
				.addIntegerOption(option =>
					option
						.setName('s1')
						.setDescription('Enter the Skill 1 level of the selected character')
						.setMinValue(1)
						.setMaxValue(10))
				.addIntegerOption(option =>
					option
						.setName('s2')
						.setDescription('Enter the Skill 2 level of the selected character')
						.setMinValue(1)
						.setMaxValue(10))
				.addIntegerOption(option =>
					option
						.setName('burst')
						.setDescription('Enter the Burst level of the selected character')
						.setMinValue(1)
						.setMaxValue(10))
				.addIntegerOption(option =>
					option
						.setName('overload')
						.setDescription('Enter the nubmer of OL gear on the selected character')
						.setMinValue(0)
						.setMaxValue(4))),

	async autocomplete(interaction) {
		if (interaction.options.getSubcommand() === 'add') {
			const focusedOption = interaction.options.getFocused(true);
			// getting array with names of obtained characters
			const charData = await userInfo.findOne({ _id: interaction.user.id }).distinct('characters');
			const char = charData.map(c => c.name);
			// can't show more than 25 at once, so show only after typing
			if (focusedOption.value) {
				// showing only not obtained characters
				const filtered = nikkeNames.filter(choice => choice.toLowerCase().startsWith(focusedOption.value.toLowerCase()) && !char.find(c => c === choice));
				await interaction.respond(filtered.map(choice => ({ name: choice, value: choice })));
			}
		}
		if (interaction.options.getSubcommand() === 'remove' || interaction.options.getSubcommand() === 'update') {
			const focusedOption = interaction.options.getFocused(true);
			const charData = await userInfo.findOne({ _id: interaction.user.id }).distinct('characters');
			const char = charData.map(c => c.name);
			// showing only obtained characters, it's limited to 12, so don't care about 25 show limit
			const filtered = char.filter(choice => choice.toLowerCase().startsWith(focusedOption.value.toLowerCase()));
			await interaction.respond(filtered.map(choice => ({ name: choice, value: choice })));
		}
	},

	async execute(interaction) {
		if (interaction.options.getSubcommand() === 'add') {
			const userData = await userInfo.findOne({ _id: interaction.user.id });
			if (!userData) {
				return interaction.reply({ content: 'You don\'t have a profile! Create one via `create profile` command.', ephemeral: true });
			}
			const nikkeName = interaction.options.getString('name');
			const nikkeN = nikkeNames.find(n => n.toLowerCase() === nikkeName.toLowerCase());
			if (!nikkeN) {
				return interaction.reply({ content: `There is no Nikke named **${nikkeName}**!`, ephemeral: true });
			}
			const s1 = interaction.options.getInteger('s1');
			const s2 = interaction.options.getInteger('s2');
			const burst = interaction.options.getInteger('burst');
			const ol = interaction.options.getInteger('overload');
			const cv = s1 + s2 + burst + ol * 3;
			const char = userData.characters.map(c => c.name);
			if (char.find(n => n === nikkeN)) {
				return interaction.reply({ content: `You've already added **${nikkeN}** to your profile!`, ephemeral: true });
			}
			// limit is 12 nikkes per profile
			if (char.length >= 12) {
				return interaction.reply({ content: 'You can\'t add more than 12 characters.', ephemeral: true });
			}
			// updating user information in database by pushing and sorting new info
			await userInfo.findOneAndUpdate({
				_id: interaction.user.id,
			}, {
				_id: interaction.user.id,
				username: interaction.user.tag,
				$push:{
					characters: {
						$each: [{ name: nikkeN, s1: s1,	s2: s2,	burst: burst, ol: ol, cv: cv }],
						$sort: { cv: -1, name: 1 },
					},
				},
			}, {});
			// building an embed with added nikke info to reply to user
			const replyEmbed = new EmbedBuilder()
				.setDescription(`**${nikkeN}** has been successfully added!`)
				.addFields(
					{ name: 'Skill 1', value: `Level ${s1}`, inline: true },
					{ name: 'Skill 2', value: `Level ${s2}`, inline: true },
					{ name: 'Burst', value: `Level ${burst}`, inline: true },
					{ name: 'Number of OL gear', value: `${ol}` },
				);
			return interaction.reply({ embeds: [replyEmbed], ephemeral: true });
		}
		if (interaction.options.getSubcommand() === 'remove' || interaction.options.getSubcommand() === 'update') {
			const nikkeName = interaction.options.getString('name');
			const nikkeN = nikkeNames.find(n => n.toLowerCase() === nikkeName.toLowerCase());
			if (!nikkeN) {
				return interaction.reply({ content: `There is no Nikke named **${nikkeName}**!`, ephemeral: true });
			}
			const userData = await userInfo.findOne({ _id: interaction.user.id });
			if (!userData) {
				return interaction.reply({ content: 'You don\'t have a profile! Add a character to have one.', ephemeral: true });
			}
			const char = userData.characters.map(c => c.name);
			if (!char.find(n => n === nikkeN)) {
				return interaction.reply({ content: `You don't have **${nikkeN}** in your profile!`, ephemeral: true });
			}
			if (interaction.options.getSubcommand() === 'remove') {
				// pulling out info from database
				await userInfo.findOneAndUpdate({
					_id: interaction.user.id,
				}, {
					username: interaction.user.tag,
					$pull:{
						characters: {
							name: nikkeN,
						},
					},
				}, {});
				return interaction.reply({ content: `You've successfully removed **${nikkeN}** from your profile.`, ephemeral: true });
			}
			if (interaction.options.getSubcommand() === 'update') {
				if (!interaction.options.getInteger('s1') &&
					!interaction.options.getInteger('s2') &&
					!interaction.options.getInteger('burst') &&
					!interaction.options.getInteger('overload')) {
					return interaction.reply({ content: 'You have to enter at least 1 parameter that you want to update.', ephemeral: true });
				}
				// getting current values from user data in database and setting them if nothing is entered to the corresponding fields
				const data = (await userInfo.findOne({ _id: interaction.user.id }).distinct('characters')).find(c => c.name === nikkeN);
				const s1 = interaction.options.getInteger('s1') ?? data.s1;
				const s2 = interaction.options.getInteger('s2') ?? data.s2;
				const burst = interaction.options.getInteger('burst') ?? data.burst;
				const ol = interaction.options.getInteger('overload') ?? data.ol;
				const cv = s1 + s2 + burst + ol * 3;
				// delete previous data of the character by pulling it out
				await userInfo.findOneAndUpdate({
					_id: interaction.user.id,
				}, {
					username: interaction.user.tag,
					$pull:{
						characters: {
							name: nikkeN,
						},
					},
				}, {});
				// adding updated data of the character by pushing it in and sorting
				await userInfo.findOneAndUpdate({
					_id: interaction.user.id,
				}, {
					$push: {
						characters: {
							$each: [{ name: nikkeN, s1: s1,	s2: s2,	burst: burst, ol: ol, cv: cv }],
							$sort: { cv: -1, name: 1 },
						},
					},
				}, {});
				// building an embed with new nikke info to reply to user
				const replyEmbed = new EmbedBuilder()
					.setDescription(`**${nikkeN}** has been successfully updated!`)
					.addFields(
						{ name: 'Skill 1', value: `Level ${s1}`, inline: true },
						{ name: 'Skill 2', value: `Level ${s2}`, inline: true },
						{ name: 'Burst', value: `Level ${burst}`, inline: true },
						{ name: 'Number of OL gear', value: `${ol}` },
					);
				return interaction.reply({ embeds: [replyEmbed], ephemeral: true });
			}
		}
	},
};
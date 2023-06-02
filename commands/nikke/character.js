const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { nikkeList } = require('./data/chardata.json');
// array of nikkes names
const nikkeNames = nikkeList.map(char => char.name);
const userInfo = require('./data/database.js');
const { APBM } = require('./data/apbm.js');

module.exports = {
	cooldown: 3,
	data: new SlashCommandBuilder()
		.setName('character')
		.setDescription('Add or remove a Nikke to your account or update her info!')
		// add
		.addSubcommand(subcommand =>
			subcommand
				.setName('add')
				.setDescription('Add a Nikke to your account!')
				.addStringOption(option =>
					option
						.setName('name')
						.setDescription('Start typing to pick a Nikke by her name!')
						.setAutocomplete(true)
						.setRequired(true))
				.addIntegerOption(option =>
					option
						.setName('lb')
						.setDescription('Choose the number of Limit Breaks / Core Ups')
						.addChoices(
							{ name: '0 Stars', value: 0 },
							{ name: '1 Star', value: 1 },
							{ name: '2 Stars', value: 2 },
							{ name: '3 Stars', value: 3 },
							{ name: 'Core +1', value: 4 },
							{ name: 'Core +2', value: 5 },
							{ name: 'Core +3', value: 6 },
							{ name: 'Core +4', value: 7 },
							{ name: 'Core +5', value: 8 },
							{ name: 'Core +6', value: 9 },
							{ name: 'Core MAX', value: 10 },
						)
						.setRequired(true))
				.addIntegerOption(option =>
					option
						.setName('bond')
						.setDescription('Enter the Bond level of the selected Nikke')
						.setMinValue(1)
						.setMaxValue(40)
						.setRequired(true))
				.addIntegerOption(option =>
					option
						.setName('s1')
						.setDescription('Enter the Skill 1 level of the selected Nikke')
						.setMinValue(1)
						.setMaxValue(10)
						.setRequired(true))
				.addIntegerOption(option =>
					option
						.setName('s2')
						.setDescription('Enter the Skill 2 level of the selected Nikke')
						.setMinValue(1)
						.setMaxValue(10)
						.setRequired(true))
				.addIntegerOption(option =>
					option
						.setName('burst')
						.setDescription('Enter the Burst level of the selected Nikke')
						.setMinValue(1)
						.setMaxValue(10)
						.setRequired(true)))
		// remove
		.addSubcommand(subcommand =>
			subcommand
				.setName('remove')
				.setDescription('Remove a Nikke from your account!')
				.addStringOption(option =>
					option
						.setName('name')
						.setDescription('Start typing to pick a Nikke by her name!')
						.setAutocomplete(true)
						.setRequired(true)))
		// update
		.addSubcommand(subcommand =>
			subcommand
				.setName('update')
				.setDescription('Update info of a Nikke in your account!')
				.addStringOption(option =>
					option
						.setName('name')
						.setDescription('Start typing to pick a Nikke by her name!')
						.setAutocomplete(true)
						.setRequired(true))
				.addIntegerOption(option =>
					option
						.setName('lb')
						.setDescription('Choose the number of Limit Breaks / Core Ups')
						.addChoices(
							{ name: '0 Stars', value: 1 },
							{ name: '1 Star', value: 2 },
							{ name: '2 Stars', value: 3 },
							{ name: '3 Stars', value: 4 },
							{ name: 'Core +1', value: 5 },
							{ name: 'Core +2', value: 6 },
							{ name: 'Core +3', value: 7 },
							{ name: 'Core +4', value: 8 },
							{ name: 'Core +5', value: 9 },
							{ name: 'Core +6', value: 10 },
							{ name: 'Core MAX', value: 11 },
						))
				.addIntegerOption(option =>
					option
						.setName('bond')
						.setDescription('Enter the Bond level of the selected Nikke')
						.setMinValue(1)
						.setMaxValue(40))
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
						.setMaxValue(10))),

	async autocomplete(interaction) {
		if (interaction.options.getSubcommand() === 'add') {
			const focusedOption = interaction.options.getFocused(true);
			// getting array with names of obtained characters
			const charData = await userInfo.findOne({ _id: interaction.user.id }).distinct('characters');
			const char = charData.map(c => c.name);
			// can't show more than 25 at once, so show only after typing or when less than 25
			const filtered = nikkeNames.filter(choice => choice.toLowerCase().startsWith(focusedOption.value.toLowerCase()) && !char.find(c => c === choice));
			if (focusedOption.value || filtered.length <= 25) {
				// showing only not obtained characters
				await interaction.respond(filtered.map(choice => ({ name: choice, value: choice })));
			}
		}
		if (interaction.options.getSubcommand() === 'remove' || interaction.options.getSubcommand() === 'update') {
			const focusedOption = interaction.options.getFocused(true);
			const charData = await userInfo.findOne({ _id: interaction.user.id }).distinct('characters');
			const char = charData.map(c => c.name);
			// showing only obtained characters, it's limited to 25, so don't care about 25 show limit
			const filtered = char.filter(choice => choice.toLowerCase().startsWith(focusedOption.value.toLowerCase()));
			await interaction.respond(filtered.map(choice => ({ name: choice, value: choice })));
		}
	},

	async execute(interaction) {
		await interaction.deferReply({ ephemeral: true });
		const nikkeName = interaction.options.getString('name');
		const nikkeN = nikkeNames.find(n => n.toLowerCase() === nikkeName.toLowerCase());
		if (!nikkeN) {
			return interaction.editReply({ content: `There is no Nikke named **${nikkeName}**!` }).catch((err) => console.log('ERROR IN CHARACTER JS', err));
		}
		const userData = await userInfo.findOne({ _id: interaction.user.id });
		if (!userData) {
			return interaction.editReply({ content: 'You don\'t have an account! Create one via **/account create** command.' }).catch((err) => console.log('ERROR IN CHARACTER JS', err));
		}
		if (interaction.options.getSubcommand() === 'add') {
			let lb = interaction.options.getInteger('lb');
			let core = 0;
			if (lb > 3) {
				core = lb - 3;
				lb = 3;
			}
			const bond = interaction.options.getInteger('bond');
			const s1 = interaction.options.getInteger('s1');
			const s2 = interaction.options.getInteger('s2');
			const burst = interaction.options.getInteger('burst');
			const char = userData.characters.map(c => c.name);
			if (char.find(n => n === nikkeN)) {
				return interaction.editReply({ content: `You've already added **${nikkeN}** to your account!` }).catch((err) => console.log('ERROR IN CHARACTER JS', err));
			}
			// limit is 25 nikkes per acount
			if (char.length >= 25) {
				return interaction.editReply({ content: 'You can\'t add more than 25 characters.' }).catch((err) => console.log('ERROR IN CHARACTER JS', err));
			}
			// getting selected Nikke and checking bond level
			const selectedNikke = nikkeList.find(n => n.name === nikkeN);
			if (bond > 30 && selectedNikke.manufacturer !== 'Pilgrim') {
				return interaction.editReply({ content: 'Only Pilgrims can have Bond level higher than 30.' }).catch((err) => console.log('ERROR IN CHARACTER JS', err));
			}
			if (bond > 10 + 10 * lb) {
				return interaction.editReply({ content: `**${nikkeN}** doesn't have enought Limit Breaks for this Bond level.` }).catch((err) => console.log('ERROR IN CHARACTER JS', err));
			}
			const rr_manulvl = userData.rr_manu.find(m => m.name === selectedNikke.manufacturer).lvl;
			const apbm = APBM(selectedNikke, s1, s2, burst, lb, core, bond, [], [], rr_manulvl);

			const attack = apbm.attack;
			const pp = apbm.pp;
			const pp_elem = apbm.pp_elem;
			// updating user information in database by pushing and sorting new info
			await userInfo.findOneAndUpdate({
				_id: interaction.user.id,
			}, {
				$push:{
					characters: {
						$each: [{
							name: nikkeN,
							lb: lb,
							core: core,
							bond: bond,
							s1: s1,
							s2: s2,
							burst: burst,
							pp: Math.round(pp),
							pp_elem: Math.round(pp_elem),
							ammo: selectedNikke.ammo,
							in_profile: false,
							baseAttack: Math.round(attack),
							gear: [],
							cube: [],
						}],
						$sort: { name: 1 },
					},
				},
			}, {});
			// building an embed with added nikke info to reply to user
			const file = new AttachmentBuilder(`${__dirname}/images/characters/${nikkeN.replace(':', '').replace(' ', '_')}.png`);
			const replyEmbed = new EmbedBuilder()
				.setTitle(`${nikkeN}`)
				.setDescription(`Limit Break: **${lb}**${core ? (' +**' + String(core) + '**') : ''}` +
                    `\nBond: Lv. **${bond}**` + `\nSkills: **${s1}**/**${s2}**/**${burst}**`)
				.setThumbnail(`attachment://${nikkeN.replace(':', '').replace(' ', '_')}.png`);
			return interaction.editReply({ content: 'Your Nikke has been added successfully!', embeds: [replyEmbed], files: [file] }).catch((err) => console.log('ERROR IN CHARACTER JS', err));
		}
		if (interaction.options.getSubcommand() === 'remove' || interaction.options.getSubcommand() === 'update') {
			const char = userData.characters.map(c => c.name);
			if (!char.find(n => n === nikkeN)) {
				return interaction.editReply({ content: `You don't have **${nikkeN}** in your account!` }).catch((err) => console.log('ERROR IN CHARACTER JS', err));
			}
			if (interaction.options.getSubcommand() === 'remove') {
				// pulling out info from database
				await userInfo.findOneAndUpdate({
					_id: interaction.user.id,
				}, {
					$pull:{
						characters: {
							name: nikkeN,
						},
					},
				}, {});
				return interaction.editReply({ content: `You've successfully removed **${nikkeN}** from your account.` }).catch((err) => console.log('ERROR IN CHARACTER JS', err));
			}
			if (interaction.options.getSubcommand() === 'update') {
				if (!interaction.options.getInteger('s1') &&
					!interaction.options.getInteger('s2') &&
					!interaction.options.getInteger('burst') &&
					!interaction.options.getInteger('lb') &&
					!interaction.options.getInteger('bond')) {
					return interaction.editReply({ content: 'You have to enter at least 1 parameter that you want to update.' }).catch((err) => console.log('ERROR IN CHARACTER JS', err));
				}
				// getting current values from user data in database and setting them if nothing is entered to the corresponding fields
				const nikkeData = (await userInfo.findOne({ _id: interaction.user.id }).distinct('characters')).find(c => c.name === nikkeN);
				const s1 = interaction.options.getInteger('s1') ?? nikkeData.s1;
				const s2 = interaction.options.getInteger('s2') ?? nikkeData.s2;
				const burst = interaction.options.getInteger('burst') ?? nikkeData.burst;
				const bond = interaction.options.getInteger('bond') ?? nikkeData.bond;
				let lb = 0;
				let core = 0;
				if (interaction.options.getInteger('lb')) {
					lb = interaction.options.getInteger('lb') - 1;
					if (lb > 3) {
						core = lb - 3;
						lb = 3;
					}
				}
				else {
					lb = nikkeData.lb,
					core = nikkeData.core;
				}
				// getting selected Nikke and checking bond level
				const selectedNikke = nikkeList.find(n => n.name === nikkeN);
				if (bond > 30 && selectedNikke.manufacturer !== 'Pilgrim') {
					return interaction.editReply({ content: 'Only Pilgrims can have Bond level higher than 30.' }).catch((err) => console.log('ERROR IN CHARACTER JS', err));
				}
				if (bond > 10 + 10 * lb) {
					return interaction.editReply({ content: `**${nikkeN}** doesn't have enought Limit Breaks for this Bond level.` }).catch((err) => console.log('ERROR IN CHARACTER JS', err));
				}
				const gear = nikkeData.gear;
				const cube = nikkeData.cube;
				const in_profile = nikkeData.in_profile;
				const rr_manulvl = userData.rr_manu.find(m => m.name === selectedNikke.manufacturer).lvl;
				const apbm = APBM(selectedNikke, s1, s2, burst, lb, core, bond, gear, cube, rr_manulvl);
				const pp = apbm.pp;
				const pp_elem = apbm.pp_elem;
				const ammo = apbm.ammo;
				const attack = apbm.attack;
				await userInfo.findOneAndUpdate({
					_id: interaction.user.id,
				}, {
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
					$push:{
						characters: {
							$each: [{
								name: nikkeN,
								lb: lb,
								core: core,
								bond: bond,
								s1: s1,
								s2: s2,
								burst: burst,
								pp: Math.round(pp),
								pp_elem: Math.round(pp_elem),
								ammo: ammo,
								baseAttack: Math.round(attack),
								in_profile: in_profile,
								gear: gear,
								cube: cube,
							}],
							$sort: { name: 1 },
						},
					},
				}, {});
				// building an embed with added nikke info to reply to user
				const file = new AttachmentBuilder(`${__dirname}/images/characters/${nikkeN.replace(':', '').replace(' ', '_')}.png`);
				const replyEmbed = new EmbedBuilder()
					.setTitle(`${nikkeN}`)
					.setDescription(`Limit Break: **${lb}**${core ? (' +**' + String(core) + '**') : ''}` +
                    `\nBond: Lv. **${bond}**` + `\nSkills: **${s1}**/**${s2}**/**${burst}**`)
					.setThumbnail(`attachment://${nikkeN.replace(':', '').replace(' ', '_')}.png`);
				return interaction.editReply({ content: 'Your Nikke has been updaed successfully!', embeds: [replyEmbed], files: [file] }).catch((err) => console.log('ERROR IN CHARACTER JS', err));
			}
		}
	},
};
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ComponentType, EmbedBuilder } = require('discord.js');
const userInfo = require('./db/database.js');
const { nikkeList } = require('./nikkedata.json');
// array of nikkes names
const nikkeNames = nikkeList.map(char => char.name);

module.exports = {
	cooldown: 10,
	data: new SlashCommandBuilder()
		.setName('who')
		.setDescription('Shows the list of users')
		.addSubcommand(subcommand =>
			subcommand
				.setName('has')
				.setDescription('Shows the list of users who have a character with specified')
				.addStringOption(option =>
					option
						.setName('name')
						.setDescription('Start typing to pick a character by name!')
						.setAutocomplete(true)
						.setRequired(true))
				.addIntegerOption(option =>
					option
						.setName('s1')
						.setDescription('Enter the minimum Skill 1 level (default 1)')
						.setMinValue(1)
						.setMaxValue(10))
				.addIntegerOption(option =>
					option
						.setName('s2')
						.setDescription('Enter the minimum Skill 2 level (default 1)')
						.setMinValue(1)
						.setMaxValue(10))
				.addIntegerOption(option =>
					option
						.setName('burst')
						.setDescription('Enter the minimum Burst level (default 1)')
						.setMinValue(1)
						.setMaxValue(10))
				.addIntegerOption(option =>
					option
						.setName('overload')
						.setDescription('Enter the minimum nubmer of OL gear (default 0)')
						.setMinValue(0)
						.setMaxValue(4))),

	async autocomplete(interaction) {
		const focusedOption = interaction.options.getFocused(true);
		// can't show more than 25 at once, so show only after typing
		if (focusedOption.value) {
			const filtered = nikkeNames.filter(choice => choice.toLowerCase().startsWith(focusedOption.value.toLowerCase()));
			await interaction.respond(filtered.map(choice => ({ name: choice, value: choice })));
		}
	},

	async execute(interaction) {
		const users = await userInfo.find({}, {}, { sort: { name: 1, username: 1 } });
		// HAS
		if (interaction.options.getSubcommand() === 'has') {
			const name = nikkeNames.find(n => n.toLowerCase() === interaction.options.getString('name').toLowerCase());
			if (!name) {
				return interaction.reply({ content: `There is no Nikke named **${interaction.options.getString('name')}**!`, ephemeral: true });
			}
			let filtered = users.filter(u => u.characters.find(c => c.name === name));
			// min values
			let ms1 = 1, ms2 = 1, mburst = 1, mol = 0;
			if (interaction.options.getInteger('s1')) {
				ms1 = interaction.options.getInteger('s1');
				filtered = filtered.filter(u => u.characters.find(c => c.name === name).s1 >= ms1);
			}
			if (interaction.options.getInteger('s2')) {
				ms2 = interaction.options.getInteger('s2');
				filtered = filtered.filter(u => u.characters.find(c => c.name === name).s2 >= ms2);
			}
			if (interaction.options.getInteger('burst')) {
				mburst = interaction.options.getInteger('burst');
				filtered = filtered.filter(u => u.characters.find(c => c.name === name).burst >= mburst);
			}
			if (interaction.options.getInteger('overload')) {
				mol = interaction.options.getInteger('overload');
				filtered = filtered.filter(u => u.characters.find(c => c.name === name).ol >= mol);
			}
			if (!filtered.length) {
				return interaction.reply({ content: `Nobody has **${name}** at least **${ms1}**/**${ms2}**/**${mburst}** with **${mol}** OL :smiling_face_with_tear:` });
			}
			filtered.sort(function(a, b) {
				return b.characters.find(c => c.name === name).cv - a.characters.find(c => c.name === name).cv;
			});
			// current page
			let current = 1;
			// number of results on page
			const len = 10;
			// array of descpriptions for every page
			const descriptions = [];
			const options = [];
			for (let i = 0; i < filtered.length / len; i++) {
				const option = new StringSelectMenuOptionBuilder()
					.setLabel(`Page ${i + 1}`)
					.setValue(`${i + 1}`);
				options.push(option);
				let description = '';
				for (let j = 0; j < len && i * len + j < filtered.length; j++) {
					const character = filtered[i * len + j].characters.find(c => c.name === name);
					const s1 = character.s1;
					const s2 = character.s2;
					const burst = character.burst;
					const ol = character.ol;
					description += `**${i * len + j + 1}.** ${filtered[i * len + j].name} (<@${filtered[i * len + j]._id}>): ${name} ${s1}/${s2}/${burst} with ${ol} OL\n\n`;
				}
				descriptions.push(description);
			}

			const selectPage = new StringSelectMenuBuilder()
				.setCustomId('pages')
				.setPlaceholder('Select page')
				.addOptions(options);
			const nextPage = new ButtonBuilder()
				.setLabel('>')
				.setCustomId('next')
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(current === options.length);
			const prevPage = new ButtonBuilder()
				.setLabel('<')
				.setCustomId('prev')
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(current === 1);
			const descButton = new ButtonBuilder()
				.setLabel('Click buttons to navigate or use menu below')
				.setCustomId('desc')
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(true);
			const buttonRow = new ActionRowBuilder().addComponents(prevPage, descButton, nextPage);
			const menuRow = new ActionRowBuilder().addComponents(selectPage);

			const listEmbed = new EmbedBuilder()
				.setTitle(`List of users with ${name} at least ${ms1}/${ms2}/${mburst} with ${mol} OL`)
				.setDescription(descriptions[current - 1])
				.setFooter({ text: `Page ${current}/${options.length}` });

			const response = await interaction.reply({
				embeds: [listEmbed],
				components: [buttonRow, menuRow],
			});
			const buttonCollector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 300_000 });
			const menuCollector = response.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 300_000 });

			buttonCollector.on('collect', async i => {
				if (i.user.id !== interaction.user.id) {
					return;
				}
				const buttonId = i.customId;
				switch (buttonId) {
				case 'prev':
					current -= 1;
					break;
				case 'next':
					current += 1;
					break;
				}
				prevPage.setDisabled(current === 1);
				nextPage.setDisabled(current === options.length);
				listEmbed.setFooter({ text: `Page ${current}/${options.length}` }).setDescription(descriptions[current - 1]);
				await i.update({
					embeds: [listEmbed],
					components: [buttonRow, menuRow],
				});
			});
			menuCollector.on('collect', async i => {
				if (i.user.id !== interaction.user.id) {
					return;
				}
				const value = i.values[0];
				current = Number(value);
				prevPage.setDisabled(current === 1);
				nextPage.setDisabled(current === options.length);
				listEmbed.setFooter({ text: `Page ${current}/${options.length}` }).setDescription(descriptions[current - 1]);
				await i.update({
					embeds: [listEmbed],
					components: [buttonRow, menuRow],
				});
			});

		}
	},
};
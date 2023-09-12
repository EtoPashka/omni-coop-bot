const { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const userInfo = require('./data/database.js');
const { nikkeList } = require('./data/chardata.json');
const { gearSubs } = require('./data/geardata.json');
const { cubeData } = require('./data/cubedata.json');
// array of nikkes names
const nikkeNames = nikkeList.map(char => char.name).sort();
// number of results on page
const len = 10;

module.exports = {
	cooldown: 10,
	data: new SlashCommandBuilder()
		.setName('top')
		.setDescription('Shows the list of users')
		.addStringOption(option =>
			option
				.setName('nikke')
				.setDescription('Start typing to pick a Nikke by name!')
				.setAutocomplete(true)
				.setRequired(true))
		.addStringOption(option =>
			option
				.setName('server')
				.setDescription('Choose your server')
				.setRequired(true)
				.addChoices(
					{ name: 'Global', value: 'Global' },
					{ name: 'SEA', value: 'SEA' },
				))
		.addStringOption(option =>
			option
				.setName('weakness')
				.setDescription('Choose boss\' weakness')
				.addChoices(
					{ name: 'Fire', value: 'Fire' },
					{ name: 'Water', value: 'Water' },
					{ name: 'Iron', value: 'Iron' },
					{ name: 'Wind', value: 'Wind' },
					{ name: 'Electric', value: 'Electric' },
				)),

	async autocomplete(interaction) {
		const focusedOption = interaction.options.getFocused(true);
		// can't show more than 25 at once, so show only after typing or when the length less than 25
		const filtered = nikkeNames.filter(choice => choice.toLowerCase().startsWith(focusedOption.value.toLowerCase()));
		if (focusedOption.value || filtered.length <= 25) {
			await interaction.respond(filtered.map(choice => ({ name: choice, value: choice })));
		}
	},

	async execute(interaction) {
		await interaction.deferReply();
		const name = nikkeNames.find(n => n.toLowerCase() === interaction.options.getString('nikke').toLowerCase());
		if (!name) {
			return interaction.editReply({ content: `There is no Nikke named **${interaction.options.getString('name')}**!`, ephemeral: true }).catch((err) => console.log('ERROR IN TOP JS', err));
		}
		const server = interaction.options.getString('server');
		const weakness = interaction.options.getString('weakness') ?? 'none';
		const weakness_flag = nikkeList.find(n => n.name === name).code === weakness;
		const users = await userInfo.find({
			'characters.name': name,
			server: server,
		}, {}, { sort: { name: 1 } });
		if (!users.length) {
			return interaction.editReply({ content: `Nobody has **${name}** in their account in ${server} :smiling_face_with_tear:` }).catch((err) => console.log('ERROR IN TOP JS', err));
		}
		const data = users.map(u => {
			const nikke = u.characters.find(n => n.name === name);
			const pp = nikke.pp + (weakness_flag ? nikke.pp_elem : 0);
			return {
				id: u._id,
				name: u.name,
				nikke: {
					s1: nikke.s1,
					s2: nikke.s2,
					burst: nikke.burst,
					pp: pp,
					ammo: nikke.ammo,
					attack: nikke.baseAttack,
				},
			};
		});
		data.sort((a, b) => b.nikke.pp - a.nikke.pp);
		// current page
		let current = 1;
		// array of descpriptions for every page
		const descriptions = [];
		const options = [];
		for (let i = 0; i < data.length / len; i++) {
			let description = '';
			for (let j = 0; j < len && i * len + j < data.length; j++) {
				const d = data[i * len + j];
				description += `${i * len + j + 1}. **${d.name}** (<@${d.id}>)\n> PP: \`${d.nikke.pp}\` | Base ATK: \`${d.nikke.attack}\` | Ammo: \`${d.nikke.ammo}\` | Skills: \`${d.nikke.s1}\`/\`${d.nikke.s2}\`/\`${d.nikke.burst}\` \n`;
				const option = new StringSelectMenuOptionBuilder().setLabel(d.name).setValue(d.id);
				options.push(option);
			}
			descriptions.push(description);
		}

		const selectUser = new StringSelectMenuBuilder()
			.setCustomId('top-users')
			.setPlaceholder('Select a user for more detailed information')
			.setOptions(options.slice(0, len));
		const closeButton = new ButtonBuilder()
			.setLabel('Close')
			.setCustomId(`coop-delete${interaction.user.id}`)
			.setStyle(ButtonStyle.Danger);
		const nextPage = new ButtonBuilder()
			.setLabel('>')
			.setCustomId('top-next')
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(current === descriptions.length);
		const prevPage = new ButtonBuilder()
			.setLabel('<')
			.setCustomId('top-prev')
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(current === 1);
		const descButton = new ButtonBuilder()
			.setLabel('Click buttons to navigate')
			.setCustomId('top-desc')
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(true);
		const buttonRow = new ActionRowBuilder().addComponents(prevPage, descButton, nextPage, closeButton);
		const menuRow = new ActionRowBuilder().addComponents(selectUser);
		const elem_adv = `Elemental advantage is ${weakness_flag ? '' : 'NOT '}active`;
		const listEmbed = new EmbedBuilder()
			.setTitle(`Top ${name} in ${server}`)
			.setDescription(descriptions[current - 1])
			.setFooter({ text: `${elem_adv}\nPage ${current}/${descriptions.length}` });

		const response = await interaction.editReply({
			embeds: [listEmbed],
			components: [buttonRow, menuRow],
		}).catch((err) => console.log('ERROR IN TOP JS', err));
		const buttonCollector = response.createMessageComponentCollector({ idle: 60_000 });
		let alive = true;
		buttonCollector.on('end', async () => {
			prevPage.setDisabled(true);
			nextPage.setDisabled(true);
			descButton.setLabel('Interaction expired');
			if (alive) { return response.edit({ components: [buttonRow] }).catch((err) => console.log('ERROR IN TOP JS WITH EDITING MESSAGE', err)); }
		});

		buttonCollector.on('collect', async i => {
			if (i.customId.startsWith('coop-delete')) {
				if (i.user.id === interaction.user.id) {
					alive = false;
					buttonCollector.stop();
				}
			}
			else if (i.customId === 'top-prev' || i.customId === 'top-next') {
				if (i.user.id !== interaction.user.id) {
					return i.reply({ content: 'You can\'t interact with it, because you are not the one who used the command!', ephemeral: true }).catch((err) => console.log('ERROR IN TOP JS', err));
				}
				switch (i.customId) {
				case 'top-prev':
					current -= 1;
					break;
				case 'top-next':
					current += 1;
					break;
				}
				prevPage.setDisabled(current === 1);
				nextPage.setDisabled(current === descriptions.length);
				listEmbed.setFooter({ text: `${elem_adv}\nPage ${current}/${descriptions.length}` }).setDescription(descriptions[current - 1]);
				selectUser.setOptions(options.slice((current - 1) * len, current * len));
				await i.update({
					embeds: [listEmbed],
					components: [buttonRow, menuRow],
				}).catch((err) => console.log('ERROR IN TOP JS', err));
			}
			else if (i.customId === 'top-users') {
				if (i.user.id !== interaction.user.id) {
					return i.reply({ content: 'You can\'t interact with it, because you are not the one who used the command!', ephemeral: true }).catch((err) => console.log('ERROR IN TOP JS', err));
				}
				const userData = await userInfo.findOne({ _id: i.values[0] });
				characterPage(i, name, closeButton, userData, weakness);
			}
		});
	},
};

async function characterPage(interaction, name, closeButton, userData, bossWeakness) {
	const exitRow = new ActionRowBuilder().addComponents(closeButton);
	const nikke = userData.characters.find(c => c.name === name);
	// loading character image
	const image = new AttachmentBuilder(`${__dirname}/images/characters/${name.replaceAll(':', '').replaceAll(' ', '_')}.png`);
	let description = '';
	if (nikkeList.find(c => c.name === name).code === bossWeakness) {
		description += `PP: ${nikke.pp} [+${nikke.pp_elem}] (**${nikke.pp + nikke.pp_elem}**)\n`;
	}
	else { description += `PP: **${nikke.pp}** [+${nikke.pp_elem}] (${nikke.pp + nikke.pp_elem})\n`; }
	description += `Base ATK: **${nikke.baseAttack}**\nAmmo: **${nikke.ammo}**`;
	let gearDesc = '';
	// const gearStats = [];
	const gear = userData.characters.find(c => c.name === name).gear;
	const gearTypes = ['Head', 'Torso', 'Arm', 'Leg'];
	for (const gearType of gearTypes) {
		const currentGear = gear.find(g => g.gtype === gearType);
		if (currentGear) { gearDesc += `${gearType}: **${currentGear.tier}** Lv. **${currentGear.lvl}**\n`; }
		else { gearDesc += `${gearType}: None\n`; }
	}
	const gearStats = [];
	for (const stat of gearSubs.map(s => s.attribute)) {
		gearStats.push({ attribute: stat, value: 0 });
	}
	for (const piece of gear) {
		for (const sub of piece.subs) {
			gearStats.at(gearStats.findIndex(s => s.attribute === sub.attribute)).value += sub.value;
		}
	}
	let cubeDesc = '';
	const cube = userData.characters.find(c => c.name === name).cube;
	if (cube.length) {
		cubeDesc += `**${cube.at(0).ctype} Cube** Lv. **${cube.at(0).lvl}**`;
		const curCube = cubeData.cubes.find(c => c.ctype === cube.at(0).ctype);
		if (gearStats.find(s => s.attribute === curCube.attribute)) {
			gearStats.at(gearStats.findIndex(s => s.attribute === curCube.attribute)).value += curCube.values.at(cube.at(0).lvl - 1);
		}
		gearStats.at(gearStats.findIndex(s => s.attribute === 'Element Damage Dealt')).value += cubeData.basicValues.elem.at(cube.at(0).lvl - 1);
	}
	else { cubeDesc += 'No Cube equipped'; }
	let statField = '';
	for (const stat of gearStats) {
		if (stat.value) {
			statField += `${stat.attribute} +${Math.round(stat.value * 100) / 100}%\n`;
		}
	}
	const embed = new EmbedBuilder()
		.setTitle(name)
		.setDescription(description)
		.addFields(
			{ name: 'General Info', value: `Limit Break: **${nikke.lb}**${nikke.core ? (' +**' + String(nikke.core) + '**') : ''}` +
            `\nBond: Lv. **${nikke.bond}**` + `\nSkills: **${nikke.s1}**/**${nikke.s2}**/**${nikke.burst}**` },
			{ name: 'Gear', value: gearDesc },
			{ name: 'Cube', value: cubeDesc },
		)
		.setThumbnail(`attachment://${name.replaceAll(':', '').replaceAll(' ', '_')}.png`)
		.setFooter({ text: `Owner: ${userData.name}` });
	if (statField) { embed.addFields({ name: 'Additional Stats', value: statField }); }
	return interaction.reply({
		embeds: [embed],
		components: [exitRow],
		files: [image],
	}).catch((err) => console.log('ERROR IN TOP JS', err));
}
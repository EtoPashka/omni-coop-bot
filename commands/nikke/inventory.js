const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, AttachmentBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const userInfo = require('./data/database.js');
const { nikkeList, bossWeakness } = require('./data/chardata.json');
const { gearSubs } = require('./data/geardata.json');
const { cubeData } = require('./data/cubedata.json');
const { APBM } = require('./data/apbm.js');
const time_limit = 90_000;

module.exports = {
	cooldown: 10,
	data: new SlashCommandBuilder()
		.setName('inventory')
		.setDescription('Set up your Nikkes'),
	async execute(interaction) {
		// await interaction.deferReply({ ephemeral: true });
		// need LET later
		let userData = await userInfo.findOne({ _id: interaction.user.id });
		if (!userData) {
			return interaction.reply({ content: 'You don\'t have an account! Create one via **/account create** command.', ephemeral: true }).catch((err) => console.log('ERROR IN INVENTORY JS', err));
		}
		if (userData.inventory) {
			return interaction.reply({ content: 'Your previous inventory is still active!', ephemeral: true }).catch((err) => console.log('ERROR IN INVENTORY JS', err));
		}
		let invData = listedCharacters(userData);
		// home page button
		const homeButton = new ButtonBuilder()
			.setEmoji('1106561343844274186')
			.setCustomId('inv-home')
			.setStyle(ButtonStyle.Secondary);
		// buttons and menu for home page
		const prevButton = new ButtonBuilder()
			.setLabel('<')
			.setCustomId('inv-prev')
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(true);
		const nextButton = new ButtonBuilder()
			.setLabel('>')
			.setCustomId('inv-next')
			.setStyle(invData.names.length > 10 ? ButtonStyle.Primary : ButtonStyle.Secondary)
			.setDisabled(invData.names.length <= 10);

		const nikkeOptions = [];
		for (const name of invData.names) {
			const option = new StringSelectMenuOptionBuilder().setLabel(name).setValue(name);
			nikkeOptions.push(option);
		}
		if (!nikkeOptions.length) {
			const option = new StringSelectMenuOptionBuilder().setLabel('Sadness').setValue('Sadness');
			nikkeOptions.push(option);
		}
		const nikkeSelect = new StringSelectMenuBuilder()
			.setCustomId('inv-selection')
			.setDisabled(invData.names.length === 0)
			.setPlaceholder(`${invData.names.length ? 'Select Nikke' : 'No Nikkes to select'}`)
			.addOptions(nikkeOptions.slice(0, 10));

		const invButtons = new ActionRowBuilder().addComponents(prevButton, nextButton);
		const invMenu = new ActionRowBuilder().addComponents(nikkeSelect);
		// character buttons
		const profileButton = new ButtonBuilder();
		const gearButton = new ButtonBuilder()
			.setCustomId('char-gear')
			.setLabel('Gear')
			.setStyle(ButtonStyle.Primary);
		const cubeButton = new ButtonBuilder()
			.setCustomId('char-cube')
			.setLabel('Cube')
			.setStyle(ButtonStyle.Primary);
		const charButtons1 = new ActionRowBuilder().addComponents(homeButton, gearButton, cubeButton);
		const charButtons2 = new ActionRowBuilder().addComponents(profileButton);
		// invEmbed
		let currentPage = 1;
		const invEmbed = new EmbedBuilder()
			.setTitle('Your Nikkes')
			.setDescription(invData.descriptions.at(0))
			.setFooter({ text: `* — active elemental advantage\nPage ${currentPage}/${invData.descriptions.length}` });

		const exitButton = new ButtonBuilder().setCustomId('inv-exit').setLabel('Exit').setStyle(ButtonStyle.Danger);
		const exitRow = new ActionRowBuilder().addComponents(exitButton);
		const response = await interaction.reply({
			embeds: [invEmbed],
			components: [invButtons, invMenu, exitRow],
			files: [],
			ephemeral: true,
		}).catch((err) => console.log('ERROR IN INVENTORY JS', err));

		const settings = {
			'nikke': '',
			'gear': { 'gtype': '', 'tier': '', 'lvl': -1, 'subs': [] },
			'cube': { 'ctype': '', 'lvl': 0 },
		};

		const buttonCollector = response.createMessageComponentCollector({ idle: time_limit });
		await userInfo.findOneAndUpdate({ _id: interaction.user.id }, { inventory: true }, {});

		let inactive = true;

		buttonCollector.on('end', async () => {
			await userInfo.findOneAndUpdate({ _id: interaction.user.id }, { inventory: false }, {});
			if (inactive) {
				const expireButton = new ButtonBuilder().setCustomId('inv-expire').setLabel('Inventory interation expired').setDisabled(true).setStyle(ButtonStyle.Secondary);
				const expireRow = new ActionRowBuilder().addComponents(expireButton);
				return response.edit({ components: [expireRow] }).catch((err) => console.log('ERROR IN INVENTORY JS WITH EDITING MANAGE MESSAGE', err));
			}
		});
		buttonCollector.on('collect', async i => {
			if (i.customId.startsWith('inv-')) {
				if (i.customId === 'inv-exit') {
					await userInfo.findOneAndUpdate({ _id: interaction.user.id }, { inventory: false }, {});
					inactive = false;
					buttonCollector.stop();
					return i.update({ content: 'Inventory closed!', embeds: [], components: [], files: [] }).catch((err) => console.log('ERROR IN INVENTORY JS', err));
				}
				else if (i.customId === 'inv-prev' || i.customId === 'inv-next') {
					switch (i.customId) {
					case 'inv-prev':
						currentPage -= 1;
						break;
					case 'inv-next':
						currentPage += 1;
						break;
					}
					invPage(i, prevButton, nextButton, invEmbed, invData, invButtons, currentPage);
				}
				else if (i.customId === 'inv-home') {
					invData = listedCharacters(userData);
					currentPage = 1;
					invPage(i, prevButton, nextButton, invEmbed, invData, invButtons, currentPage);
				}
				else if (i.customId === 'inv-selection') {
					settings.nikke = i.values[0];
					characterPage(i, userData, settings.nikke, profileButton, [charButtons1, charButtons2]);
				}
			}
			else if (i.customId.startsWith('char-')) {
				if (i.customId === 'char-profile-add') {
					await userInfo.findOneAndUpdate({
						_id: interaction.user.id,
						'characters.name': settings.nikke,
					}, {
						$set: { 'characters.$.in_profile': true },
					}, {});
					userData = await userInfo.findOne({ _id: interaction.user.id });
					characterPage(i, userData, settings.nikke, profileButton, [charButtons1, charButtons2]);
				}
				else if (i.customId === 'char-profile-remove') {
					await userInfo.findOneAndUpdate({
						_id: interaction.user.id,
						'characters.name': settings.nikke,
					}, {
						$set: { 'characters.$.in_profile': false },
					}, {});
					userData = await userInfo.findOne({ _id: interaction.user.id });
					characterPage(i, userData, settings.nikke, profileButton, [charButtons1, charButtons2]);
				}
				else if (i.customId === 'char-gear') {
					gearPage(i, userData, settings.nikke, homeButton);
				}
				else if (i.customId === 'char-cube') {
					cubePage(i, userData, settings.nikke, homeButton);
				}
			}
			else if (i.customId.startsWith('gear-')) {
				if (i.customId === 'gear-back') {
					characterPage(i, userData, settings.nikke, profileButton, [charButtons1, charButtons2]);
				}
				else if (i.customId === 'gear-equip') {
					equipPage(i, settings.nikke, homeButton, []);
				}
				else if (i.customId === 'gear-unequip') {
					const gearData = userData.characters.find(c => c.name === settings.nikke).gear;
					equipPage(i, settings.nikke, homeButton, gearData);
				}
				else if (i.customId === 'gear-cancel') {
					gearPage(i, userData, settings.nikke, homeButton);
					settings.gear.gtype = '';
					settings.gear.tier = '';
					settings.gear.lvl = -1;
					settings.gear.subs = [];
				}
				else if (i.customId.startsWith('gear-tier')) {
					settings.gear.tier = i.customId.slice(9);
					selectGearStats(i, settings);
				}
				else if (i.customId === 'gear-level') {
					settings.gear.lvl = Number(i.values[0]);
					selectGearStats(i, settings);
				}
				else if (i.customId === 'gear-add-stat' || i.customId === 'gear-remove-stat') {
					selectGearStats(i, settings);
				}
				else if (i.customId === 'gear-stats-remove') {
					if (i.values[0] === 'cancel') { selectGearStats(i, settings); }
					else {
						const leftStats = settings.gear.subs.filter(s => s.attribute !== i.values[0]);
						settings.gear.subs = leftStats;
						selectGearStats(i, settings);
					}
				}
				else if (i.customId === 'gear-stats-add') {
					if (i.values[0] === 'cancel') { selectGearStats(i, settings); }
					else {
						settings.gear.subs.push({ 'attribute': i.values[0], 'value': 0 });
						selectGearStats(i, settings);
					}
				}
				else if (i.customId === 'gear-stats-value') {
					if (i.values[0] === 'cancel') {
						settings.gear.subs.pop();
						selectGearStats(i, settings);
					}
					else {
						const currentSub = settings.gear.subs.pop();
						settings.gear.subs.push({ 'attribute': currentSub.attribute, 'value': Number(i.values[0]) });
						selectGearStats(i, settings);
					}
				}
				else if (i.customId === 'gear-confirm') {
					const currentNikke = userData.characters.find(c => c.name === settings.nikke);
					const selectedNikke = nikkeList.find(n => n.name === settings.nikke);
					const newGear = currentNikke.gear.filter(g => g.gtype !== settings.gear.gtype);
					newGear.push(settings.gear);
					const rr_manulvl = userData.rr_manu.find(m => m.name === selectedNikke.manufacturer).lvl;
					const apbm = APBM(selectedNikke, currentNikke.s1, currentNikke.s2, currentNikke.burst, currentNikke.lb, currentNikke.core, currentNikke.bond, newGear, currentNikke.cube, rr_manulvl);

					await userInfo.findOneAndUpdate({
						_id: interaction.user.id,
						'characters.name': settings.nikke,
					}, {
						$set: {
							'characters.$.ammo': apbm.ammo,
							'characters.$.baseAttack': Math.round(apbm.attack),
							'characters.$.pp': Math.round(apbm.pp),
							'characters.$.pp_elem': Math.round(apbm.pp_elem),
							'characters.$.gear': newGear,
						},
					}, {});

					userData = await userInfo.findOne({ _id: interaction.user.id });
					settings.gear.gtype = '';
					settings.gear.tier = '';
					settings.gear.lvl = -1;
					settings.gear.subs = [];
					gearPage(i, userData, settings.nikke, homeButton);
				}
				else if (i.customId === 'gear-change') {
					const gearData = userData.characters.find(c => c.name === settings.nikke).gear;
					equipPage(i, settings.nikke, homeButton, gearData);
				}
			}
			else if (i.customId.startsWith('equip-')) {
				if (i.customId === 'equip-back') {
					gearPage(i, userData, settings.nikke, homeButton);
				}
				else if (i.customId.startsWith('equip-type')) {
					settings.gear.gtype = i.customId.slice(10);
					selectTier(i, settings);
				}
			}
			else if (i.customId.startsWith('unequip-')) {
				if (i.customId.startsWith('unequip-type')) {
					const currentNikke = userData.characters.find(c => c.name === settings.nikke);
					const selectedNikke = nikkeList.find(n => n.name === settings.nikke);
					const newGear = currentNikke.gear.filter(g => g.gtype !== i.customId.slice(12));
					const rr_manulvl = userData.rr_manu.find(m => m.name === selectedNikke.manufacturer).lvl;
					const apbm = APBM(selectedNikke, currentNikke.s1, currentNikke.s2, currentNikke.burst, currentNikke.lb, currentNikke.core, currentNikke.bond, newGear, currentNikke.cube, rr_manulvl);
					await userInfo.findOneAndUpdate({
						_id: interaction.user.id,
						'characters.name': settings.nikke,
					}, {
						$set: {
							'characters.$.ammo': apbm.ammo,
							'characters.$.baseAttack': Math.round(apbm.attack),
							'characters.$.pp': Math.round(apbm.pp),
							'characters.$.pp_elem': Math.round(apbm.pp_elem),
						},
						$pull: {
							'characters.$.gear': { gtype: i.customId.slice(12) },
						},
					}, {});
					userData = await userInfo.findOne({ _id: interaction.user.id });
					gearPage(i, userData, settings.nikke, homeButton);
				}
			}
			else if (i.customId.startsWith('update-')) {
				if (i.customId.startsWith('update-type')) {
					const currentNikke = userData.characters.find(c => c.name === settings.nikke);
					const selectedGear = currentNikke.gear.find(g => g.gtype === i.customId.slice(11));
					settings.gear.gtype = selectedGear.gtype;
					settings.gear.lvl = selectedGear.lvl;
					settings.gear.tier = selectedGear.tier;
					settings.gear.subs = selectedGear.subs;
					selectGearStats(i, settings);
				}
			}
			else if (i.customId.startsWith('cube-')) {
				if (i.customId === 'cube-equip') {
					equipCubePage(i, settings);
				}
				else if (i.customId === 'cube-cancel') {
					settings.cube.ctype = '';
					cubePage(i, userData, settings.nikke, homeButton);
				}
				else if (i.customId === 'cube-type') {
					settings.cube.ctype = i.values[0];
					equipCubePage(i, settings);
				}
				else if (i.customId === 'cube-level') {
					settings.cube.lvl = Number(i.values[0]);
					const selectedNikke = nikkeList.find(n => n.name === settings.nikke);
					const nikke = userData.characters.find(n => n.name === settings.nikke);
					const rr_manulvl = userData.rr_manu.find(m => m.name === selectedNikke.manufacturer).lvl;
					const apbm = APBM(selectedNikke, nikke.s1, nikke.s2, nikke.burst, nikke.lb, nikke.core, nikke.bond, nikke.gear, [settings.cube], rr_manulvl);
					await userInfo.findOneAndUpdate({
						_id: interaction.user.id,
						'characters.name': settings.nikke,
					}, {
						$set: {
							'characters.$.ammo': apbm.ammo,
							'characters.$.baseAttack': Math.round(apbm.attack),
							'characters.$.pp': Math.round(apbm.pp),
							'characters.$.pp_elem': Math.round(apbm.pp_elem),
							'characters.$.cube': [settings.cube],
						},
					}, {});
					settings.cube.ctype = '';
					settings.cube.lvl = 0;
					userData = await userInfo.findOne({ _id: interaction.user.id });
					cubePage(i, userData, settings.nikke, homeButton);
				}
				else if (i.customId === 'cube-unequip') {
					const selectedNikke = nikkeList.find(n => n.name === settings.nikke);
					const nikke = userData.characters.find(n => n.name === settings.nikke);
					const rr_manulvl = userData.rr_manu.find(m => m.name === selectedNikke.manufacturer).lvl;
					const apbm = APBM(selectedNikke, nikke.s1, nikke.s2, nikke.burst, nikke.lb, nikke.core, nikke.bond, nikke.gear, [], rr_manulvl);
					await userInfo.findOneAndUpdate({
						_id: interaction.user.id,
						'characters.name': settings.nikke,
					}, {
						$set: {
							'characters.$.ammo': apbm.ammo,
							'characters.$.baseAttack': Math.round(apbm.attack),
							'characters.$.pp': Math.round(apbm.pp),
							'characters.$.pp_elem': Math.round(apbm.pp_elem),
							'characters.$.cube': [],
						},
					}, {});
					userData = await userInfo.findOne({ _id: interaction.user.id });
					cubePage(i, userData, settings.nikke, homeButton);
				}
			}
		});
	},
};


async function invPage(interaction, prevButton, nextButton, invEmbed, invData, row, currentPage) {
	const exitButton = new ButtonBuilder().setCustomId('inv-exit').setLabel('Exit').setStyle(ButtonStyle.Danger);
	const exitRow = new ActionRowBuilder().addComponents(exitButton);
	const nikkeOptions = [];
	for (const name of invData.names) {
		const option = new StringSelectMenuOptionBuilder().setLabel(name).setValue(name);
		nikkeOptions.push(option);
	}
	if (!nikkeOptions.length) {
		const option = new StringSelectMenuOptionBuilder().setLabel('Sadness').setValue('Sadness');
		nikkeOptions.push(option);
	}
	const nikkeSelect = new StringSelectMenuBuilder()
		.setCustomId('inv-selection')
		.setDisabled(invData.names.length === 0)
		.setPlaceholder(`${invData.names.length ? 'Select Nikke' : 'No Nikkes to select'}`)
		.addOptions(nikkeOptions.slice(10 * (currentPage - 1), 10 * currentPage));
	const invMenu = new ActionRowBuilder().addComponents(nikkeSelect);
	prevButton.setDisabled(currentPage === 1);
	prevButton.setStyle(currentPage === 1 ? ButtonStyle.Secondary : ButtonStyle.Primary);
	nextButton.setDisabled(currentPage === invData.descriptions.length);
	nextButton.setStyle(currentPage === invData.descriptions.length ? ButtonStyle.Secondary : ButtonStyle.Primary);
	invEmbed.setFooter({ text: `* — active elemental advantage\nPage ${currentPage}/${invData.descriptions.length}` }).setDescription(invData.descriptions.at(currentPage - 1));
	await interaction.update({
		embeds: [invEmbed],
		components: [row, invMenu, exitRow],
		files: [],
	}).catch((err) => console.log('ERROR IN INVENTORY JS', err));
}

async function selectTier(interaction, settings) {
	const exitButton = new ButtonBuilder().setCustomId('inv-exit').setLabel('Exit').setStyle(ButtonStyle.Danger);
	const exitRow = new ActionRowBuilder().addComponents(exitButton);
	const T9Button = new ButtonBuilder().setCustomId('gear-tierT9').setLabel('T9').setStyle(ButtonStyle.Primary);
	const T9MButton = new ButtonBuilder().setCustomId('gear-tierT9M').setLabel('T9M').setStyle(ButtonStyle.Primary);
	const T10Button = new ButtonBuilder().setCustomId('gear-tierT10').setLabel('T10').setStyle(ButtonStyle.Primary);
	const cancelButton = new ButtonBuilder().setCustomId('gear-cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary);
	const image = new AttachmentBuilder(`${__dirname}/images/characters/${settings.nikke.replaceAll(':', '').replaceAll(' ', '_')}.png`);
	const equipEmbed = new EmbedBuilder()
		.setAuthor({ name: settings.nikke, iconURL: `attachment://${settings.nikke.replaceAll(':', '').replaceAll(' ', '_')}.png` })
		.setDescription('**Select tier**')
		.setFooter({ text: settings.gear.gtype });
	const cancelRow = new ActionRowBuilder().addComponents(cancelButton);
	const tierRow = new ActionRowBuilder().addComponents(T9Button, T9MButton, T10Button);
	await interaction.update({
		embeds: [equipEmbed],
		components: [cancelRow, tierRow, exitRow],
		files: [image],
	}).catch((err) => console.log('ERROR IN INVENTORY JS', err));
}

async function equipPage(interaction, name, homeButton, gear) {
	const exitButton = new ButtonBuilder().setCustomId('inv-exit').setLabel('Exit').setStyle(ButtonStyle.Danger);
	const exitRow = new ActionRowBuilder().addComponents(exitButton);
	const action = interaction.customId === 'gear-unequip' ? 'unequip' : (interaction.customId === 'gear-equip' ? 'equip' : 'update');
	const headButton = new ButtonBuilder().setCustomId(`${action}-typeHead`).setLabel('Head').setStyle(ButtonStyle.Primary);
	const torsoButton = new ButtonBuilder().setCustomId(`${action}-typeTorso`).setLabel('Torso').setStyle(ButtonStyle.Primary);
	const armButton = new ButtonBuilder().setCustomId(`${action}-typeArm`).setLabel('Arm').setStyle(ButtonStyle.Primary);
	const legButton = new ButtonBuilder().setCustomId(`${action}-typeLeg`).setLabel('Leg').setStyle(ButtonStyle.Primary);
	if (action === 'unequip' || action === 'update') {
		if (!gear.find(g => g.gtype === 'Head')) { headButton.setDisabled(true).setStyle(ButtonStyle.Secondary); }
		if (!gear.find(g => g.gtype === 'Torso')) { torsoButton.setDisabled(true).setStyle(ButtonStyle.Secondary); }
		if (!gear.find(g => g.gtype === 'Arm')) { armButton.setDisabled(true).setStyle(ButtonStyle.Secondary); }
		if (!gear.find(g => g.gtype === 'Leg')) { legButton.setDisabled(true).setStyle(ButtonStyle.Secondary); }
	}
	const image = new AttachmentBuilder(`${__dirname}/images/characters/${name.replaceAll(':', '').replaceAll(' ', '_')}.png`);
	const equipEmbed = new EmbedBuilder()
		.setAuthor({ name: name, iconURL: `attachment://${name.replaceAll(':', '').replaceAll(' ', '_')}.png` })
		.setDescription(`**Select gear to ${action}**`);
	const backButton = new ButtonBuilder().setCustomId('equip-back').setLabel('Back').setStyle(ButtonStyle.Secondary);
	const menuButtons = new ActionRowBuilder().addComponents(homeButton, backButton);
	const gearButtons = new ActionRowBuilder().addComponents(headButton, torsoButton, armButton, legButton);
	await interaction.update({
		embeds: [equipEmbed],
		components: [menuButtons, gearButtons, exitRow],
		files: [image],
	}).catch((err) => console.log('ERROR IN INVENTORY JS', err));
}

async function equipCubePage(interaction, settings) {
	const exitButton = new ButtonBuilder().setCustomId('inv-exit').setLabel('Exit').setStyle(ButtonStyle.Danger);
	const exitRow = new ActionRowBuilder().addComponents(exitButton);
	const cancelButton = new ButtonBuilder().setCustomId('cube-cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary);
	const typeMenu = new StringSelectMenuBuilder().setCustomId('cube-type').setPlaceholder('Select Cube');
	const levelMenu = new StringSelectMenuBuilder().setCustomId('cube-level').setPlaceholder('Select level');

	const buttonRow = new ActionRowBuilder().addComponents(cancelButton);
	const menuRow = new ActionRowBuilder();
	const image = new AttachmentBuilder(`${__dirname}/images/characters/${settings.nikke.replaceAll(':', '').replaceAll(' ', '_')}.png`);
	const embed = new EmbedBuilder()
		.setAuthor({ name: settings.nikke, iconURL: `attachment://${settings.nikke.replaceAll(':', '').replaceAll(' ', '_')}.png` });

	if (interaction.customId === 'cube-equip') {
		const optionsArray = cubeData.cubes.map(c => c.ctype);
		const options = [];
		for (const option of optionsArray) {
			const typeOption = new StringSelectMenuOptionBuilder().setLabel(`${option} Cube`).setValue(option);
			options.push(typeOption);
		}
		typeMenu.addOptions(options);
		menuRow.addComponents(typeMenu);
		embed.setDescription('Cube: `Select Cube`');
	}
	else if (interaction.customId === 'cube-type') {
		const options = [];
		for (let i = 1; i <= 10; i++) {
			const option = new StringSelectMenuOptionBuilder().setLabel(`Level ${i}`).setValue(`${i}`);
			options.push(option);
		}
		levelMenu.addOptions(options);
		menuRow.addComponents(levelMenu);
		embed.setDescription(`Cube: **${settings.cube.ctype} Cube**\n\nNow select level and it will be equipped.`);
	}
	await interaction.update({
		embeds: [embed],
		components: [buttonRow, menuRow, exitRow],
		files: [image],
	}).catch((err) => console.log('ERROR IN INVENTORY JS', err));
}

async function cubePage(interaction, userData, name, homeButton) {
	const exitButton = new ButtonBuilder().setCustomId('inv-exit').setLabel('Exit').setStyle(ButtonStyle.Danger);
	const exitRow = new ActionRowBuilder().addComponents(exitButton);
	const backButton = new ButtonBuilder().setCustomId('gear-back').setLabel('Back').setStyle(ButtonStyle.Secondary);
	const equipButton = new ButtonBuilder().setCustomId('cube-equip').setLabel('Equip (Replace)').setStyle(ButtonStyle.Success);
	const unequipButon = new ButtonBuilder().setCustomId('cube-unequip').setLabel('Unequip').setStyle(ButtonStyle.Danger);
	const cube = await userData.characters.find(c => c.name === name).cube;
	if (!cube.length) { unequipButon.setDisabled(true).setStyle(ButtonStyle.Secondary); }
	const image = new AttachmentBuilder(`${__dirname}/images/characters/${name.replaceAll(':', '').replaceAll(' ', '_')}.png`);
	let cubeDesc = '';
	let cubeStats = '';
	const embed = new EmbedBuilder()
		.setTitle(name)
		.setThumbnail(`attachment://${name.replaceAll(':', '').replaceAll(' ', '_')}.png`);
	if (cube.length) {
		cubeDesc = `**${cube.at(0).ctype}\n** Cube Lv. **${cube.at(0).lvl}**`;
		const selectedCube = cubeData.cubes.find(c => c.ctype === cube.at(0).ctype);
		if (cube.at(0).ctype === 'Bastion') {
			let ammo = 2;
			if (cube.at(0).lvl < 3) { ammo = 1; }
			else if (cube.at(0).lvl > 6) { ammo = 3; }
			cubeStats = `Gives ${ammo} ammo per 10 rounds\n`;
		}
		else { cubeStats = `${selectedCube.attribute} +${selectedCube.values.at(cube.at(0).lvl - 1)}%\n`; }
		if (cube.at(0).lvl > 4) { cubeStats += `Element Damage Dealt +${cubeData.basicValues.elem.at(cube.at(0).lvl - 1)}%`; }
		embed.addFields(
			{ name: 'General Info', value: cubeDesc },
			{ name: 'Attributes', value: cubeStats },
		);
	}
	else { embed.setDescription('No cube equipped'); }

	const menuButtons = new ActionRowBuilder().addComponents(homeButton, backButton);
	const equipButtons = new ActionRowBuilder().addComponents(equipButton, unequipButon);
	await interaction.update({
		embeds: [embed],
		components: [menuButtons, equipButtons, exitRow],
		files: [image],
	}).catch((err) => console.log('ERROR IN INVENTORY JS', err));
}

async function gearPage(interaction, userData, name, homeButton) {
	const exitButton = new ButtonBuilder().setCustomId('inv-exit').setLabel('Exit').setStyle(ButtonStyle.Danger);
	const exitRow = new ActionRowBuilder().addComponents(exitButton);
	const backButton = new ButtonBuilder().setCustomId('gear-back').setLabel('Back').setStyle(ButtonStyle.Secondary);
	const equipButton = new ButtonBuilder().setCustomId('gear-equip').setLabel('Equip (Replace)').setStyle(ButtonStyle.Success);
	const unequipButton = new ButtonBuilder().setCustomId('gear-unequip').setLabel('Unequip').setStyle(ButtonStyle.Danger);
	const changeButton = new ButtonBuilder().setCustomId('gear-change').setLabel('Update current').setStyle(ButtonStyle.Success);
	const gear = await userData.characters.find(c => c.name === name).gear;
	if (!gear.length) {
		unequipButton.setDisabled(true).setStyle(ButtonStyle.Secondary);
		changeButton.setDisabled(true).setStyle(ButtonStyle.Secondary);
	}
	const image = new AttachmentBuilder(`${__dirname}/images/characters/${name.replaceAll(':', '').replaceAll(' ', '_')}.png`);
	const gearFields = [];
	const gearTypes = ['Head', 'Torso', 'Arm', 'Leg'];
	for (const gearType of gearTypes) {
		const currentGear = gear.find(g => g.gtype === gearType);
		if (currentGear) {
			let field = `**${currentGear.tier}** Lv. **${currentGear.lvl}**\n`;
			for (const sub of currentGear.subs) {
				field += `${sub.attribute} +${sub.value}%\n`;
			}
			gearFields.push(field);
		}
		else { gearFields.push('Nothing'); }
	}
	const gearEmbed = new EmbedBuilder()
		.setTitle(name)
		.setThumbnail(`attachment://${name.replaceAll(':', '').replaceAll(' ', '_')}.png`)
		.addFields(
			{ name: gearTypes.at(0), value: gearFields.at(0) },
			{ name: gearTypes.at(1), value: gearFields.at(1) },
			{ name: gearTypes.at(2), value: gearFields.at(2) },
			{ name: gearTypes.at(3), value: gearFields.at(3) },
		);
	const menuButtons = new ActionRowBuilder().addComponents(homeButton, backButton);
	const equipButtons = new ActionRowBuilder().addComponents(changeButton, equipButton, unequipButton);
	await interaction.update({
		embeds: [gearEmbed],
		components: [menuButtons, equipButtons, exitRow],
		files: [image],
	}).catch((err) => console.log('ERROR IN INVENTORY JS', err));
}

async function characterPage(interaction, userData, name, profile, rows) {
	const exitButton = new ButtonBuilder().setCustomId('inv-exit').setLabel('Exit').setStyle(ButtonStyle.Danger);
	const exitRow = new ActionRowBuilder().addComponents(exitButton);
	const nikke = userData.characters.find(c => c.name === name);
	// setting profile button
	if (nikke.in_profile) {
		profile.setLabel('Remove from profile').setStyle(ButtonStyle.Secondary).setCustomId('char-profile-remove').setDisabled(false);
	}
	else if (userData.characters.filter(c => c.in_profile).length < 12) {
		profile.setLabel('Add to profile').setStyle(ButtonStyle.Success).setCustomId('char-profile-add').setDisabled(false);
	}
	else {
		profile.setLabel('Add to profile').setStyle(ButtonStyle.Secondary).setCustomId('char-profile-add').setDisabled(true);
	}
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
		console.log(cube.at(0));
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
		.setThumbnail(`attachment://${name.replaceAll(':', '').replaceAll(' ', '_')}.png`);
	if (statField) { embed.addFields({ name: 'Additional Stats', value: statField }); }
	const rerows = rows;
	rerows.push(exitRow);
	await interaction.update({
		embeds: [embed],
		components: rows,
		files: [image],
	}).catch((err) => console.log('ERROR IN INVENTORY JS', err));
}

function listedCharacters(userData) {
	const characters = userData.characters;
	if (!characters.length) { return { descriptions: ['Not a single Nikke here :C\n Use **/character add** command to add one!'], names: [] }; }
	characters.sort((a, b) => ((b.pp + (nikkeList.find(c => c.name === b.name).code === bossWeakness ? b.pp_elem : 0)) - (a.pp + (nikkeList.find(c => c.name === a.name).code === bossWeakness ? a.pp_elem : 0))));
	const descriptions = [];
	const names = [];
	let description = '';
	for (let i = 0; i < characters.length; i++) {
		const character = characters.at(i);
		const name = character.name;
		const bonus_pp = nikkeList.find(c => c.name === name).code === bossWeakness ? character.pp_elem : 0;
		names.push(name);
		description += `${i + 1}. **${name}**${character.in_profile ? ' [in profile]' : ''}\n`;
		description += `> PP: \`${character.pp + bonus_pp}\`${bonus_pp ? '\\*' : ''} | Base ATK: \`${character.baseAttack}\` | Ammo: \`${character.ammo}\` | Skills: \`${character.s1}\`/\`${character.s2}\`/\`${character.burst}\`\n`;
		if (!((i + 1) % 10)) {
			descriptions.push(description);
			description = '';
		}
	}
	if (description) { descriptions.push(description); }
	return { descriptions: descriptions, names: names };
}

async function selectGearStats(interaction, settings) {
	const exitButton = new ButtonBuilder().setCustomId('inv-exit').setLabel('Exit').setStyle(ButtonStyle.Danger);
	const exitRow = new ActionRowBuilder().addComponents(exitButton);
	// buttons
	const cancelButton = new ButtonBuilder().setCustomId('gear-cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary);
	const confirmButton = new ButtonBuilder().setCustomId('gear-confirm').setLabel('Confirm selections').setStyle(ButtonStyle.Success);
	// embed
	const image = new AttachmentBuilder(`${__dirname}/images/characters/${settings.nikke.replaceAll(':', '').replaceAll(' ', '_')}.png`);
	const embed = new EmbedBuilder()
		.setAuthor({ name: settings.nikke, iconURL: `attachment://${settings.nikke.replaceAll(':', '').replaceAll(' ', '_')}.png` })
		.setTitle('Gear information')
		.addFields(
			{ name: 'General', value: `Type: ${settings.gear.gtype}\nTier: ${settings.gear.tier}\nLevel: ${settings.gear.lvl === -1 ? '`Select level`' : settings.gear.lvl}` })
		.setFooter({ text: 'Click "Confirm selection" only when you are done with all selections' });
	// finishing embed and building level and stats menus
	let subFieldString = '';
	const levelOptions = [];
	for (let i = 0; i <= 5; i++) {
		const levelOption = new StringSelectMenuOptionBuilder().setLabel(`Level ${i}`).setValue(`${i}`).setDefault(i === settings.gear.lvl);
		levelOptions.push(levelOption);
	}
	const levelMenu = new StringSelectMenuBuilder().setCustomId('gear-level').setPlaceholder('Select level').addOptions(levelOptions);
	const selectedOptions = [];
	for (const sub of settings.gear.subs) {
		selectedOptions.push(sub.attribute);
		subFieldString += `${sub.attribute}: ${sub.value !== 0 ? `+${sub.value}%` : '`Select value`'}\n`;
	}
	if (subFieldString) { embed.addFields({ name: 'Substats', value: subFieldString }); }

	const returnOption = new StringSelectMenuOptionBuilder().setLabel('Cancel selection').setValue('cancel');
	// buttons to add and remove substats
	const addStatButton = new ButtonBuilder().setCustomId('gear-add-stat').setLabel('Add Substat').setStyle(ButtonStyle.Success);
	const removeStatButton = new ButtonBuilder().setCustomId('gear-remove-stat').setLabel('Remove Substat').setStyle(ButtonStyle.Danger);
	if (settings.gear.lvl === -1 || settings.gear.tier.startsWith('T9')) {
		removeStatButton.setDisabled(true).setStyle(ButtonStyle.Secondary);
		addStatButton.setDisabled(true).setStyle(ButtonStyle.Secondary);
	}
	else if (settings.gear.subs.length === 0) { removeStatButton.setDisabled(true).setStyle(ButtonStyle.Secondary); }
	else if (settings.gear.subs.length === 3) { addStatButton.setDisabled(true).setStyle(ButtonStyle.Secondary); }

	const statRow = new ActionRowBuilder();
	const statsMenu = new StringSelectMenuBuilder();
	const valuesMenu = new StringSelectMenuBuilder();

	if (interaction.customId.startsWith('gear-tier') || interaction.customId.startsWith('update-type')) {
		statRow.addComponents(addStatButton, removeStatButton);
		confirmButton.setStyle(ButtonStyle.Secondary).setDisabled(true);
	}
	else if (interaction.customId === 'gear-level') {
		statRow.addComponents(addStatButton, removeStatButton);
	}
	else if (interaction.customId === 'gear-add-stat') {
		statsMenu.setCustomId('gear-stats-add').setPlaceholder('Select substat to add');
		const optionsArray = gearSubs.map(s => s.attribute).filter(a => !selectedOptions.includes(a));
		const statOptions = [];
		for (const opt of optionsArray) {
			const newOpt = new StringSelectMenuOptionBuilder().setLabel(`Increase ${opt}`).setValue(opt);
			statOptions.push(newOpt);
		}
		statOptions.unshift(returnOption);
		statsMenu.addOptions(statOptions);
		statRow.addComponents(statsMenu);
		levelMenu.setDisabled(true);
		confirmButton.setStyle(ButtonStyle.Secondary).setDisabled(true);
	}
	else if (interaction.customId === 'gear-remove-stat') {
		statsMenu.setCustomId('gear-stats-remove').setPlaceholder('Select substat to remove');
		const statOptions = [];
		for (const opt of selectedOptions) {
			const newOpt = new StringSelectMenuOptionBuilder().setLabel(`Increase ${opt}`).setValue(opt);
			statOptions.push(newOpt);
		}
		statOptions.unshift(returnOption);
		statsMenu.addOptions(statOptions);
		statRow.addComponents(statsMenu);
		levelMenu.setDisabled(true);
		confirmButton.setStyle(ButtonStyle.Secondary).setDisabled(true);
	}
	if (interaction.customId === 'gear-stats-remove') {
		statRow.addComponents(addStatButton, removeStatButton);
	}
	if (interaction.customId === 'gear-stats-add') {
		if (interaction.values[0] === 'cancel') {
			statRow.addComponents(addStatButton, removeStatButton);
		}
		else {
			const valuesArray = gearSubs.find(s => s.attribute === interaction.values[0]).values;
			const valuesOptions = [];
			for (const value of valuesArray) {
				const valuesOption = new StringSelectMenuOptionBuilder().setLabel(`+${value}%`).setValue(`${value}`);
				valuesOptions.push(valuesOption);
			}
			valuesOptions.unshift(returnOption);
			valuesMenu.setCustomId('gear-stats-value').setPlaceholder(`Increase ${settings.gear.subs.at(-1).attribute} (Select value)`).addOptions(valuesOptions);
			confirmButton.setStyle(ButtonStyle.Secondary).setDisabled(true);
			statRow.addComponents(valuesMenu);
			levelMenu.setDisabled(true);
		}
	}
	if (interaction.customId === 'gear-stats-value') {
		statRow.addComponents(addStatButton, removeStatButton);
	}
	const cancelRow = new ActionRowBuilder().addComponents(cancelButton, confirmButton);
	const levelRow = new ActionRowBuilder().addComponents(levelMenu);
	await interaction.update({
		embeds: [embed],
		components: [cancelRow, levelRow, statRow, exitRow],
		files: [image],
	}).catch((err) => console.log('ERROR IN INVENTORY JS', err));
}
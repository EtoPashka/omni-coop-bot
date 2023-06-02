const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, AttachmentBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const { request } = require('undici');
const userInfo = require('./data/database.js');
const { themes } = require('./data/themes.json');
const { nikkeList, bossWeakness } = require('./data/chardata.json');
const Canvas = require('@napi-rs/canvas');
// the res of the profile image
const iWidth = 500;
const iHeight = 300;
const path = require('node:path');
const fontsPath = path.join(__dirname, 'fonts');
Canvas.GlobalFonts.registerFromPath(path.join(fontsPath, 'NotoSans-Bold.ttf'), 'noto-sans');
Canvas.GlobalFonts.registerFromPath(path.join(fontsPath, 'NotoSans-Light.ttf'), 'noto-sans-l');
Canvas.GlobalFonts.registerFromPath(path.join(fontsPath, 'BOMBARD_.ttf'), 'bomb');
// resizing the text if it's too wide for the image
const applyText = (canvas, text, size, maxWidth, family) => {
	const context = canvas.getContext('2d');
	let fontSize = size;
	context.font = `${size}px ${family}`;
	while (context.measureText(text).width > maxWidth) {
		context.font = `${fontSize -= 1}px ${family}`;
	}
	return [context.font, fontSize, context.measureText(text).width];
};

module.exports = {
	cooldown: 10,
	data: new SlashCommandBuilder()
		.setName('profile')
		.setDescription('Get info about yourself or another user')
		.addUserOption(option => option.setName('target').setDescription('The user')),
	async execute(interaction) {
		const user = interaction.options.getUser('target') ?? interaction.user;
		let userData = await userInfo.findOne({ _id: user.id });
		// if no user found in database => no profile
		if (!userData) {
			if (user.id === interaction.user.id) {
				return interaction.reply({ content: 'You don\'t have an account! Create one via **/account create** command.', ephemeral: true }).catch((err) => console.log('ERROR IN PROFILE JS', err));
			}
			else {
				return interaction.reply({ content: `<@${user.id}> doesn't have an account!`, ephemeral: true }).catch((err) => console.log('ERROR IN PROFILE JS', err));
			}
		}
		await interaction.deferReply();
		const member = interaction.guild.members.cache.find(u => u.id === user.id);
		let theme = themes.find(t => t.name === userData.theme);
		let canvas = Canvas.createCanvas(iWidth, iHeight);
		let context = canvas.getContext('2d');
		let bg = theme.bg;
		let charData = userData.characters.filter(c => c.in_profile).sort((a, b) => ((b.pp + (nikkeList.find(c => c.name === b.name).code === bossWeakness ? b.pp_elem : 0)) - (a.pp + (nikkeList.find(c => c.name === a.name).code === bossWeakness ? a.pp_elem : 0))));
		// load required character images
		let images = [];
		for (let i = 0; i < charData.length; i++) {
			const image = await Canvas.loadImage(`${__dirname}/images/characters/${charData[i].name.replace(':', '').replace(' ', '_')}.png`);
			images.push(image);
		}
		// create image with bg
		let background = await Canvas.loadImage(`${__dirname}/images/bg/${bg}`);
		const { body } = await request(member.displayAvatarURL({ extension: 'png' }));
		const avatar = await Canvas.loadImage(await body.arrayBuffer());
		drawProfile(userData, theme, canvas, context, images, background, charData, avatar);
		let attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'profile-image.png' });

		const profileEmbed = new EmbedBuilder()
			.setTitle('Profile')
			.setDescription(`Owner: <@${user.id}> [${userData.server}]`)
			.setColor(theme.text)
			.setImage('attachment://profile-image.png');
		// the get id button handled in getid.js
		const showID = new ButtonBuilder()
			.setLabel('Get player ID')
			.setCustomId(`idB${userData.ID}`)
			.setStyle(ButtonStyle.Secondary);
		const editButton = new ButtonBuilder()
			.setLabel('Edit profile')
			.setCustomId('profile-edit')
			.setStyle(ButtonStyle.Primary);
		const row = new ActionRowBuilder();
		if (interaction.user.id !== user.id) {
			row.addComponents(showID);
			return interaction.editReply({ embeds: [profileEmbed], files: [attachment], components: [row] }).catch((err) => console.log('ERROR IN PROFILE JS', err));
		}
		row.addComponents(showID, editButton);
		const response = await interaction.editReply({ embeds: [profileEmbed], files: [attachment], components: [row] }).catch((err) => console.log('ERROR IN PROFILE JS', err));
		const buttonCollector = response.createMessageComponentCollector({ time: 45_000 });

		buttonCollector.on('end', async () => {
			editButton.setDisabled(true).setStyle(ButtonStyle.Secondary);
			return response.edit({ components: [row] }).catch((err) => console.log('ERROR IN PROFILE JS WITH EDITING MESSAGE', err));
		});

		buttonCollector.on('collect', async i => {
			if (i.customId === 'profile-edit') {
				const selection = { theme: userData.theme, nikkes: userData.characters.filter(c => c.in_profile).map(c => c.name) };
				if (i.user.id !== user.id) { return i.reply({ content: 'You cannot edit others\' profiles!', ephemeral: true }).catch((err) => console.log('ERROR IN PROFILE JS', err)); }
				buttonCollector.resetTimer({ time:  45_000 });
				if (userData.edit_profile) { return i.reply({ content: 'You have an active profile manager!', ephemeral: true }).catch((err) => console.log('ERROR IN PROFILE JS', err)); }
				const themeMenu = new StringSelectMenuBuilder().setCustomId('profile-theme').setPlaceholder('Select theme');
				const nikkeMenu = new StringSelectMenuBuilder().setCustomId('profile-nikkes').setPlaceholder('Select Nikkes');
				const cancelButton = new ButtonBuilder().setCustomId('profile-cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary);
				const confirmButton = new ButtonBuilder().setCustomId('profile-confirm').setLabel('Confirm changes').setStyle(ButtonStyle.Secondary).setDisabled(true);
				let addedNikkes = 'Nikkes in profile: ';
				for (const nikke of selection.nikkes) { addedNikkes += `\`${nikke}\` `; }
				if (!userData.characters.length) { addedNikkes = 'You don\'t have Nikkes. Use **/character add** to add a Nikke.'; }
				const embed = new EmbedBuilder()
					.setTitle('Profile management')
					.setDescription(`Theme: \`${selection.theme}\`\n\n${addedNikkes}`)
					.setFooter({ text: 'You can add up to 12 Nikkes' });
				const options = [];
				for (const nikke of userData.characters) {
					const option = new StringSelectMenuOptionBuilder().setLabel(nikke.name).setValue(nikke.name).setDefault(selection.nikkes.includes(nikke.name));
					options.push(option);
				}
				const max = userData.characters.length > 12 ? 12 : userData.characters.length;
				if (max) {
					nikkeMenu.setMinValues(0).setMaxValues(max);
					nikkeMenu.addOptions(options);
				}
				else {
					const option = new StringSelectMenuOptionBuilder().setLabel('sad').setValue('sad');
					nikkeMenu.addOptions([option]).setDisabled(true).setPlaceholder('You don\'t have Nikkes to add');
				}
				const themeOptions = [];
				for (const t of themes.map(te => te.name)) {
					const option = new StringSelectMenuOptionBuilder().setLabel(t).setValue(t).setDefault(t === selection.theme);
					themeOptions.push(option);
				}
				themeMenu.addOptions(themeOptions);
				const buttonRow = new ActionRowBuilder().addComponents(cancelButton, confirmButton);
				const themeRow = new ActionRowBuilder().addComponents(themeMenu);
				const nikkeRow = new ActionRowBuilder().addComponents(nikkeMenu);
				const editResponse = await i.reply({ embeds: [embed], components: [buttonRow, themeRow, nikkeRow], ephemeral: true }).catch((err) => console.log('ERROR IN PROFILE JS', err));
				const editCollector = editResponse.createMessageComponentCollector({ idle: 30_000 });

				await userInfo.findOneAndUpdate({ _id: interaction.user.id }, { edit_profile: true }, {});
				userData = await userInfo.findOne({ _id: interaction.user.id });
				let inactive = true;
				editCollector.on('end', async () => {
					const expireButton = new ButtonBuilder().setCustomId('profile-expire').setLabel('Profile edit interation expired').setDisabled(true).setStyle(ButtonStyle.Secondary);
					const expireRow = new ActionRowBuilder().addComponents(expireButton);
					await userInfo.findOneAndUpdate({ _id: interaction.user.id }, { edit_profile: false }, {});
					userData = await userInfo.findOne({ _id: interaction.user.id });
					if (inactive) { return editResponse.edit({ components: [expireRow] }).catch((err) => console.log('ERROR IN PROFILE JS WITH EDITING MANAGE MESSAGE', err)); }
				});
				editCollector.on('collect', async int => {
					buttonCollector.resetTimer({ time:  45_000 });
					if (int.customId === 'profile-theme') {
						selection.theme = int.values[0];
						newManagePage(int, selection, userData);
					}
					else if (int.customId === 'profile-nikkes') {
						selection.nikkes = [];
						for (const val of int.values) { selection.nikkes.push(val); }
						newManagePage(int, selection, userData);
					}
					else if (int.customId === 'profile-cancel') {
						selection.nikkes = userData.characters.filter(c => c.in_profile).map(c => c.name);
						selection.theme = userData.theme;
						inactive = false;
						editCollector.stop();
						// await response.edit({ content: 'Calcelleldlalsdla' });
						return int.update({ content: 'Profile edit has been cancelled.', embeds: [], components: [] }).catch((err) => console.log('ERROR IN PROFILE JS', err));
					}
					else if (int.customId === 'profile-confirm') {
						await userInfo.findOneAndUpdate({ _id: interaction.user.id }, {
							theme: selection.theme,
							$set: {
								'characters.$[].in_profile': false,
							},
						}, {});
						await userInfo.findOneAndUpdate({
							_id: interaction.user.id,
						}, {
							$set: {
								'characters.$[elem].in_profile': true,
							},
						}, { arrayFilters: [{ 'elem.name': { $in: selection.nikkes } }] });

						userData = await userInfo.findOne({ _id: interaction.user.id });
						theme = themes.find(t => t.name === userData.theme);
						canvas = Canvas.createCanvas(iWidth, iHeight);
						context = canvas.getContext('2d');
						bg = theme.bg;
						charData = userData.characters.filter(c => c.in_profile).sort((a, b) => ((b.pp + (nikkeList.find(c => c.name === b.name).code === bossWeakness ? b.pp_elem : 0)) - (a.pp + (nikkeList.find(c => c.name === a.name).code === bossWeakness ? a.pp_elem : 0))));
						// load required character images
						images = [];
						for (let k = 0; k < charData.length; k++) {
							const image = await Canvas.loadImage(`${__dirname}/images/characters/${charData[k].name.replace(':', '').replace(' ', '_')}.png`);
							images.push(image);
						}
						// create image with bg
						background = await Canvas.loadImage(`${__dirname}/images/bg/${bg}`);
						drawProfile(userData, theme, canvas, context, images, background, charData, avatar);

						attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'profile-image.png' });
						profileEmbed.setColor(theme.text);
						await response.edit({ embeds: [profileEmbed], files: [attachment] }).catch((err) => console.log('ERROR IN PROFILE JS', err));
						inactive = false;
						editCollector.stop();
						return int.update({ content: 'Profile edit has been completed.', embeds: [], components: [] }).catch((err) => console.log('ERROR IN PROFILE JS', err));
					}
				});
			}
		});
	},
};

async function newManagePage(i, selection, userData) {
	const themeMenu = new StringSelectMenuBuilder().setCustomId('profile-theme').setPlaceholder('Select theme');
	const nikkeMenu = new StringSelectMenuBuilder().setCustomId('profile-nikkes').setPlaceholder('Select Nikkes');
	const cancelButton = new ButtonBuilder().setCustomId('profile-cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary);
	const confirmButton = new ButtonBuilder().setCustomId('profile-confirm').setLabel('Confirm changes').setStyle(ButtonStyle.Success);
	let addedNikkes = 'Nikkes in profile: ';
	for (const nikke of selection.nikkes) { addedNikkes += `\`${nikke}\` `; }
	if (!userData.characters.length) { addedNikkes = 'You don\'t have Nikkes. Use **/character add** to add a Nikke.'; }
	const embed = new EmbedBuilder()
		.setTitle('Profile management')
		.setDescription(`Theme: \`${selection.theme}\`\n\n${addedNikkes}`)
		.setFooter({ text: 'You can add up to 12 Nikkes' });
	const options = [];
	for (const nikke of userData.characters) {
		const option = new StringSelectMenuOptionBuilder().setLabel(nikke.name).setValue(nikke.name).setDefault(selection.nikkes.includes(nikke.name));
		options.push(option);
	}
	const max = userData.characters.length > 12 ? 12 : userData.characters.length;
	if (max) {
		nikkeMenu.setMinValues(0).setMaxValues(max);
		nikkeMenu.addOptions(options);
	}
	else {
		const option = new StringSelectMenuOptionBuilder().setLabel('sad').setValue('sad');
		nikkeMenu.addOptions([option]).setDisabled(true).setPlaceholder('You don\'t have Nikkes to add');
	}
	const themeOptions = [];
	for (const theme of themes.map(t => t.name)) {
		const option = new StringSelectMenuOptionBuilder().setLabel(theme).setValue(theme).setDefault(theme === selection.theme);
		themeOptions.push(option);
	}
	themeMenu.addOptions(themeOptions);
	const buttonRow = new ActionRowBuilder().addComponents(cancelButton, confirmButton);
	const themeRow = new ActionRowBuilder().addComponents(themeMenu);
	const nikkeRow = new ActionRowBuilder().addComponents(nikkeMenu);
	await i.update({ embeds: [embed], components: [buttonRow, themeRow, nikkeRow], ephemeral: true }).catch((err) => console.log('ERROR IN PROFILE JS', err));
}

function drawProfile(userData, theme, canvas, context, images, background, charData, avatar) {
	const colors = [theme.stroke, theme.text];
	context.drawImage(background, 0, 0, canvas.width, canvas.height);
	context.fillStyle = 'rgba(0, 0, 0, 0.7)';
	context.strokeStyle = colors[0];
	// member avatar placing and adding status
	context.save();
	Circle(context, 30, 170, 100);
	context.fill();
	context.clip();

	const avatarSize = 100;
	context.drawImage(avatar, 30, 170, avatarSize, avatarSize);
	context.restore();
	Circle(context, 30, 170, avatarSize);
	context.lineWidth = 3;
	context.stroke();
	// grid (with characters) placing
	context.lineWidth = 1;
	GridOfSquircles(context, 180, 60, 4, 3, 60, 20, 20, charData, images, colors);
	// player name and id placing
	const name = userData.name;
	let textParams = applyText(canvas, name, 30, 200, 'noto-sans');
	context.font = textParams[0];
	const fontSize = textParams[1];
	const textWidth = textParams[2];
	context.fillStyle = '#000000';
	context.fillText(name, 172, 42);
	context.fillStyle = colors[1];
	context.fillText(name, 170, 40);
	context.beginPath();
	context.moveTo(180 + textWidth, 40 - fontSize);
	context.lineTo(180 + textWidth, 50);
	context.closePath();
	context.lineWidth = 2;
	context.stroke();
	const ID = userData.ID;
	const stringID = `ID: ${ID}`;
	textParams = applyText(canvas, stringID, 15, 100, 'noto-sans-l');
	context.font = textParams[0];
	context.fillText(stringID, 187 + textWidth, 50);
}
// drawing Squircle
function Squircle(context, x, y, size) {
	const hsize = size / 2;
	context.beginPath();
	context.moveTo(x + hsize, y);
	context.bezierCurveTo(x, y, x, y, x, y + hsize);
	context.bezierCurveTo(x, y + size, x, y + size, x + hsize, y + size);
	context.bezierCurveTo(x + size, y + size, x + size, y + size, x + size, y + hsize);
	context.bezierCurveTo(x + size, y, x + size, y, x + hsize, y);
	context.closePath();
}
// drawing Circle
function Circle(context, x, y, size) {
	const r = size / 2;
	context.beginPath();
	context.arc(x + r, y + r, r, 0, Math.PI * 2, true);
	context.closePath();
}
// megafunction xD
function GridOfSquircles(context, start_x, start_y, x_num, y_num, cell_size, space_x, space_y, charData, images, colors) {
	// set cell fill style and stroke style
	context.fillStyle = 'rgba(0, 0, 0, 0.7)';
	context.strokeStyle = colors[0];
	for (let i = 0, k = 0; i < y_num; i++) {
		for (let j = 0; j < x_num; j++, k++) {
			const x = start_x + j * (cell_size + space_x);
			const y = start_y + i * (cell_size + space_y);
			// cell shape
			Squircle(context, x, y, cell_size);
			context.fill();
			// if there is a character left to put in cell => put it in
			if (k < charData.length && k < y_num * x_num) {
				const character = charData[k];
				context.save();
				context.clip();
				context.drawImage(images[k], x, y, cell_size, cell_size);
				context.stroke();
				context.restore();
				// adding pp
				const pp = `${character.pp + (nikkeList.find(c => c.name === character.name).code === bossWeakness ? character.pp_elem : 0)}`;
				context.font = '16px bomb';
				const ppWidth = context.measureText(pp).width;
				context.fillStyle = 'rgba(0, 0, 0, 1)';
				context.fillText(pp, x + (cell_size - ppWidth) / 2 + 1, y + cell_size + 14);
				context.fillText(pp, x + (cell_size - ppWidth) / 2 - 1, y + cell_size + 12);
				context.fillText(pp, x + (cell_size - ppWidth) / 2 - 1, y + cell_size + 14);
				context.fillText(pp, x + (cell_size - ppWidth) / 2 + 1, y + cell_size + 12);
				context.fillStyle = colors[1];
				context.fillText(pp, x + (cell_size - ppWidth) / 2, y + cell_size + 13);
				context.font = '14px bomb';
				for (let c = 0; c < 3; c++) {
					context.fillStyle = 'rgba(0, 0, 0, 1)';
					Circle(context, x, y + 4 + c * (2 + 16), 16);
					context.fill();
					context.stroke();
					context.fillStyle = colors[1];
					let text;
					switch (c) {
					case 0:
						text = String(character.s1);
						break;
					case 1:
						text = String(character.s2);
						break;
					case 2:
						text = String(character.burst);
						break;
					}
					const tWidth = context.measureText(text).width;
					context.fillText(text, x + 8 - tWidth / 2, y + 12 + 4 + c * (2 + 16));
				}
				context.fillStyle = 'rgba(0, 0, 0, 0.7)';
			}
			else {
				// if no character => just stroke the cell and draw next
				context.stroke();
			}
		}
	}
}
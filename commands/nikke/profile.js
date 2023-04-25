const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { request } = require('undici');
const { themes } = require('./themes.json');
const defaultTheme = 'Guillotine (Purple)';
const userInfo = require('./db/database.js');
const Canvas = require('@napi-rs/canvas');
// the res of the profile image
const iWidth = 500;
const iHeight = 300;
const path = require('node:path');
const fontsPath = path.join(__dirname, 'fonts');
Canvas.GlobalFonts.registerFromPath(path.join(fontsPath, 'NotoSansHK-Bold.otf'), 'noto-sans');
Canvas.GlobalFonts.registerFromPath(path.join(fontsPath, 'BOMBARD_.ttf'), 'bomb');
// resizing the text if it's too wide for the image
const applyText = (canvas, text) => {
	const context = canvas.getContext('2d');
	let fontSize = 40;
	context.font = '40px noto-sans';
	while (context.measureText(text).width > 300) {
		context.font = `${fontSize -= 1}px noto-sans`;
	}
	return context.font;
};

module.exports = {
	cooldown: 10,
	data: new SlashCommandBuilder()
		.setName('profile')
		.setDescription('Get info about yourself or another user')
		.addUserOption(option => option.setName('target').setDescription('The user')),
	async execute(interaction) {
		const user = interaction.options.getUser('target') ?? interaction.user;
		const userData = await userInfo.findOne({ _id: user.id });
		// if no user found in database => no profile
		if (!userData) {
			return interaction.reply({ content: `<@${user.id}> doesn't have a profile!`, ephemeral: true });
		}
		const member = interaction.guild.members.cache.find(u => u.id === user.id);
		// getting style info
		// const colors = ['#d3790e', '#f8ab2b'];
		let bg;
		let colors = [];
		if (userData.theme.bg && userData.theme.stroke && userData.theme.text) {
			colors = [userData.theme.stroke, userData.theme.text];
			bg = userData.theme.bg;
		}
		else {
			const theme = themes.find(t => t.name === defaultTheme);
			colors = [theme.stroke, theme.text];
			bg = theme.bg;
		}
		const charData = userData.characters;
		const canvas = Canvas.createCanvas(iWidth, iHeight);
		const context = canvas.getContext('2d');
		// load required character images
		const images = [];
		for (let i = 0; i < charData.length; i++) {
			const image = await Canvas.loadImage(`${__dirname}/images/${charData[i].name.replace(':', '')}.png`);
			images.push(image);
		}
		// create image with bg
		const background = await Canvas.loadImage(`${__dirname}/images/${bg}`);
		context.drawImage(background, 0, 0, canvas.width, canvas.height);
		context.fillStyle = 'rgba(0, 0, 0, 0.7)';
		context.strokeStyle = colors[0];
		// member avatar placing and adding status
		context.save();
		Circle(context, 30, 170, 100);
		context.fill();
		context.clip();
		const { body } = await request(member.displayAvatarURL({ extension: 'png' }));
		const avatar = await Canvas.loadImage(await body.arrayBuffer());
		const avatarSize = 100;
		context.drawImage(avatar, 30, 170, avatarSize, avatarSize);
		context.restore();
		Circle(context, 30, 170, avatarSize);
		context.lineWidth = 3;
		context.stroke();
		// grid (with characters) placing
		context.lineWidth = 1;
		GridOfSquircles(context, 180, 60, 4, 3, 60, 20, 20, charData, images, colors);
		// member name placing
		context.font = applyText(canvas, member.displayName);
		context.fillStyle = '#000000';
		context.fillText(member.displayName, 172, 42);
		context.fillStyle = colors[1];
		context.fillText(member.displayName, 170, 40);

		const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'profile-image.png' });

		return interaction.reply({ files: [attachment] });
	},
};
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
				// circle for OL number
				Circle(context, x + cell_size - 15, y + cell_size - 15, 20);
				context.fillStyle = 'rgba(0, 0, 0, 1)';
				context.fill();
				context.stroke();
				context.fillStyle = colors[1];
				context.font = '16px bomb';
				const ol = String(character.ol);
				const olWidth = context.measureText(ol).width;
				context.fillText(ol, x + cell_size - 5 - olWidth / 2, y + cell_size);
				// circles for nikke skills' levels
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
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const userInfo = require('./data/database.js');
const { nikkeList } = require('./data/chardata.json');
const { APBM } = require('./data/apbm.js');

module.exports = {
	cooldown: 10,
	data: new SlashCommandBuilder()
		.setName('recycle')
		.setDescription('Set Recycling Room levels')
		/* .addIntegerOption(option =>
			option
				.setName('general')
				.setDescription('General Research level')
				.setMinValue(0)
				.setMaxValue(999))
		.addIntegerOption(option =>
			option
				.setName('attacker')
				.setDescription('Attacker Class Research level')
				.setMinValue(0)
				.setMaxValue(999))
		.addIntegerOption(option =>
			option
				.setName('supporter')
				.setDescription('Supporter Class Research level')
				.setMinValue(0)
				.setMaxValue(999))
		.addIntegerOption(option =>
			option
				.setName('defender')
				.setDescription('Defender Class Research level')
				.setMinValue(0)
				.setMaxValue(999)) */
		.addIntegerOption(option =>
			option
				.setName('elysion')
				.setDescription('Elysion Manufacturer Research level')
				.setMinValue(0)
				.setMaxValue(999))
		.addIntegerOption(option =>
			option
				.setName('missilis')
				.setDescription('Missilis Manufacturer Research level')
				.setMinValue(0)
				.setMaxValue(999))
		.addIntegerOption(option =>
			option
				.setName('tetra')
				.setDescription('Tetra Manufacturer Research level')
				.setMinValue(0)
				.setMaxValue(999))
		.addIntegerOption(option =>
			option
				.setName('pilgrim')
				.setDescription('Pilgrim Manufacturer Research level')
				.setMinValue(0)
				.setMaxValue(999))
		.addIntegerOption(option =>
			option
				.setName('abnormal')
				.setDescription('Abnormal Manufacturer Research level')
				.setMinValue(0)
				.setMaxValue(999)),
	async execute(interaction) {
		await interaction.deferReply({ ephemeral: true });
		const userData = await userInfo.findOne({ _id: interaction.user.id });
		if (!userData) {
			return interaction.editReply({ content: 'You don\'t have an account! Create one via **/account create** command.' }).catch((err) => console.log('ERROR IN RECYCLE JS', err));
		}
		const manuArray = [];
		// getting all the values and checking manufacturers
		/* const generalR = interaction.options.getInteger('general') ?? userData.rr_general_lvl;
		const attackerR = interaction.options.getInteger('attacker') ?? userData.rr_class.find(c => c.name === 'Attacker').lvl;
		const supporterR = interaction.options.getInteger('supporter') ?? userData.rr_class.find(c => c.name === 'Supporter').lvl;
		const defenderR = interaction.options.getInteger('defender') ?? userData.rr_class.find(c => c.name === 'Defender').lvl; */
		const elysionR = interaction.options.getInteger('elysion') ?? userData.rr_manu.find(c => c.name === 'Elysion').lvl;
		if (elysionR !== userData.rr_manu.find(c => c.name === 'Elysion').lvl) { manuArray.push({ manufacturer: 'Elysion', lvl: elysionR }); }
		const tetraR = interaction.options.getInteger('tetra') ?? userData.rr_manu.find(c => c.name === 'Tetra').lvl;
		if (tetraR !== userData.rr_manu.find(c => c.name === 'Tetra').lvl) { manuArray.push({ manufacturer: 'Tetra', lvl: tetraR }); }
		const missilisR = interaction.options.getInteger('missilis') ?? userData.rr_manu.find(c => c.name === 'Missilis').lvl;
		if (missilisR !== userData.rr_manu.find(c => c.name === 'Missilis').lvl) { manuArray.push({ manufacturer: 'Missilis', lvl: missilisR }); }
		const pilgrimR = interaction.options.getInteger('pilgrim') ?? userData.rr_manu.find(c => c.name === 'Pilgrim').lvl;
		if (pilgrimR !== userData.rr_manu.find(c => c.name === 'Pilgrim').lvl) { manuArray.push({ manufacturer: 'Pilgrim', lvl: pilgrimR }); }
		const abnormalR = interaction.options.getInteger('abnormal') ?? userData.rr_manu.find(c => c.name === 'Abnormal').lvl;
		if (abnormalR !== userData.rr_manu.find(c => c.name === 'Abnormal').lvl) { manuArray.push({ manufacturer: 'Abnormal', lvl: abnormalR }); }
		// updating characters values
		const characters = userData.characters;
		for (const manu of manuArray) {
			for (const character of characters) {
				const currentNikke = nikkeList.find(c => c.name === character.name);
				if (currentNikke.manufacturer === manu.manufacturer) {
					const apbm = APBM(currentNikke, character.s1, character.s2, character.burst, character.lb, character.core, character.bond, character.gear, character.cube, manu.lvl);
					character.baseAttack = Math.round(apbm.attack);
					character.pp = Math.round(apbm.pp);
					character.pp_elem = Math.round(apbm.pp_elem);
					character.ammo = apbm.ammo;
				}
			}
		}
		// sending data to database
		await userInfo.findOneAndUpdate({
			_id: interaction.user.id,
		}, {
			// rr_general_lvl: generalR,
			// rr_class: [{ name: 'Attacker', lvl: attackerR }, { name: 'Supporter', lvl: supporterR }, { name: 'Defender', lvl: defenderR }],
			rr_manu: [
				{ name: 'Elysion', lvl: elysionR },
				{ name: 'Tetra', lvl: tetraR },
				{ name: 'Missilis', lvl: missilisR },
				{ name: 'Pilgrim', lvl: pilgrimR },
				{ name: 'Abnormal', lvl: abnormalR },
			],
			$set: { characters: characters },
		}, {});
		// building reply
		const replyEmbed = new EmbedBuilder()
			.setTitle('Recycling Room Info')
			// .setDescription(`__General Research__: Lv. ${generalR}`)
			.addFields(
				// { name: 'Class Research', value: `__Attacker__: Lv. ${attackerR}\n__Supporter__: Lv. ${supporterR}\n__Defender__: Lv. ${defenderR}` },
				{ name: 'Manufacturer Research', value: `__Elysion__: Lv. ${elysionR}\n__Missilis__: Lv. ${missilisR}\n__Tetra__: Lv. ${tetraR}\n__Pilgrim__: Lv. ${pilgrimR}\n__Abnormal__: Lv. ${abnormalR}` },
			);
		return interaction.editReply({ embeds: [replyEmbed] }).catch((err) => console.log('ERROR IN RECYCLE JS', err));
	},
};
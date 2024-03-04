const { SlashCommandBuilder } = require('discord.js');
const userInfo = require('./data/database.js');
const userInfo2 = require('./data/db2.js');
const { nikkeList } = require('./data/chardata.json');
const { APBM } = require('./data/apbm.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('reset')
		.setDescription('Reset user characters values')
		.setDefaultMemberPermissions('0'),
	async execute(interaction) {
		await interaction.deferReply({ ephemeral: true });
		const users = await userInfo.find({});
		/* for (const user of users) {
			await userInfo2.findOneAndUpdate({ _id: user._id }, {
				_id: user._id,
				name: user.name,
				ID: user.ID,
				theme: user.theme,
				server: 'Global',
				edit_profile: false,
				inventory: false,
				rr_general_lvl: user.rr_general_lvl,
				rr_class: user.rr_class,
				rr_manu: user.rr_manu,
				characters: user.characters,
			},
			{ upsert: true });
		} */
		// THIS IS FOR THE RESETING!!!!!
		/* for (const user of users) {
			const nikkes = nikkeList.map(n => n.name);
			const characters = user.characters.filter(c => nikkes.includes(c.name));
			// if (user.name === 'PASHA') { console.log(characters); }
			for (const character of characters) {
				const currentNikke = nikkeList.find(n => n.name === character.name);
				const rr_manulvl = user.rr_manu.find(m => m.name === currentNikke.manufacturer).lvl;
				const apbm = APBM(currentNikke, character.s1, character.s2, character.burst, character.lb, character.core, character.bond, character.gear, character.cube, rr_manulvl);
				character.baseAttack = Math.round(apbm.attack);
				character.pp = Math.round(apbm.pp);
				character.pp_elem = Math.round(apbm.pp_elem);
				character.ammo = apbm.ammo;
			}
			// if (user.name === 'HoshiWS') { console.log(characters); }
			await userInfo.findOneAndUpdate({
				_id: user._id,
			}, {
				$set: { characters: characters },
			}, {});
		} */
		return interaction.editReply('Done').catch((err) => console.log('err in reset', err));

	},
};

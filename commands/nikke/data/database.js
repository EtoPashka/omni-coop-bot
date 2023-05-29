const { Schema, model, models } = require('mongoose');

const userInfo = new Schema ({
	_id: String,
	name: String,
	ID: String,
	server: String,
	theme: String,
	edit_profile: Boolean,
	inventory: Boolean,
	rr_general_lvl: Number,
	rr_class: [{ name: String, lvl: Number }],
	rr_manu: [{ name: String, lvl: Number }],
	characters: [{
		name: String,
		lb: Number,
		core: Number,
		bond: Number,
		s1: Number,
		s2: Number,
		burst: Number,
		pp: Number,
		pp_elem: Number,
		ammo: Number,
		baseAttack: Number,
		in_profile: Boolean,
		gear: [{
			tier: String,
			gtype: String,
			lvl: Number,
			subs: [{ attribute: String, value: Number }],
		}],
		cube: [{
			ctype: String,
			lvl: Number,
		}],
	}],
});


const name = 'omni-coop-accounts-server';
module.exports = models[name] || model(name, userInfo);
const { Schema, model, models } = require('mongoose');

const userInfo = new Schema ({
	_id: String,
	username: String,
	name: String,
	ID: String,
	theme: {
		bg: String,
		stroke: String,
		text: String,
	},
	characters: [ {
		name: String,
		s1: Number,
		s2: Number,
		burst: Number,
		ol: Number,
		cv: Number,
	} ],
});


const name = 'nikke-coop-database';
module.exports = models[name] || model(name, userInfo);
const { Events, ActivityType } = require('discord.js');
const mongoose = require('mongoose');
require('dotenv/config');
const userInfo = require('../commands/nikke//data/database.js');

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		mongoose.connect(process.env.MONGO_URI, {
			keepAlive: true,
		});
		client.user.setActivity({ name: '/help', type: ActivityType.Listening });
		await userInfo.updateMany({}, { inventory: false, edit_profile: false });
		console.log(`Ready! Logged in as ${client.user.tag}`);
	},
};
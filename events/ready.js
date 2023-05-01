const { Events, ActivityType } = require('discord.js');
const mongoose = require('mongoose');
require('dotenv/config');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		mongoose.connect(process.env.MONGO_URI, {
			keepAlive: true,
		});
		client.user.setActivity({ name: '/help', type: ActivityType.Listening });

		console.log(`Ready! Logged in as ${client.user.tag}`);
	},
};
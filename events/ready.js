const { Events } = require('discord.js');
const mongoose = require('mongoose');
require('dotenv/config');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
		mongoose.connect(process.env.MONGO_URI, {
			keepAlive: true,
		});
	},
};
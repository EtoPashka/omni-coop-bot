const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('Shows the information about the bot'),
	async execute(interaction) {
		const helpEmbed = new EmbedBuilder()
			.setTitle('Bot information')
			.setDescription('This bot is created to help Omni members find companions for ranked Co-Op runs in Nikke. It can store information about players\' Nikkes (up to 12 Nikkes per user).\n Please, add __ONLY__ characters that are most important for the current Co-Op battle.\n You can check out the list of all commands below.\n**Note:** to __create a profile__ you have to add your first character via `/character add` command.')
			.addFields(
				{ name: '/character', value:
                '**/character add** — adds a Nikke to your profile (creates a new one if you don\'t have any) with her skills\' levels and the number of OL gear she has. You can\'t add a character twice.\n\n' +
                '**/character update** — updates the chosen Nikke in your profile. You can enter only the parameters that you want to change.\n\n' +
                '**/character remove** — removes the chosen Nikke from your profile.\n' },
				{ name: '/delete profile', value:
                'Removes your profile from bot\'s database completely.\n' },
				{ name: '/who has', value:
                'Shows all users with the chosen Nikke. You can set the required minimum parameters (optional).\n' +
                '*CD: 10 seconds.*\n' },
				{ name: '/set theme', value:
                'Sets the desired theme to your profile. Currently there are only 2 themes available.\n' +
                '*CD: 5 seconds.*\n' },
				{ name: '/profile', value:
                'Shows the profile of the chosen user if they have it. If no user chosen the command shows your profile. You can see the profile example below. Values:\n' +
                '**1.** Skills\' levels;\n**2.** Number of OL gear equipped.\n' +
                '*CD: 5 seconds.*\n' },
			)
			.setImage('https://i.ibb.co/6wpX4ML/profile-guide.png');
		await interaction.reply({
			content: `<@${interaction.user.id}>`,
			embeds: [helpEmbed],
			ephemeral: true,
		});
	},
};
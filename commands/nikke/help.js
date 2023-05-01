const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const bot_creator_id = '224490278478675968';
const coopChannel = '<#1042837815752396811>';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('Shows the information about the bot'),
	async execute(interaction) {
		const member = interaction.guild.members.cache.find(m => m.id === bot_creator_id);
		const helpEmbed = new EmbedBuilder()
			.setTitle('Bot information')
			.setDescription(`**NOTE**: use commands in ${coopChannel}!\n\nThis bot is created to help Omni members find companions for ranked Co-Op runs in Nikke. It can store information about players' Nikkes (up to 12 Nikkes per user).\n Please, add __ONLY__ characters that are most important for the current Co-Op battle.\n You can check out the list of all coop-related commands below.\n`)
			.addFields(
				{ name: '/create profile', value:
				'Creates your profile and adds it to bot\'s database. You have to provide your in-game name and player ID.\n' },
				{ name: '/update profile', value:
				'Allows you to change your in-game name and/or player ID in your profile.\n' },
				{ name: '/delete profile', value:
                'Removes your profile from bot\'s database completely.\n' },
				{ name: '/character', value:
                '**/character add** — adds a Nikke to your profile with her skills\' levels and the number of OL gear she has. You can\'t add a character twice.\n\n' +
                '**/character update** — updates the chosen Nikke in your profile. You can enter only the parameters that you want to change.\n\n' +
                '**/character remove** — removes the chosen Nikke from your profile.\n' },
				{ name: '/who has', value:
                'Shows all users with the chosen Nikke. You can set the required minimum parameters (optional).\n' +
                '*CD: 10 seconds.*\n' },
				{ name: '/set theme', value:
                'Sets the desired theme to your profile. Currently there are only 2 themes available.\n' +
                '*CD: 5 seconds.*\n' },
				{ name: '/profile', value:
                'Shows the profile of the chosen user if they have it. If no user chosen the command shows your profile. You can see the profile image example below.\n' +
                '*CD: 5 seconds.*\n\n' +
				'Values in the image:\n**1.** Skills\' levels;\n**2.** Number of OL gear equipped.\n' },
			)
			.setImage('https://i.ibb.co/Kx9wvn9/profile-guide.png')
			.setFooter({ text: `Created by ${member.user.tag}`, iconURL: member.user.displayAvatarURL() });
		const supButton = new ButtonBuilder()
			.setCustomId('help-kofi')
			.setEmoji('1102315230094163968')
			.setStyle(ButtonStyle.Secondary);
		const row = new ActionRowBuilder().addComponents(supButton);
		return interaction.reply({
			embeds: [helpEmbed],
			components: [row],
			ephemeral: true,
		});
	},
};
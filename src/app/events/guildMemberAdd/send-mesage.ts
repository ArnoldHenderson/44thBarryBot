
import type { EventHandler } from 'commandkit';
import { Logger } from 'commandkit/logger';

const welcomeMessages = require('./welcome-messages.json');

const handler : EventHandler<'guildMemberAdd'> = async (member) => { 
    
    if (member.guild.id !== process.env['44TH_DISCORD_GUILD_ID']) return; // Check if the guild ID matches the specific guild 

    // Get a random welcome message
    const randomMessageObj = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
    const randomMessage = randomMessageObj.Message;

    Logger.info(`New member joined: ${member.user.tag} (${member.id}), sending welcome message (${randomMessageObj.WelcomeMessageID}).`);
    
    if (!process.env.HELP_CHANNEL) {
        Logger.error('HELP_CHANNEL environment variable not set');
        return;
    }
    
    const channel = member.guild.channels.cache.get(process.env.HELP_CHANNEL);
    if (!channel || !('send' in channel)) {
        Logger.error(`Channel not found: ${process.env.HELP_CHANNEL}`);
        return;
    }

    channel.send(randomMessage.replace('{user}', `<@${member.id}>`));
};

export default handler;
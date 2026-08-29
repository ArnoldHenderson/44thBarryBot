import type { EventHandler } from 'commandkit';
import { Logger } from 'commandkit/logger';

const handler : EventHandler<'guildMemberAdd'> = async (member) => { 
    if (member.guild.id !== '928381935523348480') return; // Check if the guild ID matches the specific guild 
    Logger.info(`New member joined: ${member.user.tag} (${member.id})`);
};

export default handler;
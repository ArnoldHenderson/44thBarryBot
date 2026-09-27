import type { EventHandler } from "commandkit";
import { Logger } from "commandkit/logger";

const handler: EventHandler<"guildMemberRemove"> = async (member) => {
  // Logger.info(`Debug: Member left: ${member.user.tag} (${member.id})`);
  if (member.guild.id !== process.env["44TH_DISCORD_GUILD_ID"]) return;

  if (!process.env.REMOVALS_CHANNEL) {
    Logger.error("REMOVALS_CHANNEL environment variable not set");
    return;
  }

  const channel = member.guild.channels.cache.get(process.env.REMOVALS_CHANNEL);
  if (!channel || !("send" in channel)) {
    Logger.warn(`Channel not found: ${process.env.REMOVALS_CHANNEL}`);
    return;
  }

  channel.send(`Member left: *<@${member.id}>*`);
};

export default handler;

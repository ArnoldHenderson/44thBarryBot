import type { EventHandler } from "commandkit";
import connectMongo from "../../mongo";
import { Logger } from "commandkit/logger";

const handler: EventHandler<"guildMemberRemove"> = async (member) => {
  // Logger.info(`Debug: Member left: ${member.user.tag} (${member.id})`);
  if (member.guild.id !== process.env["44TH_DISCORD_GUILD_ID"]) return;

  const config = await (await connectMongo())
    .db("44thbarry")
    .collection("config")
    .findOne({ guildId: process.env["44TH_DISCORD_GUILD_ID"] });

  const channel = member.guild.channels.cache.get(config?.["removalChannelId"]);
  if (!channel || !("send" in channel)) {
    Logger.warn(`Channel not found: ${process.env.REMOVALS_CHANNEL}`);
    return;
  }

  channel.send(`Member left: *<@${member.id}>*`);
};

export default handler;

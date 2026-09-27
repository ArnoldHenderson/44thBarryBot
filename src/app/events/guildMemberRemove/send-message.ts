import type { EventHandler } from "commandkit";
import connectMongo from "../../mongo";
import { Logger } from "commandkit/logger";

const handler: EventHandler<"guildMemberRemove"> = async (member) => {
  const guildId = process.env["44TH_DISCORD_GUILD_ID"];
  if (member.guild.id !== guildId) return;

  try {
    const config = await (await connectMongo())
      .db("44thbarry")
      .collection("config")
      .findOne({ guildId });
    const channelId = config?.removalChannelId;

    if (!channelId) {
      Logger.warn(`Removal channel is not configured for guild ${guildId}.`);
      return;
    }

    const channel = await member.guild.channels.fetch(channelId);
    if (!channel || !("send" in channel)) {
      Logger.warn(`Removal channel not found: ${channelId}`);
      return;
    }

    await channel.send(`Member left: *<@${member.id}>*`);
  } catch (error) {
    Logger.error(`Failed to send member removal message: ${error}`);
  }
};

export default handler;

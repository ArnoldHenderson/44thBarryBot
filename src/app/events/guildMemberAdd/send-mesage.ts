import connectMongo from "@/app/mongo";
import type { EventHandler } from "commandkit";
import { Logger } from "commandkit/logger";

const welcomeMessages = require("./welcome-messages.json");

const handler: EventHandler<"guildMemberAdd"> = async (member) => {
  if (member.guild.id !== process.env["44TH_DISCORD_GUILD_ID"]) return; // Check if the guild ID matches the specific guild

  // Get a random welcome message
  const randomMessageObj =
    welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
  const randomMessage = randomMessageObj.Message;

  Logger.info(
    `New member joined: ${member.user.tag} (${member.id}), sending welcome message (Message ID: ${randomMessageObj.WelcomeMessageID}).`,
  );

  const config = await (await connectMongo())
    .db("44thbarry")
    .collection("config")
    .findOne({ guildId: process.env["44TH_DISCORD_GUILD_ID"] });

  const channel = member.guild.channels.cache.get(config?.["welcomeChannelId"]);
  if (!channel || !("send" in channel)) {
    Logger.error(`Channel not found: ${config?.["welcomeChannelId"]}`);
    return;
  }

  channel.send(
    randomMessage
      .replace("{user}", `<@${member.id}>`)
      .replace(
        "{how-to-enlist}",
        "<#" + process.env.HOW_TO_ENLIST_CHANNEL + ">",
      )
      .replace(
        "{application-form}",
        "<#" + process.env.APPLICATION_FORM_CHANNEL + ">",
      )
      .replace("{help-channel}", "<#" + process.env.HELP_CHANNEL + ">")
      .replace(
        "{application-channel}",
        "<#" + process.env.APPLICATION_FORM_CHANNEL + ">",
      ),
  );
};

export default handler;

import { Client, Interaction } from "discord.js";
import { Logger } from "commandkit/logger";
import getClient from "./app/mongo";
import cron from "node-cron";

const client = new Client({
  intents: ["Guilds", "GuildMembers", "GuildMessages", "MessageContent"],
});

// Surface failures that would otherwise be swallowed silently in production
process.on("unhandledRejection", (reason) => {
  Logger.error(`Unhandled promise rejection: ${reason}`);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  Logger.error(`Uncaught exception: ${error}`);
  process.exit(1);
});

getClient().catch(() => {
  // Error already logged inside getClient(); exit so the container restarts and retries
  process.exit(1);
});

client.login(process.env.DISCORD_BOT_TOKEN);

/*
   Below are cron jobs that run on a schedule. They are currently commented out, but can be enabled if needed.
   These cron jobs are used for pining admins at event times. These in theory will work around daylight savings time, but may need to be adjusted if the event times change.
*/

// Test cron job that runs every minute and sends a message to a specific channel
/*
cron.schedule('* * * * *', async () => {
  const channel = client.channels.cache.get('1543055339740725271');

  if (channel && channel.isTextBased() && 'send' in channel) {
    await channel.send('test');
  }
}, {
  timezone: 'Europe/London',
});
*/

// Ping admins at 17:00 on Thursdays and Fridays for the 44th Skirmisher event
cron.schedule(
  "45 17 * * 5,6",
  async () => {
    const channel = client.channels.cache.get("1317264796000714862");

    if (channel && channel.isTextBased() && "send" in channel) {
      await channel.send(
        "<@&1317257762597634149> The 44th Skirmisher event is starting at <t:1788026400:t>, React with a ✅ if you want to admin.",
      );
    }
  },
  {
    timezone: "Europe/London",
  },
);

export default client;

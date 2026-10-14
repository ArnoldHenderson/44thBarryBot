import { Client, Interaction } from "discord.js";
import { Logger } from "commandkit/logger";
import cron from "node-cron";
import connectMongo from "./app/mongo";

let isReady = false;

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

connectMongo().catch(() => {
  // Error already logged in connectMongo(); exit so the container restarts and retries
  process.exit(1);
});

client.login(process.env.DISCORD_BOT_TOKEN);

client.once("ready", () => {
  Logger.info("Logging to uptime kuma");

  isReady = true;
});

/*
   Below are cron jobs that run on a schedule. They are currently commented out, but can be enabled if needed.
   These cron jobs are used for pining admins at event times. These in theory will work around daylight savings time, but may need to be adjusted if the event times change.
*/

cron.schedule(
  "* * * * *",
  async () => {
    if (isReady) {
      if (process.env.UPTIME_KUMA_PUSH_URL) {
        const pushURL: string = process.env.UPTIME_KUMA_PUSH_URL!;

        const push = async () => {
          await fetch(pushURL);
          console.log("Pushed!");
        };
        push();
      }
    }
  },
  {
    timezone: "Europe/London",
  },
);

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

/*
const config = await (await connectMongo())
  .db("bot-config")
  .collection("config")
  .findOne({ guildId: process.env["44TH_DISCORD_GUILD_ID"] });

Logger.debug(`removals channel debug: ${config?.["removalChannelId"]}`);
*/

export default client;

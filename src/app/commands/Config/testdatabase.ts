import type { ChatInputCommand, CommandData } from "commandkit";
import connectMongo from "../../mongo";

export const metadata = {
  guilds: [`${process.env["44TH_DISCORD_GUILD_ID"]}`],
  userPermissions: "Administrator",
};

export const command: CommandData = {
  name: "testdatabase",
  description: "Test the database for development debug",
};

export const chatInput: ChatInputCommand = async (ctx) => {
  await ctx.interaction.deferReply();

  try {
    const client = await connectMongo();
    await client.db().command({ ping: 1 });
    await ctx.interaction.editReply("Successfully connected to the database.");
  } catch {
    await ctx.interaction.editReply("Database check failed.");
  }
};

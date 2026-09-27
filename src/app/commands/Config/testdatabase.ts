import type { ChatInputCommand, CommandData } from "commandkit";
import connectMongo from "../../mongo";

export const metadata = {
  guilds: ["1543055338247290994"],
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

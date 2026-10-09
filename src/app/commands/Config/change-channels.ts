import type { ChatInputCommand, CommandData } from "commandkit";
import { EmbedBuilder } from "discord.js";
import { Logger } from "commandkit/logger";
import connectMongo from "../../mongo";

export const metadata = {
  guilds: [`${process.env["44TH_DISCORD_GUILD_ID"]}`],
  userPermissions: "Administrator",
};

export const command: CommandData = {
  name: "change-message-channels",
  description: "Change the channels for the bot",
  options: [
    {
      name: "set-channels",
      description: "Set one or more message channels",
      type: 1,
      options: [
        {
          name: "welcome-message-channel",
          description: "The channel for welcome messages",
          type: 7,
          required: false,
        },
        {
          name: "removal-message-channel",
          description: "The channel for removal messages",
          type: 7,
          required: false,
        },
      ],
    },
    {
      name: "read-channels",
      description: "Read the current message channels",
      type: 1,
    },
    {
      name: "clear-channels",
      description: "Clear the message channels",
      type: 1,
    },
  ],
};

export const chatInput: ChatInputCommand = async (ctx) => {
  await ctx.interaction.deferReply();

  // Blocks usage outside of a server context
  const guildId = ctx.interaction.guildId;
  if (!guildId) {
    await ctx.interaction.editReply(
      "This command can only be used in a server.",
    );
    return;
  }

  // Connect to the database and handle the subcommands
  try {
    const client = await connectMongo();
    const collection = client.db("bot-config").collection("config");
    const welcomeChannel = ctx.interaction.options.getChannel(
      "welcome-message-channel",
      false,
    );
    const removalChannel = ctx.interaction.options.getChannel(
      "removal-message-channel",
      false,
    );

    // Handle the "read-channels" subcommand first
    if (ctx.interaction.options.getSubcommand() === "read-channels") {
      const config = await collection.findOne({ guildId });
      const readEmbed = new EmbedBuilder()
        .setTitle("Current Message Channels")
        .setColor("Blue")
        .addFields(
          {
            name: "Welcome Channel",
            value: config?.welcomeChannelId
              ? `<#${config.welcomeChannelId}>`
              : "Not Set",
            inline: true,
          },
          {
            name: "Removal Channel",
            value: config?.removalChannelId
              ? `<#${config.removalChannelId}>`
              : "Not Set",
            inline: true,
          },
        );
      await ctx.interaction.editReply({ embeds: [readEmbed] });
      return;
    }

    if (ctx.interaction.options.getSubcommand() === "clear-channels") {
      await collection.updateOne(
        { guildId },
        { $unset: { welcomeChannelId: "", removalChannelId: "" } },
        { upsert: true },
      );

      const clearEmbed = new EmbedBuilder()
        .setTitle("Message Channels Cleared")
        .setDescription("All message channels have been cleared.")
        .setColor("Green");
      await ctx.interaction.editReply({ embeds: [clearEmbed] });
      return;
    }

    // Handle the "set-channels" subcommand next
    if (!welcomeChannel && !removalChannel) {
      await ctx.interaction.editReply("Choose at least one channel to update.");
      return;
    }

    const updates: Record<string, string> = {};
    if (welcomeChannel) updates.welcomeChannelId = welcomeChannel.id;
    if (removalChannel) updates.removalChannelId = removalChannel.id;

    await collection.updateOne(
      { guildId },
      { $set: updates },
      { upsert: true },
    );

    // Re-fetch so unmodified channels still show their previously stored value
    const updatedConfig = await collection.findOne({ guildId });

    const embed = new EmbedBuilder()
      .setTitle("Message Channels Updated")
      .setDescription("Updated Channels")
      .setColor("Green")
      .addFields(
        {
          name: "Welcome Channel",
          value: updatedConfig?.welcomeChannelId
            ? `<#${updatedConfig.welcomeChannelId}>`
            : "Not Set",
          inline: true,
        },
        {
          name: "Removal Channel",
          value: updatedConfig?.removalChannelId
            ? `<#${updatedConfig.removalChannelId}>`
            : "Not Set",
          inline: true,
        },
      );

    await ctx.interaction.editReply({ embeds: [embed] });

    Logger.info(`Successfully updated message channels for guild ${guildId}.`);
  } catch (error) {
    Logger.error(`Failed to update message channel configuration: ${error}`);

    const errorEmbed = new EmbedBuilder()
      .setTitle("Error")
      .setDescription("Failed to update message channels.")
      .setColor("Red");
    await ctx.interaction.editReply({ embeds: [errorEmbed] });
  }
};

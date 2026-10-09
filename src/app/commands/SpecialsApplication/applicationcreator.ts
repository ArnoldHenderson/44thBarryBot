import type { ChatInputCommand, CommandData } from "commandkit";
import { EmbedBuilder } from "discord.js";
import { Logger } from "commandkit/logger";
import connectMongo from "../../mongo";
import { message } from "../GeneralCommands/ping";

export const metadata = {
  guilds: [`${process.env["44TH_DISCORD_GUILD_ID"]}`],
  userPermissions: "Administrator",
};

export const command: CommandData = {
  name: "application-creator",
  description:
    "Creates a new application for the Specials and Auxiliary companies.",
  options: [
    {
      name: "send-application-channel",
      description: "Set a message channel",
      type: 1,
      options: [
        {
          name: "application-channel",
          description: "The channel for the application",
          type: 7,
          required: true,
          channel_types: [0],
        },
        {
          name: "skrim-minimum-rank",
          description: "The role for the Skrim company",
          type: 8,
          required: true,
        },
        {
          name: "cav-minimum-rank",
          description: "The role for the Cav company",
          type: 8,
          required: true,
        },
        {
          name: "arty-minimum-rank",
          description: "The role for the Auxiliary company",
          type: 8,
          required: true,
        },
        {
          name: "medic-minimum-rank",
          description: "The role for the Medic company",
          type: 8,
          required: true,
        },
        {
          name: "guard-minimum-rank",
          description: "The role for the Guard company",
          type: 8,
          required: true,
        },
        {
          name: "navy-minimum-rank",
          description: "The role for the Navy company",
          type: 8,
          required: true,
        },
      ],
    },
    {
      name: "delete-application",
      description: "Delete the existing application",
      type: 1,
    },
  ],
};

export const chatInput: ChatInputCommand = async (ctx) => {
  const interaction = ctx.interaction;

  try {
    await interaction.deferReply();
    const mongoClient = await connectMongo();
    const applicationCollection = mongoClient
      .db("bot-config")
      .collection("rof-applications");

    // Application response collections for each company
    const skirmApplicationResponseCollection = mongoClient
      .db("bot-config")
      .collection("skirm-application-responses");
    const cavApplicationResponseCollection = mongoClient
      .db("bot-config")
      .collection("cav-application-responses");
    const artyApplicationResponseCollection = mongoClient
      .db("bot-config")
      .collection("arty-application-responses");
    const medicApplicationResponseCollection = mongoClient
      .db("bot-config")
      .collection("medic-application-responses");
    const guardApplicationResponseCollection = mongoClient
      .db("bot-config")
      .collection("guard-application-responses");
    const navyApplicationResponseCollection = mongoClient
      .db("bot-config")
      .collection("navy-application-responses");

    if (interaction.options.getSubcommand() === "send-application-channel") {
      const channel = interaction.options.getChannel("application-channel");
      const targetChannel = channel
        ? await interaction.guild?.channels.fetch(channel.id)
        : null;
      if (!targetChannel?.isTextBased()) {
        await interaction.editReply("Choose a text application channel.");
        return;
      }

      const minimumRanks = {
        skrim: interaction.options.getRole("skrim-minimum-rank"),
        cav: interaction.options.getRole("cav-minimum-rank"),
        arty: interaction.options.getRole("arty-minimum-rank"),
        medic: interaction.options.getRole("medic-minimum-rank"),
        guard: interaction.options.getRole("guard-minimum-rank"),
        navy: interaction.options.getRole("navy-minimum-rank"),
      };

      const ApplicationEmbedAndButtons = new EmbedBuilder()
        .setColor(14803200)
        .setTitle("44th Specials and Auxiliary Application")
        .setAuthor({
          name: "44th | Sgt. Barry",
          iconURL: "https://44thholdfast.com/android-chrome-512x512.png",
        })
        .setDescription(
          "This is the application to apply for specials. Please choose a special down below and make sure you can apply by looking at the minimum rank required for each special.",
        )
        .setImage(
          "https://44thholdfast.com/media/images/regiment_photos/regphoto6.webp",
        )
        .addFields(
          {
            name: "Skirmishers",
            value: `Minimum Rank: ${minimumRanks.skrim}`,
          },
          {
            name: "Cavalry",
            value: `Minimum Rank: ${minimumRanks.cav}`,
          },
          {
            name: "Artillery",
            value: `Minimum Rank: ${minimumRanks.arty}`,
          },
          {
            name: "Medic",
            value: `Minimum Rank: ${minimumRanks.medic}`,
          },
          {
            name: "Guard",
            value: `Minimum Rank: ${minimumRanks.guard}`,
          },
          {
            name: "Navy",
            value: `Minimum Rank: ${minimumRanks.navy}`,
          },
        )
        .setFooter({
          text: "44th Regiment of Foot",
          iconURL: "https://44thholdfast.com/android-chrome-512x512.png",
        });

      if (await applicationCollection.findOne({ exists: true })) {
        await interaction.editReply(
          `An application already exists in <#${targetChannel.id}>.`,
        );
        return;
      }

      const applicationMsg = await targetChannel.send({
        embeds: [ApplicationEmbedAndButtons],
      });

      await applicationCollection.insertOne({
        exists: true,
        messageId: applicationMsg.id,
        channelId: targetChannel.id,
        createdAt: new Date(),
      });

      await interaction.editReply(
        `Application sent to <#${targetChannel.id}>.`,
      );
      return;
    }

    if (interaction.options.getSubcommand() === "delete-application") {
      const application = await applicationCollection.findOne({ exists: true });
      if (!application) {
        await interaction.editReply("There is no application to delete.");
        return;
      }

      const applicationChannel = await interaction.guild?.channels.fetch(
        application.channelId,
      );
      if (!applicationChannel?.isTextBased()) {
        await interaction.editReply(
          "The application channel could not be found.",
        );
        return;
      }

      const applicationMessage = await applicationChannel.messages.fetch(
        application.messageId,
      );
      await applicationMessage.delete();
      await applicationCollection.deleteOne({ _id: application._id });

      await interaction.editReply("Application deleted.");
    }
    //
  } catch (error) {
    Logger.error(error);
    const errorMessage = "An error occurred while executing the command.";
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
};

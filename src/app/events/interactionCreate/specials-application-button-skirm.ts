import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  LabelBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import type { EventHandler } from "commandkit";
import { Logger } from "commandkit/logger";
import { ObjectId } from "mongodb";
import connectMongo from "@/app/mongo";

const applicationId = "apply-skrim";
const modalId = `specials-application:${applicationId}`;
const reviewButtonPrefix = "skirm-review";

type ApplicationStatus =
  | "pending"
  | "claimed"
  | "on-hold"
  | "accepted"
  | "denied";

type SkirmApplication = {
  userId: string;
  username: string;
  guildId: string | null;
  discordUsernameAndRank: string;
  whyJoin: string;
  experience: string;
  leaderboardScore: string;
  willingToTrain: string;
  status: ApplicationStatus;
  submittedAt: Date;
  claimedBy?: string;
  claimedAt?: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewMessageId?: string;
};

const createReviewEmbed = (
  application: SkirmApplication,
  applicationId: string,
) =>
  new EmbedBuilder()
    .setColor(
      application.status === "accepted"
        ? "Green"
        : application.status === "denied"
          ? "Red"
          : application.status === "on-hold"
            ? "Yellow"
            : "Blue",
    )
    .setTitle("Skirmishers Application")
    .setDescription(
      `Applicant: <@${application.userId}>\nStatus: **${application.status}**`,
    )
    .addFields(
      {
        name: "Discord username and rank",
        value: application.discordUsernameAndRank,
      },
      { name: "Why join?", value: application.whyJoin },
      { name: "Experience", value: application.experience },
      { name: "Leaderboard score", value: application.leaderboardScore },
      { name: "Willing to train?", value: application.willingToTrain },
    )
    .setFooter({ text: `Application ID: ${applicationId}` })
    .setTimestamp(application.submittedAt);

const createReviewButtons = (
  applicationId: string,
  status: ApplicationStatus,
) => {
  const isFinal = status === "accepted" || status === "denied";

  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${reviewButtonPrefix}:claim:${applicationId}`)
      .setLabel("Claim")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(status !== "pending"),
    new ButtonBuilder()
      .setCustomId(`${reviewButtonPrefix}:accept:${applicationId}`)
      .setLabel("Accept")
      .setStyle(ButtonStyle.Success)
      .setDisabled(isFinal),
    new ButtonBuilder()
      .setCustomId(`${reviewButtonPrefix}:hold:${applicationId}`)
      .setLabel("Hold")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(isFinal),
    new ButtonBuilder()
      .setCustomId(`${reviewButtonPrefix}:deny:${applicationId}`)
      .setLabel("Deny")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(isFinal),
  );
};

const handler: EventHandler<"interactionCreate"> = async (interaction) => {
  if (interaction.isModalSubmit()) {
    if (interaction.customId !== modalId) return;

    await interaction.deferReply({ ephemeral: true });

    try {
      if (!interaction.guildId || !interaction.guild) {
        throw new Error(
          "Skirmisher applications can only be submitted in a server.",
        );
      }

      const mongoClient = await connectMongo();
      const database = mongoClient.db("bot-config");
      const configuration = await database
        .collection("rof-applications-skirm")
        .findOne({ exists: true, guildId: interaction.guildId });

      if (!configuration?.reviewChannelId || !configuration.reviewerRoleId) {
        throw new Error(
          "Skirmisher application review settings are incomplete.",
        );
      }

      const reviewChannel = await interaction.guild.channels.fetch(
        configuration.reviewChannelId,
      );
      if (!reviewChannel?.isTextBased() || !("send" in reviewChannel)) {
        throw new Error("Configured Skirmisher review channel is unavailable.");
      }

      const application: SkirmApplication = {
        userId: interaction.user.id,
        username: interaction.user.username,
        guildId: interaction.guildId,
        discordUsernameAndRank:
          interaction.fields.getTextInputValue("user-name-and-rank"),
        whyJoin: interaction.fields.getTextInputValue("why-join"),
        experience: interaction.fields.getTextInputValue("experience"),
        leaderboardScore:
          interaction.fields.getTextInputValue("leaderboard-score"),
        willingToTrain:
          interaction.fields.getTextInputValue("willing-to-train"),
        status: "pending",
        submittedAt: new Date(),
      };
      const responses = database.collection<SkirmApplication>(
        "skirm-application-responses",
      );
      const result = await responses.insertOne(application);

      try {
        const reviewMessage = await reviewChannel.send({
          embeds: [
            createReviewEmbed(application, result.insertedId.toString()),
          ],
          components: [
            createReviewButtons(
              result.insertedId.toString(),
              application.status,
            ),
          ],
        });
        await responses.updateOne(
          { _id: result.insertedId },
          { $set: { reviewMessageId: reviewMessage.id } },
        );
      } catch (error) {
        await responses.deleteOne({ _id: result.insertedId });
        throw error;
      }

      await interaction.editReply(
        "Your Skirmishers application has been submitted for review.",
      );
    } catch (error) {
      Logger.error(
        `Failed to submit Skirmishers application from ${interaction.user.id}: ${error}`,
      );
      await interaction.editReply(
        "Your application could not be submitted. Please try again later.",
      );
    }

    return;
  }

  if (!interaction.isButton()) return;

  if (interaction.customId.startsWith(`${reviewButtonPrefix}:`)) {
    const [, action, responseId] = interaction.customId.split(":");
    if (
      !responseId ||
      !ObjectId.isValid(responseId) ||
      (action !== "claim" &&
        action !== "accept" &&
        action !== "hold" &&
        action !== "deny")
    ) {
      await interaction.reply({
        content: "This application action is invalid.",
        ephemeral: true,
      });
      return;
    }

    if (!interaction.guildId || !interaction.guild) {
      await interaction.reply({
        content: "Applications can only be reviewed in a server.",
        ephemeral: true,
      });
      return;
    }

    try {
      const mongoClient = await connectMongo();
      const database = mongoClient.db("bot-config");
      const configuration = await database
        .collection("rof-applications")
        .findOne({ exists: true, guildId: interaction.guildId });

      if (!configuration?.reviewerRoleId) {
        await interaction.reply({
          content: "The application reviewer role is not configured.",
          ephemeral: true,
        });
        return;
      }

      const reviewer = await interaction.guild.members.fetch(
        interaction.user.id,
      );
      if (!reviewer.roles.cache.has(configuration.reviewerRoleId)) {
        await interaction.reply({
          content: "You do not have permission to review applications.",
          ephemeral: true,
        });
        return;
      }

      const responses = database.collection<SkirmApplication>(
        "skirm-application-responses",
      );
      const application = await responses.findOne({
        _id: new ObjectId(responseId),
        guildId: interaction.guildId,
      });

      if (!application) {
        await interaction.reply({
          content: "This application could not be found.",
          ephemeral: true,
        });
        return;
      }

      if (action === "claim" && application.status !== "pending") {
        await interaction.reply({
          content: "This application has already been claimed or reviewed.",
          ephemeral: true,
        });
        return;
      }

      if (
        action !== "claim" &&
        (application.claimedBy !== interaction.user.id ||
          (application.status !== "claimed" &&
            application.status !== "on-hold"))
      ) {
        await interaction.reply({
          content: "Claim this pending application before reviewing it.",
          ephemeral: true,
        });
        return;
      }

      const status: ApplicationStatus =
        action === "claim"
          ? "claimed"
          : action === "accept"
            ? "accepted"
            : action === "hold"
              ? "on-hold"
              : "denied";

      await interaction.deferUpdate();

      const update =
        action === "claim"
          ? {
              $set: {
                status,
                claimedBy: interaction.user.id,
                claimedAt: new Date(),
              },
            }
          : {
              $set: {
                status,
                reviewedBy: interaction.user.id,
                reviewedAt: new Date(),
              },
            };
      const result = await responses.updateOne(
        {
          _id: application._id,
          status: application.status,
          ...(action === "claim" ? {} : { claimedBy: interaction.user.id }),
        },
        update,
      );

      if (!result.matchedCount) {
        await interaction.followUp({
          content: "This application was updated by another reviewer.",
          ephemeral: true,
        });
        return;
      }

      const updatedApplication: SkirmApplication = {
        ...application,
        status,
        ...(action === "claim"
          ? { claimedBy: interaction.user.id, claimedAt: new Date() }
          : { reviewedBy: interaction.user.id, reviewedAt: new Date() }),
      };
      await interaction.editReply({
        embeds: [createReviewEmbed(updatedApplication, responseId)],
        components: [createReviewButtons(responseId, status)],
      });
    } catch (error) {
      Logger.error(
        `Failed to process Skirmishers application action from ${interaction.user.id}: ${error}`,
      );

      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          content: "The application action could not be completed.",
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: "The application action could not be completed.",
          ephemeral: true,
        });
      }
    }

    return;
  }

  if (interaction.customId !== applicationId) return;

  const modal = new ModalBuilder()
    .setCustomId(modalId)
    .setTitle("Skirmishers Application");

  const nameAndRankInput = new TextInputBuilder()
    .setCustomId("user-name-and-rank")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);
  const nameLabel = new LabelBuilder()
    .setLabel("What is your Discord username and current rank?")
    .setTextInputComponent(nameAndRankInput);

  const whyJoinInput = new TextInputBuilder()
    .setCustomId("why-join")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);
  const whyJoinLabel = new LabelBuilder()
    .setLabel("Why do you want to join the Skirmishers?")
    .setTextInputComponent(whyJoinInput);

  const experienceInput = new TextInputBuilder()
    .setCustomId("experience")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);
  const experienceLabel = new LabelBuilder()
    .setLabel("Skirmisher experience and/or understanding?")
    .setTextInputComponent(experienceInput);

  const leaderboardScoreInput = new TextInputBuilder()
    .setCustomId("leaderboard-score")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);
  const leaderboardScoreLabel = new LabelBuilder()
    .setLabel("What is your current leaderboard score? (Lights/Rifles)")
    .setTextInputComponent(leaderboardScoreInput);

  const willingToTrain = new TextInputBuilder()
    .setCustomId("willing-to-train")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);
  const willingToTrainLabel = new LabelBuilder()
    .setLabel("Are you willing to train with the Skirmishers before battles?")
    .setTextInputComponent(willingToTrain);

  await interaction.showModal(
    modal.addLabelComponents(
      nameLabel,
      whyJoinLabel,
      experienceLabel,
      leaderboardScoreLabel,
      willingToTrainLabel,
    ),
  );
};

export default handler;

import { MongoClient } from "mongodb";
import { Logger } from "commandkit/logger";

const uri = process.env.MONGODB_URI!;
const mongoClient = new MongoClient(uri);

export default async function getClient() {
  try {
    await mongoClient.connect().then(() => {
      Logger.info("🔌 Connected to MongoDB");
    });
    return mongoClient;
  } catch (error) {
    Logger.error(`Failed to connect to MongoDB" ${error}`);
    throw error;
  }
}

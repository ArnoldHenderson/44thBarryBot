import { MongoClient } from "mongodb";
import { Logger } from "commandkit/logger";

const uri = process.env.MONGODB_URI!;
// Fail fast instead of hanging silently if the server is unreachable
const mongoClient = new MongoClient(uri, {
  serverSelectionTimeoutMS: 10_000,
  connectTimeoutMS: 10_000,
});

export default async function getClient() {
  try {
    await mongoClient.connect();
    Logger.info("🔌 Connected to MongoDB");
    return mongoClient;
  } catch (error) {
    Logger.error(`Failed to connect to MongoDB: ${error}`);
    throw error;
  }
}

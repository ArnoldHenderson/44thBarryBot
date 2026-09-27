import { MongoClient } from "mongodb";
import { Logger } from "commandkit/logger";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("MONGODB_URI is not set");
}

// Fail fast instead of hanging silently if the server is unreachable
const mongoClient = new MongoClient(uri, {
  serverSelectionTimeoutMS: 10_000,
  connectTimeoutMS: 10_000,
});

let connectionPromise: Promise<MongoClient> | undefined;

export default function connectMongo(): Promise<MongoClient> {
  if (!connectionPromise) {
    connectionPromise = mongoClient
      .connect()
      .then((client) => {
        Logger.info("🔌 Connected to MongoDB");
        return client;
      })
      .catch((error: unknown) => {
        connectionPromise = undefined;
        Logger.error(`Failed to connect to MongoDB: ${error}`);
        throw error;
      });
  }

  return connectionPromise;
}

export { mongoClient };

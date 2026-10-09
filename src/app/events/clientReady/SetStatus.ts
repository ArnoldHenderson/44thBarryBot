import type { EventHandler } from "commandkit";

const handler: EventHandler<"clientReady"> = async (client) => {
  client.user?.setPresence({
    activities: [{ name: "Watching the 44th Regiment of Foot", type: 3 }],
    status: "online",
  });
};

export default handler;

import http from "http";
import { createApp } from "@/app/app";
import { env } from "@/config/env";
import { connectDB } from "@/db/connect";
import { closeSocket, setupSocket } from "@/realtime/socket.server";

async function bootstrap() {
  await connectDB();

  const app = createApp();
  const server = http.createServer(app);
  await setupSocket(server);

  server.listen(env.port,env.host,  () => {
    console.log(`Backend running on http://localhost:${env.port}`);
  });

  const shutdown = async () => {
    await closeSocket();
    process.exit(0);
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});

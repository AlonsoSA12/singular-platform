import { buildServer } from "./app.js";
import { appConfig } from "../src/config.js";

async function start() {
  const app = buildServer();

  try {
    await app.listen({
      port: appConfig.port,
      host: "0.0.0.0"
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void start();

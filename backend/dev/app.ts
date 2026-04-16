import cors from "@fastify/cors";
import Fastify from "fastify";
import { findUserByEmail } from "../src/airtable.js";
import { appConfig } from "../src/config.js";

type ValidateEmailBody = {
  email?: string;
};

export function buildServer() {
  const app = Fastify({
    logger: true
  });

  app.register(cors, {
    origin: [appConfig.frontendUrl],
    credentials: true
  });

  app.get("/health", async () => {
    return {
      ok: true,
      service: "singular-platform-api"
    };
  });

  app.post<{ Body: ValidateEmailBody }>("/auth/validate-email", async (request, reply) => {
    const email = request.body.email?.trim().toLowerCase();

    if (!email) {
      return reply.code(400).send({
        ok: false,
        message: "El email es obligatorio."
      });
    }

    const user = await findUserByEmail(email);

    if (!user) {
      return reply.code(401).send({
        ok: false,
        message: "Email no autorizado."
      });
    }

    return reply.send({
      ok: true,
      user
    });
  });

  return app;
}

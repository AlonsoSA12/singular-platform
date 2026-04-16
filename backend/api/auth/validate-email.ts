import { findUserByEmail } from "../../src/airtable.js";

type ValidateEmailBody = {
  email?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ValidateEmailBody;
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return Response.json(
        {
          ok: false,
          message: "El email es obligatorio."
        },
        { status: 400 }
      );
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return Response.json(
        {
          ok: false,
          message: "Email no autorizado."
        },
        { status: 401 }
      );
    }

    return Response.json({
      ok: true,
      user
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible validar el email en Airtable.";

    return Response.json(
      {
        ok: false,
        message
      },
      { status: 500 }
    );
  }
}

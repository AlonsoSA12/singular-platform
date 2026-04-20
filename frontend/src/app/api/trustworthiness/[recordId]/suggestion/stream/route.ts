import { NextResponse } from "next/server";
import { fetchFromBackend } from "@/lib/backend";
import { getBackendBaseUrl } from "@/lib/env";
import { readSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    recordId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await readSession();

  if (!session) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  try {
    const { recordId } = await context.params;
    const body = (await request.json()) as {
      end?: string;
      participantEmail?: string;
      start?: string;
    };
    const participantEmail = body.participantEmail?.trim().toLowerCase();
    const start = body.start?.trim();
    const end = body.end?.trim();

    if (!participantEmail) {
      return NextResponse.json({ message: "El email del talento es obligatorio." }, { status: 400 });
    }

    if (!start || !end) {
      return NextResponse.json(
        { message: "El rango total start/end es obligatorio." },
        { status: 400 }
      );
    }

    const backendBaseUrl = getBackendBaseUrl();
    const url = new URL(
      `${backendBaseUrl}/trustworthiness/${encodeURIComponent(recordId)}/suggestion/stream`
    );

    url.searchParams.set("activeEmail", session.email);
    url.searchParams.set("evaluatorEmail", session.email);

    const backendResponse = await fetchFromBackend(url, {
      body: JSON.stringify({
        end,
        participantEmail,
        start
      }),
      cache: "no-store",
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });

    const contentType = backendResponse.headers.get("content-type") ?? "";

    if (!backendResponse.body || !contentType.includes("application/x-ndjson")) {
      const message = await backendResponse.text().catch(() => "");

      return NextResponse.json(
        {
          message:
            message.length > 0
              ? message
              : "El backend no devolvió un stream NDJSON para la sugerencia TW."
        },
        { status: 502 }
      );
    }

    return new Response(backendResponse.body, {
      headers: {
        "Cache-Control": "no-cache, no-transform",
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "X-Accel-Buffering": "no"
      },
      status: backendResponse.status
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible iniciar la generación de sugerencia TW.";

    return NextResponse.json({ message }, { status: 502 });
  }
}

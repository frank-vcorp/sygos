import { pingDb } from "@/db/client";

export async function GET() {
  const dbOk = await pingDb();
  return Response.json(
    {
      status: dbOk ? "ok" : "degraded",
      service: "sygos",
      db: dbOk,
      time: new Date().toISOString(),
    },
    { status: dbOk ? 200 : 503 },
  );
}

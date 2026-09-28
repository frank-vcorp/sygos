import postgres, { Sql } from "postgres";
import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

let client: Sql | undefined;
let instance: PostgresJsDatabase<typeof schema> | undefined;

export function getDb() {
  if (instance) return instance;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  client = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: true,
  });
  instance = drizzle(client, { schema });
  return instance;
}

export async function pingDb(): Promise<boolean> {
  try {
    const sql = client ?? postgres(process.env.DATABASE_URL!, { max: 1 });
    await sql`select 1`;
    if (!client) await sql.end({ timeout: 1 });
    return true;
  } catch {
    return false;
  }
}

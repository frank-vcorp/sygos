#!/usr/bin/env node
const bcrypt = require("bcryptjs");
const postgres = require("postgres");

const pw = process.argv[2];
if (!pw) {
  console.error("usage: verify-user-password.js <password> [username]");
  process.exit(1);
}
const username = process.argv[3] || "ceo";

(async () => {
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const rows = await sql`select username, password_hash from users where username = ${username}`;
  if (!rows[0]) {
    console.error("user not found");
    process.exit(1);
  }
  const match = await bcrypt.compare(pw, rows[0].password_hash);
  console.log(username, "match", match);
  await sql.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

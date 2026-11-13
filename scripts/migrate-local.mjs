// Back up and migrate only the local development database, then prove existing
// tasting data survived. Remote deployment is deliberately a separate command.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import pg from "pg";

const url = new URL(process.env.DATABASE_URL ?? "");
if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new Error("This backup helper only migrates a local database.");
const dumpUrl = new URL(url);
dumpUrl.searchParams.delete("schema");
const directory = await mkdtemp(path.join(os.tmpdir(), "wine-flight-backup-"));
const tables = ["Event", "Wine", "Team", "TeamGuess", "Taster", "Submission"];
const client = new pg.Client({ connectionString: url.href });
async function run(executable, args) {
  const child = spawn(executable, args, { env: process.env, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (data) => { output += data; }); child.stderr.on("data", (data) => { output += data; });
  const code = await new Promise((resolve, reject) => { child.on("error", reject); child.on("exit", resolve); });
  if (code !== 0) throw new Error(output.replaceAll(url.href, "[local database]"));
  return output;
}
const snapshot = async () => {
  const data = {};
  for (const table of tables) data[table] = (await client.query(`SELECT row_to_json(t) AS row FROM "${table}" t ORDER BY "id"`)).rows.map((entry) => entry.row);
  return data;
};
try {
  await client.connect();
  const mapTable = await client.query("SELECT to_regclass('public.\"TeamMapGuess\"') AS name");
  if (mapTable.rows[0].name) tables.push("TeamMapGuess");
  const before = await snapshot();
  await run("pg_dump", ["--format=custom", "--file", path.join(directory, "before.dump"), "--dbname", dumpUrl.href]);
  await writeFile(path.join(directory, "before.json"), JSON.stringify(before, null, 2));
  const migration = await run(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy", "--config", "prisma7.config.ts"]);
  await writeFile(path.join(directory, "migration.log"), migration);
  const after = await snapshot();
  for (const table of tables) {
    assert.equal(after[table].length, before[table].length, `${table}: row count preserved`);
    for (let i = 0; i < before[table].length; i++) {
      const old = before[table][i], current = after[table][i];
      for (const [column, value] of Object.entries(old)) {
        if (table === "Event" && column === "revealMode") {
          assert.equal(current[column], "BLIND");
        } else assert.deepEqual(current[column], value, `${table} ${old.id}: ${column} preserved`);
      }
    }
  }
  const report = { database: url.pathname.slice(1), backup: path.join(directory, "before.dump"),
    counts: Object.fromEntries(tables.map((table) => [table, after[table].length])),
    existingDataPreserved: true, allTastingsBlind: true };
  await writeFile(path.join(directory, "verified.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { await client.end(); }

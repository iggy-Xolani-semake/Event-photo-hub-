import fs from "node:fs";
import path from "node:path";
import process from "node:process";

function loadLocalEnv() {
  const filePath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(filePath)) return;

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

loadLocalEnv();

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "NEXT_PUBLIC_R2_PUBLIC_HOST",
  "NEXT_PUBLIC_APP_URL",
];
const placeholders = /^(your-|your_|replace-|changeme|example|pub-xxxxxxxx)/i;
const missing = required.filter((name) => {
  const value = process.env[name]?.trim();
  return !value || placeholders.test(value);
});

if (missing.length > 0) {
  console.error(`Missing or placeholder environment variables: ${missing.join(", ")}`);
  console.error("Set them in the hosting provider or .env.local before building.");
  process.exit(1);
}

try {
  new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
  new URL(process.env.NEXT_PUBLIC_APP_URL);
} catch {
  console.error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_APP_URL must be valid URLs.");
  process.exit(1);
}

console.log(`Environment preflight passed (${required.length} required variables checked).`);

/** Safe compile-time defaults for local/CI builds only. Configure real values in deployment.
 * The reserved .invalid host cannot accidentally reach a real Supabase project.
 */
const DUMMY_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1aWxkLW9ubHkiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoyMDAwMDAwMDAwfQ.dummy-signature";
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://build-only.invalid";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DUMMY_JWT;
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || DUMMY_JWT;

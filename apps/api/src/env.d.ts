// Secrets/vars that are not part of wrangler.jsonc bindings (so `wrangler types`
// does not generate them). Declared here as an ambient merge into the generated
// `Env` interface. Provided locally via .dev.vars and in production via
// `wrangler secret put`.
interface Env {
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
}

// Minimal shape of the authenticated user attached to the request context.
export type AuthUser = {
  id: string;
  email: string;
  name: string;
  image?: string | null;
};

// Shared Hono environment: Cloudflare bindings + per-request variables.
export type AppEnv = {
  Bindings: Env;
  Variables: {
    user: AuthUser;
  };
};

import { createAuthClient } from "better-auth/react";

// Same-origin as the API worker (basePath defaults to /api/auth), so no baseURL
// is needed. In `vite dev`, /api is proxied to the local worker (see vite.config).
export const authClient = createAuthClient();

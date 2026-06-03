import type { NextAuthConfig } from "next-auth"

// Edge-safe Auth.js config, shared by the middleware (Edge runtime) and the full server
// instance in auth.ts. Keep this free of Node-only APIs and DB adapters so it can run in
// middleware. The OIDC discovery/token exchange only happens in the route handler (Node).
export const authConfig: NextAuthConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [
    {
      id: "mabhas19",
      name: "Mabhas19",
      type: "oidc",
      issuer: process.env.AUTH_MABHAS19_ISSUER,
      clientId: process.env.AUTH_MABHAS19_ID,
      clientSecret: process.env.AUTH_MABHAS19_SECRET,
      authorization: {
        params: {
          scope: "openid profile email roles offline_access mabhas19.api",
        },
      },
    },
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken
      return session
    },
  },
}

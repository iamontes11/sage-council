import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { saveGoogleRefreshToken } from "./supabase";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          // access_type + prompt=consent so Google actually issues a refresh
          // token (needed to upload El Oráculo's PNGs to Drive unattended).
          access_type: "offline",
          prompt: "consent",
          scope: "openid email profile https://www.googleapis.com/auth/drive.file",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as any).id = token.sub;
      }
      return session;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
      }
      if (account?.refresh_token && token.email) {
        // Fire-and-forget — never block sign-in on this.
        saveGoogleRefreshToken(token.email, account.refresh_token).catch((err) =>
          console.error("[auth] failed to save Google refresh token:", err),
        );
      }
      return token;
    },
  },
  pages: {
    signIn: "/",
  },
};

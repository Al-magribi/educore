/** @type {import("next-auth").NextAuthConfig} */
export const authConfig = {
  pages: {
    signIn: "/masuk",
  },
  session: {
    strategy: "jwt",
  },
  trustHost: true,
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? token.sub;
        session.user.role = token.role;
      }
      return session;
    },
  },
};

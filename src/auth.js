import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { CredentialsSignin } from "next-auth";
import { authConfig } from "@/auth.config.js";
import { prisma } from "@/lib/db.js";
import { ROLES } from "@/config/roles.js";

class EmailNotVerified extends CredentialsSignin {
  code = "email_not_verified";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim()?.toLowerCase();
        const password = credentials?.password;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        if (user.role === ROLES.APPLICANT && !user.emailVerifiedAt) {
          throw new EmailNotVerified();
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
});

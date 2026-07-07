import NextAuth from "next-auth";
import { authConfig } from "@/auth.config.js";

const { auth } = NextAuth(authConfig);

export { auth as proxyAuth };

import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { findAllowedUser, isAllowed } from "@/lib/allowlist"
import { verifyCode } from "@/lib/otp"

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Google,
        Credentials({
            id: "email-code",
            name: "Email code",
            credentials: {
                email: {},
                code: {},
            },
            authorize: async (credentials) => {
                const email = String(credentials?.email ?? "").toLowerCase().trim()
                const code = String(credentials?.code ?? "").trim()
                if (!email || !/^\d{6}$/.test(code)) return null

                // Only allowlisted emails can ever have a valid code.
                const user = findAllowedUser(email)
                if (!user) return null

                const ok = await verifyCode(email, code)
                if (!ok) return null

                return { id: email, email, name: user.name }
            },
        }),
    ],
    callbacks: {
        // Gate BOTH providers: a Google account not on the allowlist is rejected
        // here just like a code login would be.
        signIn: async ({ user }) => isAllowed(user?.email),
        jwt: async ({ token, user }) => {
            if (user) {
                token.email = user.email ?? token.email
                token.name = user.name ?? token.name
            }
            return token
        },
        session: async ({ session, token }) => {
            if (session.user) {
                if (token.email) session.user.email = token.email as string
                if (token.name) session.user.name = token.name as string
            }
            return session
        },
    },
})

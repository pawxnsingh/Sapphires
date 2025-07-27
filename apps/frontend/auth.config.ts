import type { NextAuthConfig } from "next-auth";
import CredentialProvider from "next-auth/providers/credentials";
import Github from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { LoginSchema } from "@/schemas";
import { getUserByEmail } from "./data/user";

export default {
  providers: [
    Github,
    Google,
    CredentialProvider({
      async authorize(credentials) {
        const { success, data } = LoginSchema.safeParse(credentials);

        if (success) {
          const { email, password } = data;
          // check first that the email providing exist for not
          const user = await getUserByEmail(email);

          console.log({ user });

          if (!user || !user.password) {
            // why not password stuff if user loggedin using the oauth provider
            // then we cant allow user to logged in using the credential
            return null;
          }
          // now check the password in the database with the password that user provided

          const passwordMatch = await compare(password, user.password);
          console.log({ passwordMatch });

          if (passwordMatch) {
            return user;
          }
        }
        return null;
      },
    }),
  ],
} satisfies NextAuthConfig;

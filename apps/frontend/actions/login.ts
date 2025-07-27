"use server";
import * as z from "zod";
import { LoginSchema } from "@/schemas";
import { signIn } from "@/auth";
import { DEFAULT_LOGIN_REDIRECT } from "@/route";
import { AuthError } from "next-auth";
import {
  generateVerificationToken,
  generateTwoFactorToken,
} from "@/lib/tokens";
import { getUserByEmail } from "@/data/user";
import {
  sendVerificationEmail,
  sendTwoFactorConfirmationEmail,
} from "@/lib/mail";

import { getTwoFactorTokenbyEmail } from "@/data/twoFactorToken";
import { prisma } from "@/lib/db";
import { getTwoFactorConfirmationbyUserId } from "@/data/twoFactorConfirmation";

// by this way our server code will never bundled with client code
// just use rpc behind the scenes
export const login = async (values: z.infer<typeof LoginSchema>) => {
  // we need to validate the "values" cuz client side value validation can be easily by-passed
  const validatedFields = LoginSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      error: "Invalid fields!",
    };
  }
  // now i just have to pass these success and error messages to the client
  // now we successfully got these value on the server, we just have to put
  // these value on the database just configure prisma
  const { email, password, code } = validatedFields.data;
  const existingUser = await getUserByEmail(email);
  console.log({ existingUser });

  if (!existingUser || !existingUser.email || !existingUser.password) {
    // password check is user got logged in using oAuth
    return {
      error: "Email don't exists!",
    };
  }

  if (!existingUser.emailVerified) {
    const verificationToken = await generateVerificationToken(
      existingUser?.email
    );
    await sendVerificationEmail(
      verificationToken.email,
      verificationToken.token
    );
    return {
      success: "Verification email sent!",
    };
  }

  if (existingUser.isTwoFactorEnabled && existingUser.email) {
    if (code) {
      const twoFactorToken = await getTwoFactorTokenbyEmail(existingUser.email);
      if (!twoFactorToken) {
        return {
          error: "Token doesn't exist!",
        };
      }

      if (twoFactorToken.token !== code) {
        return {
          error: "Didn't matched!",
        };
      }
      // now check the expiry
      const hasExpires = new Date(twoFactorToken.expires) < new Date();
      if (hasExpires) {
        return {
          error: "Token Expires!",
        };
      }
      // delete two factor token and create a two factor confirmation
      await prisma.twoFactorToken.delete({
        where: {
          id: twoFactorToken.id,
        },
      });

      // create userConfirmation
      // added twofactorConfirmation
      const existingTwoFactorConfirmation =
        await getTwoFactorConfirmationbyUserId(existingUser.id);

      if (existingTwoFactorConfirmation) {
        await prisma.twoFactorConfirmation.delete({
          where: {
            id: existingTwoFactorConfirmation.id,
          },
        });
      }
      // just create new token
      await prisma.twoFactorConfirmation.create({
        data: {
          userId: existingUser.id,
        },
      });
    } else {
      const twoFactorToken = await generateTwoFactorToken(existingUser.email);
      await sendTwoFactorConfirmationEmail(
        twoFactorToken.email,
        twoFactorToken.token
      );

      return {
        twoFactor: true,
      };
    }
  }

  try {
    await signIn("credentials", {
      email,
      password,
      // !Explicit: which is good
      redirectTo: DEFAULT_LOGIN_REDIRECT, // this is what to you'll redirect to setting: which is protected routes
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid credentials" };
        default:
          return {
            error: "Something went wrong",
          };
      }
    }
    throw error; // otherwise it will not redirect you to the redirectto=""
  }
};

// this is function is just wrapper around next-auth
// this functon can

// we need to tell to next auth ki never allow this user to signin completely
// if he hasn't verified email

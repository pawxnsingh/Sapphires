"use server";
import * as z from "zod";
import { prisma } from "@/lib/db";
import { SettingsSchema } from "@/schemas";
import { getUserByEmail, getUserById } from "@/data/user";
import { currentUser } from "@/lib/auth";
import { generateVerificationToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/mail";
import bcrypt from "bcryptjs";

export const setting = async (values: z.infer<typeof SettingsSchema>) => {
  // check first the user, which is trying to update the details
  // is loggedin using the credential/oAuth
  const user = await currentUser();
  if (!user) {
    return {
      error: "Unauthorized",
    };
  }

  const dbUser = await getUserById(user?.id!);

  if (!dbUser) {
    return {
      error: "Unauthorized",
    };
  }

  if (user.isOAuth) {
    values.email = undefined;
    values.newPassword = undefined;
    values.password = undefined;
    values.isTwoFactorEnabled = undefined;
  }

  // user tries to update email
  if (values.email && values.email !== user.email) {
    // send verification token
    const existingUser = await getUserByEmail(values.email); // check the values they try to update is not used by another user}
    if (existingUser && existingUser.id !== user.id) {
      return {
        error: "Email already in use!",
      };
    }

    const verificationToken = await generateVerificationToken(values.email);
    await sendVerificationEmail(
      verificationToken.email,
      verificationToken.token
    );

    return {
      success: "Verification mail sent!",
    };
  }

  if (values.password && values.newPassword && dbUser.password) {
    const passwordMatch = await bcrypt.compare(
      values.password,
      dbUser.password
    );

    if (!passwordMatch) {
      return {
        error: "Incorrect password!",
      };
    }
    // hash the new password
    const newHashedPassword = await bcrypt.hash(values.newPassword, 10);
    values.password = newHashedPassword;
    values.newPassword = undefined; // because we dont need this to be sent on the backend
  }

  await prisma.user.update({
    where: {
      id: dbUser.id,
    },
    data: {
      ...values,
    },
  });

  return {
    success: "Updated",
  };
};

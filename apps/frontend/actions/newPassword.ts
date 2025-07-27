"use server";
import { getUserByEmail } from "@/data/user";
import { getPasswordResetTokenByToken } from "@/data/passwordResetToken";
import { NewPasswordSchema } from "@/schemas";
import { prisma } from "@/lib/db";
import { hash } from "bcryptjs";
import * as z from "zod";

export const newPassword = async (
  values: z.infer<typeof NewPasswordSchema>,
  token: string | null
) => {
  if (!token) {
    return {
      error: "Token isn't there!",
    };
  }

  // first to the backend validation here
  // cuz client side validation can easily be passed

  const validatedFields = NewPasswordSchema.safeParse(values);
  if (!validatedFields.success) {
    return {
      error: "Invalid fields",
    };
  }

  const { password } = validatedFields.data;

  // check doest that token exists or not
  const verficationToken = await getPasswordResetTokenByToken(token);
  if (!verficationToken) {
    return {
      error: "Token invalid!",
    };
  }

  // now token is present
  // also check does that expires or not
  const hasExpired = new Date(verficationToken.expires) < new Date();
  if (hasExpired) {
    return {
      error: "Token expires!",
    };
  }

  const existingUser = await getUserByEmail(verficationToken.email);
  if (!existingUser) {
    return {
      error: "Email doesn't exist",
    };
  }

  // now email exists
  // hash the new password and update the password
  const newHashPassword = await hash(password, 10);
  // password got hash now add it to the database
  await prisma.user.update({
    where: {
      id: existingUser.id,
    },
    data: {
      password: newHashPassword,
    },
  });
  // also delete the passwordVerificationToken
  // cuz we dont need it
  await prisma.passwordResetToken.delete({
    where: {
      id: verficationToken.id,
    },
  });

  return {
    success: "Password Updated!",
  };
};

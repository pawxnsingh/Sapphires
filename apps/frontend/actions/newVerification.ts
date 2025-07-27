"use server";
import { prisma } from "@/lib/db";
import { getUserByEmail } from "@/data/user";
import { getVerificationTokenbyToken } from "@/data/verificationToken";

export const newVerification = async (token: string) => {
  const existingToken = await getVerificationTokenbyToken(token);
  if (!existingToken) {
    return {
      error: "Token does not exist!",
    };
  }

  const hasExpired = new Date(existingToken.expires) < new Date();

  if (hasExpired) {
    return {
      error: "Token has expired!",
    };
  }
  const existingUser = await getUserByEmail(existingToken.email);
  console.log({ existingUser, existingToken });

  if (!existingUser) {
    return {
      error: "Email doesn't exists!",
    };
  }

  await prisma.user.update({
    where: {
      id: existingUser.id,
    },
    data: {
      emailVerified: new Date(),
      // basically, we dont need it in the registration
      // but if we want to add fucntionalites to update the email
      // we will send again a token to email and put it
      // email put a new email it that token , when user click this link or
      // then we update the email
      email: existingToken.email,
    },
  });

  // now remove the verification token
  await prisma.verficationToken.delete({
    where: {
      id: existingToken.id,
    },
  });
  return {
    success: "Email verified",
  };
};

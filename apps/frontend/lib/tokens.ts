import { getVerificationTokenbyEmail } from "@/data/verificationToken";
import { getPasswordResetTokenByEmail } from "@/data/passwordResetToken";
import { getTwoFactorTokenbyEmail } from "@/data/twoFactorToken";
import crypto from "crypto";

import { v4 as uuidV4 } from "uuid";
import { prisma } from "@/lib/db";

export const generateTwoFactorToken = async (email: string) => {
  const token = crypto.randomInt(100_100, 1_000_000).toString();
  // TODO: change it to 15 minutes instead an hour
  const expires = new Date(new Date().getTime() + 600 * 1000);
  const existingToken = await getTwoFactorTokenbyEmail(email);
  // if there is existing token delete this
  if (existingToken) {
    await prisma.twoFactorToken.delete({
      where: {
        id: existingToken.id,
      },
    });
  }

  const twoFactorToken = await prisma.twoFactorToken.create({
    data: {
      email,
      token,
      expires,
    },
  });

  return twoFactorToken;
};

// this is used to generate the verification token
export const generateVerificationToken = async (email: string) => {
  const token = uuidV4();
  const expires = new Date(new Date().getTime() + 3600 * 1000);
  const existingToken = await getVerificationTokenbyEmail(email);
  // if there is existing token delete this
  if (existingToken) {
    await prisma.verficationToken.delete({
      where: {
        id: existingToken.id,
      },
    });
  }

  const verificationToken = await prisma.verficationToken.create({
    data: {
      email,
      token,
      expires,
    },
  });
  return verificationToken;
};

// take this email and generate me a token and store it in db
// so that i can sent that token to the user by mail
export const generatePasswordResetToken = async (email: string) => {
  // generate new token
  const token = uuidV4();
  // generate a exipiry and add one hour expiry
  const expires = new Date(new Date().getTime() + 3600 * 1000);
  // check for existing token

  // if there is token on this email just delete it cuz we are going to override it anyway
  const existingToken = await getPasswordResetTokenByEmail(email);
  if (existingToken) {
    await prisma.passwordResetToken.delete({
      where: {
        id: existingToken.id, // why id cuz id one is less expensive to do
      },
    });
  }

  // now create the entry for the newly created token
  const passwordResetToken = await prisma.passwordResetToken.create({
    data: {
      email,
      expires,
      token,
    },
  });
  return passwordResetToken;
};

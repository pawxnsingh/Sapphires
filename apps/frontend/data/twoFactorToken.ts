import { prisma } from "@/lib/db";

export const getTwoFactorTokenbyToken = async (token: string) => {
  try {
    const VerificationToken = await prisma.twoFactorToken.findUnique({
      where: {
        token,
      },
    });
    return VerificationToken;
  } catch {
    return null;
  }
};

export const getTwoFactorTokenbyEmail = async (email: string) => {
  try {
    const VerificationToken = await prisma.twoFactorToken.findFirst({
      where: {
        email,
      },
    });
    return VerificationToken;
  } catch {
    return null;
  }
};


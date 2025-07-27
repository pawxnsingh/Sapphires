import { prisma } from "@/lib/db";

export const getVerificationTokenbyToken = async (token: string) => {
  try {
    const verficationToken = await prisma.verficationToken.findUnique({
      where: {
        token,
      },
    });
    return verficationToken;
  } catch {
    return null;
  }
};

export const getVerificationTokenbyEmail = async (email: string) => {
  try {
    const VerificationToken = await prisma.verficationToken.findFirst({
      where: {
        email,
      },
    });
    return VerificationToken;
  } catch {
    return null;
  }
};

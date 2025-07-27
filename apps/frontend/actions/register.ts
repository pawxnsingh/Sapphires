"use server";
import * as z from "zod";
import { RegisterSchema } from "@/schemas";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { getUserByEmail } from "@/data/user";
import { generateVerificationToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/mail";

// by this way our server code will never bundled with client code
// just use rpc behind the scenes
export const register = async (values: z.infer<typeof RegisterSchema>) => {
  // we need to validate the "values" cuz client side value validation can be easily by-passed
  const validatedFields = RegisterSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      error: "invalid field",
    };
  }

  const { password, email, name } = validatedFields.data;
  const hashedPassword = await hash(password, 10);

  // check first that this email is not taken
  const existingUser = await getUserByEmail(email);

  if (existingUser) {
    return {
      error: "Email already in use!",
    };
  }

  // this is the used to create the user
  await prisma.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
    },
  });

  const verificationToken = await generateVerificationToken(email);
  // TODO: send a verification link to the user so that some wont able to hijacks someone else mail
  await sendVerificationEmail(verificationToken.email, verificationToken.token);

  // now i just have to pass these success and error messages to the client
  return {
    success: "Confirmation email sent!",
  };
};

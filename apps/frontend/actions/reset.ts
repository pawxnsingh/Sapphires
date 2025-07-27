"use server";
import * as z from "zod";

import { ResetSchema } from "@/schemas";
import { getUserByEmail } from "@/data/user";
import { generatePasswordResetToken } from "@/lib/tokens";
import { sendPasswordResetMail } from "@/lib/mail";

export const reset = async (values: z.infer<typeof ResetSchema>) => {
  console.log(values);
  const validatedFields = ResetSchema.safeParse(values);
  if (!validatedFields.success) {
    return {
      error: "Invalid fields",
    };
  }

  const { email } = validatedFields.data;
  // existing user
  const existingUser = await getUserByEmail(email);
  if (!existingUser || !existingUser.email || !existingUser.password) {
    return {
      error: "Email does't exists",
    };
  }
  // TODO: sent and generate token
  const generateToken = await generatePasswordResetToken(existingUser.email);
  await sendPasswordResetMail(generateToken.email, generateToken.token);
  return {
    success: "Reset mail sent!",
  };
};

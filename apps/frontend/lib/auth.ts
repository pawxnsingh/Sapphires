// this is lib which is used to get the current user
// from the next-auth
import { auth } from "@/auth";

export const currentUser = async () => {
  const session = await auth();
  return session?.user;
};

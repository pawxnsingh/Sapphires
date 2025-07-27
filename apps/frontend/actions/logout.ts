"use server";

import { signOut } from "@/auth";

// in this method, we use client and server action
// where this is useful, well where we want to do the server stuff

export const logout = async () => {
  // some server stuff clearing some info about user and some other stuff
  await signOut();
};

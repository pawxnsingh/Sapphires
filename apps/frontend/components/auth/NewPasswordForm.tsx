"use client";
import { CardWrapper } from "@/components/auth/CardWrapper";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import * as z from "zod";

import { NewPasswordSchema } from "@/schemas";
import { Button } from "@/components/ui/button";
import { useState, useTransition } from "react";

import {
  Form,
  FormControl,
  FormField,
  FormLabel,
  FormItem,
  FormMessage,
} from "@/components/ui/form";

import { FormError } from "@/components/FormError";
import { FormSuccess } from "@/components/FormSuccess";
import { newPassword } from "@/actions/newPassword";
import { useSearchParams } from "next/navigation";

export const NewPasswordForm = () => {
  const [error, setError] = useState<string | undefined>("");
  const [success, setSuccess] = useState<string | undefined>("");
  const [isPending, startTransition] = useTransition();

  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  

  const form = useForm<z.infer<typeof NewPasswordSchema>>({
    resolver: zodResolver(NewPasswordSchema),
    defaultValues: {
      password: "",
    },
  });

  //TODO: just learn "useTransition"
  const onSubmit = (values: z.infer<typeof NewPasswordSchema>) => {
    setError("");
    setSuccess("");
    // now we just have to send these value to the sever
    startTransition(() => {
      newPassword(values, token).then((data) => {
        setError(data?.error || "");
        // TODO: add when we add the email sent fxnality and 2FA
        setSuccess(data?.success || "");
      });
    });
  };

  return (
    <CardWrapper
      headerLabel={"Enter a new password!"}
      backButtonLabel={"Back to login"}
      backButtonHref={"/auth/login"}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isPending}
                      placeholder="*******"
                      type="password"
                      {...field} // copies all the form props here
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormError message={error} />
          <FormSuccess message={success} />

          <Button type="submit" className="w-full" disabled={isPending}>
            Reset password
          </Button>
        </form>
      </Form>
    </CardWrapper>
  );
};

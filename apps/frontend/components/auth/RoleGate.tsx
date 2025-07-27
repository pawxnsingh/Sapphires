"use client";
import { useCurrentRole } from "@/hooks/useCurrentRole";
import { UserRole } from "@prisma/client";
import { FormError } from "@/components/FormError";

export const RoleGate = ({
  children,
  allowedRole,
}: Readonly<{
  children: React.ReactNode;
  allowedRole: UserRole;
}>) => {
  const role = useCurrentRole();

  if (role !== allowedRole) {
    return (
      <FormError message="You do not have permission to view this content" />
    );
  }
  return <>{children}</>;
};

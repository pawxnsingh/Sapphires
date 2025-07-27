import { logout } from "@/actions/logout";
// import { signOut } from "@/auth";

export const LogoutButton = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const logOutHandler = async () => {
    await logout();
  };
  return (
    <span onClick={logOutHandler} className="cursor-pointer">
      {children}
    </span>
  );
};

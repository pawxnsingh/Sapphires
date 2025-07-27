import { Button } from "@/components/ui/button";
import  Sidebar  from "./Sidebar-Icon";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 w-full flex items-center justify-between p-6 z-20">
      <div className="flex items-center space-x-24">


       <Sidebar />



        <ul className="hidden md:flex gap-4 text-white font-semibold space-x-3">
          <li>Community</li>
          <li>Features</li>
          <li>Pricing</li>
        </ul>
      </div>
      <div className="text-white">
        <SignedOut>
          <div className="flex space-x-2">
            <div className="bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
              <SignInButton />
            </div>
            <div className="bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
              <SignUpButton />
            </div>
          </div>
        </SignedOut>

        <SignedIn>
          <UserButton />
        </SignedIn>
      </div>
    </nav>
  );
}

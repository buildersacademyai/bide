import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { UserProfile } from "./UserProfile";

export function Navigation() {
  const [location] = useLocation();
  const isAppPage = location === "/app";

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/">
              <a className="flex items-center">
                <svg
                  className="h-8 w-8 text-primary"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
                  <line x1="16" y1="8" x2="2" y2="22" />
                  <line x1="17.5" y1="15" x2="9" y2="15" />
                </svg>
                <span className="ml-2 text-xl font-bold">Blockchain IDE</span>
              </a>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/about">
              <a className="text-sm font-medium hover:text-primary">
                About Us
              </a>
            </Link>
            
            {!isAppPage && (
              <Link href="/app">
                <Button>
                  Launch App
                </Button>
              </Link>
            )}

            <UserProfile />
          </div>
        </div>
      </div>
    </nav>
  );
}

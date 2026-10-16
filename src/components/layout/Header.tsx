import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, Search, UploadCloud } from "lucide-react";
import { Logo } from "./Logo";
import { Breadcrumbs } from "./Breadcrumbs";
import { RoleSwitcher } from "./RoleSwitcher";
import { NotificationsPopover } from "./NotificationsPopover";
import { ProfileMenu } from "./ProfileMenu";

export interface HeaderProps {
  onOpenMobileNav: () => void;
}

export function Header({ onOpenMobileNav }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/claims?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const isOverview =
    location.pathname === "/" || location.pathname === "/dashboard";

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-border/80 bg-card/85 backdrop-blur-md px-4 sm:px-6 transition-colors">
      {/* Left side: Hamburger (mobile) + Logo (mobile) + Page Title / Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 text-muted-foreground hover:text-foreground hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          aria-label="Open mobile navigation menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="lg:hidden">
          <Logo collapsed />
        </div>

        <div className="flex items-center gap-2">
          {isOverview ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight text-foreground">
                Overview
              </span>
              <span className="hidden sm:inline-block h-3.5 w-px bg-border/80" />
              <Breadcrumbs />
            </div>
          ) : (
            <Breadcrumbs />
          )}
        </div>
      </div>

      {/* Middle: Compact Search Input (hidden on small mobile screens) */}
      <div className="hidden md:flex flex-1 max-w-xs mx-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search claims, bills (e.g. BB-DEMO-1001)..."
            aria-label="Search medical claims and bills"
            className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-border/80 bg-secondary/40 placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-foreground"
          />
        </form>
      </div>

      {/* Right side: Upload a bill action + Role Switcher + Notifications + Profile Avatar */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        <Link
          to="/upload"
          className="inline-flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
          aria-label="Upload a medical bill"
        >
          <UploadCloud className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">Upload a bill</span>
          <span className="sm:hidden">Upload</span>
        </Link>

        <RoleSwitcher />
        <NotificationsPopover />
        <ProfileMenu />
      </div>
    </header>
  );
}

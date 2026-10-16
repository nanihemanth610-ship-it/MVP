import { useLocation, Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

export function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  const getBreadcrumbLabel = (segment: string): string => {
    switch (segment.toLowerCase()) {
      case "dashboard":
        return "Overview";
      case "upload":
        return "Upload & Extract";
      case "claims":
        return "Claims Registry";
      case "review":
        return "Review Workspace";
      case "design-system":
        return "Design System";
      case "claim-memorial-002":
        return "BB-DEMO-1001 (Apollo Bengaluru)";
      case "claim-apex-001":
        return "BB-DEMO-1003 (Fortis Gurugram)";
      case "admin":
        return "Super Admin Portal";
      case "hospital":
        return "Hospital Admin Portal";
      case "insurance":
        return "Insurance Admin Portal";
      case "profile":
        return "Identity Profile & Permissions";
      case "patient":
        return "Patient Plain View (EN/తెలుగు)";
      case "claim-beacon-003":
        return "BB-DEMO-1002 (Max Saket)";
      default:
        return segment.length > 12 ? `${segment.substring(0, 10)}...` : segment;
    }
  };

  return (
    <nav aria-label="Breadcrumb" className="hidden sm:flex items-center">
      <ol className="flex items-center space-x-1.5 text-xs text-muted-foreground">
        <li>
          <Link
            to="/dashboard"
            className="flex items-center text-muted-foreground hover:text-foreground transition-colors p-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Home Dashboard"
          >
            <Home className="h-3.5 w-3.5" />
          </Link>
        </li>

        {pathnames.map((value, index) => {
          const to = `/${pathnames.slice(0, index + 1).join("/")}`;
          const isLast = index === pathnames.length - 1;
          const label = getBreadcrumbLabel(value);

          return (
            <li key={to} className="flex items-center space-x-1.5">
              <ChevronRight
                className="h-3 w-3 text-muted-foreground/60 shrink-0"
                aria-hidden="true"
              />
              {isLast ? (
                <span
                  className="font-medium text-foreground truncate max-w-[180px] sm:max-w-[260px]"
                  aria-current="page"
                >
                  {label}
                </span>
              ) : (
                <Link
                  to={to}
                  className="hover:text-foreground transition-colors truncate max-w-[120px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

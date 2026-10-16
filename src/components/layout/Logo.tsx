import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export interface LogoProps {
  collapsed?: boolean;
  className?: string;
}

/**
 * Dedicated BillBridge vector emblem representing:
 * 1. Hospital medical bill document with folded corner & itemized lines
 * 2. Cross medical motif on header
 * 3. Optical AI Reader scan beam (Hospital Bill Reader)
 * 4. Insurance protection shield & verification badge (Insurance Claim Bridge)
 */
export function BillBridgeEmblem({
  className = "h-8 w-8",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        "shrink-0 transition-transform duration-150 group-hover:scale-[1.03]",
        className,
      )}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="bb-grad-primary"
          x1="0"
          y1="0"
          x2="36"
          y2="36"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0f766e" />
        </linearGradient>
        <linearGradient
          id="bb-grad-beam"
          x1="6"
          y1="18.5"
          x2="30"
          y2="18.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
          <stop offset="60%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#2dd4bf" />
        </linearGradient>
      </defs>

      {/* Base squircle container */}
      <rect width="36" height="36" rx="9" fill="url(#bb-grad-primary)" />

      {/* Subtle border ring */}
      <rect
        x="0.75"
        y="0.75"
        width="34.5"
        height="34.5"
        rx="8.25"
        stroke="#ffffff"
        strokeOpacity="0.22"
        strokeWidth="1.5"
      />

      {/* Medical Bill Document Base */}
      <path
        d="M9 7.5C9 6.67 9.67 6 10.5 6H20L26 12V28.5C26 29.33 25.33 30 24.5 30H10.5C9.67 30 9 29.33 9 28.5V7.5Z"
        fill="#ffffff"
        fillOpacity="0.18"
      />
      {/* Document fold corner */}
      <path
        d="M20 6V11.5C20 11.78 20.22 12 20.5 12H26"
        stroke="#ffffff"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.6"
        fill="none"
      />

      {/* Medical Cross on Bill Header */}
      <path
        d="M12.5 10.5H15.5M14 9V12"
        stroke="#38bdf8"
        strokeWidth="1.4"
        strokeLinecap="round"
      />

      {/* Document line items */}
      <path
        d="M12.5 15H22M12.5 18.5H18M12.5 22H20"
        stroke="#ffffff"
        strokeOpacity="0.75"
        strokeWidth="1.25"
        strokeLinecap="round"
      />

      {/* Optical AI Reader Scan Beam */}
      <line
        x1="6.5"
        y1="18.5"
        x2="29.5"
        y2="18.5"
        stroke="url(#bb-grad-beam)"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      {/* Active Reader Laser Sensor dot */}
      <circle cx="28.5" cy="18.5" r="1.75" fill="#2dd4bf" />
      <circle
        cx="28.5"
        cy="18.5"
        r="3.25"
        stroke="#2dd4bf"
        strokeOpacity="0.4"
        strokeWidth="0.75"
      />

      {/* Shield / Insurance Verification Badge in Bottom Right */}
      <path
        d="M19.5 20C19.5 24.5 23.5 27.5 23.5 27.5C23.5 27.5 27.5 24.5 27.5 20V16.2L23.5 14.8L19.5 16.2V20Z"
        fill="#0f766e"
        stroke="#38bdf8"
        strokeWidth="1.2"
      />
      {/* Shield verification checkmark */}
      <path
        d="M21.8 20.5L22.9 21.6L25.2 19.2"
        stroke="#ffffff"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ collapsed = false, className }: LogoProps) {
  return (
    <Link
      to="/"
      className={cn(
        "flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg group select-none transition-opacity hover:opacity-90 min-w-0",
        className,
      )}
      aria-label="BillBridge Home"
    >
      {/* High-res bespoke vector emblem */}
      <BillBridgeEmblem className="h-8 w-8" />

      {!collapsed && (
        <div className="flex flex-col leading-none min-w-0">
          <span className="text-base font-semibold tracking-tight text-foreground truncate">
            Bill<span className="text-primary font-bold">Bridge</span>
          </span>
          <span
            className="text-[10px] text-muted-foreground font-medium tracking-tight truncate mt-0.5"
            title="Hospital Bill and Insurance Reader"
          >
            Hospital Bill and Insurance Reader
          </span>
        </div>
      )}
    </Link>
  );
}

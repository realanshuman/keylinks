import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";

export function Logo({ size = 28, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <Link to="/" className="group inline-flex items-center gap-2 font-semibold tracking-tight">
      <motion.span
        whileHover={{ scale: 1.08, rotate: -4 }}
        whileTap={{ scale: 0.94 }}
        transition={{ type: "spring", stiffness: 400, damping: 18 }}
        className="relative inline-flex items-center justify-center rounded-xl shadow-lg shadow-primary/20"
        style={{
          width: size,
          height: size,
          background:
            "linear-gradient(135deg, var(--primary), color-mix(in oklab, var(--primary) 60%, #fff))",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width={size * 0.6}
          height={size * 0.6}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: "var(--primary-foreground)" }}
        >
          <path d="M10 14a4 4 0 1 1 0-4" />
          <path d="M10 12h9" />
          <path d="M17 9v6" />
          <path d="M21 10v4" />
        </svg>
      </motion.span>
      {withText && (
        <span
          className="text-base font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          keylinks
        </span>
      )}
    </Link>
  );
}

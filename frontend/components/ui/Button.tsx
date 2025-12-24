"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "success" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const variants = {
  primary: "bg-[#6a25f4] hover:bg-[#5a1fe0] text-white shadow-[0_0_20px_rgba(106,37,244,0.3)] hover:shadow-[0_0_30px_rgba(106,37,244,0.5)]",
  secondary: "glass-panel hover:bg-white/10 text-white border-white/10",
  success: "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]",
  danger: "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]",
  ghost: "hover:bg-white/5 text-gray-300 hover:text-white",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-bold rounded-xl transition-all duration-300",
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6a25f4] focus:ring-offset-[#050510]",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

"use client";

import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/utils/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "gradient" | "glass";
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variants = {
      default: "bg-white border border-gray-200",
      gradient: "bg-gradient-to-br from-white to-gray-50 border border-gray-200",
      glass: "bg-white/80 backdrop-blur-sm border border-white/20",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl shadow-sm",
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Card.displayName = "Card";

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("px-6 py-4 border-b border-gray-100", className)} {...props} />
  )
);

CardHeader.displayName = "CardHeader";

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("px-6 py-4", className)} {...props} />
  )
);

CardContent.displayName = "CardContent";

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-xl", className)} {...props} />
  )
);

CardFooter.displayName = "CardFooter";

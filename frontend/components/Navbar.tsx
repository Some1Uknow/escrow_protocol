"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Lock, LayoutDashboard, Plus, Home } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/utils/cn";
import { NETWORK } from "@/utils/constants";

export const Navbar = () => {
  const pathname = usePathname();
  const { connected } = useWallet();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navLinks = [
    { href: "/", label: "Home", icon: Home, showAlways: true },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, showAlways: false },
    { href: "/create", label: "Create Escrow", icon: Plus, showAlways: false },
  ].filter(link => link.showAlways || connected);

  const isDevnet = NETWORK === "devnet";

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-6 px-4 pointer-events-none">
      <nav className="w-full max-w-6xl pointer-events-auto rounded-2xl border border-white/10 nav-glass shadow-2xl shadow-black/20 transition-all duration-300">
        <div className="flex items-center justify-between h-20 px-6 md:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex items-center justify-center size-10 rounded-lg bg-gradient-to-br from-[#6a25f4]/30 to-[#6a25f4]/5 text-[#6a25f4] border border-[#6a25f4]/20 shadow-[0_0_15px_rgba(106,37,244,0.15)]">
              <Lock className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-white to-[#6a25f4] bg-clip-text text-transparent">
              EscrowProtocol
            </h2>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-10">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "group relative py-2 text-sm font-medium transition-colors",
                    isActive ? "text-white" : "text-gray-300 hover:text-white"
                  )}
                >
                  {link.label}
                  <span
                    className={cn(
                      "absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-[#6a25f4] to-purple-400 transition-all duration-300 ease-out",
                      isActive ? "w-full" : "w-0 group-hover:w-full"
                    )}
                  />
                </Link>
              );
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-5">
            {/* Network Badge */}
            {isDevnet && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/5 border border-amber-500/20 shadow-[0_0_12px_-2px_rgba(245,158,11,0.2)]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500">
                  Devnet
                </span>
              </div>
            )}

            {/* Wallet Button */}
            {mounted ? (
              <div className="hidden sm:block">
                <WalletMultiButton />
              </div>
            ) : (
              <div className="hidden sm:block h-[44px] w-[140px] rounded-xl bg-gradient-to-r from-[#6a25f4] to-indigo-600 animate-pulse" />
            )}

            {/* Mobile menu button */}
            <button
              className="md:hidden text-white p-2 hover:bg-white/5 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 bg-[#050510]/90 backdrop-blur-xl rounded-b-2xl">
            <div className="px-4 py-3 space-y-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                      isActive
                        ? "bg-[#6a25f4]/20 text-[#6a25f4]"
                        : "text-gray-300 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {link.label}
                  </Link>
                );
              })}
              {mounted && (
                <div className="pt-3 sm:hidden">
                  <WalletMultiButton />
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </div>
  );
};

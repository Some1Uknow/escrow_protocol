import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SolanaLogo } from "@/components/icons/SolanaLogo";
import { ArrowRight, FileText, Coins, Zap, Gavel } from "lucide-react";
import Link from "next/link";
import { NETWORK } from "@/utils/constants";

const stats = [
  {
    icon: Coins,
    label: "Fees",
    value: "Sub 0.01 SOL",
    description: "Industry leading low transaction costs.",
    hoverColor: "hover:border-[#6a25f4]/40",
    iconBg: "bg-[#6a25f4]/10 text-[#6a25f4]",
    iconHoverBg: "group-hover:bg-[#6a25f4] group-hover:text-white",
  },
  {
    icon: Zap,
    label: "Settlement",
    value: "~2 Seconds",
    description: "Instant finality on Solana blockchain.",
    hoverColor: "hover:border-cyan-500/40",
    iconBg: "bg-cyan-500/10 text-cyan-400",
    iconHoverBg: "group-hover:bg-cyan-500 group-hover:text-white",
  },
  {
    icon: Gavel,
    label: "Security",
    value: "Smart Dispute",
    description: "Decentralized arbitration layer built-in.",
    hoverColor: "hover:border-pink-500/40",
    iconBg: "bg-pink-500/10 text-pink-400",
    iconHoverBg: "group-hover:bg-pink-500 group-hover:text-white",
  },
];

export default function Home() {
  const isMainnet = NETWORK === "mainnet-beta";

  return (
    <main className="min-h-screen bg-[#050510] text-white overflow-x-hidden">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="orb orb-primary animate-float-slow"
          style={{ width: '500px', height: '500px', top: '-100px', left: '-100px' }}
        />
        <div 
          className="orb orb-cyan animate-float-medium"
          style={{ width: '400px', height: '400px', bottom: '10%', right: '-50px' }}
        />
        <div 
          className="orb orb-blue animate-float-fast"
          style={{ width: '600px', height: '600px', top: '20%', left: '30%' }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar />

        {/* Hero Section */}
        <section className="grow flex flex-col items-center justify-center pt-40 pb-20 px-4 md:px-8">
          <div className="max-w-[1100px] w-full flex flex-col gap-16">
            {/* Hero Content */}
            <div className="flex flex-col items-center text-center gap-8 md:gap-10 pt-10">
              {/* Status Badge */}
              <div className="inline-flex items-center gap-2 rounded-full glass-panel px-4 py-1.5 text-xs font-medium text-[#6a25f4] border-[#6a25f4]/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#6a25f4] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#6a25f4]" />
                </span>
                {isMainnet ? "V2.0 Now Live on Mainnet" : "Live on Devnet"}
              </div>

              {/* Heading */}
              <div className="flex flex-col gap-4 max-w-4xl">
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-[0.95] tracking-tight">
                  <span className="text-gradient">Trustless</span>
                  <br />
                  <span className="text-white">Freelance Payments</span>
                </h1>
                <p className="text-gray-400 text-lg md:text-xl font-light leading-relaxed max-w-2xl mx-auto mt-4">
                  Secure, trustless escrow for the gig economy. Eliminate payment
                  risk with smart contracts and instant settlement.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-4 w-full">
                <Link
                  href="/create"
                  className="h-12 md:h-14 min-w-[160px] md:min-w-[180px] rounded-xl bg-[#6a25f4] hover:bg-[#6a25f4]/90 text-white text-base font-bold transition-all shadow-[0_0_20px_rgba(106,37,244,0.3)] hover:shadow-[0_0_30px_rgba(106,37,244,0.5)] flex items-center justify-center gap-2"
                >
                  <span>Start Escrow</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-12 md:h-14 min-w-[160px] md:min-w-[180px] rounded-xl glass-panel hover:bg-white/10 text-white text-base font-bold transition-all flex items-center justify-center gap-2"
                >
                  <FileText className="w-5 h-5" />
                  <span>Documentation</span>
                </a>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full mt-8">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className={`glass-panel p-6 md:p-8 rounded-2xl flex flex-col gap-3 group transition-colors duration-300 ${stat.hoverColor}`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className={`p-2 rounded-lg transition-colors ${stat.iconBg} ${stat.iconHoverBg}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">
                        {stat.label}
                      </p>
                    </div>
                    <p className="text-3xl font-bold text-white">{stat.value}</p>
                    <p className="text-sm text-gray-500">{stat.description}</p>
                  </div>
                );
              })}
            </div>

            {/* Built on Solana Section */}
            <div className="flex flex-col items-center gap-6 mt-4 opacity-90">
              <p className="text-sm text-gray-500 uppercase tracking-widest font-semibold">
                Built on
              </p>
              <SolanaLogo className="h-8" />
              <p className="text-gray-500 text-sm max-w-md text-center">
                Fast, secure, and decentralized. Powered by the worlds highest-performance blockchain.
              </p>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </main>
  );
}

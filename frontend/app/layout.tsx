import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import { WalletContextProvider } from "@/components/WalletContextProvider";
import { ToastProvider } from "@/components/ui/Toast";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "EscrowProtocol | Blockchain-Powered Freelance Payments",
  description: "Secure, trustless escrow for the gig economy. Eliminate payment risk with smart contracts and instant settlement on Solana.",
  keywords: ["freelance", "escrow", "solana", "blockchain", "web3", "crypto payments", "smart contracts"],
  openGraph: {
    title: "EscrowProtocol | Blockchain-Powered Freelance Payments",
    description: "Secure, trustless escrow for the gig economy. Eliminate payment risk with smart contracts.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${spaceGrotesk.variable} font-[family-name:var(--font-display)] antialiased min-h-screen bg-[#050510] text-white`}
      >
        <WalletContextProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </WalletContextProvider>
      </body>
    </html>
  );
}

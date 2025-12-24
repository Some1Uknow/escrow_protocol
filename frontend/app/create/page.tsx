import { CreateEscrowForm } from "@/components/CreateEscrowForm";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function CreatePage() {
  return (
    <main className="min-h-screen bg-[#050510] text-white overflow-x-hidden">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="orb orb-primary animate-float-slow"
          style={{ width: '500px', height: '500px', top: '-100px', right: '-100px' }}
        />
        <div 
          className="orb orb-cyan animate-float-medium"
          style={{ width: '400px', height: '400px', bottom: '20%', left: '-50px' }}
        />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar />
        <div className="flex-grow pt-32 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <CreateEscrowForm />
        </div>
        <Footer />
      </div>
    </main>
  );
}

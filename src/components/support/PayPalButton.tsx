"use client";

import { Coins } from "lucide-react";

export function PayPalButton() {
  return (
    <div className="flex flex-col items-center gap-3">
      <a
        href="https://paypal.me/ssieber434"
        target="_blank"
        rel="noopener noreferrer"
        className="group relative inline-flex items-center gap-3 overflow-hidden rounded-lg border-2 border-accent-gold/60 px-8 py-4 font-barlow font-bold uppercase text-base tracking-wide transition-all duration-300 hover:border-accent-gold hover:shadow-[0_0_28px_rgba(202,185,38,0.3)] hover:scale-[1.03]"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(202,185,38,0.15) 0%, rgba(168,147,32,0.08) 50%, rgba(202,185,38,0.15) 100%)",
          color: "#f5e6a3",
        }}
      >
        {/* Hover-Shine */}
        <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

        <Coins className="h-5 w-5 text-accent-gold" />
        <span>Dem GM einen Trank spendieren</span>
      </a>

      <p className="font-libre text-xs text-gray-500 italic max-w-sm text-center leading-relaxed">
        Wähle bei PayPal bitte &quot;Freunde &amp; Familie&quot;, damit die
        Unterstützung ohne Abzüge ankommt.
      </p>
    </div>
  );
}

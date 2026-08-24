"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Clock, Coffee, Dices } from "lucide-react";

type StatDef = {
  id: string;
  target: number;
  decimals: number;
  label: string;
  Icon: typeof Clock;
};

const STATS: StatDef[] = [
  {
    id: "hours",
    target: 4288,
    decimals: 0,
    label: "Stunden Entwicklung & Tests",
    Icon: Clock,
  },
  {
    id: "coffee",
    target: 22.2,
    decimals: 1,
    label: "Liter Kaffee",
    Icon: Coffee,
  },
  {
    id: "d20",
    target: 688,
    decimals: 0,
    label: "mal d20 gerollt",
    Icon: Dices,
  },
];

function formatStat(value: number, decimals: number): string {
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function CountUpNumber({
  target,
  decimals,
  active,
}: {
  target: number;
  decimals: number;
  active: boolean;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!active) return;

    let frame = 0;
    const duration = 1600;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(target * eased);
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, target]);

  return (
    <span className="tabular-nums">
      {formatStat(active ? display : 0, decimals)}
    </span>
  );
}

export function SupportDevStats() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} aria-label="Entwicklungsstatistiken">
      <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-6">
        Was bisher geschah
      </h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {STATS.map((stat, index) => {
          const Icon = stat.Icon;
          return (
            <motion.div
              key={stat.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              className="rounded-md border border-hero-dark bg-background-card p-6 shadow-lg text-center"
            >
              <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-accent-gold/30 bg-accent-gold/10">
                <Icon className="h-6 w-6 text-accent-gold" aria-hidden />
              </div>
              <p
                className="font-barlow font-extrabold text-3xl uppercase tracking-wide text-hero-vibrant"
                aria-label={`${formatStat(stat.target, stat.decimals)} ${stat.label}`}
              >
                <CountUpNumber
                  target={stat.target}
                  decimals={stat.decimals}
                  active={inView}
                />
              </p>
              <p className="mt-2 font-libre text-sm text-gray-200 leading-relaxed">
                {stat.label}
              </p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

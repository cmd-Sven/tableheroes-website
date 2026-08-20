"use client";

import { motion } from "framer-motion";
import { Loader2, Shield, Swords, Map, Users } from "lucide-react";
import Image from "next/image";

export type PreloadStep = {
  id: string;
  label: string;
  icon: "shield" | "swords" | "map" | "users";
  status: "pending" | "loading" | "done" | "error";
};

const STEP_ICONS = {
  shield: Shield,
  swords: Swords,
  map: Map,
  users: Users,
} as const;

type Props = {
  steps: PreloadStep[];
  progress: number;
  message?: string;
};

export function LiveSessionLoadingScreen({ steps, progress, message }: Props) {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background-dark">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="flex w-full max-w-md flex-col items-center gap-8 px-6"
      >
        <Image
          src="/images/logo/tableheroes_logo.webp"
          alt="TableHeroes"
          width={180}
          height={60}
          priority
          className="opacity-90"
        />

        <h1 className="font-barlow text-2xl font-extrabold uppercase tracking-wide text-hero-vibrant">
          Session wird geladen…
        </h1>

        {message && (
          <p className="text-center font-libre text-sm text-gray-400">
            {message}
          </p>
        )}

        {/* Progress bar */}
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-background-card border border-hero-dark">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-hero-dark to-hero-vibrant"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", damping: 30, stiffness: 120 }}
          />
        </div>

        {/* Steps */}
        <ul className="flex w-full flex-col gap-3">
          {steps.map((step) => {
            const Icon = STEP_ICONS[step.icon];
            return (
              <li
                key={step.id}
                className="flex items-center gap-3 font-barlow text-sm uppercase tracking-wide"
              >
                <span className="flex h-7 w-7 items-center justify-center">
                  {step.status === "loading" ? (
                    <Loader2 className="h-5 w-5 animate-spin text-accent-gold" />
                  ) : (
                    <Icon
                      className={`h-5 w-5 ${
                        step.status === "done"
                          ? "text-hero-vibrant"
                          : step.status === "error"
                            ? "text-red-400"
                            : "text-gray-600"
                      }`}
                    />
                  )}
                </span>
                <span
                  className={
                    step.status === "done"
                      ? "text-gray-200"
                      : step.status === "loading"
                        ? "text-accent-gold"
                        : step.status === "error"
                          ? "text-red-300"
                          : "text-gray-600"
                  }
                >
                  {step.label}
                </span>
                {step.status === "done" && (
                  <span className="ml-auto text-hero-vibrant">✓</span>
                )}
              </li>
            );
          })}
        </ul>
      </motion.div>
    </div>
  );
}

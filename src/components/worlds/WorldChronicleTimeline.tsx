"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import {
  ageForYear,
  ageSpanLabel,
  yearLabel,
  nearestEvent,
  type ChronicleEvent,
  type WorldChronicle,
} from "@/src/lib/world/chronicle";

type LoreLink = { label: string; loreId: string };

const LINKS: Record<string, LoreLink[]> = {
  "Geburt von Kassadras": [
    { label: "Die Uralten", loreId: "377f187d-0862-49bc-ab10-75e6cac42c19" },
    { label: "Vatrimus", loreId: "99084c23-1734-4d5a-aa83-3fe4ef6398e0" },
  ],
  "Erster Dark Fall": [
    { label: "Der Dark Fall", loreId: "293705d4-f8ba-464a-b82d-fdd5a4f6507e" },
    { label: "Vattrak", loreId: "efd6ff44-b9d4-499f-932c-f89d790d5be5" },
  ],
  "Zweiter Dark Fall": [
    { label: "Malanthir", loreId: "a9148c88-b68b-4730-bc2c-2d753018b06a" },
  ],
  "Lundra wird zum Mond": [
    { label: "Lunara", loreId: "b1f84cf9-d0c6-4ad5-a586-a98a52935731" },
  ],
  "Die Völker des Lichts": [
    { label: "Zephyra", loreId: "68ddfc8f-adeb-4a32-a047-c4c2e2c455a0" },
  ],
  "Bruch des Pantheons": [
    { label: "Zephyra", loreId: "68ddfc8f-adeb-4a32-a047-c4c2e2c455a0" },
  ],
  "Sieg und schwarzer Kataklysmus": [
    { label: "Der schwarze Kataklysmus", loreId: "731192ca-6b0e-40eb-8cdd-24d89b20cff2" },
    { label: "Arta-Maahr", loreId: "ca15a11c-b49a-4bc4-b0cb-5ef65eb5ef1c" },
  ],
  "Dritter Dark Fall": [
    { label: "Der Dark Fall", loreId: "293705d4-f8ba-464a-b82d-fdd5a4f6507e" },
    { label: "Vattrak", loreId: "efd6ff44-b9d4-499f-932c-f89d790d5be5" },
    { label: "Malanthir", loreId: "a9148c88-b68b-4730-bc2c-2d753018b06a" },
  ],
  "Großer Plan der Maschinenzwerge": [
    { label: "Maschinenzwerge", loreId: "d139b913-2b71-49b5-aa6d-a59250662677" },
    { label: "Arta-Maahr", loreId: "ca15a11c-b49a-4bc4-b0cb-5ef65eb5ef1c" },
    { label: "Die alten Tunnel", loreId: "98607bcb-6776-443e-b706-b2c81fb46335" },
  ],
  "Gründung Exploras": [
    { label: "Explora", loreId: "4efa1a48-4834-464a-b699-5b995eb509ad" },
  ],
  "Fall von Zalandar": [
    { label: "Kraterbecken", loreId: "6aa74ec7-df49-4ab8-972c-d8ffefba807b" },
    { label: "Schwarze Bastion", loreId: "67609d09-fc54-436b-b6a3-1c60392ac39d" },
    { label: "Nebelmeer", loreId: "b5b732a9-4f2d-441b-a9df-a20651638ba2" },
  ],
  "Krieg und Flucht nach Aurenfurt": [
    { label: "Aurenfurt", loreId: "d0464d29-4c2d-4c94-a1ab-2d8c069674b3" },
    { label: "Xarvathar", loreId: "656e8e72-8f3d-4a0f-93fd-741bad35980f" },
  ],
  "Explora teleportiert sich fort": [
    { label: "Der Fall von Explora", loreId: "5d01f624-6e1d-4a0b-babf-342c272a9573" },
    { label: "Explora", loreId: "4efa1a48-4834-464a-b699-5b995eb509ad" },
    { label: "Greifenberg", loreId: "4b5ce1ff-dcf3-44aa-be87-c3c8aad6717d" },
  ],
  "Portal über Ghremen": [
    { label: "Westwinder", loreId: "cdcd616c-d2e9-4e8b-b053-d01e3fb7dc28" },
    { label: "Alte Tunnel von Arta-Maahr", loreId: "98607bcb-6776-443e-b706-b2c81fb46335" },
    { label: "Ghalar", loreId: "c85f40c8-17e9-4053-a099-eb1e31436a2c" },
    { label: "Falghalar", loreId: "03c9a2cf-2e63-4045-9378-1ba0faca31a7" },
  ],
};

type Props = {
  chronicle: WorldChronicle;
  worldName: string;
  loreBasePath: string;
};

function eventKey(event: ChronicleEvent) {
  return `${event.year}-${event.title}`;
}

export function WorldChronicleTimeline({ chronicle, worldName, loreBasePath }: Props) {
  const rebirth = chronicle.ages.find((age) => age.restartYear);
  const rebirthNow = rebirth ? chronicle.presentYear - rebirth.startYear : chronicle.presentYear;
  const [probe, setProbe] = useState(String(rebirthNow));
  const [openAges, setOpenAges] = useState<Record<string, boolean>>({});
  const fieldId = useId();
  const skipScroll = useRef(true);

  const probeNumber = Number(probe);
  const probeReady = probe.length > 0 && Number.isInteger(probeNumber);
  const absoluteYear =
    probeReady && rebirth && probeNumber <= rebirthNow
      ? rebirth.startYear + probeNumber
      : probeNumber;
  const probeAge = probeReady ? ageForYear(chronicle, absoluteYear) : null;
  const probeEvent = probeReady ? nearestEvent(chronicle, absoluteYear) : null;

  useEffect(() => {
    if (skipScroll.current) {
      skipScroll.current = false;
      return;
    }
    if (!probeEvent) return;
    document.getElementById(eventKey(probeEvent))?.scrollIntoView({ block: "center" });
  }, [probeEvent]);

  let side = 0;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-barlow font-extrabold text-4xl uppercase tracking-wide text-hero-vibrant">
          Zeitstrahl von {worldName}
        </h1>
        <p className="font-libre text-gray-200 leading-relaxed">{chronicle.epoch}</p>
        <p className="font-libre text-gray-200 leading-relaxed">{chronicle.presentLabel}</p>
      </header>

      <section className="rounded-md border border-hero-border bg-background-card p-4">
        <label className="block font-barlow font-bold uppercase text-sm text-gray-300" htmlFor={fieldId}>
          Jahr der Wiedergeburt
        </label>
        <input
          id={fieldId}
          inputMode="numeric"
          value={probe}
          onChange={(event) => setProbe(event.target.value.replace(/[^\d]/g, "").slice(0, 4))}
          className="mt-2 w-32 bg-slate-900 border border-hero-dark rounded p-2 text-white focus:border-hero-vibrant outline-none font-barlow"
        />
        {probeReady && probeAge && probeEvent ? (
          <p className="mt-3 font-libre text-gray-200 leading-relaxed">
            {`${yearLabel(probeAge, absoluteYear)} liegt im ${probeAge.name}. Nächstgelegenes Geschehen: ${probeEvent.title}.`}
          </p>
        ) : null}
      </section>

      <div className="overflow-x-auto">
        <div className="relative min-w-[720px]">
          <div
            className="pointer-events-none absolute bottom-0 left-1/2 top-0 w-px -translate-x-1/2 bg-hero-border"
            aria-hidden
          />
          <ol>
            {chronicle.ages.map((age) => (
              <li key={age.id}>
                <div className="relative flex justify-center px-4 py-8">
                  <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-md border-2 border-[#f0c2b8] bg-[#241410] shadow-lg">
                    <button
                      type="button"
                      aria-expanded={openAges[age.id] === true}
                      aria-controls={`age-summary-${age.id}`}
                      onClick={() =>
                        setOpenAges((current) => ({ ...current, [age.id]: !current[age.id] }))
                      }
                      className="flex w-full items-center gap-3 px-4 py-4 text-left"
                    >
                      <ChevronDown
                        className={`h-5 w-5 shrink-0 text-[#f0c2b8] transition-transform duration-300 ${
                          openAges[age.id] ? "rotate-180" : ""
                        }`}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 text-center">
                        <span className="block font-barlow text-xs font-bold uppercase tracking-[0.22em] text-[#f0c2b8]">
                          Zeitalter
                        </span>
                        <h2 className="mt-1 font-cinzel font-bold text-xl text-white">{age.name}</h2>
                        <span className="mt-1 block font-barlow text-sm uppercase tracking-wide text-accent-gold">
                          {ageSpanLabel(age)}
                        </span>
                      </span>
                      <span className="w-5 shrink-0" aria-hidden />
                    </button>
                    <p
                      id={`age-summary-${age.id}`}
                      hidden={!openAges[age.id]}
                      className="border-t border-[#f0c2b8]/50 px-5 py-4 text-center font-libre text-sm leading-relaxed text-[#f0c2b8]"
                    >
                      {age.summary}
                    </p>
                  </div>
                </div>
                {age.events.map((event) => {
                  const left = side % 2 === 0;
                  side += 1;
                  const active = probeEvent?.title === event.title && probeEvent.year === event.year;
                  const links = LINKS[event.title] ?? [];
                  return (
                    <div
                      key={eventKey(event)}
                      id={eventKey(event)}
                      className="grid grid-cols-[1fr_2.5rem_1fr] items-start"
                    >
                      <article
                        className={`px-4 py-5 ${left ? "text-right" : ""}`}
                        style={{ gridColumn: left ? "1" : "3", gridRow: "1" }}
                      >
                        <p className="font-barlow font-bold uppercase text-hero-vibrant">
                          {yearLabel(age, event.year)}
                          {event.year === chronicle.presentYear && event.title === "Portal über Ghremen"
                            ? " · Heute"
                            : ""}
                        </p>
                        <h3 className="mt-1 font-cinzel font-bold text-lg text-accent-gold">{event.title}</h3>
                        <p className="mt-2 font-libre text-sm text-gray-200 leading-relaxed">{event.summary}</p>
                        {event.image ? (
                          <div
                            className={`relative mt-3 aspect-video w-full max-w-sm overflow-hidden rounded-md border border-hero-dark ${
                              left ? "ml-auto" : ""
                            }`}
                          >
                            <Image
                              src={event.image}
                              alt={event.title}
                              fill
                              className="object-cover"
                              sizes="384px"
                            />
                          </div>
                        ) : null}
                        {links.length > 0 ? (
                          <ul className={`mt-3 flex flex-wrap gap-x-3 gap-y-1 ${left ? "justify-end" : ""}`}>
                            {links.map((link) => (
                              <li key={link.loreId}>
                                <Link
                                  href={`${loreBasePath}/${link.loreId}`}
                                  className="font-barlow text-sm font-bold uppercase text-hero-vibrant hover:text-white"
                                >
                                  {link.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </article>
                      <div className="relative flex justify-center self-stretch" style={{ gridColumn: "2", gridRow: "1" }}>
                        <span
                          className={`relative z-10 mt-6 h-3 w-3 rounded-full border-2 ${
                            active ? "border-accent-gold bg-hero-vibrant" : "border-hero-vibrant bg-accent-gold"
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

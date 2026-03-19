"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";
import { Footer } from "@/src/components/layout/Footer";
import { StarrySkySection } from "@/src/components/layout/StarrySkySection";
import { LoginCardFrame } from "@/src/components/auth/LoginCardFrame";

type Props = { children: React.ReactNode };

/**
 * Nur auf /login: Sternenhimmel-Sektion mit Logo + Login-Card, darunter Footer ohne Sternen-Sektion.
 * Auf /signup etc.: Burg-Hintergrund + Logo + Drachen + Card + normaler Footer.
 */
export function AuthLayoutClient({ children }: Props) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return (
      <div className="flex min-h-screen w-full min-w-0 max-w-full flex-col">
        <div className="flex flex-1 w-full min-w-0 flex-col">
          <StarrySkySection className="min-h-screen pt-16 pb-24">
            <div className="flex flex-col items-center justify-center gap-8 py-8">
              <Image
                src="/images/tableHeroes-logo.png"
                alt="TableHeroes"
                width={320}
                height={100}
                className="h-auto w-full max-w-[320px]"
              />
              <p className="font-libre text-gray-300 text-sm -mt-4">
                Deine Pen &amp; Paper Community in Osnabrück
              </p>
              <LoginCardFrame>{children}</LoginCardFrame>
            </div>
          </StarrySkySection>
        </div>
        <Footer showStarrySection={false} />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full min-w-0 max-w-full flex-col">
      <Image
        src="/images/bg_hero_castle.jpg"
        alt=""
        fill
        className="object-cover"
        priority
      />
      <div className="absolute inset-0 bg-[#061a06]/85 pointer-events-none" />
      <div className="relative z-10 flex flex-1 w-full min-w-0 flex-col">
        <div className="flex flex-1 w-full min-w-0 items-center justify-center p-6 overflow-visible">
          <div className="w-full max-w-md min-w-0 relative z-10">
            <div className="mb-8 flex flex-col items-center text-center">
              <Image
                src="/images/tableHeroes-logo.png"
                alt="TableHeroes"
                width={320}
                height={100}
                className="h-auto w-full max-w-[320px]"
              />
              <p className="font-libre text-gray-300 text-sm mt-2">
                Deine Pen &amp; Paper Community in Osnabrück
              </p>
            </div>
            <div className="relative z-20 min-h-[420px] w-full overflow-visible">
              <div className="absolute left-1/2 top-0 z-0 h-28 w-28 -translate-x-1/2 -translate-y-2 opacity-90 sm:-translate-y-4">
                <Image
                  src="/images/dragon-wing.png"
                  alt=""
                  width={112}
                  height={112}
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="absolute left-1/2 top-12 z-10 h-52 w-60 -translate-x-1/2">
                <Image
                  src="/images/dragon-body.png"
                  alt=""
                  width={240}
                  height={208}
                  className="h-full w-full object-contain"
                />
                <div className="absolute -right-6 top-1 h-20 w-20">
                  <Image
                    src="/images/dragon-head.png"
                    alt=""
                    width={80}
                    height={80}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="absolute -left-6 top-3 h-16 w-24">
                  <Image
                    src="/images/dragon-tail.png"
                    alt=""
                    width={96}
                    height={64}
                    className="h-full w-full object-contain"
                  />
                </div>
              </div>
              <div className="absolute left-[calc(50%+0.5rem)] top-4 z-20 h-24 w-24 -translate-x-1/2 translate-y-1 opacity-95 sm:left-[calc(50%+1rem)]">
                <Image
                  src="/images/dragon-wing.png"
                  alt=""
                  width={96}
                  height={96}
                  className="h-full w-full object-contain"
                />
              </div>
              <LoginCardFrame>{children}</LoginCardFrame>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}

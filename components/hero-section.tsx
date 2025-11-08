"use client";
import React from "react";
import Link from "next/link";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import HeroSvg from "@/components/hero-svg";
import { LayoutTextFlip } from "@/components/ui/layout-text-flip";

export default function HeroSection() {
  return (
    <main className="overflow-hidden">
      <section className="bg-[linear-gradient(to_bottom,#ffffff_0%,#ffffff_70%,#f9fafb_100%)]">
        <div className="relative pt-24 pb-16">
          <div className="mx-auto max-w-7xl px-6">
            <div className="max-w-5xl text-center sm:mx-auto lg:mr-auto lg:mt-0 lg:w-4/5">
              <h1 className="mt-8 text-balance text-6xl font-bold md:text-[6rem] xl:text-[6rem] xl:leading-[0.95] text-gray-700">
                Professionelle Marketing Boards für{" "}
                <LayoutTextFlip
                  showText={false}
                  words={[
                    "Vertriebler",
                    "Marketing-Teams",
                    "Verkäufer",
                    "Sales-Profis",
                    "Account Manager",
                  ]}
                  duration={3000}
                  wordClassName="inline-block text-6xl font-bold md:text-[6rem] xl:text-[6rem] xl:leading-[0.95] text-gray-700 bg-transparent border-0 shadow-none ring-0 px-0 py-0 rounded-none overflow-visible dark:bg-transparent dark:text-gray-700"
                />
              </h1>
              <p className="mx-auto mt-6 hidden max-w-2xl text-wrap text-lg sm:block text-gray-800">
                Erstelle interaktive, ansprechende Verkaufsunterlagen ohne
                technische Kenntnisse. So einfach wie PowerPoint, so
                leistungsfähig wie eine moderne Webanwendung.
              </p>
              <p className="mx-auto mt-6 max-w-2xl text-wrap sm:hidden">
                Erstelle interaktive Verkaufsunterlagen ohne technische
                Kenntnisse. Einfach, professionell, messbar.
              </p>

              <div className="mt-8">
                <Button
                  size="lg"
                  className="bg-lemonspace hover:bg-lemonspace/90"
                  asChild
                >
                  <Link href="/signup">
                    <Rocket className="relative size-4" />
                    <span className="text-nowrap">Kostenlos starten</span>
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="relative mx-auto mt-[-50px] max-w-[90%] h-[40vw] overflow-hidden">
            <HeroSvg className="w-full h-full object-cover object-top" />
          </div>
        </div>
      </section>
    </main>
  );
}

"use client";
import React from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import HeroSvg from "@/components/hero-svg";
import { LayoutTextFlip } from "@/components/ui/layout-text-flip";

export default function HeroSection() {
  const t = useTranslations("hero");

  const words = [
    t("words.salespeople"),
    t("words.marketingTeams"),
    t("words.sellers"),
    t("words.salesPros"),
    t("words.accountManagers"),
  ];

  return (
    <main className="overflow-hidden">
      <section className="bg-[linear-gradient(to_bottom,#ffffff_0%,#ffffff_70%,#f9fafb_100%)]">
        <div className="relative pt-24 pb-16">
          <div className="mx-auto max-w-7xl px-6">
            <div className="max-w-5xl text-center sm:mx-auto lg:mr-auto lg:mt-0 lg:w-4/5">
              <h1 className="mt-8 text-balance text-6xl font-bold md:text-[6rem] xl:text-[6rem] xl:leading-[0.95] text-gray-700">
                {t("title")}{" "}
                <LayoutTextFlip
                  showText={false}
                  words={words}
                  duration={5000}
                  wordClassName="inline-block text-6xl font-bold md:text-[6rem] xl:text-[6rem] xl:leading-[0.95] text-gray-700 bg-transparent border-0 shadow-none ring-0 px-0 py-0 rounded-none overflow-visible dark:bg-transparent dark:text-gray-700 text-lemonspace"
                />
              </h1>
              <p className="mx-auto mt-6 hidden max-w-2xl text-wrap text-lg sm:block text-gray-800">
                {t("description")}
              </p>
              <p className="mx-auto mt-6 max-w-2xl text-wrap sm:hidden">
                {t("descriptionMobile")}
              </p>

              <div className="relative z-20 mt-8">
                <Button
                  size="lg"
                  className="bg-black hover:bg-gray-800/90 text-white cursor-pointer"
                  asChild
                >
                  <Link href="/signup">
                    <Rocket className="relative size-4" />
                    <span className="text-nowrap">{t("cta")}</span>
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="relative mx-auto mt-[-60px] max-w-[90%] h-[40vw] overflow-hidden z-10 pointer-events-none">
            <HeroSvg className="w-full h-full object-cover object-top" />
          </div>
        </div>
      </section>
    </main>
  );
}

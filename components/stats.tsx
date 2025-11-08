"use client";
import { useTranslations } from 'next-intl';

export default function StatsSection() {
    const t = useTranslations("stats");

    return (
        <section className="bg-gradient-to-b from-gray-50 to-white py-12 md:py-20">
            <div className="mx-auto max-w-5xl space-y-8 px-6 md:space-y-16">
                <div className="relative z-10 mx-auto max-w-xl space-y-6 text-center">
                    <h2 className="text-4xl font-medium lg:text-5xl">{t("title")}</h2>
                    <p>{t("description")}</p>
                </div>

                <div className="grid gap-12 divide-y *:text-center md:grid-cols-3 md:gap-2 md:divide-x md:divide-y-0">
                    <div className="space-y-4">
                        <div className="text-5xl font-bold">0</div>
                        <p>{t("noTechnicalSkills")}</p>
                    </div>
                    <div className="space-y-4">
                        <div className="text-5xl font-bold">100%</div>
                        <p>{t("customizable")}</p>
                    </div>
                    <div className="space-y-4">
                        <div className="text-5xl font-bold">∞</div>
                        <p>{t("possibilities")}</p>
                    </div>
                </div>
            </div>
        </section>
    )
}

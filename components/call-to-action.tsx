"use client";
import { Button } from "@/components/ui/button";
import { Mail, SendHorizonal } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";

export default function CallToAction() {
    const t = useTranslations("cta");

    return (
        <>
            <section className="py-16">
                <div className="mx-auto max-w-5xl px-6">
                    <div className="text-center">
                        <h2 className="text-balance text-4xl font-semibold lg:text-5xl">
                            {t("title")}
                        </h2>
                        <p className="mt-4 text-muted-foreground">
                            {t("subtitle")}
                        </p>

                        <form action="" className="mx-auto mt-10 max-w-sm lg:mt-12">
                            <div className="bg-background has-[input:focus]:ring-muted relative grid grid-cols-[1fr_auto] items-center rounded-[calc(var(--radius)+0.75rem)] border pr-3 shadow shadow-zinc-950/5 dark:shadow-zinc-950/50 has-[input:focus]:ring-2">
                                <Mail className="text-muted-foreground pointer-events-none absolute inset-y-0 left-5 my-auto size-5" />

                                <input
                                    placeholder={t("emailPlaceholder")}
                                    className="h-14 w-full bg-transparent pl-12 focus:outline-none"
                                    type="email"
                                />

                                <div className="md:pr-1.5 lg:pr-0">
                                    <Button aria-label="submit" className="rounded-(--radius)">
                                        <span className="hidden md:block">{t("button")}</span>
                                        <SendHorizonal
                                            className="relative mx-auto size-5 md:hidden"
                                            strokeWidth={2}
                                        />
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </section>
            <section className="bg-background relative z-10 pb-16 py-16">
                <div className="m-auto max-w-5xl px-6">
                    <h2 className="text-center text-lg font-medium">
                        {t("trustedBy")}
                    </h2>
                    <div className="mx-auto mt-12 flex max-w-4xl flex-wrap items-center justify-center gap-x-12 gap-y-6">
                        <Image
                            className="h-5 w-fit dark:invert"
                            src="https://html.tailus.io/blocks/customers/nvidia.svg"
                            alt="Nvidia Logo"
                            height={20}
                            width={80}
                        />
                        <Image
                            className="h-4 w-fit dark:invert"
                            src="https://html.tailus.io/blocks/customers/column.svg"
                            alt="Column Logo"
                            height={16}
                            width={80}
                        />
                        <Image
                            className="h-4 w-fit dark:invert"
                            src="https://html.tailus.io/blocks/customers/github.svg"
                            alt="GitHub Logo"
                            height={16}
                            width={80}
                        />
                        <Image
                            className="h-5 w-fit dark:invert"
                            src="https://html.tailus.io/blocks/customers/nike.svg"
                            alt="Nike Logo"
                            height={20}
                            width={80}
                        />
                        <Image
                            className="h-4 w-fit dark:invert"
                            src="https://html.tailus.io/blocks/customers/laravel.svg"
                            alt="Laravel Logo"
                            height={16}
                            width={80}
                        />
                        <Image
                            className="h-7 w-fit dark:invert"
                            src="https://html.tailus.io/blocks/customers/lilly.svg"
                            alt="Lilly Logo"
                            height={28}
                            width={80}
                        />
                        <Image
                            className="h-5 w-fit dark:invert"
                            src="https://html.tailus.io/blocks/customers/lemonsqueezy.svg"
                            alt="Lemon Squeezy Logo"
                            height={20}
                            width={80}
                        />
                        <Image
                            className="h-6 w-fit dark:invert"
                            src="https://html.tailus.io/blocks/customers/openai.svg"
                            alt="OpenAI Logo"
                            height={24}
                            width={80}
                        />
                        <Image
                            className="h-4 w-fit dark:invert"
                            src="https://html.tailus.io/blocks/customers/tailwindcss.svg"
                            alt="Tailwind CSS Logo"
                            height={16}
                            width={80}
                        />
                        <Image
                            className="h-5 w-fit dark:invert"
                            src="https://html.tailus.io/blocks/customers/vercel.svg"
                            alt="Vercel Logo"
                            height={20}
                            width={80}
                        />
                        <Image
                            className="h-5 w-fit dark:invert"
                            src="https://html.tailus.io/blocks/customers/zapier.svg"
                            alt="Zapier Logo"
                            height={20}
                            width={80}
                        />
                    </div>
                </div>
            </section>
        </>
    );
}

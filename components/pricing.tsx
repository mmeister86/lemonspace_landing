"use client";
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function Pricing() {
    const t = useTranslations("pricing");

    return (
        <section className="py-16 md:py-32">
            <div className="mx-auto max-w-6xl px-6">
                <div className="mx-auto max-w-2xl space-y-6 text-center">
                    <h1 className="text-center text-4xl font-semibold lg:text-5xl">{t("title")}</h1>
                    <p>{t("subtitle")}</p>
                </div>

                <div className="mt-8 grid gap-6 md:mt-20 md:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-medium">{t("free.name")}</CardTitle>

                            <span className="my-3 block text-2xl font-semibold">{t("free.price")}</span>

                            <CardDescription className="text-sm">{t("free.description")}</CardDescription>
                            <Button
                                asChild
                                variant="outline"
                                className="mt-4 w-full">
                                <Link href="/signup">{t("free.cta")}</Link>
                            </Button>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <hr className="border-dashed" />

                            <ul className="list-outside space-y-3 text-sm">
                                {t.raw("free.features").map((item: string, index: number) => (
                                    <li
                                        key={index}
                                        className="flex items-center gap-2">
                                        <Check className="size-3" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>

                    <Card className="relative">
                        <span className="bg-linear-to-br/increasing absolute inset-x-0 -top-3 mx-auto flex h-6 w-fit items-center rounded-full from-purple-400 to-amber-300 px-3 py-1 text-xs font-medium text-amber-950 ring-1 ring-inset ring-white/20 ring-offset-1 ring-offset-gray-950/5">{t("pro.badge")}</span>

                        <CardHeader>
                            <CardTitle className="font-medium">{t("pro.name")}</CardTitle>

                            <span className="my-3 block text-2xl font-semibold">{t("pro.price")}</span>

                            <CardDescription className="text-sm">{t("pro.yearly")}</CardDescription>

                            <Button
                                asChild
                                className="mt-4 w-full">
                                <Link href="/signup">{t("pro.cta")}</Link>
                            </Button>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <hr className="border-dashed" />

                            <ul className="list-outside space-y-3 text-sm">
                                {t.raw("pro.features").map((item: string, index: number) => (
                                    <li
                                        key={index}
                                        className="flex items-center gap-2">
                                        <Check className="size-3" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>

                    <Card className="flex flex-col">
                        <CardHeader>
                            <CardTitle className="font-medium">{t("lifetime.name")}</CardTitle>

                            <span className="my-3 block text-2xl font-semibold">{t("lifetime.price")}</span>

                            <CardDescription className="text-sm">{t("lifetime.description")}</CardDescription>

                            <Button
                                asChild
                                variant="outline"
                                className="mt-4 w-full">
                                <Link href="/signup">{t("lifetime.cta")}</Link>
                            </Button>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <hr className="border-dashed" />

                            <ul className="list-outside space-y-3 text-sm">
                                {t.raw("lifetime.features").map((item: string, index: number) => (
                                    <li
                                        key={index}
                                        className="flex items-center gap-2">
                                        <Check className="size-3" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </section>
    )
}

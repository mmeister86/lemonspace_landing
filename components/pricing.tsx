import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check } from 'lucide-react'

export default function Pricing() {
    return (
        <section className="py-16 md:py-32">
            <div className="mx-auto max-w-6xl px-6">
                <div className="mx-auto max-w-2xl space-y-6 text-center">
                    <h1 className="text-center text-4xl font-semibold lg:text-5xl">Preise, die zu dir passen</h1>
                    <p>Starte kostenlos und upgrade, wenn du mehr Features brauchst. Alle Pläne können jederzeit gekündigt werden.</p>
                </div>

                <div className="mt-8 grid gap-6 md:mt-20 md:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-medium">Free</CardTitle>

                            <span className="my-3 block text-2xl font-semibold">0€ / Monat</span>

                            <CardDescription className="text-sm">Für den Einstieg</CardDescription>
                            <Button
                                asChild
                                variant="outline"
                                className="mt-4 w-full">
                                <Link href="/signup">Jetzt starten</Link>
                            </Button>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <hr className="border-dashed" />

                            <ul className="list-outside space-y-3 text-sm">
                                {['Max. 3 Boards gleichzeitig', 'Basis-Blöcke (Text, Bilder, Buttons)', 'Standard-Farbschemata', 'Einfache Analytics', '50MB Video-Upload-Limit'].map((item, index) => (
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
                        <span className="bg-linear-to-br/increasing absolute inset-x-0 -top-3 mx-auto flex h-6 w-fit items-center rounded-full from-purple-400 to-amber-300 px-3 py-1 text-xs font-medium text-amber-950 ring-1 ring-inset ring-white/20 ring-offset-1 ring-offset-gray-950/5">Beliebt</span>

                        <CardHeader>
                            <CardTitle className="font-medium">Pro</CardTitle>

                            <span className="my-3 block text-2xl font-semibold">19€ / Monat</span>

                            <CardDescription className="text-sm">oder 199€ / Jahr</CardDescription>

                            <Button
                                asChild
                                className="mt-4 w-full">
                                <Link href="/signup">Jetzt upgraden</Link>
                            </Button>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <hr className="border-dashed" />

                            <ul className="list-outside space-y-3 text-sm">
                                {['Alles aus dem Free Plan', 'Unbegrenzte Boards', 'Alle Premium-Blöcke', 'Custom Farbschemata', 'White-Label (kein Branding)', 'Detaillierte Analytics', 'Custom Link-IDs', 'Passwortschutz & zeitliche Limits', 'Eigene Templates speichern', '500MB Video-Upload-Limit', 'Priority Support'].map((item, index) => (
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
                            <CardTitle className="font-medium">Lifetime</CardTitle>

                            <span className="my-3 block text-2xl font-semibold">399€</span>

                            <CardDescription className="text-sm">Einmalig zahlen</CardDescription>

                            <Button
                                asChild
                                variant="outline"
                                className="mt-4 w-full">
                                <Link href="/signup">Jetzt kaufen</Link>
                            </Button>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <hr className="border-dashed" />

                            <ul className="list-outside space-y-3 text-sm">
                                {['Alles aus dem Pro Plan', 'Lebenslanger Zugang', 'Früher Zugang zu neuen Features', 'Keine monatlichen Kosten', 'Einmalige Zahlung'].map((item, index) => (
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

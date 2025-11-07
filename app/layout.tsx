import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://lemonspace.io"),
  title: "LemonSpace.io",
  description:
    "LemonSpace.io is a platform for creating and managing marketing boards to share on social media.",
  openGraph: {
    title: "LemonSpace.io",
    description:
      "LemonSpace.io is a platform for creating and managing marketing boards to share on social media.",
    url: "https://lemonspace.io", // Platzhalter URL
    siteName: "LemonSpace.io",
    images: [
      {
        url: "/og-image.png", // Platzhalter Bild-URL
        width: 1200,
        height: 630,
        alt: "LemonSpace.io",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LemonSpace.io",
    description:
      "LemonSpace.io is a platform for creating and managing marketing boards to share on social media.",
    images: ["/og-image.png"], // Platzhalter Bild-URL
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

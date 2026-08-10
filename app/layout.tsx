import type { Metadata, Viewport } from "next";
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

// 📱 VIEWPORT CONFIGURATION (Mobile & Branding)
export const viewport: Viewport = {
  themeColor: "#ccff00",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

// 🌐 BASE URL & DOMAIN
const siteUrl = "https://eksdipadel.com";

// 🌐 METADATA SEO & FAVICON CONFIG
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Padel Tasik - Lapangan & Komunitas Padel Terbaik di Tasikmalaya | Eksdi Padel",
    template: "%s | Eksdi Padel Tasik",
  },
  description:
    "Cari tempat main Padel di Tasik? Eksdi Padel Tasikmalaya menyediakan lapangan modern, sewa raket premium, dan komunitas seru. Lokasi strategis, terdekat, dan booking online mudah. Main Padel Tasik sekarang!",
  keywords: [
    "padel tasik",
    "padel tasikmalaya",
    "lapangan padel tasikmalaya",
    "komunitas padel tasikmalaya",
    "sewa lapangan padel tasik",
    "booking padel tasikmalaya",
    "tempat olahraga tasikmalaya",
    "padel terdekat tasikmalaya",
    "eksdi padel tasik",
    "eksdi padel",
  ],
  authors: [{ name: "Eksdi Padel Tasikmalaya" }],
  creator: "Eksdi Padel",
  publisher: "Eksdi Padel",
  formatDetection: {
    telephone: true,
    address: true,
    email: true,
  },

  // 🖼️ FAVICON & ICON CONFIGURATION (Memaksa Bypass Cache Google & Vercel)
  icons: {
    icon: [
      { url: "/favicon.ico?v=2", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
    ],
    shortcut: "/favicon.ico?v=2",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/site.webmanifest",

  // 📱 OPENGRAPH (Medsos Share & Google Preview)
  openGraph: {
    title: "Padel Tasik - Main di Lapangan Modern Eksdi Padel Tasikmalaya",
    description:
      "Fasilitas lengkap, lokasi strategis, dan komunitas Padel Tasikmalaya terbesar. Booking lapangan online mudah di Eksdi Padel.",
    url: siteUrl,
    siteName: "Eksdi Padel Tasikmalaya",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "/og-image.webp",
        width: 1200,
        height: 630,
        alt: "Suasana Lapangan Eksdi Padel Tasikmalaya",
      },
    ],
  },

  // 🤖 ROBOTS
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },

  // 📍 GEO TAGS (Local Business Tasikmalaya)
  other: {
    "geo.region": "ID-JB",
    "geo.placename": "Tasikmalaya",
    "geo.position": "-7.294295;108.197783",
    ICBM: "-7.294295, 108.197783",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 📍 JSON-LD SCHEMA.ORG FOR LOCAL SEO & GOOGLE MAPS
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": ["SportsActivityLocation", "LocalBusiness"],
    name: "Eksdi Padel Tasikmalaya",
    image: `${siteUrl}/og-image.webp`,
    "@id": siteUrl,
    url: siteUrl,
    telephone: "+628132314141",
    priceRange: "Rp 100.000 - Rp 250.000",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Jl. Simpang Nagrog, Nagarasari, Cipedes",
      addressLocality: "Kota Tasikmalaya",
      addressRegion: "Jawa Barat",
      postalCode: "46132",
      addressCountry: "ID",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: -7.294295359883887,
      longitude: 108.19778262883635,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
        opens: "06:00",
        closes: "22:00",
      },
    ],
    sameAs: [
      "https://www.instagram.com/eksdipadelcourts",
    ],
    sport: "Padel",
  };

  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Inject Schema JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-[#0f1715] text-white">
        <main className="flex-grow">{children}</main>
      </body>
    </html>
  );
}
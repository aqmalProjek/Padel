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

// 🌐 METADATA SEO LOKAL & BRANDING
export const metadata: Metadata = {
  metadataBase: new URL("https://eksdipadel.com"), // Ganti dengan domain asli kamu
  title: {
    default: "Eksdi Padel - Lapangan & Komunitas Padel Terbaik di Tasikmalaya",
    template: "%s | Eksdi Padel Tasikmalaya",
  },
  description:
    "Eksdi Padel adalah penyedia lapangan padel terbaik, terdekat, dan paling modern di Tasikmalaya. Pesan jadwal main online, sewa raket, dan gabung komunitas padel Tasik sekarang!",
  keywords: [
    "padel tasik",
    "padel tasikmalaya",
    "padel terbaik di tasik",
    "padel terdekat",
    "lapangan padel tasikmalaya",
    "sewa lapangan padel tasik",
    "booking padel tasik",
    "eksdi padel",
    "eksdi padel tasik",
    "olahraga padel tasikmalaya",
  ],
  authors: [{ name: "Eksdi Padel Tasikmalaya" }],
  creator: "Eksdi Padel",
  publisher: "Eksdi Padel",
  formatDetection: {
    telephone: true,
    address: true,
  },
  icons: {
    icon: "/eksdipadel.png",
    shortcut: "/eksdipadel.png",
    apple: "/eksdipadel.png",
  },
  openGraph: {
    title: "Eksdi Padel - Lapangan Padel Terbaik & Terdekat di Tasikmalaya",
    description:
      "Cari lapangan padel terdekat di Tasikmalaya? Main di Eksdi Padel! Fasilitas lengkap, raket premium, dan booking online instan.",
    url: "https://eksdipadel.com",
    siteName: "Eksdi Padel Tasikmalaya",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "/eksdipadel.png", // Atau gambar banner promo/lapangan resolusi tinggi
        width: 1200,
        height: 630,
        alt: "Eksdi Padel Tasikmalaya",
      },
    ],
  },
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
    canonical: "https://eksdipadel.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 📍 JSON-LD SCHEMA.ORG FOR LOCAL SEO (Sangat Penting untuk "Padel Terdekat" & Google Maps)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": ["SportsActivityLocation", "LocalBusiness"],
    name: "Eksdi Padel Tasikmalaya",
    image: "https://eksdipadel.com/eksdipadel.png",
    "@id": "https://eksdipadel.com",
    url: "https://eksdipadel.com",
    telephone: "+628132314141", // Nomor WA/Telp Eksdi Padel
    priceRange: "Rp 100.000 - Rp 250.000",
    address: {
      "@type": "PostalAddress",
      streetAddress: "l. Simpang Nagrog, Indihiang, Tasikmalaya Regency, West Java", // 👈 Sesuaikan dengan alamat fisik sebenarnya di Tasik
      addressLocality: "Tasikmalaya",
      addressRegion: "Jawa Barat",
      postalCode: "46151", // 👈 Sesuaikan kode pos
      addressCountry: "ID",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude:       -7.294359211929342,  // 👈 PENTING: Masukkan Latitude presisi lokasi dari Google Maps
      longitude: 108.19775044232807, // 👈 PENTING: Masukkan Longitude presisi dari Google Maps
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
      "https://www.instagram.com/eksdipadelcourts", // 👈 Tambahkan IG/Medsos jika ada
    ],
  };

  return (
    <html
      lang="id" // 👈 Diubah ke "id" untuk Bahasa Indonesia
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Inject JSON-LD Schema.org */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Geo Meta Tags untuk GPS/Pencarian Terdekat */}
        <meta name="geo.region" content="ID-JB" />
        <meta name="geo.placename" content="Tasikmalaya" />
        <meta name="geo.position" content="-7.294359211929342;108.19775044232807" />
        <meta name="ICBM" content="-7.294359211929342, 108.19775044232807" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
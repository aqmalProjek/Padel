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

// 📱 VIEWPORT CONFIGURATION (Penting untuk Mobile SEO)
export const viewport: Viewport = {
  themeColor: "#ccff00", // Warna utama branding Eksdi Padel
  width: "device-width",
  initialScale: 1,
  maximumScale: 5, // Mengizinkan user zoom untuk aksesibilitas, tapi bagus untuk SEO mobile
};

// 🌐 METADATA SEO LOKAL & BRANDING (Target Utama: "Padel Tasik")
// Ganti "https://eksdipadel.com" dengan domain asli kamu jika sudah ada.
const siteUrl = "https://eksdipadel.com";

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
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png", // Disarankan buat Apple Touch Icon spesifik
  },
  // OpenGraph (Untuk share ke medsos agar SEO Friendly)
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
        url: "/og-image.webp", // Disarankan buat gambar khusus OG (1200x630) yang menarik
        width: 1200,
        height: 630,
        alt: "Suasana Lapangan Eksdi Padel Tasikmalaya",
      },
    ],
  },
  // Robots config
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
  // Geo tags (Meta tags jadul tapi masih dibaca beberapa engine untuk local business)
  other: {
    "geo.region": "ID-JB",
    "geo.placename": "Tasikmalaya",
    "geo.position": "-7.294295;108.197783", // Sesuai kordinat Boss
    ICBM: "-7.294295, 108.197783",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 📍 JSON-LD SCHEMA.ORG FOR LOCAL SEO (Sangat Penting untuk "Padel Terdekat" & Google Maps)
  // Data alamat di-reverse engineer dari koordinat Boss
  const jsonLd = {
    "@context": "https://schema.org",
    // Menggunakan multipel type agar Google paham ini tempat aktivitas sekaligus bisnis lokal
    "@type": ["SportsActivityLocation", "LocalBusiness"],
    name: "Eksdi Padel Tasikmalaya",
    image: `${siteUrl}/eksdipadel.png`,
    "@id": siteUrl,
    url: siteUrl,
    telephone: "+628132314141", // Nomor WA Eksdi Padel
    priceRange: "Rp 100.000 - Rp 250.000", // Estimasi harga
    address: {
      "@type": "PostalAddress",
      streetAddress: "Jl. Simpang Nagrog, Nagarasari, Cipedes", // 👈 Alamat presisi sesuai koordinat
      addressLocality: "Kota Tasikmalaya",
      addressRegion: "Jawa Barat",
      postalCode: "46132", // 👈 Kode pos presisi Cipedes/Nagarasari
      addressCountry: "ID",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: -7.294295359883887, // 👈 Kordinat Boss
      longitude: 108.19778262883635, // 👈 Kordinat Boss
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
        opens: "06:00", // Sesuaikan jam operasional asli
        closes: "22:00",
      },
    ],
    sameAs: [
      "https://www.instagram.com/eksdipadelcourts", // IG Komunitas/Bisnis
      // Tambahkan URL Facebook, Google Maps Bisnis, dll jika ada di sini
    ],
    // Tambahan untuk memperkuat SEO olahraga
    sport: "Padel",
    coach: {
      "@type": "Person",
      name: "Tersedia Pelatih Padel" // Contoh jika ada coach
    }
  };

  return (
    <html
      lang="id" // 👈 Wajib "id" agar Google tahu ini target Indonesia
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Inject JSON-LD Schema.org */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Favicons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-[#0f1715] text-white">
        {/* Kamu bisa menambahkan Header/Navbar SEO friendly di sini */}
        
        <main className="flex-grow">
          {children}
        </main>
        
        {/* Kamu bisa menambahkan Footer SEO friendly di sini yang berisi alamat lengkap */}
      </body>
    </html>
  );
}
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "MLBB Draft Assistant",
  description:
    "Asisten draft Mobile Legends: Hero Power, counter pick, saran combo, dan analisis early/mid/late game. Langsung di browser HP, tanpa install.",
  applicationName: "MLBB Draft",
  appleWebApp: { capable: true, title: "MLBB Draft", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0e1a",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Orbitron:wght@600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <Navbar />
        <main className="min-h-[70vh] pb-24 md:pb-8">{children}</main>
        <div className="pb-20 md:pb-0">
          <Footer />
        </div>
        <BottomNav />
      </body>
    </html>
  );
}

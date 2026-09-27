import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AlertWatcher } from "@/components/AlertWatcher";
import { RegisterSW } from "@/components/RegisterSW";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ScrollReveal, RouteProgress } from "@/components/ScrollAndProgress";

const vazir = localFont({
  src: [
    { path: "../fonts/Vazirmatn-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/Vazirmatn-Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/Vazirmatn-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "../fonts/Vazirmatn-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-vazir",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "تحلیلگر جامع | تحلیل هوشمند بورس ایران",
    template: "%s | تحلیلگر جامع",
  },
  description:
    "پلتفرم تحلیل هوشمند بورس ایران با قدرت هوش مصنوعی — تحلیل فاندامنتال و تکنیکال، اخبار غربال‌شده و پیشنهاد معامله",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "تحلیلگر جامع",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#070b14" },
    { media: "(prefers-color-scheme: light)", color: "#f4f6fb" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body className={`${vazir.variable} font-sans antialiased`}>
        <ThemeProvider>
          <div className="flex min-h-screen flex-col">
            <OfflineBanner />
            <RouteProgress />
            <ScrollReveal />
            <Header />
            <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-6 sm:px-6">{children}</main>
            <Footer />
            <AlertWatcher />
            <RegisterSW />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}

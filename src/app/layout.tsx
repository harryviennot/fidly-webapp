import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { AuthProvider } from "@/contexts/auth-provider";
import { BusinessProvider } from "@/contexts/business-context";
import { FeaturesProvider } from "@/contexts/features-context";
import { QueryProvider } from "@/components/providers";
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
  title: "Stampeo Dashboard",
  description: "Manage your loyalty card program",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <QueryProvider>
            <FeaturesProvider>
              <AuthProvider>
                <BusinessProvider>{children}</BusinessProvider>
              </AuthProvider>
            </FeaturesProvider>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

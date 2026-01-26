import type { Metadata } from "next";
import { AuthProvider } from "@/lib/supabase/auth-provider";
import { BusinessProvider } from "@/lib/context/business-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stampeo Dashboard",
  description: "Manage your loyalty card program",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <BusinessProvider>{children}</BusinessProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

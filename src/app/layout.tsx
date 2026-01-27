import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/auth-provider";
import { BusinessProvider } from "@/contexts/business-context";
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

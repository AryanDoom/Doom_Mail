import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Background } from "@/components/Background";
import { Sidebar } from "@/components/Sidebar";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Coldmail",
  description: "Sent email and open tracking.",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen antialiased">
        <Background />
        <Sidebar />
        {children}
      </body>
    </html>
  );
}

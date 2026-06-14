import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GrowthMind AI - Coffee Brand CRM",
  description: "AI-powered growth agent for Brew & Grow coffee brand",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex min-h-screen bg-background">
          <Sidebar />
          {/* Main content area - offset by sidebar width */}
          <main className="flex-1 ml-64 min-h-screen overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

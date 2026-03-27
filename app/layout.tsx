import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import CouncilBackground from "@/components/CouncilBackground";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sage Council",
  description: "Your personal council of wisdom from the greatest minds",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className={inter.className}>
        <CouncilBackground />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Providers session={session}>{children}</Providers>
        </div>
      </body>
    </html>
  );
}

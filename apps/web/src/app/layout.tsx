import type { Metadata } from "next";
import "../styles/globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "G-Stock — Plateforme SaaS Universelle de Gestion des Stocks",
  description:
    "Plateforme SaaS multi-entreprises configurable de gestion des stocks, entrepôts, mouvements transactionnels et inventaires.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

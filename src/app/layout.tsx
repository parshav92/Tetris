import type { Metadata } from "next";
import { DM_Sans, Geist_Mono, Press_Start_2P } from "next/font/google";
import "./globals.css";
import ErrorBoundary from "@/components/ErrorBoundary";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const pressStart2P = Press_Start_2P({
  variable: "--font-press-start-2p",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tetris - Classic Puzzle Game",
  description: "Play the classic Tetris game with modern web technologies. Features smooth animations, sound effects, and responsive design.",
  keywords: ["tetris", "puzzle game", "classic games", "arcade", "web game", "React", "TypeScript"],
  authors: [{ name: "Tetris Game" }],
  robots: "index, follow",
  metadataBase: new URL('https://tetris-game.vercel.app'),
  openGraph: {
    title: "Tetris - Classic Puzzle Game",
    description: "Play the classic Tetris game with modern web technologies",
    type: "website",
    url: "https://tetris-game.vercel.app",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Tetris Game Screenshot",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tetris - Classic Puzzle Game",
    description: "Play the classic Tetris game with modern web technologies",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/favicon.ico" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body
        className={`${dmSans.variable} ${geistMono.variable} ${pressStart2P.variable} antialiased`}
      >
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}

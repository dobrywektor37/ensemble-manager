
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "bootstrap/dist/css/bootstrap.min.css";
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
  title: "Ensemble Manager",
  description:
      "System zarządzania zespołami muzycznymi, próbami, koncertami i nieobecnościami.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
      <html
          lang="pl"
          data-bs-theme="dark"
          className={`${geistSans.variable} ${geistMono.variable}`}
      >
      <body>{children}</body>
      </html>
  );
}

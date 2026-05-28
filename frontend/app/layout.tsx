import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ApplyOS",
  description: "Application Decision Agent for targeted recruiting"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

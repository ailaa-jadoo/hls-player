import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "HLS Player",
  description: "Haxx",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <link rel="icon" type="image/svg+xml" href="/hax.svg" />
      <body className={inter.className}>{children}</body>
    </html>
  );
}

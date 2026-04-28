import type { ReactNode } from "react";
import "./styles.css";

export const metadata = {
  title: "JP Address UPS Latin Converter",
  description: "Internal review system for UPS-safe Japanese address conversions",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true
    }
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

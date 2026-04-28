import type { ReactNode } from "react";
import "./styles.css";

export const metadata = {
  title: "JP Address UPS Latin Converter",
  description: "Internal review system for UPS-safe Japanese address conversions"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

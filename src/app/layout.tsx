import "./globals.css";
import { Atkinson_Hyperlegible } from "next/font/google";

// Atkinson Hyperlegible: diseñada para máxima legibilidad, pensando en lectores mayores.
const font = Atkinson_Hyperlegible({ subsets: ["latin"], weight: ["400", "700"] });

export const metadata = { title: "Querido Abuelo", description: "Voluntarios y adultos mayores, juntos a largo plazo." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${font.className} bg-[#F5F8F7] text-lg leading-relaxed text-[#1E2B2A]`}>{children}</body>
    </html>
  );
}

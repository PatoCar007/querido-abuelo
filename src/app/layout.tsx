import "./globals.css";
import { Atkinson_Hyperlegible } from "next/font/google";

// Atkinson Hyperlegible: diseñada para máxima legibilidad, pensando en lectores mayores.
const font = Atkinson_Hyperlegible({ subsets: ["latin"], weight: ["400", "700"] });

export const metadata = { title: "Querido Abuelo", description: "Voluntarios y adultos mayores, juntos a largo plazo." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${font.className} flex min-h-screen flex-col bg-[#F5F8F7] text-lg leading-relaxed text-[#1E2B2A]`}>
        <div className="flex-1">{children}</div>
        <footer className="border-t border-[#C9DAD7] px-6 py-6 text-center text-base">
          Para cualquier aclaración, enviar un correo a:{" "}
          <a href="mailto:aclaracionesqueridoabuelo@gmail.com" className="font-bold text-[#2F6F6B] underline">
            aclaracionesqueridoabuelo@gmail.com
          </a>
        </footer>
      </body>
    </html>
  );
}
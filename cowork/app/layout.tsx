import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cowork',
  description: 'Guía de 7 pasos para ejecutar tareas sin parálisis',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-[#0f0f0f] text-white antialiased">{children}</body>
    </html>
  );
}

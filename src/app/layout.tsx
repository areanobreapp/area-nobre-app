import type { Metadata, Viewport } from 'next';
import './globals.css';
import 'leaflet/dist/leaflet.css';
import Header from '@/components/Header';
import MobileNav from '@/components/MobileNav';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Área Nobre — Oportunidades Imobiliárias',
  description: 'Aplicação moderna de organização de carteira, buscas e matching de oportunidades para corretores.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1E4620',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <html lang="pt-BR">
      <body>
        <div className="app-container">
          <Header user={user} />
          <main className="main-content">
            {children}
          </main>
          <MobileNav />
        </div>
      </body>
    </html>
  );
}

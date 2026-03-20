import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from './api/auth/[...nextauth]/route';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sage Council',
  description:
    'Your personal council of 9 wisdom voices — Mark Manson, Derek Sivers, Steven Bartlett, and more — collaborating to give you 3 unique perspectives on any challenge.',
  icons: { icon: '/favicon.ico' },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}

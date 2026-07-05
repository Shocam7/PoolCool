import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; // Global styles

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Heat Wave Refuge Network',
  description: 'Find and share cool spaces during heat waves',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={inter.className}>
      <body suppressHydrationWarning className="bg-gray-50 text-gray-900 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}

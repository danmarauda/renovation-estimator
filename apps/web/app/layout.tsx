import type { Metadata, Viewport } from 'next';
import { Inter_Tight, Cormorant } from 'next/font/google';
import '../styles/palettes.css';
import '../styles/frost-glass.css';
import '../styles/studio-ui.css';
import '../styles/app.css';
import '../styles/panel.css';
import './globals.css';

const sans = Inter_Tight({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-studio-sans', display: 'swap' });
const serif = Cormorant({ subsets: ['latin'], weight: '500', style: ['normal', 'italic'], variable: '--font-studio-serif', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL('https://incrediblekitchens.com.au'),
  title: '3D Kitchen Estimator | Incredible Kitchens Australia',
  description: 'Explore your Incredible Kitchens design in 3D, compare finishes and plan with metric measurements and indicative AUD allowances.',
  alternates: { canonical: '/' },
  openGraph: { type: 'website', locale: 'en_AU', siteName: 'Incredible Kitchens', title: '3D Kitchen Estimator | Incredible Kitchens Australia', description: 'Your kitchen. Made incredible. Explore finishes in 3D with metric measurements and indicative AUD allowances.', url: '/' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', colorScheme: 'light dark', themeColor: '#2F5E4E' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-AU" data-palette="emerald" className={`bg-background ${sans.variable} ${serif.variable}`}><body className="ws font-sans">{children}</body></html>;
}

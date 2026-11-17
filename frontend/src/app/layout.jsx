import './globals.css';
import { AuthProvider } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import RadialMenu from '@/components/RadialMenu';

export const metadata = {
  title: 'CampusKart | PES University student marketplace',
  description: 'Buy and sell second-hand items inside your campus.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          <Navbar />
          <main className="container">{children}</main>
          <Footer />
          <RadialMenu />
        </AuthProvider>
      </body>
    </html>
  );
}

import './globals.css';
import Link from 'next/link';

export const metadata = {
    title: 'FleetTracker - Automotive Fleet Management',
    description: 'Enterprise fleet management solution for automotive companies',
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>
                <nav className="navbar">
                    <div className="nav-container">
                        <Link href="/" className="nav-brand">
                            🚗 FleetTracker
                        </Link>
                        <div className="nav-links">
                            <Link href="/dashboard">Dashboard</Link>
                            <Link href="/vehicles">Vehicles</Link>
                            <Link href="/maintenance">Maintenance</Link>
                        </div>
                    </div>
                </nav>
                <main className="main-content">
                    {children}
                </main>
                <footer className="footer">
                    <p>© 2024 FleetTracker - JLR Demo Application</p>
                </footer>
            </body>
        </html>
    );
}


import './globals.css';

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
                        <a href="/" className="nav-brand">
                            🚗 FleetTracker
                        </a>
                        <div className="nav-links">
                            <a href="/dashboard">Dashboard</a>
                            <a href="/vehicles">Vehicles</a>
                            <a href="/maintenance">Maintenance</a>
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

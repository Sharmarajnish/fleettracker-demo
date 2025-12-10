/**
 * Dashboard Page
 * 
 * VULNERABILITY: CWE-79 - Cross-Site Scripting (XSS)
 * Vehicle notes are rendered using dangerouslySetInnerHTML without sanitization
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
    const [vehicles, setVehicles] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        maintenance: 0,
        totalMileage: 0
    });

    useEffect(() => {
        const fetchVehicles = async () => {
            try {
                const response = await fetch('http://localhost:3001/api/vehicles');
                const data = await response.json();
                setVehicles(data);
                setStats({
                    total: data.length,
                    active: data.filter(v => v.status === 'active').length,
                    maintenance: data.filter(v => v.status === 'maintenance').length,
                    totalMileage: data.reduce((sum, v) => sum + (v.mileage || 0), 0)
                });
            } catch (error) {
                console.error('Failed to fetch vehicles:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchVehicles();
    }, []);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) {
            fetchVehicles();
            return;
        }

        try {
            // This endpoint is vulnerable to SQL injection
            const response = await fetch(
                `http://localhost:3001/api/vehicles/search?query=${encodeURIComponent(searchQuery)}`
            );
            const data = await response.json();
            setVehicles(data);
        } catch (error) {
            console.error('Search failed:', error);
        }
    };

    const getStatusBadge = (status) => {
        const classes = {
            active: 'badge badge-active',
            maintenance: 'badge badge-maintenance',
            inactive: 'badge badge-inactive'
        };
        return classes[status] || 'badge';
    };

    if (loading) {
        return <div className="card">Loading fleet data...</div>;
    }

    return (
        <div>
            <h1 className="page-title">Fleet Dashboard</h1>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-value">{stats.total}</div>
                    <div className="stat-label">Total Vehicles</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{stats.active}</div>
                    <div className="stat-label">Active</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{stats.maintenance}</div>
                    <div className="stat-label">In Maintenance</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{stats.totalMileage.toLocaleString()}</div>
                    <div className="stat-label">Total Miles</div>
                </div>
            </div>

            {/* Search Box - Uses vulnerable SQL injection endpoint */}
            <form onSubmit={handleSearch} className="search-box">
                <input
                    type="text"
                    className="search-input"
                    placeholder="Search by model or VIN... (try: ' OR '1'='1)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit" className="btn btn-primary">Search</button>
            </form>

            {/* Vehicle List */}
            <div className="card">
                <h2 className="card-title">Fleet Vehicles</h2>
                <table className="table">
                    <thead>
                        <tr>
                            <th>VIN</th>
                            <th>Model</th>
                            <th>Year</th>
                            <th>Mileage</th>
                            <th>Status</th>
                            <th>Notes</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {vehicles.map((vehicle) => (
                            <tr key={vehicle.id}>
                                <td>{vehicle.vin}</td>
                                <td>{vehicle.model}</td>
                                <td>{vehicle.year}</td>
                                <td>{vehicle.mileage?.toLocaleString() || 0}</td>
                                <td>
                                    <span className={getStatusBadge(vehicle.status)}>
                                        {vehicle.status}
                                    </span>
                                </td>
                                <td>
                                    {/* VULNERABILITY: CWE-79 - XSS via dangerouslySetInnerHTML */}
                                    {/* Vehicle notes are rendered without sanitization */}
                                    {/* Attacker can store: <script>alert('XSS')</script> */}
                                    <div
                                        className="vehicle-notes"
                                        dangerouslySetInnerHTML={{ __html: vehicle.notes }}
                                    />
                                </td>
                                <td>
                                    <Link href={`/dashboard/${vehicle.id}`} className="btn btn-primary" style={{ marginRight: '0.5rem' }}>
                                        View
                                    </Link>
                                    <button className="btn btn-danger">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

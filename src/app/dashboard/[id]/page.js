/**
 * Vehicle Detail Page (Dynamic Route)
 * 
 * VULNERABILITY: CVE-2025-55182 - React2Shell
 * This page demonstrates a vulnerability pattern in React Server Components
 * where user-controlled data is unsafely serialized/deserialized.
 * 
 * Note: This is a simulated vulnerability for demonstration purposes.
 * The actual React2Shell vulnerability involves specific RSC serialization issues.
 */

import VehicleDetails from '@/components/VehicleDetails';
import Link from 'next/link';

// Simulated vulnerable server-side data fetching
async function getVehicleData(id) {
    // In a real scenario, this data could come from an untrusted source
    const response = await fetch(`http://localhost:3001/api/vehicles/${id}`, {
        cache: 'no-store'
    });

    if (!response.ok) {
        return null;
    }

    return response.json();
}

/**
 * VULNERABILITY: CVE-2025-55182 - React2Shell Pattern
 * 
 * This Server Component demonstrates the dangerous pattern where:
 * 1. User-controlled params are used to fetch data
 * 2. The fetched data (potentially malicious) is passed to client components
 * 3. React's serialization could be exploited to execute arbitrary code
 * 
 * In the actual CVE, the vulnerability involves:
 * - unstable_serialize from 'react-server-dom-webpack/server'
 * - Special crafted payloads that exploit React's streaming protocol
 * - Remote code execution when the payload is deserialized on the client
 */
export default async function VehiclePage({ params }) {
    const { id } = params;

    // VULNERABLE: User-controlled ID directly used in data fetching
    // An attacker could craft a malicious ID that, when combined with
    // React's serialization, leads to code execution
    const vehicleData = await getVehicleData(id);

    if (!vehicleData) {
        return (
            <div className="card">
                <h1 className="page-title">Vehicle Not Found</h1>
                <p>The requested vehicle could not be found.</p>
                <Link href="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
            </div>
        );
    }

    // VULNERABLE: Passing unsanitized data to client component
    // In React2Shell, the serialization of this data could be exploited
    return (
        <div>
            <div style={{ marginBottom: '1rem' }}>
                <Link href="/dashboard" style={{ color: 'var(--highlight-color)' }}>
                    ← Back to Dashboard
                </Link>
            </div>

            <h1 className="page-title">{vehicleData.model}</h1>

            {/* 
        VULNERABLE PATTERN: Direct data passing from server to client
        The VehicleDetails component receives potentially malicious data
        that was serialized by React's RSC protocol
      */}
            <VehicleDetails vehicle={vehicleData} />
        </div>
    );
}

// Force dynamic rendering to always fetch fresh data
export const dynamic = 'force-dynamic';

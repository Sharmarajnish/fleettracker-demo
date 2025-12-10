/**
 * API Tests
 * 
 * Test suite for FleetTracker API endpoints
 */

const request = require('supertest');
const app = require('../src/server');

// Mock database for testing
jest.mock('../src/lib/db', () => ({
    query: jest.fn(),
    getClient: jest.fn(),
    pool: {
        on: jest.fn()
    }
}));

const db = require('../src/lib/db');

describe('FleetTracker API', () => {
    // Test token for authenticated requests
    const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AamxyLmNvbSIsInJvbGUiOiJhZG1pbiJ9.test';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Health Check', () => {
        test('GET /api/health returns ok status', async () => {
            const response = await request(app).get('/api/health');

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('ok');
            expect(response.body).toHaveProperty('timestamp');
        });
    });

    describe('Vehicle Endpoints', () => {
        const mockVehicles = [
            {
                id: 1,
                vin: 'SALWA2BK9LA123456',
                model: 'Range Rover Sport',
                year: 2024,
                owner_id: 1,
                notes: 'Executive vehicle',
                status: 'active',
                mileage: 12500
            },
            {
                id: 2,
                vin: 'SADCA2BN5LA789012',
                model: 'Jaguar F-PACE',
                year: 2023,
                owner_id: 2,
                notes: 'Fleet vehicle',
                status: 'active',
                mileage: 28700
            }
        ];

        test('GET /api/vehicles returns list of vehicles', async () => {
            db.query.mockResolvedValueOnce({ rows: mockVehicles });

            const response = await request(app).get('/api/vehicles');

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(2);
        });

        test('GET /api/vehicles/:id returns single vehicle', async () => {
            db.query.mockResolvedValueOnce({ rows: [mockVehicles[0]] });

            const response = await request(app).get('/api/vehicles/1');

            expect(response.status).toBe(200);
            expect(response.body.vin).toBe('SALWA2BK9LA123456');
        });

        test('GET /api/vehicles/:id returns 404 for non-existent vehicle', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });

            const response = await request(app).get('/api/vehicles/999');

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Vehicle not found');
        });

        test('POST /api/vehicles requires authentication', async () => {
            const response = await request(app)
                .post('/api/vehicles')
                .send({
                    vin: 'TEST123456789',
                    model: 'Test Vehicle',
                    year: 2024
                });

            expect(response.status).toBe(401);
        });

        test('GET /api/vehicles/search requires query parameter', async () => {
            const response = await request(app).get('/api/vehicles/search');

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Search query required');
        });

        test('GET /api/vehicles/search returns filtered results', async () => {
            db.query.mockResolvedValueOnce({ rows: [mockVehicles[0]] });

            const response = await request(app)
                .get('/api/vehicles/search')
                .query({ query: 'Range' });

            expect(response.status).toBe(200);
            expect(response.body.length).toBe(1);
        });
    });

    describe('Authentication Endpoints', () => {
        test('POST /api/auth/login requires email and password', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Email and password required');
        });

        test('POST /api/auth/register requires email and password', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({ email: 'test@test.com' });

            expect(response.status).toBe(400);
        });

        test('POST /api/auth/logout returns success', async () => {
            const response = await request(app).post('/api/auth/logout');

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Logged out successfully');
        });
    });

    describe('Export Endpoints', () => {
        test('POST /api/export requires authentication', async () => {
            const response = await request(app)
                .post('/api/export')
                .send({ format: 'pdf', filename: 'report' });

            expect(response.status).toBe(401);
        });

        test('POST /api/export requires format and filename', async () => {
            // Would need proper token validation mock
        });
    });

    describe('File Endpoints', () => {
        test('GET /api/files/:filename returns 404 for non-existent file', async () => {
            const response = await request(app).get('/api/files/nonexistent.txt');

            expect(response.status).toBe(404);
        });
    });

    describe('Session Endpoints', () => {
        test('POST /api/session requires session data', async () => {
            const response = await request(app)
                .post('/api/session')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Session data required');
        });
    });
});

describe('Error Handling', () => {
    test('Unknown routes return 404', async () => {
        const response = await request(app).get('/api/unknown');

        expect(response.status).toBe(404);
        expect(response.body.error).toBe('Not found');
    });
});

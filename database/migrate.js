const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function migrate() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fleettracker'
    });

    try {
        await client.connect();
        console.log('Connected to database');

        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        await client.query(schema);
        console.log('Migration completed successfully');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

migrate();

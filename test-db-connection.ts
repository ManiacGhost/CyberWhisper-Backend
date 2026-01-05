import { Client } from 'pg';

const testConnection = async () => {
  const client = new Client({
    user: 'postgres',
    password: 'root',
    host: 'localhost',
    port: 5432,
    database: 'lmsMainDb',
    ssl: false,
  });

  try {
    console.log('Attempting to connect to PostgreSQL...');
    console.log(`Host: localhost:5432`);
    console.log(`Database: lmsMainDb`);
    console.log(`User: postgres`);
    
    await client.connect();
    console.log('✓ Connection successful!');
    
    const result = await client.query('SELECT version()');
    console.log('✓ PostgreSQL version:', result.rows[0].version);
    
    // Check if course table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'course'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✓ "course" table exists');
      
      const courseCount = await client.query('SELECT COUNT(*) FROM course');
      console.log(`✓ Total courses in database: ${courseCount.rows[0].count}`);
    } else {
      console.log('❌ "course" table NOT found in database');
    }
    
    await client.end();
  } catch (error: any) {
    console.error('❌ Connection failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure PostgreSQL is running');
    console.error('2. Verify the password is "root"');
    console.error('3. Check that database "lmsMainDb" exists');
    console.error('4. Use: psql -U postgres -h localhost to test manually');
  }
};

testConnection();

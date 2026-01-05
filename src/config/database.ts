import { Pool, QueryResult } from 'pg';

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'cyberwhisper',
  statement_timeout: 30000,
});

pool.on('error', (err) => {
  console.error('❌ Database pool error:', err.message);
});

pool.on('connect', () => {
  console.log('✓ New database connection established');
});

// Test connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('   Host:', process.env.DB_HOST);
    console.error('   User:', process.env.DB_USER);
    console.error('   Database:', process.env.DB_NAME);
  } else {
    console.log('✓ Database connected successfully');
    console.log('✓ Server time:', res.rows[0].now);
  }
});

export const query = (text: string, params?: any[]): Promise<QueryResult> => {
  return pool.query(text, params);
};

export const getClient = async () => {
  return pool.connect();
};

export default pool;

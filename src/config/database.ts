import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'cyberwhisper',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test connection on startup
pool.getConnection()
  .then((conn) => {
    console.log('✓ Database connected successfully');
    conn.release();
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err.message);
    console.error('   Host:', process.env.DB_HOST);
    console.error('   User:', process.env.DB_USER);
    console.error('   Port:', process.env.DB_PORT);
    console.error('   Database:', process.env.DB_NAME);
  });

/**
 * Convert PostgreSQL-style placeholders ($1, $2, etc.) to MySQL-style (?)
 */
function convertPostgresToMysql(sql: string): string {
  // Replace $1, $2, etc. with ?
  // Also handle common PostgreSQL functions like ILIKE -> LIKE (case-insensitive)
  let converted = sql.replace(/\$\d+/g, '?');
  
  // Convert PostgreSQL ILIKE to MySQL LIKE with binary collation
  // MySQL LIKE is case-insensitive by default, so we can use LIKE
  converted = converted.replace(/ILIKE/g, 'LIKE');
  
  // Convert PostgreSQL RETURNING clause (not supported in MySQL)
  // This is a simple approach - just remove RETURNING and handle in code
  converted = converted.replace(/\s+RETURNING\s+\*/gi, '');
  
  return converted;
}

export const query = async (text: string, params?: any[]): Promise<any> => {
  const connection = await pool.getConnection();
  try {
    const convertedSql = convertPostgresToMysql(text);
    const [results] = await connection.execute(convertedSql, params || []);
    // Return in a format compatible with existing repositories that expect .rows
    return { rows: results };
  } finally {
    connection.release();
  }
};

export const getConnection = async () => {
  return pool.getConnection();
};

export default pool;

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
 * Convert PostgreSQL-style SQL to MySQL-compatible SQL
 */
function convertPostgresToMysql(sql: string): { sql: string; hasReturning: boolean } {
  // Check if this is a RETURNING query
  const hasReturning = /RETURNING\s+\*/i.test(sql);
  
  // Replace $1, $2, etc. with ?
  let converted = sql.replace(/\$\d+/g, '?');
  
  // Remove only the 'public.' schema prefix (more specific than before)
  // This handles patterns like: FROM public.table, INTO public.table, UPDATE public.table
  converted = converted.replace(/\bpublic\./gi, '');
  
  // Convert PostgreSQL ILIKE to MySQL LIKE (MySQL LIKE is case-insensitive by default)
  converted = converted.replace(/ILIKE/g, 'LIKE');
  
  // Convert PostgreSQL double quotes to MySQL backticks for identifiers
  // This handles column names like "language" and "level"
  converted = converted.replace(/"([^"]+)"/g, '`$1`');
  
  // Convert PostgreSQL LOWER() function - MySQL already defaults to case-insensitive
  // But we keep LOWER() for explicit collation if needed
  
  // Convert PostgreSQL NULLS LAST/FIRST (not supported in MySQL)
  converted = converted.replace(/\s+NULLS\s+LAST\s*/gi, ' ');
  converted = converted.replace(/\s+NULLS\s+FIRST\s*/gi, ' ');
  
  // Convert PostgreSQL RETURNING clause to MySQL compatibility
  // Remove RETURNING clause and we'll handle it differently
  converted = converted.replace(/\s+RETURNING\s+\*\s*/gi, ' ');
  
  return { sql: converted, hasReturning };
}

export const query = async (text: string, params?: any[]): Promise<any> => {
  const connection = await pool.getConnection();
  try {
    const { sql: convertedSql, hasReturning } = convertPostgresToMysql(text);
    const originalSql = text.trim(); // Keep original case for table name extraction
    
    // Debug logging
    console.log('📝 SQL Query:', convertedSql);
    console.log('📌 Params:', params);
    
    // For INSERT with RETURNING, we need special handling
    if (hasReturning && originalSql.toUpperCase().startsWith('INSERT')) {
      await connection.execute(convertedSql, params || []);
      
      // Get the last insert ID and fetch the row
      const getLastIdResult = await connection.execute('SELECT LAST_INSERT_ID() as id');
      const insertedId = (getLastIdResult[0] as any)[0].id;
      
      if (!insertedId) {
        throw new Error('Failed to retrieve inserted ID from database');
      }
      
      // Find the table name from the original INSERT statement (preserving case)
      const tableMatch = originalSql.match(/INSERT INTO\s+(\w+)/i);
      if (tableMatch) {
        const tableName = tableMatch[1];
        const selectResult = await connection.execute(
          `SELECT * FROM \`${tableName}\` WHERE id = ?`,
          [insertedId]
        );
        const rows = selectResult[0] as any[];
        if (!rows || rows.length === 0) {
          throw new Error(`Failed to retrieve inserted row from table \`${tableName}\` with id ${insertedId}`);
        }
        return { rows };
      } else {
        throw new Error('Could not extract table name from INSERT statement');
      }
    }
    
    // For UPDATE with RETURNING
    if (hasReturning && originalSql.toUpperCase().startsWith('UPDATE')) {
      await connection.execute(convertedSql, params || []);
      
      // Extract table name
      const tableMatch = originalSql.match(/UPDATE\s+(\w+)/i);
      
      if (tableMatch) {
        const tableName = tableMatch[1];
        
        // For UPDATE...WHERE id = $X queries, the ID is the last parameter
        // This is the standard pattern used in repositories
        if (params && params.length > 0) {
          const idValue = params[params.length - 1];
          
          const selectResult = await connection.execute(
            `SELECT * FROM \`${tableName}\` WHERE id = ?`,
            [idValue]
          );
          const rows = selectResult[0] as any[];
          return { rows };
        }
      }
    }
    
    // For regular SELECT queries
    const [results] = await connection.execute(convertedSql, params || []);
    
    if (originalSql.toUpperCase().startsWith('SELECT')) {
      console.log('✓ SELECT Result rows:', results);
      return { rows: results as any[] };
    }
    
    // For INSERT/UPDATE/DELETE without RETURNING
    const affectedRows = (results as any).affectedRows || 0;
    return {
      rows: results as any[],
      rowCount: affectedRows,
      affectedRows: affectedRows,
    };
  } catch (error: any) {
    console.error('❌ Database Query Error:', {
      message: error.message,
      sql: text,
      params: params,
      code: error.code,
      errno: error.errno,
    });
    throw error;
  } finally {
    connection.release();
  }
};

export const getConnection = async () => {
  return pool.getConnection();
};

export default pool;

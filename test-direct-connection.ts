import { Client } from 'pg';

const client = new Client({
  user: 'postgres',
  password: 'root',
  host: 'localhost',
  port: 5432,
  database: 'lmsMainDb',
});

console.log('Attempting direct connection with these details:');
console.log('Host: localhost');
console.log('Port: 5432');
console.log('User: postgres');
console.log('Password: root');
console.log('Database: lmsMainDb');
console.log('---');

client.connect((err) => {
  if (err) {
    console.error('❌ Connection failed:', err.message);
    console.error('\nFull error:', err);
  } else {
    console.log('✓ Connected successfully!');
    
    client.query('SELECT COUNT(*) as course_count FROM course', (err, res) => {
      if (err) {
        console.error('❌ Query failed:', err.message);
      } else {
        console.log('✓ Courses in database:', res.rows[0].course_count);
      }
      client.end();
    });
  }
});

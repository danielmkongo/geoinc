import db from '../db/connection.js';

async function initializeDatabase() {
  try {
    console.log('📋 Initializing database...');
    
    // Test connection
    const result = await db.query('SELECT 1 as status');
    console.log('✅ Database connected');
    
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

export { initializeDatabase };

const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./prisma/dev.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    return;
  }
  console.log('✅ Connected to SQLite database');
});

// Check tables
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
  if (err) {
    console.error('Error getting tables:', err.message);
    return;
  }
  
  console.log(`\n📊 Found ${rows.length} tables:`);
  rows.forEach(row => console.log(`- ${row.name}`));
  
  // Check some key tables for data
  const keyTables = ['User', 'Lead', 'Campaign', 'Industry', 'ServiceProvider'];
  
  keyTables.forEach(table => {
    db.get(`SELECT COUNT(*) as count FROM ${table}`, (err, row) => {
      if (err) {
        console.log(`❌ ${table}: Error - ${err.message}`);
      } else {
        console.log(`📈 ${table}: ${row.count} records`);
      }
    });
  });
  
  // Close database
  setTimeout(() => {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('\n✅ Database connection closed');
      }
    });
  }, 1000);
});

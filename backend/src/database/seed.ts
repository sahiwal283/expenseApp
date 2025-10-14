import { pool } from '../config/database';
import bcrypt from 'bcrypt';

async function seedDatabase() {
  try {
    console.log('Seeding database...');

    // Check if users already exist
    const existingUsers = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(existingUsers.rows[0].count) > 0) {
      console.log('Database already seeded. Skipping...');
      process.exit(0);
    }

    // Use sandbox123 for development/sandbox, password123 for production
    const isSandbox = process.env.NODE_ENV === 'development' || process.env.DB_NAME?.includes('sandbox');
    const defaultPassword = isSandbox ? 'sandbox123' : 'password123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    
    console.log(`Using default password: ${defaultPassword} (Environment: ${process.env.NODE_ENV || 'not set'})`);

    // Create demo users
    const users = [
      { username: 'admin', password: hashedPassword, name: 'Admin User', email: 'admin@company.com', role: 'admin' },
      { username: 'sarah', password: hashedPassword, name: 'Sarah Johnson', email: 'sarah@company.com', role: 'coordinator' },
      { username: 'mike', password: hashedPassword, name: 'Mike Chen', email: 'mike@company.com', role: 'salesperson' },
      { username: 'lisa', password: hashedPassword, name: 'Lisa Williams', email: 'lisa@company.com', role: 'accountant' }
    ];

    for (const user of users) {
      await pool.query(
        'INSERT INTO users (username, password, name, email, role) VALUES ($1, $2, $3, $4, $5)',
        [user.username, user.password, user.name, user.email, user.role]
      );
    }

    // Create a demo event
    const coordinatorResult = await pool.query(
      "SELECT id FROM users WHERE username = 'sarah'"
    );
    const coordinatorId = coordinatorResult.rows[0].id;

    await pool.query(
      `INSERT INTO events (name, venue, city, state, start_date, end_date, budget, coordinator_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      ['CES 2025', 'Las Vegas Convention Center', 'Las Vegas', 'Nevada', '2025-01-07', '2025-01-10', 50000, coordinatorId]
    );

    // Create default settings
    await pool.query(
      `INSERT INTO app_settings (key, value) VALUES 
       ('cardOptions', $1),
       ('entityOptions', $2)`,
      [
        JSON.stringify([
          { name: 'Haute Intl USD Debit', lastFour: '0000' },
          { name: 'Haute Inc GBP Amex', lastFour: '0000' },
          { name: 'Haute Inc USD Amex', lastFour: '0000' },
          { name: 'Haute Inc USD Debit', lastFour: '0000' },
          { name: 'Haute LLC GBP Amex', lastFour: '0000' },
          { name: 'Haute LLC USD Amex', lastFour: '0000' },
          { name: 'Haute LLC USD Debit', lastFour: '0000' }
        ]),
        JSON.stringify(['Entity A - Main Operations', 'Entity B - Sales Division', 'Entity C - Marketing Department', 'Entity D - International Operations'])
      ]
    );

    console.log('Database seeded successfully!');
    console.log('Demo users created:');
    console.log(`  - admin / ${defaultPassword} (Admin)`);
    console.log(`  - sarah / ${defaultPassword} (Coordinator)`);
    console.log(`  - mike / ${defaultPassword} (Salesperson)`);
    console.log(`  - lisa / ${defaultPassword} (Accountant)`);
    
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seedDatabase();

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const app = require('./app');
const db = require('./database/db');
const { seed } = require('./database/seed');
const { shouldSeedDemoData } = require('./database/config');
const { startScheduler } = require('./services/scheduler');

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  try {
    console.log('Initializing database connection...');
    await db.initDatabase();

    // Demo data is never added unless explicitly opted in via SEED_DEMO_DATA=true.
    const userCountRes = await db.query('SELECT COUNT(*) as count FROM users');
    if (shouldSeedDemoData(process.env.SEED_DEMO_DATA, userCountRes.rows[0].count)) {
      console.log('Database empty. Running seed script...');
      await seed();
    } else {
      console.log(`Database ready. Existing users: ${userCountRes.rows[0].count}`);
    }

    startScheduler();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Sweety API server listening on http://0.0.0.0:${PORT}`);
      console.log(`Health check available at http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap();

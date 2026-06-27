import http from 'http';
import mongoose from 'mongoose';
import { app } from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { ensureSeedAdmin } from './store.js';
import { initSocket } from './socket.js';

connectDatabase()
  .then(async () => {
    // Force-sync all Mongoose indexes to Cosmos DB (MongoDB API).
    // Cosmos DB requires explicit indexes for sort operations; without this,
    // queries with .sort() will return 400 BadRequest.
    try {
      await mongoose.connection.syncIndexes();
      console.log('All database indexes synced successfully.');
    } catch (indexErr) {
      console.error('WARNING: Failed to sync indexes:', indexErr.message);
    }

    await ensureSeedAdmin();
    const server = http.createServer(app);
    initSocket(server);
    const port = process.env.PORT || 5000;
    server.listen(port, '0.0.0.0', () => {
      console.log(`GoUnion Express API listening on http://0.0.0.0:${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to connect to MongoDB:', error.message);
    process.exit(1);
  });

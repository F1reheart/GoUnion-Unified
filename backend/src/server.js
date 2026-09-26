import http from 'http';
import mongoose from 'mongoose';
import { app } from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { ensureSeedAdmin } from './store.js';
import { initSocket } from './socket.js';

connectDatabase()
  .then(async () => {
    
    
    
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

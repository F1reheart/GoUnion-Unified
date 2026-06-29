import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { adminRouter } from './routes/admin.js';
import { authRouter } from './routes/auth.js';
import { commentsRouter } from './routes/comments.js';
import { conversationsRouter } from './routes/conversations.js';
import { friendsRouter } from './routes/friends.js';
import { groupsRouter } from './routes/groups.js';
import { mediaRouter } from './routes/media.js';
import { mobileRouter } from './routes/mobile.js';
import { notificationsRouter } from './routes/notifications.js';
import { postsRouter } from './routes/posts.js';
import { profilesRouter } from './routes/profiles.js';
import { reportsRouter } from './routes/reports.js';
import { searchRouter } from './routes/search.js';
import { storiesRouter } from './routes/stories.js';
import { usersRouter } from './routes/users.js';
import { messagesRouter } from './routes/messages.js';

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      const normalized = origin.replace(/\/$/, '');
      if (env.frontendOrigins.includes(normalized) || /^(https?|capacitor|ionic):\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?$/.test(normalized)) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

app.get('/', (_req, res) => {
  res.json({ message: 'GoUnion Express API is running.', health: '/health' });
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    environment: {
      cloudinary_configured: Boolean(process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME),
      mongodb_connected: mongoose.connection.readyState === 1,
    },
  });
});

const apiRouter = express.Router();
apiRouter.use(authRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/profiles', profilesRouter);
apiRouter.use('/posts', postsRouter);
apiRouter.use('/comments', commentsRouter);
apiRouter.use('/groups', groupsRouter);
apiRouter.use('/search', searchRouter);
apiRouter.use('/conversations', conversationsRouter);
apiRouter.use(friendsRouter);
apiRouter.use('/notifications', notificationsRouter);
apiRouter.use('/reports', reportsRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/stories', storiesRouter);
apiRouter.use('/media', mediaRouter);
apiRouter.use('/mobile', mobileRouter);
apiRouter.use('/messages', messagesRouter);

app.use('/api', apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

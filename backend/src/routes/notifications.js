import { Router } from 'express';
import { Notification, PushSubscription } from '../models.js';
import { serializeNotification } from '../store.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const notificationsRouter = Router();

notificationsRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const notifications = await Notification.find({ user_id: req.user.id }).sort({ created_at: -1 }).limit(100);
    res.json(await Promise.all(notifications.map((item) => serializeNotification(item, req.user.id))));
  }),
);

notificationsRouter.get(
  '/unread-count',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ count: await Notification.countDocuments({ user_id: req.user.id, is_read: false }) });
  }),
);

notificationsRouter.post(
  '/read-all',
  requireAuth,
  asyncHandler(async (req, res) => {
    await Notification.updateMany({ user_id: req.user.id }, { is_read: true });
    res.json({ status: 'read' });
  }),
);

notificationsRouter.post(
  '/:id/read',
  requireAuth,
  asyncHandler(async (req, res) => {
    await Notification.updateOne({ id: req.params.id, user_id: req.user.id }, { is_read: true });
    res.json({ status: 'read' });
  }),
);

notificationsRouter.post(
  '/subscribe',
  requireAuth,
  asyncHandler(async (req, res) => {
    const subscription = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Subscription endpoint is required.' });
    }
    await PushSubscription.updateOne(
      { endpoint: subscription.endpoint },
      {
        user_id: req.user.id,
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys?.p256dh || '',
          auth: subscription.keys?.auth || '',
        },
      },
      { upsert: true }
    );
    res.status(201).json({ status: 'subscribed' });
  }),
);

import bcrypt from 'bcryptjs';
import { getIo } from './socket.js';
import {
  Comment,
  Conversation,
  Follow,
  GroupMember,
  Message,
  Notification,
  Post,
  StoryLike,
  StoryView,
  User,
  PushSubscription,
} from './models.js';
import webpush from 'web-push';
import { env } from './config/env.js';

export const toPlain = (doc) => {
  if (!doc) return null;
  const value = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  delete value._id;
  return value;
};

export const makeTimestamp = () => new Date().toISOString();

export const ensureSeedAdmin = async () => {
  const seedAdminUsername = process.env.SEED_ADMIN_USERNAME || 'admin';
  const seedAdminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@gounion.test';
  const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD || 'password123';
  const existing = await User.findOne({ email: seedAdminEmail });
  if (existing) return existing;

  const user = await User.create({
    username: seedAdminUsername,
    email: seedAdminEmail,
    password_hash: await bcrypt.hash(seedAdminPassword, 10),
    is_active: true,
    role: 'admin',
    profile: {
      full_name: 'GoUnion Admin',
      bio: 'Campus community admin',
      university: 'GoUnion University',
    },
  });
  user.profile.user_id = user.id;
  await user.save();
  return user;
};

export const publicUser = async (userOrId, viewerId = null) => {
  const user = typeof userOrId === 'string' ? await User.findOne({ id: userOrId }) : userOrId;
  if (!user) return null;
  const plain = toPlain(user);
  const [followers, following, posts, isFollowing] = await Promise.all([
    Follow.countDocuments({ following_id: plain.id }),
    Follow.countDocuments({ follower_id: plain.id }),
    Post.find({ user_id: plain.id }).select('likes').lean(),
    viewerId ? Follow.exists({ follower_id: viewerId, following_id: plain.id }) : null,
  ]);

  return {
    id: plain.id,
    username: plain.username,
    email: plain.email,
    is_active: plain.is_active,
    is_online: plain.is_online,
    last_seen: plain.last_seen,
    email_verified: plain.email_verified,
    role: plain.role,
    profile: plain.profile,
    followers_count: followers,
    following_count: following,
    total_likes: posts.reduce((sum, post) => sum + (post.likes?.length || 0), 0),
    is_following: Boolean(isFollowing),
  };
};

export const serializeComment = async (commentOrDoc, viewerId = null) => {
  const comment = toPlain(commentOrDoc);
  if (!comment) return null;
  return {
    ...comment,
    user: await publicUser(comment.user_id, viewerId),
    likes_count: comment.likes?.length || 0,
    is_liked: viewerId ? (comment.likes || []).includes(viewerId) : false,
  };
};

export const serializePost = async (postOrDoc, viewerId = null) => {
  const post = toPlain(postOrDoc);
  if (!post) return null;
  const commentsCount = await Comment.countDocuments({ post_id: post.id });
  return {
    ...post,
    user: await publicUser(post.user_id, viewerId),
    comments: [],
    likes: (post.likes || []).map((userId) => ({ id: userId })),
    likes_count: post.likes?.length || 0,
    comments_count: commentsCount,
  };
};

if (env.vapidPublicKey && env.vapidPrivateKey) {
  try {
    webpush.setVapidDetails(
      'mailto:support@gounion.app',
      env.vapidPublicKey,
      env.vapidPrivateKey
    );
  } catch (err) {
    console.error('Failed to set VAPID details:', err.message);
  }
}

export const addNotification = async ({ user_id, sender_id, type, post_id = null, comment_id = null, group_id = null, message = null }) => {
  if (!user_id || !sender_id || user_id === sender_id) return null;
  const doc = await Notification.create({ user_id, sender_id, type, post_id, comment_id, group_id, message });

  try {
    const io = getIo();
    if (io) {
      const payload = await serializeNotification(doc);
      io.to(`user:${user_id}`).emit('notification', { type: 'new_notification', notification: payload });
    }
  } catch (e) {
    // ignore socket failures
  }

  // Send Web Push Notification
  try {
    const subscriptions = await PushSubscription.find({ user_id });
    if (subscriptions.length > 0) {
      let bodyText = message;
      if (!bodyText) {
        const actor = await User.findOne({ id: sender_id });
        const actorName = actor ? (actor.profile?.full_name || actor.username) : 'Someone';
        switch (type) {
          case 'like': bodyText = `${actorName} liked your post.`; break;
          case 'comment': bodyText = `${actorName} commented on your post.`; break;
          case 'like_comment': bodyText = `${actorName} liked your comment.`; break;
          case 'follow': bodyText = `${actorName} started following you.`; break;
          case 'group_invite': bodyText = `${actorName} invited you to a group.`; break;
          case 'group_request': bodyText = `${actorName} requested to join your group.`; break;
          case 'new_message': bodyText = `${actorName} sent you a new message.`; break;
          default: bodyText = `${actorName} interacted with you.`; break;
        }
      }
      const payload = JSON.stringify({
        title: 'GoUnion Network',
        body: bodyText,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        url: type === 'new_message' ? '/messages' : (post_id ? `/post/${post_id}` : '/notifications'),
      });
      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.keys.p256dh,
                auth: sub.keys.auth,
              },
            },
            payload
          );
        } catch (pushErr) {
          if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
            await PushSubscription.deleteOne({ endpoint: sub.endpoint });
          }
        }
      }
    }
  } catch (pushErr) {
    // ignore push failures
  }

  return doc;
};

export const serializeNotification = async (notificationOrDoc, viewerId = null) => {
  const notification = toPlain(notificationOrDoc);
  return {
    ...notification,
    actor: await publicUser(notification.sender_id, viewerId),
    sender: await publicUser(notification.sender_id, viewerId),
  };
};

export const serializeGroup = async (groupOrDoc, viewerId = null) => {
  const group = toPlain(groupOrDoc);
  return {
    ...group,
    creatorId: String(group.creator_id),
    privacy: group.privacy,
    adminsOnlyChat: group.admins_only_chat || false,
    member_count: await GroupMember.countDocuments({ group_id: group.id }),
    is_joined: viewerId ? Boolean(await GroupMember.exists({ group_id: group.id, user_id: viewerId })) : false,
  };
};

export const serializeMessage = async (messageOrDoc) => {
  const message = toPlain(messageOrDoc);
  return {
    ...message,
    sender: message.sender_id ? await publicUser(message.sender_id) : null,
  };
};

export const serializeConversation = async (conversationOrDoc, viewerId = null) => {
  const conversation = toPlain(conversationOrDoc);
  const messages = await Message.find({ conversation_id: conversation.id }).sort({ created_at: 1 });
  
  let unreadCount = 0;
  if (viewerId) {
    unreadCount = await Message.countDocuments({
      conversation_id: conversation.id,
      sender_id: { $ne: viewerId },
      is_read: false,
    });
  }

  return {
    ...conversation,
    participants: await Promise.all((conversation.participant_ids || []).map((id) => publicUser(id, viewerId))),
    messages: await Promise.all(messages.map(serializeMessage)),
    unread_count: unreadCount,
  };
};

export const serializeStory = async (storyOrDoc, viewerId = null) => {
  const story = toPlain(storyOrDoc);
  const [views, likes] = await Promise.all([
    StoryView.find({ story_id: story.id }).lean(),
    StoryLike.find({ story_id: story.id }).lean(),
  ]);
  return {
    ...story,
    user: await publicUser(story.user_id, viewerId),
    views: views.map(toPlain),
    likes: likes.map(toPlain),
  };
};

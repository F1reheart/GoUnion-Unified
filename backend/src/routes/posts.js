import { Router } from 'express';
import { Comment, Post, Group, GroupMember } from '../models.js';
import { addNotification, serializeComment, serializePost } from '../store.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError, forbidden, notFound } from '../utils/httpError.js';
import { notifyMentions } from '../utils/mentions.js';
import { getIo } from '../socket.js';

export const postsRouter = Router();

postsRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const posts = await Post.find({ is_taken_down: { $ne: true } }).sort({ created_at: -1 }).skip(Number(req.query.skip || 0)).limit(Number(req.query.limit || 50));
    res.json(await Promise.all(posts.map((post) => serializePost(post, req.user.id))));
  }),
);

postsRouter.get(
  '/feed',
  requireAuth,
  asyncHandler(async (req, res) => {
    const query = req.query.reels === 'true' ? { video: { $nin: [null, ''] }, is_taken_down: { $ne: true } } : { is_taken_down: { $ne: true } };
    const posts = await Post.find(query).sort({ created_at: -1 }).skip(Number(req.query.skip || 0)).limit(Number(req.query.limit || 10));
    res.json(await Promise.all(posts.map((post) => serializePost(post, req.user.id))));
  }),
);

postsRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { caption = '', image = null, video = null, group_id = null } = req.body;
    if (!caption && !image && !video) throw new HttpError(400, 'caption, image or video is required.');
    
    if (group_id) {
      const group = await Group.findOne({ id: group_id });
      if (group && group.admins_only_chat) {
        const membership = await GroupMember.findOne({ group_id: group.id, user_id: req.user.id });
        const isManager = ['admin', 'moderator'].includes(req.user.role) || (membership && ['admin', 'moderator'].includes(membership.role));
        if (!isManager) {
          throw forbidden('Only admins can send messages in this group.');
        }
      }
    }

    const post = await Post.create({ user_id: req.user.id, group_id: group_id ? String(group_id) : null, caption, image, video, likes: [] });
    await notifyMentions({ text: caption, senderId: req.user.id, postId: post.id });
    const serializedPost = await serializePost(post, req.user.id);
    
    if (group_id) {
      try {
        const io = getIo();
        if (io) {
          io.to(`group:${group_id}`).emit('new_group_message', {
            groupId: group_id,
            message: serializedPost
          });
        }
      } catch (e) {
        // ignore
      }
    }
    
    res.status(201).json(serializedPost);
  }),
);

postsRouter.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const post = await Post.findOne({ id: req.params.id });
    if (!post) throw notFound('Post not found.');
    res.json(await serializePost(post, req.user.id));
  }),
);

postsRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const post = await Post.findOne({ id: req.params.id });
    if (!post) throw notFound('Post not found.');
    if (post.user_id !== req.user.id && !['admin', 'moderator'].includes(req.user.role)) throw forbidden('You cannot delete this post.');
    await Post.deleteOne({ id: post.id });
    await Comment.deleteMany({ post_id: post.id });
    res.json({ status: 'deleted' });
  }),
);

postsRouter.post(
  '/:id/like',
  requireAuth,
  asyncHandler(async (req, res) => {
    const post = await Post.findOne({ id: req.params.id });
    if (!post) throw notFound('Post not found.');
    if (post.likes.includes(req.user.id)) post.likes = post.likes.filter((id) => id !== req.user.id);
    else {
      post.likes.push(req.user.id);
      await addNotification({ user_id: post.user_id, sender_id: req.user.id, type: 'like', post_id: post.id });
    }
    await post.save();
    res.json({ status: 'ok', likes_count: post.likes.length });
  }),
);

postsRouter.get(
  '/:id/comments',
  requireAuth,
  asyncHandler(async (req, res) => {
    const comments = await Comment.find({ post_id: req.params.id }).sort({ created_at: 1 });
    res.json(await Promise.all(comments.map((comment) => serializeComment(comment, req.user.id))));
  }),
);

postsRouter.post(
  '/:id/comments/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const post = await Post.findOne({ id: req.params.id });
    if (!post) throw notFound('Post not found.');
    if (!req.body.content) throw new HttpError(400, 'content is required.');
    const comment = await Comment.create({ user_id: req.user.id, post_id: post.id, content: req.body.content, likes: [] });
    await notifyMentions({ text: req.body.content, senderId: req.user.id, postId: post.id, commentId: comment.id });
    await addNotification({ user_id: post.user_id, sender_id: req.user.id, type: 'comment', post_id: post.id, comment_id: comment.id });
    res.status(201).json(await serializeComment(comment, req.user.id));
  }),
);

postsRouter.post(
  '/:id/view',
  requireAuth,
  asyncHandler(async (req, res) => {
    // Frontend hits this to track views, returning 200 OK
    res.json({ status: 'ok' });
  }),
);

import { Router } from 'express';
import { Message, Conversation } from '../models.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { forbidden, notFound } from '../utils/httpError.js';
import { getIo } from '../socket.js';
import { serializeMessage } from '../store.js';

export const messagesRouter = Router();

messagesRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const message = await Message.findOne({ id: req.params.id });
    if (!message) throw notFound('Message not found.');
    if (message.sender_id !== req.user.id && req.user.role !== 'admin') {
      throw forbidden('You cannot delete this message.');
    }
    
    message.is_deleted = true;
    message.content = '';
    message.image_url = null;
    message.video_url = null;
    message.audio_url = null;
    message.sticker_url = null;
    message.sticker_id = null;
    await message.save();

    // Notify other participants via Socket
    try {
      const io = getIo();
      if (io) {
        const conversation = await Conversation.findOne({ id: message.conversation_id });
        if (conversation) {
          (conversation.participant_ids || []).forEach((pid) => {
            if (String(pid) !== String(req.user.id)) {
              io.to(`user:${pid}`).emit('message_deleted', {
                messageId: message.id,
                conversationId: message.conversation_id,
              });
            }
          });
        }
      }
    } catch (e) {
      // ignore
    }

    res.json({ status: 'ok', message: await serializeMessage(message) });
  })
);

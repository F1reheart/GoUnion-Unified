import { User } from '../models.js';
import { addNotification } from '../store.js';

/**
 * Extracts all unique @usernames from a string.
 */
export const extractMentions = (text) => {
  if (!text) return [];
  const matches = text.match(/@([a-zA-Z0-9_.-]+)/g);
  if (!matches) return [];
  // Remove the @ symbol and get unique usernames
  const usernames = [...new Set(matches.map(m => m.substring(1)))];
  return usernames;
};

/**
 * Finds users by username and creates a notification for each.
 */
export const notifyMentions = async ({ text, senderId, postId, commentId = null }) => {
  const usernames = extractMentions(text);
  if (usernames.length === 0) return;

  const users = await User.find({ username: { $in: usernames } });
  
  for (const user of users) {
    if (String(user.id) === String(senderId)) continue; // Don't notify self
    
    await addNotification({
      user_id: user.id,
      sender_id: senderId,
      type: 'mention',
      post_id: postId,
      comment_id: commentId
    });
  }
};

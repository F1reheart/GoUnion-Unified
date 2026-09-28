import { User } from '../models.js';

/**
 * Returns an array of user IDs that share the same university as the given user.
 * Used to enforce content isolation per campus.
 * Results are cached for 60 seconds in-memory to avoid repeated DB hits.
 */
const cache = new Map();
const CACHE_TTL = 60_000; // 60 seconds

export const getSameUniversityUserIds = async (user) => {
  const university = user?.profile?.university;
  if (!university || university === 'University Student') {
    // Fallback: if user has no university set, return only their own id
    return [user.id];
  }

  const cacheKey = university.toLowerCase().trim();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.ids;
  }

  const users = await User.find(
    { 'profile.university': { $regex: new RegExp(`^${cacheKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
    { id: 1 }
  ).lean();
  const ids = users.map((u) => u.id);

  cache.set(cacheKey, { ids, ts: Date.now() });
  return ids;
};

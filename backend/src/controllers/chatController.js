/**
 * OpsMind AI — Chat Controller
 *
 * Handles two save formats:
 *   A) Full messages array: { title, messages[], _id? }  ← frontend streaming flow
 *   B) Legacy pair format:  { chatId?, userMessage, assistantMessage, sources? }
 */
const Chat = require('../models/Chat');
const { success, created, notFound, badRequest } = require('../utils/apiResponse');
const logger = require('../utils/logger');

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Detect which save format the request body uses.
 * Returns 'full' (messages array) or 'pair' (legacy).
 */
const detectFormat = (body) => {
  if (Array.isArray(body.messages)) return 'full';
  if (body.userMessage !== undefined) return 'pair';
  return null;
};

// ─── POST /api/chats/save ────────────────────────────────────────────────────

const saveChat = async (req, res, next) => {
  try {
    const format = detectFormat(req.body);

    if (format === 'full') {
      return await _saveFull(req, res);
    } else if (format === 'pair') {
      return await _savePair(req, res);
    } else {
      logger.warn(`[Chat] Invalid save format from user ${req.user?._id}. Body keys: ${Object.keys(req.body).join(', ')}`);
      return badRequest(res, 'Invalid chat save format. Provide either "messages" array or "userMessage"/"assistantMessage".');
    }
  } catch (err) {
    next(err);
  }
};

/**
 * Format A — Full messages array.
 * Creates a new chat or fully replaces messages on an existing one.
 */
const _saveFull = async (req, res) => {
  const { _id, title, messages } = req.body;

  if (_id) {
    // Update existing chat — replace full messages array
    const updateFields = { messages, updatedAt: new Date() };
    if (title) updateFields.title = title; // Only update title if provided

    const chat = await Chat.findOneAndUpdate(
      { _id, userId: req.user._id },
      updateFields,
      { new: true, upsert: false }
    );
    if (!chat) {
      // Chat not found by _id — create a new one
      const newChat = await Chat.create({
        userId: req.user._id,
        title: title || (messages[0]?.content?.slice(0, 60) + '...') || 'New Chat',
        messages,
      });
      logger.info(`[Chat] Created new chat (upsert fallback) for user ${req.user._id}`);
      return success(res, {
        _id: newChat._id,
        chatId: newChat._id,
        title: newChat.title,
        messageCount: newChat.messages.length,
        createdAt: newChat.createdAt,
        updatedAt: newChat.updatedAt,
      });
    }
    return success(res, {
      _id: chat._id,
      chatId: chat._id,
      title: chat.title,
      messageCount: chat.messages.length,
      updatedAt: chat.updatedAt,
    });
  } else {
    // Create new chat — derive title from first user message if not given
    const derivedTitle = title ||
      (messages.find(m => m.role === 'user')?.content?.slice(0, 60) + '...') ||
      'New Chat';

    const chat = await Chat.create({
      userId: req.user._id,
      title: derivedTitle,
      messages,
    });
    logger.info(`[Chat] Created chat "${chat.title}" for user ${req.user._id}`);
    return success(res, {
      _id: chat._id,
      chatId: chat._id,
      title: chat.title,
      messageCount: chat.messages.length,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    });
  }
};

/**
 * Format B — Legacy pair format.
 * Appends a user+assistant message pair to an existing or new chat.
 */
const _savePair = async (req, res) => {
  const { chatId, userMessage, assistantMessage, sources = [] } = req.body;
  let chat;

  if (chatId) {
    chat = await Chat.findOne({ _id: chatId, userId: req.user._id });
    if (!chat) return notFound(res, 'Chat session not found');
    chat.messages.push(
      { role: 'user', content: userMessage },
      { role: 'assistant', content: assistantMessage, sources }
    );
    await chat.save();
  } else {
    const title = userMessage.length > 60 ? userMessage.slice(0, 57) + '...' : userMessage;
    chat = await Chat.create({
      userId: req.user._id,
      title,
      messages: [
        { role: 'user', content: userMessage },
        { role: 'assistant', content: assistantMessage, sources },
      ],
    });
  }

  return success(res, {
    _id: chat._id,
    chatId: chat._id,
    title: chat.title,
    messageCount: chat.messages.length,
  });
};

// ─── GET /api/chats ──────────────────────────────────────────────────────────

const listChats = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [rawChats, total] = await Promise.all([
      Chat.find({ userId: req.user._id, isActive: true })
        .select('title messages createdAt updatedAt')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Chat.countDocuments({ userId: req.user._id, isActive: true }),
    ]);

    // Return chats WITH messages (frontend needs them for chat continuation)
    // but strip heavy source data from list view for performance
    const chats = rawChats.map((c) => ({
      ...c,
      messageCount: c.messages.length,
      lastMessage: c.messages[c.messages.length - 1]?.content?.slice(0, 120) || '',
    }));

    return success(res, chats, 'Chats retrieved', 200);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/chats/:id ──────────────────────────────────────────────────────

const getChat = async (req, res, next) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isActive: true,
    }).lean();

    if (!chat) return notFound(res, 'Chat not found');
    return success(res, chat);
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/chats/:id ───────────────────────────────────────────────────

const deleteChat = async (req, res, next) => {
  try {
    const chat = await Chat.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isActive: false },
      { new: true }
    );
    if (!chat) return notFound(res, 'Chat not found');
    return success(res, {}, 'Chat deleted');
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/chats ───────────────────────────────────────────────────────

const clearAllChats = async (req, res, next) => {
  try {
    const result = await Chat.updateMany(
      { userId: req.user._id },
      { isActive: false }
    );
    return success(res, { cleared: result.modifiedCount }, 'All chats cleared');
  } catch (err) {
    next(err);
  }
};

module.exports = { saveChat, listChats, getChat, deleteChat, clearAllChats };

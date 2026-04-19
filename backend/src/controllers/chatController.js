const Chat = require('../models/Chat');
const { success, created, notFound, badRequest } = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * POST /api/chats/save
 * Save or update a chat session with a new message pair
 */
const saveChat = async (req, res, next) => {
  try {
    const { chatId, userMessage, assistantMessage, sources = [] } = req.body;

    let chat;

    if (chatId) {
      // Append to existing chat
      chat = await Chat.findOne({ _id: chatId, userId: req.user._id });
      if (!chat) return notFound(res, 'Chat session not found');

      chat.messages.push(
        { role: 'user', content: userMessage },
        { role: 'assistant', content: assistantMessage, sources }
      );

      await chat.save();
    } else {
      // Create new chat — derive title from first user message
      const title = userMessage.length > 60
        ? userMessage.slice(0, 57) + '...'
        : userMessage;

      chat = await Chat.create({
        userId: req.user._id,
        title,
        messages: [
          { role: 'user', content: userMessage },
          { role: 'assistant', content: assistantMessage, sources },
        ],
      });
    }

    return success(res, { chatId: chat._id, title: chat.title, messageCount: chat.messages.length });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/chats
 * List all chat sessions for the authenticated user
 */
const listChats = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [chats, total] = await Promise.all([
      Chat.find({ userId: req.user._id, isActive: true })
        .select('title messages createdAt updatedAt')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean()
        .then((docs) =>
          docs.map((c) => ({
            ...c,
            messageCount: c.messages.length,
            lastMessage: c.messages[c.messages.length - 1]?.content?.slice(0, 100),
            messages: undefined, // Don't send full messages in list
          }))
        ),
      Chat.countDocuments({ userId: req.user._id, isActive: true }),
    ]);

    return success(res, {
      chats,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/chats/:id
 * Get a single chat with full message history
 */
const getChat = async (req, res, next) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isActive: true,
    });

    if (!chat) return notFound(res, 'Chat not found');

    return success(res, { chat });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/chats/:id
 * Soft-delete a chat session
 */
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

/**
 * DELETE /api/chats (clear all)
 */
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

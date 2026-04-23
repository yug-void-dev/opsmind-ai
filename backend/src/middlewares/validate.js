const Joi = require('joi');
const { badRequest } = require('../utils/apiResponse');

/**
 * Middleware factory: validates req.body against a Joi schema
 */
const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = error.details.map((d) => d.message.replace(/"/g, "'"));
    return badRequest(res, 'Validation failed', errors);
  }

  req.body = value;
  next();
};

// ─── Schemas ─────────────────────────────────────────────────────────────────

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(72).required(),
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({ 'any.only': 'Passwords do not match', 'any.required': 'Please confirm your password' }),
  role: Joi.string().valid('user', 'admin').default('user'),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const querySchema = Joi.object({
  query: Joi.string().min(1).max(2000).required(),
  chatId: Joi.string().optional(),
  documentId: Joi.string().optional(),
  tags: Joi.array().items(Joi.string()).max(10).optional(),
  stream: Joi.boolean().default(false),
  rewriteQuery: Joi.boolean().default(true),
});

const uploadMetaSchema = Joi.object({
  tags: Joi.alternatives()
    .try(Joi.array().items(Joi.string()), Joi.string())
    .optional(),
  name: Joi.string().max(200).optional(),
});

// ─── Chat Save Schema ─────────────────────────────────────────────────────────
// Supports two formats:
//   1. Legacy pair format: { chatId?, userMessage, assistantMessage, sources? }
//   2. Full messages format: { title, messages[], _id? }  ← used by frontend
const saveChatSchema = Joi.alternatives().try(
  // Format A: full messages array (frontend sends this)
  Joi.object({
    _id: Joi.string().optional(),
    title: Joi.string().max(200).optional().allow('', null),
    messages: Joi.array()
      .items(
        Joi.object({
          role: Joi.string().valid('user', 'assistant').required(),
          content: Joi.string().min(1).required(),
          answered: Joi.boolean().optional(),
          sources: Joi.array()
            .items(
              Joi.object({
                // New field names
                documentId: Joi.string().optional().allow('', null),
                filename: Joi.string().optional().allow('', null),
                page: Joi.number().optional().allow(null),
                score: Joi.number().optional().allow(null),
                snippet: Joi.string().optional().allow('', null),
                // Legacy field names (backwards compat)
                documentName: Joi.string().optional().allow('', null),
                pageNumber: Joi.number().optional().allow(null),
                relevanceScore: Joi.number().optional().allow(null),
                confidence: Joi.string().valid('HIGH', 'MEDIUM', 'LOW').optional(),
                rerankReason: Joi.string().allow(null, '').optional(),
              }).unknown(true)
            )
            .optional(),
          timestamp: Joi.alternatives().try(Joi.date(), Joi.string()).optional(),
        }).unknown(true)
      )
      .min(1)
      .required(),
  }),
  // Format B: legacy pair format
  Joi.object({
    chatId: Joi.string().optional(),
    userMessage: Joi.string().min(1).max(2000).required(),
    assistantMessage: Joi.string().min(1).required(),
    sources: Joi.array()
      .items(
        Joi.object({
          documentId: Joi.string().optional(),
          documentName: Joi.string().optional(),
          filename: Joi.string().optional(),
          pageNumber: Joi.number().optional(),
          page: Joi.number().optional(),
          relevanceScore: Joi.number().optional(),
          score: Joi.number().optional(),
        }).unknown(true)
      )
      .optional(),
  })
);

const updateTagsSchema = Joi.object({
  tags: Joi.array().items(Joi.string().trim().max(50)).max(20).required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

const verifyOTPSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).required(),
});

const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).required(),
  newPassword: Joi.string().min(8).max(72).required(),
});

module.exports = {
  validate,
  schemas: {
    register: registerSchema,
    login: loginSchema,
    query: querySchema,
    uploadMeta: uploadMetaSchema,
    saveChat: saveChatSchema,
    updateTags: updateTagsSchema,
    forgotPassword: forgotPasswordSchema,
    verifyOTP: verifyOTPSchema,
    resetPassword: resetPasswordSchema,
  },
};

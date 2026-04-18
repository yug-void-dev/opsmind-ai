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

// ─── Schemas ────────────────────────────────────────────────────────────────

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(72).required(),
  role: Joi.string().valid('user', 'admin').default('user'),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const querySchema = Joi.object({
  query: Joi.string().min(3).max(2000).required(),
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

const saveChatSchema = Joi.object({
  chatId: Joi.string().optional(),
  userMessage: Joi.string().min(1).max(2000).required(),
  assistantMessage: Joi.string().min(1).required(),
  sources: Joi.array()
    .items(
      Joi.object({
        documentId: Joi.string(),
        documentName: Joi.string(),
        pageNumber: Joi.number(),
        relevanceScore: Joi.number(),
      })
    )
    .optional(),
});

module.exports = {
  validate,
  schemas: {
    register: registerSchema,
    login: loginSchema,
    query: querySchema,
    uploadMeta: uploadMetaSchema,
    saveChat: saveChatSchema,
  },
};

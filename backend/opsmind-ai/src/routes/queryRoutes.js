const express = require('express');
const router = express.Router();
const { query, streamQuery } = require('../controllers/queryController');
const { authenticate, optionalAuth } = require('../middlewares/auth');
const { validate, schemas } = require('../middlewares/validate');

// Query requires auth
router.post('/', authenticate, validate(schemas.query), query);
router.post('/stream', authenticate, validate(schemas.query), streamQuery);

module.exports = router;

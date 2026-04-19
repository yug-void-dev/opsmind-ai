const express = require('express');
const router = express.Router();
const {
  saveChat,
  listChats,
  getChat,
  deleteChat,
  clearAllChats,
} = require('../controllers/chatController');
const { authenticate } = require('../middlewares/auth');
const { validate, schemas } = require('../middlewares/validate');

router.use(authenticate);

router.post('/save', validate(schemas.saveChat), saveChat);
router.get('/', listChats);
router.get('/:id', getChat);
router.delete('/', clearAllChats);
router.delete('/:id', deleteChat);

module.exports = router;

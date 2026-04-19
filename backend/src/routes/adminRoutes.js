const express = require('express');
const router = express.Router();
const {
  getAnalytics,
  getStats,
  reindexAll,
  listUsers,
  toggleUser,
  clearCache,
  getFailedQueries,
  listAllDocuments,
} = require('../controllers/adminController');
const { authenticate, authorize } = require('../middlewares/auth');

router.use(authenticate, authorize('admin'));

router.get('/stats', getStats);
router.get('/analytics', getAnalytics);
router.get('/users', listUsers);
router.patch('/users/:id/toggle', toggleUser);
router.post('/reindex', reindexAll);
router.delete('/cache', clearCache);
router.get('/failed-queries', getFailedQueries);
router.get('/documents', listAllDocuments);

module.exports = router;

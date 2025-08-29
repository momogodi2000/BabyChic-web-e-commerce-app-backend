const express = require('express');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const ContactController = require('../controllers/contactController');
const SettingsController = require('../controllers/settingsController');

const router = express.Router();

// Apply auth middleware to all admin routes
router.use(authMiddleware);
router.use(adminMiddleware);

// Contact & Newsletter Routes
router.get('/contacts', ContactController.getAllContacts);
router.get('/contacts/:id', ContactController.getContactById);
router.patch('/contacts/:id/status', ContactController.updateContactStatus);
router.delete('/contacts/:id', ContactController.deleteContact);
router.post('/contacts/bulk-action', ContactController.bulkAction);

router.get('/newsletter/subscribers', ContactController.getNewsletterSubscribers);
router.post('/newsletter/campaigns', ContactController.createCampaign);
router.get('/newsletter/campaigns', ContactController.getCampaigns);
router.patch('/newsletter/subscribers/:id/status', ContactController.updateSubscriberStatus);

// Settings Routes
router.get('/settings', SettingsController.getAllSettings);
router.post('/settings', SettingsController.updateSettings);
router.get('/settings/:category', SettingsController.getSettingsByCategory);

module.exports = router;
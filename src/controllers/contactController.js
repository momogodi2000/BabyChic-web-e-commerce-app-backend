const { ContactMessage, Newsletter, EmailCampaign, User } = require('../models/associations');
const { Op } = require('sequelize');

class ContactController {
  // Get all contact messages
  static async getAllContacts(req, res) {
    try {
      const { status, search, page = 1, limit = 20 } = req.query;
      
      let whereClause = {};
      
      if (status && status !== 'all') {
        whereClause.status = status;
      }
      
      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
          { subject: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const offset = (page - 1) * limit;
      
      const contacts = await ContactMessage.findAndCountAll({
        where: whereClause,
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        data: contacts.rows,
        pagination: {
          total: contacts.count,
          page: parseInt(page),
          pages: Math.ceil(contacts.count / limit),
          limit: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Error fetching contacts:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching contacts'
      });
    }
  }

  // Get single contact message
  static async getContactById(req, res) {
    try {
      const { id } = req.params;
      
      const contact = await ContactMessage.findByPk(id);
      
      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Contact message not found'
        });
      }

      // Mark as read when viewed
      if (contact.status === 'unread') {
        await contact.update({ status: 'read' });
      }

      res.json({
        success: true,
        data: contact
      });
    } catch (error) {
      console.error('Error fetching contact:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching contact message'
      });
    }
  }

  // Update contact message status
  static async updateContactStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const contact = await ContactMessage.findByPk(id);
      
      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Contact message not found'
        });
      }

      await contact.update({ status });

      res.json({
        success: true,
        message: 'Contact status updated successfully',
        data: contact
      });
    } catch (error) {
      console.error('Error updating contact status:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating contact status'
      });
    }
  }

  // Delete contact message
  static async deleteContact(req, res) {
    try {
      const { id } = req.params;
      
      const contact = await ContactMessage.findByPk(id);
      
      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Contact message not found'
        });
      }

      await contact.destroy();

      res.json({
        success: true,
        message: 'Contact message deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting contact:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting contact message'
      });
    }
  }

  // Bulk actions on contacts
  static async bulkAction(req, res) {
    try {
      const { action, contactIds } = req.body;
      
      if (!action || !contactIds || !Array.isArray(contactIds)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid bulk action parameters'
        });
      }

      let result;
      
      switch (action) {
        case 'delete':
          result = await ContactMessage.destroy({
            where: { id: { [Op.in]: contactIds } }
          });
          break;
        case 'mark_read':
          result = await ContactMessage.update(
            { status: 'read' },
            { where: { id: { [Op.in]: contactIds } } }
          );
          break;
        case 'mark_unread':
          result = await ContactMessage.update(
            { status: 'unread' },
            { where: { id: { [Op.in]: contactIds } } }
          );
          break;
        case 'archive':
          result = await ContactMessage.update(
            { status: 'archived' },
            { where: { id: { [Op.in]: contactIds } } }
          );
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid bulk action'
          });
      }

      res.json({
        success: true,
        message: `Bulk ${action} completed successfully`,
        affected: result
      });
    } catch (error) {
      console.error('Error performing bulk action:', error);
      res.status(500).json({
        success: false,
        message: 'Error performing bulk action'
      });
    }
  }

  // Get newsletter subscribers
  static async getNewsletterSubscribers(req, res) {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      
      let whereClause = {};
      
      if (status && status !== 'all') {
        whereClause.status = status;
      }

      const offset = (page - 1) * limit;
      
      const subscribers = await Newsletter.findAndCountAll({
        where: whereClause,
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        data: subscribers.rows,
        pagination: {
          total: subscribers.count,
          page: parseInt(page),
          pages: Math.ceil(subscribers.count / limit),
          limit: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Error fetching newsletter subscribers:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching newsletter subscribers'
      });
    }
  }

  // Update subscriber status
  static async updateSubscriberStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const subscriber = await Newsletter.findByPk(id);
      
      if (!subscriber) {
        return res.status(404).json({
          success: false,
          message: 'Subscriber not found'
        });
      }

      await subscriber.update({ status });

      res.json({
        success: true,
        message: 'Subscriber status updated successfully',
        data: subscriber
      });
    } catch (error) {
      console.error('Error updating subscriber status:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating subscriber status'
      });
    }
  }

  // Create email campaign
  static async createCampaign(req, res) {
    try {
      const { name, subject, content, recipients } = req.body;
      
      const campaign = await EmailCampaign.create({
        name,
        subject,
        content,
        recipients: recipients || 'all',
        status: 'draft',
        created_by: req.user.id
      });

      res.status(201).json({
        success: true,
        message: 'Campaign created successfully',
        data: campaign
      });
    } catch (error) {
      console.error('Error creating campaign:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating campaign'
      });
    }
  }

  // Get all campaigns
  static async getCampaigns(req, res) {
    try {
      const campaigns = await EmailCampaign.findAll({
        order: [['created_at', 'DESC']],
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'first_name', 'last_name', 'email']
          }
        ]
      });

      res.json({
        success: true,
        data: campaigns
      });
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching campaigns'
      });
    }
  }
}

module.exports = ContactController;
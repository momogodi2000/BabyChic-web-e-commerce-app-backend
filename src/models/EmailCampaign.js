const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

const EmailCampaign = sequelize.define('EmailCampaign', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: {
        args: [3, 200],
        msg: 'Le nom de la campagne doit contenir entre 3 et 200 caractères'
      }
    }
  },
  
  subject: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: {
        args: [5, 200],
        msg: 'Le sujet doit contenir entre 5 et 200 caractères'
      }
    }
  },
  
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'HTML content of the email'
  },
  
  plain_text_content: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Plain text version of the email'
  },
  
  type: {
    type: DataTypes.ENUM('newsletter', 'promotion', 'announcement', 'product_update', 'welcome', 'custom'),
    defaultValue: 'newsletter',
    allowNull: false
  },
  
  status: {
    type: DataTypes.ENUM('draft', 'scheduled', 'sending', 'sent', 'cancelled', 'failed'),
    defaultValue: 'draft',
    allowNull: false
  },
  
  target_audience: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {
      segments: ['all_active'],
      filters: {}
    },
    comment: 'Targeting criteria for the campaign'
  },
  
  template_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Email template used for this campaign'
  },
  
  created_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  scheduled_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  sent_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Campaign statistics
  total_recipients: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  
  emails_sent: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  
  emails_delivered: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  
  emails_opened: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  
  emails_clicked: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  
  emails_bounced: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  
  emails_unsubscribed: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  
  // Additional settings
  settings: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {
      track_opens: true,
      track_clicks: true,
      auto_text: true,
      inline_css: true
    }
  },
  
  tags: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Tags for organizing campaigns'
  },
  
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Internal notes about the campaign'
  }
}, {
  tableName: 'email_campaigns',
  indexes: [
    {
      fields: ['status']
    },
    {
      fields: ['type']
    },
    {
      fields: ['created_by']
    },
    {
      fields: ['scheduled_at']
    },
    {
      fields: ['sent_at']
    },
    {
      fields: ['created_at']
    }
  ]
})

// Instance methods
EmailCampaign.prototype.schedule = async function(scheduledAt) {
  this.status = 'scheduled'
  this.scheduled_at = scheduledAt
  return await this.save()
}

EmailCampaign.prototype.send = async function() {
  this.status = 'sending'
  this.sent_at = new Date()
  return await this.save()
}

EmailCampaign.prototype.markAsSent = async function() {
  this.status = 'sent'
  return await this.save()
}

EmailCampaign.prototype.cancel = async function() {
  if (this.status === 'scheduled' || this.status === 'draft') {
    this.status = 'cancelled'
    return await this.save()
  }
  throw new Error('Cannot cancel campaign in current status')
}

EmailCampaign.prototype.updateStats = async function(stats) {
  Object.assign(this, stats)
  return await this.save()
}

EmailCampaign.prototype.getOpenRate = function() {
  return this.emails_sent > 0 ? (this.emails_opened / this.emails_sent) * 100 : 0
}

EmailCampaign.prototype.getClickRate = function() {
  return this.emails_sent > 0 ? (this.emails_clicked / this.emails_sent) * 100 : 0
}

EmailCampaign.prototype.getBounceRate = function() {
  return this.emails_sent > 0 ? (this.emails_bounced / this.emails_sent) * 100 : 0
}

EmailCampaign.prototype.getUnsubscribeRate = function() {
  return this.emails_sent > 0 ? (this.emails_unsubscribed / this.emails_sent) * 100 : 0
}

// Class methods
EmailCampaign.getScheduled = async function() {
  return await this.findAll({
    where: {
      status: 'scheduled',
      scheduled_at: {
        [sequelize.Sequelize.Op.lte]: new Date()
      }
    },
    order: [['scheduled_at', 'ASC']]
  })
}

EmailCampaign.getCampaignStats = async function(timeframe = '30d') {
  const timeframeDate = new Date()
  timeframeDate.setDate(timeframeDate.getDate() - 30)
  
  const campaigns = await this.findAll({
    where: {
      sent_at: {
        [sequelize.Sequelize.Op.gte]: timeframeDate
      }
    }
  })
  
  const stats = campaigns.reduce((acc, campaign) => {
    acc.total_sent += campaign.emails_sent
    acc.total_delivered += campaign.emails_delivered
    acc.total_opened += campaign.emails_opened
    acc.total_clicked += campaign.emails_clicked
    acc.total_bounced += campaign.emails_bounced
    acc.total_unsubscribed += campaign.emails_unsubscribed
    return acc
  }, {
    total_sent: 0,
    total_delivered: 0,
    total_opened: 0,
    total_clicked: 0,
    total_bounced: 0,
    total_unsubscribed: 0
  })
  
  stats.open_rate = stats.total_sent > 0 ? (stats.total_opened / stats.total_sent) * 100 : 0
  stats.click_rate = stats.total_sent > 0 ? (stats.total_clicked / stats.total_sent) * 100 : 0
  stats.bounce_rate = stats.total_sent > 0 ? (stats.total_bounced / stats.total_sent) * 100 : 0
  
  return stats
}

module.exports = EmailCampaign

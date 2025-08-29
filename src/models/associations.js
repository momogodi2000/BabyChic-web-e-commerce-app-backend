// Import all models
const User = require('./User')
const Category = require('./Category')
const Product = require('./Product')
const Order = require('./Order')
const OrderItem = require('./OrderItem')
const Payment = require('./Payment')
const ContactMessage = require('./ContactMessage')
const Newsletter = require('./Newsletter')
const EmailCampaign = require('./EmailCampaign')
const Setting = require('./Setting')

// Category associations
Category.hasMany(Category, {
  as: 'children',
  foreignKey: 'parent_id'
})

Category.belongsTo(Category, {
  as: 'parent',
  foreignKey: 'parent_id'
})

Category.hasMany(Product, {
  foreignKey: 'category_id',
  as: 'products'
})

// Product associations
Product.belongsTo(Category, {
  foreignKey: 'category_id',
  as: 'category'
})

Product.hasMany(OrderItem, {
  foreignKey: 'product_id',
  as: 'orderItems'
})

// Order associations
Order.hasMany(OrderItem, {
  foreignKey: 'order_id',
  as: 'items'
})

Order.hasMany(Payment, {
  foreignKey: 'order_id',
  as: 'payments'
})

// OrderItem associations
OrderItem.belongsTo(Order, {
  foreignKey: 'order_id',
  as: 'order'
})

OrderItem.belongsTo(Product, {
  foreignKey: 'product_id',
  as: 'product'
})

// Payment associations
Payment.belongsTo(Order, {
  foreignKey: 'order_id',
  as: 'order'
})

// ContactMessage associations
ContactMessage.belongsTo(User, {
  foreignKey: 'replied_by',
  as: 'repliedByUser'
})

User.hasMany(ContactMessage, {
  foreignKey: 'replied_by',
  as: 'repliedMessages'
})

// EmailCampaign associations
EmailCampaign.belongsTo(User, {
  foreignKey: 'created_by',
  as: 'creator'
})

User.hasMany(EmailCampaign, {
  foreignKey: 'created_by',
  as: 'emailCampaigns'
})

// Export all models for easy importing
module.exports = {
  User,
  Category,
  Product,
  Order,
  OrderItem,
  Payment,
  ContactMessage,
  Newsletter,
  EmailCampaign,
  Setting
}

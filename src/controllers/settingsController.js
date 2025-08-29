const { Setting } = require('../models/associations');

class SettingsController {
  // Get all settings
  static async getAllSettings(req, res) {
    try {
      const settings = await Setting.findAll({
        order: [['category', 'ASC'], ['key', 'ASC']]
      });

      // Group settings by category
      const groupedSettings = settings.reduce((acc, setting) => {
        if (!acc[setting.category]) {
          acc[setting.category] = {};
        }
        acc[setting.category][setting.key] = {
          value: setting.value,
          description: setting.description,
          type: setting.type
        };
        return acc;
      }, {});

      res.json({
        success: true,
        data: groupedSettings
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching settings'
      });
    }
  }

  // Get settings by category
  static async getSettingsByCategory(req, res) {
    try {
      const { category } = req.params;
      
      const settings = await Setting.findAll({
        where: { category },
        order: [['key', 'ASC']]
      });

      const categorySettings = settings.reduce((acc, setting) => {
        acc[setting.key] = {
          value: setting.value,
          description: setting.description,
          type: setting.type
        };
        return acc;
      }, {});

      res.json({
        success: true,
        data: categorySettings
      });
    } catch (error) {
      console.error('Error fetching category settings:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching category settings'
      });
    }
  }

  // Update settings
  static async updateSettings(req, res) {
    try {
      const { settings } = req.body;
      
      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Invalid settings format'
        });
      }

      const updatePromises = [];

      // Process each category
      for (const [category, categorySettings] of Object.entries(settings)) {
        for (const [key, value] of Object.entries(categorySettings)) {
          updatePromises.push(
            Setting.upsert({
              category,
              key,
              value: typeof value === 'object' ? JSON.stringify(value) : value,
              updated_by: req.user.id
            })
          );
        }
      }

      await Promise.all(updatePromises);

      res.json({
        success: true,
        message: 'Settings updated successfully'
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating settings'
      });
    }
  }
}

module.exports = SettingsController;
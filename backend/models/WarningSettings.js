const mongoose = require('mongoose');

const warningSettingsSchema = new mongoose.Schema({
  autoSendEnabled: {
    type: Boolean,
    default: true
  },
  severityLevels: {
    minor: {
      type: Boolean,
      default: true
    },
    moderate: {
      type: Boolean,
      default: true
    },
    severe: {
      type: Boolean,
      default: true
    }
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Only one settings document should exist
warningSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({
      autoSendEnabled: true,
      severityLevels: {
        minor: true,
        moderate: true,
        severe: true
      }
    });
  }
  return settings;
};

module.exports = mongoose.model('WarningSettings', warningSettingsSchema);


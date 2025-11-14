const express = require('express');
const Video = require('../models/Video');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// ========== CAPTION TRANSLATIONS ==========

// Translate video captions
router.post('/:id/captions/translate', async (req, res) => {
  try {
    const { targetLanguage } = req.body;
    const video = await Video.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }
    
    if (!video.captions || !video.captions.text) {
      return res.status(400).json({ message: 'Video has no captions' });
    }
    
    // Check if translation already exists
    if (video.captions.translatedText && video.captions.translatedText.get(targetLanguage)) {
      return res.json({
        language: targetLanguage,
        text: video.captions.translatedText.get(targetLanguage)
      });
    }
    
    // In a real app, you would use a translation service like Google Translate API
    // For now, we'll just return a mock translation
    const mockTranslation = `[Translated to ${targetLanguage}] ${video.captions.text}`;
    
    // Store translation
    if (!video.captions.translatedText) {
      video.captions.translatedText = new Map();
    }
    video.captions.translatedText.set(targetLanguage, mockTranslation);
    await video.save();
    
    res.json({
      language: targetLanguage,
      text: mockTranslation
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get available translations
router.get('/:id/captions/translations', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    
    if (!video || !video.captions || !video.captions.translatedText) {
      return res.json({ translations: [] });
    }
    
    const translations = Array.from(video.captions.translatedText.entries()).map(([lang, text]) => ({
      language: lang,
      text
    }));
    
    res.json({ translations });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Generate auto-captions (mock - in production, use speech-to-text API)
router.post('/:id/captions/generate', authMiddleware, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    
    if (!video || video.user.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Video not found or unauthorized' });
    }
    
    // Mock auto-captions generation
    // In production, you would:
    // 1. Extract audio from video
    // 2. Use speech-to-text service (Google Cloud Speech-to-Text, AWS Transcribe, etc.)
    // 3. Store the generated captions
    
    const mockCaptions = 'Auto-generated captions would appear here. This is a placeholder for speech-to-text functionality.';
    
    if (!video.captions) {
      video.captions = {};
    }
    
    video.captions.text = mockCaptions;
    video.captions.language = 'en';
    video.autoCaptions = true;
    
    await video.save();
    
    res.json({
      success: true,
      captions: {
        text: mockCaptions,
        language: 'en'
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ========== VIDEO TEMPLATES ==========

// Pre-defined video templates
const videoTemplates = [
  {
    id: 'template-1',
    name: 'Trending Dance',
    description: 'Perfect for dance videos with music sync',
    thumbnail: '/templates/trending-dance.jpg',
    settings: {
      effects: ['pulse', 'glow'],
      filter: 'vibrant',
      transitions: [{ type: 'fade', duration: 0.3 }]
    }
  },
  {
    id: 'template-2',
    name: 'Product Showcase',
    description: 'Ideal for product reviews and unboxings',
    thumbnail: '/templates/product-showcase.jpg',
    settings: {
      effects: ['zoom'],
      filter: 'bright',
      transitions: [{ type: 'zoom', duration: 0.5 }]
    }
  },
  {
    id: 'template-3',
    name: 'Travel Vlog',
    description: 'Perfect for travel and adventure content',
    thumbnail: '/templates/travel-vlog.jpg',
    settings: {
      effects: ['pan', 'ken-burns'],
      filter: 'saturated',
      transitions: [{ type: 'slide', duration: 0.4 }]
    }
  },
  {
    id: 'template-4',
    name: 'Comedy Sketch',
    description: 'Great for comedy and skits',
    thumbnail: '/templates/comedy-sketch.jpg',
    settings: {
      effects: ['shake', 'zoom'],
      filter: 'classic',
      transitions: [{ type: 'cut', duration: 0.2 }]
    }
  },
  {
    id: 'template-5',
    name: 'Tutorial',
    description: 'Perfect for how-to and educational content',
    thumbnail: '/templates/tutorial.jpg',
    settings: {
      effects: ['highlight'],
      filter: 'neutral',
      transitions: [{ type: 'fade', duration: 0.3 }]
    }
  }
];

// Get all templates
router.get('/templates', async (req, res) => {
  res.json({ templates: videoTemplates });
});

// Get template by ID
router.get('/templates/:id', async (req, res) => {
  const template = videoTemplates.find(t => t.id === req.params.id);
  
  if (!template) {
    return res.status(404).json({ message: 'Template not found' });
  }
  
  res.json(template);
});

// Apply template to video
router.post('/:id/apply-template', authMiddleware, async (req, res) => {
  try {
    const { templateId } = req.body;
    const video = await Video.findById(req.params.id);
    
    if (!video || video.user.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Video not found or unauthorized' });
    }
    
    const template = videoTemplates.find(t => t.id === templateId);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    // Apply template settings
    video.template = {
      id: templateId,
      name: template.name
    };
    
    if (template.settings.effects) {
      video.effects = template.settings.effects;
    }
    
    if (template.settings.filter) {
      video.filter = template.settings.filter;
    }
    
    if (template.settings.transitions) {
      video.transitions = template.settings.transitions;
    }
    
    await video.save();
    
    res.json({
      success: true,
      video,
      template: template.name
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

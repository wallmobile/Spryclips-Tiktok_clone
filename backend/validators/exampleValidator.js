/**
 * Example Validator
 * 
 * Input validation schemas using express-validator
 * Validators should be used in routes before controllers
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Validation result handler middleware
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
};

/**
 * Create item validation
 */
const validateCreateItem = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
    .custom((tags) => {
      if (tags.length > 10) {
        throw new Error('Maximum 10 tags allowed');
      }
      return true;
    }),
  
  handleValidationErrors,
];

/**
 * Update item validation
 */
const validateUpdateItem = [
  param('id')
    .isMongoId()
    .withMessage('Invalid item ID'),
  
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  
  handleValidationErrors,
];

/**
 * Get items query validation
 */
const validateGetItems = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('sort')
    .optional()
    .isIn(['createdAt', '-createdAt', 'title', '-title'])
    .withMessage('Invalid sort field'),
  
  handleValidationErrors,
];

/**
 * Get item by ID validation
 */
const validateGetItemById = [
  param('id')
    .isMongoId()
    .withMessage('Invalid item ID'),
  
  handleValidationErrors,
];

/**
 * Delete item validation
 */
const validateDeleteItem = [
  param('id')
    .isMongoId()
    .withMessage('Invalid item ID'),
  
  handleValidationErrors,
];

module.exports = {
  validateCreateItem,
  validateUpdateItem,
  validateGetItems,
  validateGetItemById,
  validateDeleteItem,
  handleValidationErrors,
};



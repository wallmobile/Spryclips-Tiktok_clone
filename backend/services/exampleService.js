/**
 * Example Service
 * 
 * This is a template showing the proper structure for services.
 * Services contain all business logic and interact with models.
 * They should be independent of HTTP concerns.
 */

const ExampleModel = require('../models/Example'); // Replace with actual model
const { AppError } = require('../utils/errorHandler');
const { STATUS_CODES } = require('../constants/statusCodes');
const ERROR_CODES = require('../constants/errorCodes');
const logger = require('../utils/logger');

/**
 * Get all items with pagination
 */
const getAllItems = async ({ page = 1, limit = 20, sort = 'createdAt', userId = null }) => {
  try {
    const skip = (page - 1) * limit;
    const sortOrder = sort.startsWith('-') ? -1 : 1;
    const sortField = sort.replace(/^-/, '');

    // Build query (example: filter by user if provided)
    const query = userId ? { userId } : {};

    const [items, total] = await Promise.all([
      ExampleModel.find(query)
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      ExampleModel.countDocuments(query),
    ]);

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    logger.errorWithStack('Error getting all items', error, { page, limit, userId });
    throw new AppError({
      message: 'Failed to retrieve items',
      statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
      code: ERROR_CODES.SERVER_ERROR,
      cause: error,
    });
  }
};

/**
 * Get item by ID
 */
const getItemById = async (id, userId = null) => {
  try {
    const item = await ExampleModel.findById(id).lean();

    if (!item) {
      return null;
    }

    // Optional: Check if user has access
    if (userId && item.userId && item.userId.toString() !== userId.toString()) {
      // Handle private items, etc.
    }

    return item;
  } catch (error) {
    logger.errorWithStack('Error getting item by ID', error, { id, userId });
    throw new AppError({
      message: 'Failed to retrieve item',
      statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
      code: ERROR_CODES.SERVER_ERROR,
      cause: error,
    });
  }
};

/**
 * Create new item
 */
const createItem = async (itemData, userId) => {
  try {
    // Business logic validation
    if (!itemData.title || itemData.title.trim().length === 0) {
      throw new AppError({
        message: 'Title is required',
        statusCode: STATUS_CODES.BAD_REQUEST,
        code: ERROR_CODES.VALIDATION_REQUIRED_FIELD,
      });
    }

    const newItem = new ExampleModel({
      ...itemData,
      userId,
      createdAt: new Date(),
    });

    const savedItem = await newItem.save();

    logger.info('Item created', { itemId: savedItem._id, userId });

    return savedItem.toObject();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    logger.errorWithStack('Error creating item', error, { itemData, userId });
    throw new AppError({
      message: 'Failed to create item',
      statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
      code: ERROR_CODES.SERVER_ERROR,
      cause: error,
    });
  }
};

/**
 * Update item
 */
const updateItem = async (id, updateData) => {
  try {
    const item = await ExampleModel.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).lean();

    if (!item) {
      throw new AppError({
        message: 'Item not found',
        statusCode: STATUS_CODES.NOT_FOUND,
        code: ERROR_CODES.ITEM_NOT_FOUND,
      });
    }

    return item;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    logger.errorWithStack('Error updating item', error, { id, updateData });
    throw new AppError({
      message: 'Failed to update item',
      statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
      code: ERROR_CODES.SERVER_ERROR,
      cause: error,
    });
  }
};

/**
 * Delete item
 */
const deleteItem = async (id) => {
  try {
    const item = await ExampleModel.findByIdAndDelete(id);

    if (!item) {
      throw new AppError({
        message: 'Item not found',
        statusCode: STATUS_CODES.NOT_FOUND,
        code: ERROR_CODES.ITEM_NOT_FOUND,
      });
    }

    logger.info('Item deleted', { itemId: id });

    return true;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    logger.errorWithStack('Error deleting item', error, { id });
    throw new AppError({
      message: 'Failed to delete item',
      statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
      code: ERROR_CODES.SERVER_ERROR,
      cause: error,
    });
  }
};

module.exports = {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
};


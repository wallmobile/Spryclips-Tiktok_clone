/**
 * Example Controller
 * 
 * This is a template showing the proper structure for controllers.
 * Controllers should be thin - they handle HTTP requests/responses
 * and delegate business logic to services.
 */

const { asyncHandler, AppError } = require('../utils/errorHandler');
const { sendSuccess, sendPaginated } = require('../utils/apiResponse');
const exampleService = require('../services/exampleService');
const { STATUS_CODES } = require('../constants/statusCodes');
const logger = require('../utils/logger');

/**
 * Example: Get all items
 * GET /api/example
 */
const getAllItems = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, sort = 'createdAt' } = req.query;
  
  const result = await exampleService.getAllItems({
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    sort,
    userId: req.user?._id, // Optional: if authenticated
  });

  logger.info('Items retrieved', { count: result.items.length, userId: req.user?._id });

  return sendPaginated(res, result.items, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  });
});

/**
 * Example: Get single item
 * GET /api/example/:id
 */
const getItemById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const item = await exampleService.getItemById(id, req.user?._id);

  if (!item) {
    throw new AppError({
      message: 'Item not found',
      statusCode: STATUS_CODES.NOT_FOUND,
      code: 'ITEM_NOT_FOUND',
    });
  }

  return sendSuccess(res, item, STATUS_CODES.OK);
});

/**
 * Example: Create item
 * POST /api/example
 */
const createItem = asyncHandler(async (req, res) => {
  const itemData = req.body;
  const userId = req.user._id; // Assuming auth middleware sets req.user

  const newItem = await exampleService.createItem(itemData, userId);

  logger.info('Item created', { itemId: newItem._id, userId });

  return sendSuccess(res, newItem, STATUS_CODES.CREATED);
});

/**
 * Example: Update item
 * PUT /api/example/:id
 */
const updateItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  const userId = req.user._id;

  // Check ownership or permissions
  const item = await exampleService.getItemById(id);
  if (!item) {
    throw new AppError({
      message: 'Item not found',
      statusCode: STATUS_CODES.NOT_FOUND,
      code: 'ITEM_NOT_FOUND',
    });
  }

  // Authorization check (example)
  if (item.userId.toString() !== userId.toString()) {
    throw new AppError({
      message: 'Not authorized to update this item',
      statusCode: STATUS_CODES.FORBIDDEN,
      code: 'FORBIDDEN',
    });
  }

  const updatedItem = await exampleService.updateItem(id, updateData);

  logger.info('Item updated', { itemId: id, userId });

  return sendSuccess(res, updatedItem, STATUS_CODES.OK);
});

/**
 * Example: Delete item
 * DELETE /api/example/:id
 */
const deleteItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  // Check ownership or permissions
  const item = await exampleService.getItemById(id);
  if (!item) {
    throw new AppError({
      message: 'Item not found',
      statusCode: STATUS_CODES.NOT_FOUND,
      code: 'ITEM_NOT_FOUND',
    });
  }

  // Authorization check
  if (item.userId.toString() !== userId.toString()) {
    throw new AppError({
      message: 'Not authorized to delete this item',
      statusCode: STATUS_CODES.FORBIDDEN,
      code: 'FORBIDDEN',
    });
  }

  await exampleService.deleteItem(id);

  logger.info('Item deleted', { itemId: id, userId });

  return sendSuccess(res, { message: 'Item deleted successfully' }, STATUS_CODES.OK);
});

module.exports = {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
};



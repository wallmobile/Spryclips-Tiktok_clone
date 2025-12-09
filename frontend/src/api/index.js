/**
 * API Module Exports
 * 
 * Recent Changes:
 * - Added live streaming API exports
 * - Maintained backward compatibility with existing API modules
 * - Centralized API client configuration
 */

// Provide a single default axios client and namespaced API modules to avoid
// conflicting re-exports when multiple modules export the same symbol.
import axios from '../config/axios';

export default axios;

export * as auth from './auth';
export * as videos from './videos';
export * as comments from './comments';
export * as collections from './collections';
export * as products from './products';
export * as creatorAcademy from './creator-academy';
export * as moderation from './moderation';
export * as videoFeatures from './video-features';
export * as hashtags from './hashtags';
export * as search from './search';
export * as analytics from './analytics';
export * as music from './music';
export * as notifications from './notifications';
export * as messages from './messages';
export * as drafts from './drafts';
export * as twoFactor from './twoFactor';
export * as users from './users';
export * as monetization from './monetization';
export * as verification from './verification';

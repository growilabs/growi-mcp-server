// Service base
export { BaseService } from './base-service.js';

// Page service
export { type IPageService, tokenPageService } from './page-service.js';

// User service
export { type IUserService, tokenUserService } from './user-service.js';

// Attachment service
export { type IAttachmentService, tokenAttachmentService } from './attachment-service.js';

// Error handling
export { GrowiApiError, isGrowiApiError } from './growi-api-error.js';

// Legacy service (for backward compatibility)
export { type IGrowiService, tokenGrowiService } from './growi-service.js';

// Import services to ensure they are registered with tsyringe
import './page-service.js';
import './user-service.js';
import './attachment-service.js';
import './growi-service.js';

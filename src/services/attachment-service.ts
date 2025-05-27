import { container } from 'tsyringe';
import { BaseService } from './base-service.js';

export const tokenAttachmentService = 'AttachmentService';

export interface IAttachmentService {
  // Placeholder method - will be replaced with actual attachment-related methods
  _placeholder?(): void;
}

/**
 * Service for handling GROWI attachment-related API operations
 */
class AttachmentService extends BaseService implements IAttachmentService {
  // Placeholder method - will be replaced with actual attachment-related methods
  _placeholder?(): void {
    // This method will be removed when actual attachment methods are implemented
  }
}

container.registerSingleton(tokenAttachmentService, AttachmentService);

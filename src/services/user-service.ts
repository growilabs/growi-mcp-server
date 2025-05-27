import { container } from 'tsyringe';
import { BaseService } from './base-service.js';

export const tokenUserService = 'UserService';

export interface IUserService {
  // Placeholder method - will be replaced with actual user-related methods
  _placeholder?(): void;
}

/**
 * Service for handling GROWI user-related API operations
 */
class UserService extends BaseService implements IUserService {
  // Placeholder method - will be replaced with actual user-related methods
  _placeholder?(): void {
    // This method will be removed when actual user methods are implemented
  }
}

container.registerSingleton(tokenUserService, UserService);

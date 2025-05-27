import ky from 'ky';
import config from '../config/default.js';

/**
 * Base service class that provides common HTTP clients for GROWI API communication
 */
export abstract class BaseService {
  protected readonly apiV1: typeof ky;
  protected readonly apiV3: typeof ky;

  constructor() {
    this.apiV1 = ky.create({
      prefixUrl: `${config.growi.baseUrl}/_api/`,
      headers: {
        ContentType: 'application/json',
        Authorization: `Bearer ${config.growi.apiToken}`,
      },
      timeout: 10000,
    });

    this.apiV3 = ky.create({
      prefixUrl: `${config.growi.baseUrl}/_api/v3/`,
      headers: {
        Authorization: `Bearer ${config.growi.apiToken}`,
      },
      timeout: 10000,
    });
  }
}

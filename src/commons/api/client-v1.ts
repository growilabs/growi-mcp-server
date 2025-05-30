import ky from 'ky';
import config from '../../config/default.js';

export const apiV1 = ky.create({
  prefixUrl: `${config.growi.baseUrl}/_api/`,
  headers: {
    ContentType: 'application/json',
    Authorization: `Bearer ${config.growi.apiToken}`,
  },
  timeout: 10000,
});

import ky from 'ky';
import config from '../../config/default.js';

export const apiV3 = ky.create({
  prefixUrl: `${config.growi.baseUrl}/_api/v3/`,
  headers: {
    Authorization: `Bearer ${config.growi.apiToken}`,
  },
  timeout: 10000,
});

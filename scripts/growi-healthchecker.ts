import ky from 'ky';
import { z } from 'zod';
import config from '../src/config/default';

const healthcheckResponseSchema = z.object({
  status: z.literal('OK'),
});

const baseUrl = new URL(config.growi.baseUrl);
const healthcheckUrl = new URL('/_api/v3/healthcheck', baseUrl);

console.log(`Checking if GROWI server is available at ${healthcheckUrl}...`);

try {
  const response = await ky
    .get(healthcheckUrl, {
      timeout: 5000,
      retry: 0,
    })
    .json();

  const result = healthcheckResponseSchema.safeParse(response);

  if (result.success) {
    console.log('GROWI server is available.');
    process.exit(0); // 成功
  } else {
    console.error('Invalid healthcheck response:', result.error.format());
    process.exit(1); // 失敗
  }
} catch (err) {
  if (err.name === 'TimeoutError') {
    console.error('GROWI server is not available: Request timed out.');
  } else if (err.name === 'HTTPError') {
    console.error(`GROWI server responded with status code: ${err.response.status}`);
  } else {
    console.error('GROWI server is not available or request failed:', err.message);
  }
  process.exit(1);
}

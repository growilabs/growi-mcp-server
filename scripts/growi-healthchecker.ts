import ky, { HTTPError, TimeoutError } from 'ky';
import { z } from 'zod';
import config from '../src/config/default';

const healthcheckResponseSchema = z.object({
  status: z.literal('OK'),
});

interface HealthCheckResult {
  appName: string;
  hasError?: boolean;
}

async function checkAppHealth(appName: string, baseUrl: string): Promise<HealthCheckResult> {
  try {
    const healthcheckUrl = new URL('/_api/v3/healthcheck', baseUrl);

    const response = await ky
      .get(healthcheckUrl, {
        timeout: 5000,
        retry: 0,
      })
      .json();

    const result = healthcheckResponseSchema.safeParse(response);
    if (result.success) {
      return {
        appName,
      };
    }

    console.error(`❌ ${appName}: Invalid healthcheck response: ${result.error.format()}`);
    return {
      appName,
      hasError: true,
    };
  } catch (err) {
    if (err instanceof TimeoutError) {
      console.error(`❌ ${appName}: GROWI server is not available: Request timed out.`);
    } else if (err instanceof HTTPError) {
      console.error(`❌ ${appName}: GROWI server responded with status code: ${err.response.status}`);
    } else if (err instanceof Error) {
      console.error(`❌ ${appName}: GROWI server is not available or request failed: ${err.message}`);
    } else console.error(`❌ ${appName}: An unknown error occurred while checking GROWI server health.`);

    return {
      appName,
      hasError: true,
    };
  }
}

const apps = config.growi.apps;
const healthCheckPromises = Array.from(apps.values()).map((app) => checkAppHealth(app.name, app.baseUrl));

try {
  const results = await Promise.all(healthCheckPromises);
  let hasError = false;
  for (const result of results) {
    if (result.hasError) {
      hasError = true;
      continue;
    }
    console.log(`✅ ${result.appName}: GROWI server is available.`);
  }

  // Exit with error code if any app is unhealthy
  if (hasError) {
    process.exit(1);
  }
} catch (error) {
  console.error('Failed to perform health checks:', error);
  process.exit(1);
}

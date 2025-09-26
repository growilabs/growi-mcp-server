import ky, { HTTPError, TimeoutError } from 'ky';
import { z } from 'zod';
import config from '../src/config/default';

const healthcheckResponseSchema = z.object({
  status: z.literal('OK'),
});

interface HealthCheckResult {
  appName: string;
  baseUrl: string;
  errorMessage?: string;
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
        baseUrl,
      };
    }

    return {
      appName,
      baseUrl,
      errorMessage: `Invalid healthcheck response: ${result.error.format()}`,
    };
  } catch (err) {
    let errorMessage = 'GROWI server is not available or request failed.';

    if (err instanceof TimeoutError) {
      errorMessage = 'GROWI server is not available: Request timed out.';
    }

    if (err instanceof HTTPError) {
      errorMessage = `GROWI server responded with status code: ${err.response.status}`;
    }

    if (err instanceof Error) {
      errorMessage = `GROWI server is not available or request failed: ${err.message}`;
    }

    return {
      appName,
      baseUrl,
      errorMessage,
    };
  }
}

const apps = config.growi.apps;
const healthCheckPromises = apps.map((app) => checkAppHealth(app.name, app.baseUrl));

try {
  const results = await Promise.all(healthCheckPromises);
  let hasError = false;
  for (const result of results) {
    const icon = result.errorMessage == null ? '✅' : '❌';
    const statusMessage = result.errorMessage == null ? ' - server is available' : ` - Error: ${result.errorMessage}`;
    console.log(`${icon} ${result.appName}: ${result.baseUrl}${statusMessage}`);
    if (result.errorMessage != null) {
      hasError = true;
    }
  }

  // Exit with error code if any app is unhealthy
  if (hasError) {
    process.exit(1);
  }
} catch (error) {
  console.error('Failed to perform health checks:', error);
  process.exit(1);
}

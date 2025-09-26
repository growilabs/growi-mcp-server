import type { GrowiAppConfig } from '../../config/types.js';

/**
 * Manages multiple GROWI API clients for multi-app support
 */
export class GrowiClientManager {
  private defaultAppName!: string; // definite assignment assertion - will be set in init()
  private apps: GrowiAppConfig[] = [];

  /**
   * Initialize the client manager with app configurations
   */
  async init(apps: GrowiAppConfig[], defaultAppName: string): Promise<void> {
    this.apps = apps;
    this.defaultAppName = defaultAppName;
    await this.setGlobalAxiosClient(this.defaultAppName);
  }

  /**
   * Set the global default client to a specific app (for legacy SDK usage)
   */
  async setGlobalAxiosClient(appName: string): Promise<void> {
    const appConfig = this.getAppConfig(appName);
    if (appConfig == null) {
      throw new Error(`GROWI app '${appName}' not found`);
    }

    const { AXIOS_DEFAULT } = await import('@growi/sdk-typescript');
    AXIOS_DEFAULT.setBaseURL(appConfig.baseUrl);
    AXIOS_DEFAULT.setAuthorizationHeader(appConfig.apiToken);
  }

  /**
   * Get list of available app names
   */
  getAvailableApps(): string[] {
    return this.apps.map((app) => app.name);
  }

  /**
   * Get app configuration by name
   */
  getAppConfig(appName: string): GrowiAppConfig | undefined {
    return this.apps.find((app) => app.name === appName);
  }

  /**
   * Get all app configurations
   */
  getAllAppConfigs(): GrowiAppConfig[] {
    return [...this.apps];
  }

  /**
   * Get default app name
   */
  getDefaultAppName(): string {
    return this.defaultAppName;
  }

  /**
   * Check if an app exists
   */
  hasApp(appName: string): boolean {
    return this.apps.some((app) => app.name === appName);
  }
}

// Global instance
export const growiClientManager = new GrowiClientManager();

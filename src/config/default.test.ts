import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dotenv-flow before importing the module
vi.mock('dotenv-flow', () => ({
  default: {
    config: vi.fn(),
  },
}));

describe('config/default.ts', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = {};
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Valid configurations', () => {
    it('should parse single app configuration correctly', async () => {
      // Arrange
      process.env = {
        GROWI_APP_NAME_1: 'test-app',
        GROWI_BASE_URL_1: 'https://example.com',
        GROWI_API_TOKEN_1: 'token123',
      };

      // Act
      const config = await import('./default');

      // Assert
      expect(config.default.growi.apps.size).toBe(1);
      expect(config.default.growi.apps.get('test-app')).toEqual({
        name: 'test-app',
        baseUrl: 'https://example.com',
        apiToken: 'token123',
      });
      expect(config.default.growi.defaultAppName).toBe('test-app');
    });

    it('should parse multiple app configurations correctly', async () => {
      // Arrange
      process.env = {
        GROWI_APP_NAME_1: 'app1',
        GROWI_BASE_URL_1: 'https://app1.com',
        GROWI_API_TOKEN_1: 'token1',
        GROWI_APP_NAME_2: 'app2',
        GROWI_BASE_URL_2: 'https://app2.com',
        GROWI_API_TOKEN_2: 'token2',
        GROWI_APP_NAME_10: 'app10',
        GROWI_BASE_URL_10: 'https://app10.com',
        GROWI_API_TOKEN_10: 'token10',
      };

      // Act
      const config = await import('./default');

      // Assert
      expect(config.default.growi.apps.size).toBe(3);
      expect(config.default.growi.apps.get('app1')).toBeDefined();
      expect(config.default.growi.apps.get('app2')).toBeDefined();
      expect(config.default.growi.apps.get('app10')).toBeDefined();
      expect(config.default.growi.defaultAppName).toBe('app1');
    });

    it('should use custom default app name when provided', async () => {
      // Arrange
      process.env = {
        GROWI_APP_NAME_1: 'app1',
        GROWI_BASE_URL_1: 'https://app1.com',
        GROWI_API_TOKEN_1: 'token1',
        GROWI_APP_NAME_2: 'app2',
        GROWI_BASE_URL_2: 'https://app2.com',
        GROWI_API_TOKEN_2: 'token2',
        GROWI_DEFAULT_APP_NAME: 'app2',
      };

      // Act
      const config = await import('./default');

      // Assert
      expect(config.default.growi.defaultAppName).toBe('app2');
    });

    it('should trim whitespace from configuration values', async () => {
      // Arrange
      process.env = {
        GROWI_APP_NAME_1: '  test-app  ',
        GROWI_BASE_URL_1: '  https://example.com  ',
        GROWI_API_TOKEN_1: '  token123  ',
        GROWI_DEFAULT_APP_NAME: '  test-app  ',
      };

      // Act
      const config = await import('./default');

      // Assert
      expect(config.default.growi.apps.get('test-app')).toEqual({
        name: 'test-app',
        baseUrl: 'https://example.com',
        apiToken: 'token123',
      });
      expect(config.default.growi.defaultAppName).toBe('test-app');
    });

    it('should sort app numbers correctly (1, 2, 10, 11)', async () => {
      // Arrange
      process.env = {
        GROWI_APP_NAME_11: 'app11',
        GROWI_BASE_URL_11: 'https://app11.com',
        GROWI_API_TOKEN_11: 'token11',
        GROWI_APP_NAME_2: 'app2',
        GROWI_BASE_URL_2: 'https://app2.com',
        GROWI_API_TOKEN_2: 'token2',
        GROWI_APP_NAME_1: 'app1',
        GROWI_BASE_URL_1: 'https://app1.com',
        GROWI_API_TOKEN_1: 'token1',
        GROWI_APP_NAME_10: 'app10',
        GROWI_BASE_URL_10: 'https://app10.com',
        GROWI_API_TOKEN_10: 'token10',
      };

      // Act
      const config = await import('./default');

      // Assert
      // First app should be app1 (sorted by number)
      expect(config.default.growi.defaultAppName).toBe('app1');
    });
  });

  describe('Invalid configurations', () => {
    it('should throw error when no app configuration is provided', async () => {
      // Arrange
      process.env = {};

      // Act & Assert
      await expect(async () => {
        await import('./default');
      }).rejects.toThrow('Invalid environment variables');
    });

    it('should throw error when app configuration is incomplete - missing name', async () => {
      // Arrange
      process.env = {
        GROWI_BASE_URL_1: 'https://example.com',
        GROWI_API_TOKEN_1: 'token123',
      };

      // Act & Assert
      await expect(async () => {
        await import('./default');
      }).rejects.toThrow('Invalid environment variables');
    });

    it('should throw error when app configuration is incomplete - missing base URL', async () => {
      // Arrange
      process.env = {
        GROWI_APP_NAME_1: 'test-app',
        GROWI_API_TOKEN_1: 'token123',
      };

      // Act & Assert
      await expect(async () => {
        await import('./default');
      }).rejects.toThrow('Incomplete GROWI app configuration for app 1. Missing: GROWI_BASE_URL_1');
    });

    it('should throw error when app configuration is incomplete - missing API token', async () => {
      // Arrange
      process.env = {
        GROWI_APP_NAME_1: 'test-app',
        GROWI_BASE_URL_1: 'https://example.com',
      };

      // Act & Assert
      await expect(async () => {
        await import('./default');
      }).rejects.toThrow('Incomplete GROWI app configuration for app 1. Missing: GROWI_API_TOKEN_1');
    });

    it('should throw error when app configuration is incomplete - multiple missing', async () => {
      // Arrange
      process.env = {
        GROWI_APP_NAME_1: 'test-app',
      };

      // Act & Assert
      await expect(async () => {
        await import('./default');
      }).rejects.toThrow('Incomplete GROWI app configuration for app 1. Missing: GROWI_BASE_URL_1, GROWI_API_TOKEN_1');
    });

    it('should throw error when default app name does not match any configured app', async () => {
      // Arrange
      process.env = {
        GROWI_APP_NAME_1: 'app1',
        GROWI_BASE_URL_1: 'https://app1.com',
        GROWI_API_TOKEN_1: 'token1',
        GROWI_DEFAULT_APP_NAME: 'nonexistent-app',
      };

      // Act & Assert
      await expect(async () => {
        await import('./default');
      }).rejects.toThrow('Invalid environment variables');
    });

    it('should throw error when app names are not unique', async () => {
      // Arrange
      process.env = {
        GROWI_APP_NAME_1: 'duplicate-app',
        GROWI_BASE_URL_1: 'https://app1.com',
        GROWI_API_TOKEN_1: 'token1',
        GROWI_APP_NAME_2: 'duplicate-app',
        GROWI_BASE_URL_2: 'https://app2.com',
        GROWI_API_TOKEN_2: 'token2',
      };

      // Act & Assert
      await expect(async () => {
        await import('./default');
      }).rejects.toThrow('Invalid environment variables');
    });

    it('should throw error when base URLs are not unique', async () => {
      // Arrange
      process.env = {
        GROWI_APP_NAME_1: 'app1',
        GROWI_BASE_URL_1: 'https://duplicate.com',
        GROWI_API_TOKEN_1: 'token1',
        GROWI_APP_NAME_2: 'app2',
        GROWI_BASE_URL_2: 'https://duplicate.com',
        GROWI_API_TOKEN_2: 'token2',
      };

      // Act & Assert
      await expect(async () => {
        await import('./default');
      }).rejects.toThrow('Invalid environment variables');
    });

    it('should throw error when API tokens are not unique', async () => {
      // Arrange
      process.env = {
        GROWI_APP_NAME_1: 'app1',
        GROWI_BASE_URL_1: 'https://app1.com',
        GROWI_API_TOKEN_1: 'duplicate-token',
        GROWI_APP_NAME_2: 'app2',
        GROWI_BASE_URL_2: 'https://app2.com',
        GROWI_API_TOKEN_2: 'duplicate-token',
      };

      // Act & Assert
      await expect(async () => {
        await import('./default');
      }).rejects.toThrow('Invalid environment variables');
    });

    it('should throw error when base URL is invalid', async () => {
      // Arrange
      process.env = {
        GROWI_APP_NAME_1: 'test-app',
        GROWI_BASE_URL_1: 'invalid-url',
        GROWI_API_TOKEN_1: 'token123',
      };

      // Act & Assert
      await expect(async () => {
        await import('./default');
      }).rejects.toThrow('Invalid environment variables');
    });

    it('should throw error when app name is empty', async () => {
      // Arrange
      process.env = {
        GROWI_APP_NAME_1: '',
        GROWI_BASE_URL_1: 'https://example.com',
        GROWI_API_TOKEN_1: 'token123',
      };

      // Act & Assert
      await expect(async () => {
        await import('./default');
      }).rejects.toThrow('Invalid environment variables');
    });

    it('should throw error when base URL is empty', async () => {
      // Arrange
      process.env = {
        GROWI_APP_NAME_1: 'test-app',
        GROWI_BASE_URL_1: '',
        GROWI_API_TOKEN_1: 'token123',
      };

      // Act & Assert
      await expect(async () => {
        await import('./default');
      }).rejects.toThrow('Invalid environment variables');
    });

    it('should throw error when API token is empty', async () => {
      // Arrange
      process.env = {
        GROWI_APP_NAME_1: 'test-app',
        GROWI_BASE_URL_1: 'https://example.com',
        GROWI_API_TOKEN_1: '',
      };

      // Act & Assert
      await expect(async () => {
        await import('./default');
      }).rejects.toThrow('Invalid environment variables');
    });
  });

  describe('Edge cases', () => {
    it('should handle non-consecutive app numbers', async () => {
      // Arrange
      process.env = {
        GROWI_APP_NAME_1: 'app1',
        GROWI_BASE_URL_1: 'https://app1.com',
        GROWI_API_TOKEN_1: 'token1',
        GROWI_APP_NAME_5: 'app5',
        GROWI_BASE_URL_5: 'https://app5.com',
        GROWI_API_TOKEN_5: 'token5',
        GROWI_APP_NAME_100: 'app100',
        GROWI_BASE_URL_100: 'https://app100.com',
        GROWI_API_TOKEN_100: 'token100',
      };

      // Act
      const config = await import('./default');

      // Assert
      expect(config.default.growi.apps.size).toBe(3);
      expect(config.default.growi.apps.get('app1')).toBeDefined();
      expect(config.default.growi.apps.get('app5')).toBeDefined();
      expect(config.default.growi.apps.get('app100')).toBeDefined();
    });
    it('should ignore unrelated environment variables', async () => {
      // Arrange
      process.env = {
        GROWI_APP_NAME_1: 'test-app',
        GROWI_BASE_URL_1: 'https://example.com',
        GROWI_API_TOKEN_1: 'token123',
        SOME_OTHER_VAR: 'should-be-ignored',
        GROWI_SOMETHING_ELSE: 'also-ignored',
        NODE_ENV: 'test',
      };

      // Act
      const config = await import('./default');

      // Assert
      expect(config.default.growi.apps.size).toBe(1);
      expect(config.default.growi.apps.get('test-app')).toBeDefined();
    });

    it('should handle empty default app name (use first app)', async () => {
      // Arrange
      process.env = {
        GROWI_APP_NAME_1: 'app1',
        GROWI_BASE_URL_1: 'https://app1.com',
        GROWI_API_TOKEN_1: 'token1',
        GROWI_APP_NAME_2: 'app2',
        GROWI_BASE_URL_2: 'https://app2.com',
        GROWI_API_TOKEN_2: 'token2',
        // Empty default app name should be ignored and first app used
      };

      // Act
      const config = await import('./default');

      // Assert
      expect(config.default.growi.defaultAppName).toBe('app1');
    });
    it('should handle whitespace-only default app name (use first app)', async () => {
      // Arrange
      process.env = {
        GROWI_APP_NAME_1: 'app1',
        GROWI_BASE_URL_1: 'https://app1.com',
        GROWI_API_TOKEN_1: 'token1',
        GROWI_APP_NAME_2: 'app2',
        GROWI_BASE_URL_2: 'https://app2.com',
        GROWI_API_TOKEN_2: 'token2',
        GROWI_DEFAULT_APP_NAME: '   ',
      };

      // Act & Assert
      await expect(async () => {
        await import('./default');
      }).rejects.toThrow('Invalid environment variables');
    });
  });

  describe('Environment variable pattern matching', () => {
    it('should not match invalid patterns', async () => {
      // Arrange
      process.env = {
        GROWI_APP_NAME_1: 'valid-app',
        GROWI_BASE_URL_1: 'https://valid.com',
        GROWI_API_TOKEN_1: 'valid-token',
        GROWI_APP_NAME_: 'invalid-no-number',
        GROWI_APP_NAME_abc: 'invalid-not-number',
        GROWI_APP_NAME_1a: 'invalid-mixed',
        ANOTHERGROWI_APP_NAME_1: 'invalid-prefix',
      };

      // Act
      const config = await import('./default');

      // Assert
      expect(config.default.growi.apps.size).toBe(1);
      expect(config.default.growi.apps.get('valid-app')).toBeDefined();
    });
  });
});

import { describe, expect, it } from 'vitest';
const {
  validateProductionDatabaseConfig,
  shouldSeedDemoData,
  getProductionFrontendOrigin
} = require('../src/database/config');

describe('production database configuration', () => {
  it('requires a PostgreSQL URL in production', () => {
    expect(() => validateProductionDatabaseConfig({ nodeEnv: 'production' }))
      .toThrow('DATABASE_URL is required in production.');
  });

  it('rejects malformed and non-PostgreSQL URLs in production', () => {
    expect(() => validateProductionDatabaseConfig({ nodeEnv: 'production', databaseUrl: 'not-a-url' }))
      .toThrow('valid PostgreSQL connection URL');
    expect(() => validateProductionDatabaseConfig({ nodeEnv: 'production', databaseUrl: 'https://db.example/path' }))
      .toThrow('valid PostgreSQL connection URL');
  });

  it('rejects forced memory mode in production', () => {
    expect(() => validateProductionDatabaseConfig({
      nodeEnv: 'production',
      databaseUrl: 'postgresql://user:pass@db.example/sweety',
      forceMemoryDb: 'true'
    })).toThrow('FORCE_MEMORY_DB cannot be enabled in production.');
  });

  it('accepts a PostgreSQL URL in production and leaves development configuration unrestricted', () => {
    expect(() => validateProductionDatabaseConfig({
      nodeEnv: 'production',
      databaseUrl: 'postgresql://user:pass@db.example/sweety'
    })).not.toThrow();
    expect(() => validateProductionDatabaseConfig({ nodeEnv: 'development' })).not.toThrow();
  });
});

describe('demo seed opt-in', () => {
  it('is disabled unless explicitly set to true', () => {
    expect(shouldSeedDemoData(undefined)).toBe(false);
    expect(shouldSeedDemoData('false')).toBe(false);
    expect(shouldSeedDemoData('true')).toBe(true);
    expect(shouldSeedDemoData('TRUE')).toBe(true);
  });

  it('never seeds when a registered account already exists, even when opted in', () => {
    expect(shouldSeedDemoData('true', 1)).toBe(false);
  });
});

describe('production CORS origin configuration', () => {
  it('requires a public HTTPS frontend URL and returns only its origin', () => {
    expect(getProductionFrontendOrigin({
      nodeEnv: 'production',
      frontendUrl: 'https://sweety-ui.onrender.com/some/path'
    })).toBe('https://sweety-ui.onrender.com');
    expect(() => getProductionFrontendOrigin({ nodeEnv: 'production' }))
      .toThrow('FRONTEND_URL must be configured in production.');
    expect(() => getProductionFrontendOrigin({
      nodeEnv: 'production',
      frontendUrl: 'http://sweety-ui.onrender.com'
    })).toThrow('valid HTTPS URL');
  });
});

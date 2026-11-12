function isEnabled(value) {
  return String(value || '').toLowerCase() === 'true';
}

function validateProductionDatabaseConfig({ nodeEnv, databaseUrl, forceMemoryDb }) {
  if (nodeEnv !== 'production') return;

  if (isEnabled(forceMemoryDb)) {
    throw new Error('FORCE_MEMORY_DB cannot be enabled in production.');
  }
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required in production.');
  }

  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL in production.');
  }

  if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !parsed.hostname || parsed.pathname.length < 2) {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL in production.');
  }
}

function shouldSeedDemoData(seedDemoData, userCount = 0) {
  return Number(userCount) === 0 && isEnabled(seedDemoData);
}

function getProductionFrontendOrigin({ nodeEnv, frontendUrl }) {
  if (nodeEnv !== 'production') return null;
  if (!frontendUrl) {
    throw new Error('FRONTEND_URL must be configured in production.');
  }

  let parsed;
  try {
    parsed = new URL(frontendUrl);
  } catch {
    throw new Error('FRONTEND_URL must be a valid HTTPS URL in production.');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('FRONTEND_URL must be a valid HTTPS URL in production.');
  }
  return parsed.origin;
}

module.exports = {
  validateProductionDatabaseConfig,
  shouldSeedDemoData,
  getProductionFrontendOrigin
};

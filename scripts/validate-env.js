#!/usr/bin/env node

/**
 * Environment Validation Script
 * 
 * Purpose: Validate environment configuration before build to prevent
 * cross-environment misconfigurations (e.g., sandbox building with
 * production URLs or vice versa).
 * 
 * Usage:
 *   node scripts/validate-env.js --mode development   # Sandbox build
 *   node scripts/validate-env.js --mode production    # Production build
 *   node scripts/validate-env.js                      # Auto-detect from NODE_ENV
 * 
 * Exit Codes:
 *   0 - Validation passed
 *   1 - Validation failed (misconfiguration detected)
 */

const PRODUCTION_URL = 'https://expapp.duckdns.org';
const SANDBOX_URL = 'http://192.168.1.144';
const PRODUCTION_API_URL = '/api'; // Relative path for production
const SANDBOX_API_URL = 'http://192.168.1.144/api';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  log(`\n❌ ${message}`, 'red');
}

function success(message) {
  log(`\n✅ ${message}`, 'green');
}

function warning(message) {
  log(`\n⚠️  ${message}`, 'yellow');
}

function info(message) {
  log(`\nℹ️  ${message}`, 'cyan');
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  let mode = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--mode' && args[i + 1]) {
      mode = args[i + 1];
      i++;
    } else if (args[i].startsWith('--mode=')) {
      mode = args[i].split('=')[1];
    }
  }

  // Auto-detect from NODE_ENV if not specified
  if (!mode) {
    mode = process.env.NODE_ENV || 'development';
  }

  return { mode: mode.toLowerCase() };
}

/**
 * Get environment variable value
 */
function getEnvVar(name) {
  return process.env[name] || null;
}

/**
 * Check if URL is production URL
 */
function isProductionUrl(url) {
  if (!url) return false;
  return url.includes(PRODUCTION_URL) || url.includes('expapp.duckdns.org');
}

/**
 * Check if URL is sandbox URL
 */
function isSandboxUrl(url) {
  if (!url) return false;
  return url.includes(SANDBOX_URL) || url.includes('192.168.1.144');
}

/**
 * Validate API URL for sandbox build
 */
function validateSandboxApiUrl(apiUrl) {
  if (!apiUrl) {
    warning('VITE_API_BASE_URL not set - will default to /api');
    return { valid: true, warning: true };
  }

  if (isProductionUrl(apiUrl)) {
    return {
      valid: false,
      error: `Building for SANDBOX but found PRODUCTION API URL: ${apiUrl}`,
      fix: `export VITE_API_BASE_URL=${SANDBOX_API_URL}`
    };
  }

  if (isSandboxUrl(apiUrl)) {
    return { valid: true };
  }

  // Relative path is acceptable for sandbox (will use current host)
  if (apiUrl === '/api' || apiUrl.startsWith('/api')) {
    return { valid: true };
  }

  return {
    valid: false,
    error: `Invalid API URL for sandbox: ${apiUrl}`,
    fix: `export VITE_API_BASE_URL=${SANDBOX_API_URL} or VITE_API_BASE_URL=/api`
  };
}

/**
 * Validate API URL for production build
 */
function validateProductionApiUrl(apiUrl) {
  if (!apiUrl) {
    warning('VITE_API_BASE_URL not set - will default to /api (acceptable for production)');
    return { valid: true, warning: true };
  }

  if (isSandboxUrl(apiUrl)) {
    return {
      valid: false,
      error: `Building for PRODUCTION but found SANDBOX API URL: ${apiUrl}`,
      fix: `export VITE_API_BASE_URL=/api or unset VITE_API_BASE_URL`
    };
  }

  if (isProductionUrl(apiUrl)) {
    return { valid: true };
  }

  // Relative path is acceptable for production
  if (apiUrl === '/api' || apiUrl.startsWith('/api')) {
    return { valid: true };
  }

  return {
    valid: false,
    error: `Invalid API URL for production: ${apiUrl}`,
    fix: `export VITE_API_BASE_URL=/api or unset VITE_API_BASE_URL`
  };
}

/**
 * Main validation function
 */
function validate() {
  const { mode } = parseArgs();
  const isProduction = mode === 'production';
  const isDevelopment = mode === 'development';

  log(`\n${colors.bold}🔍 Environment Validation${colors.reset}`, 'cyan');
  log(`Mode: ${mode}`, 'cyan');
  log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`, 'cyan');

  // Get API URL
  const apiUrl = getEnvVar('VITE_API_BASE_URL');

  info(`VITE_API_BASE_URL: ${apiUrl || '(not set, will default to /api)'}`);

  // Validate based on mode
  let validation;
  if (isProduction) {
    validation = validateProductionApiUrl(apiUrl);
  } else if (isDevelopment) {
    validation = validateSandboxApiUrl(apiUrl);
  } else {
    error(`Invalid mode: ${mode}. Use 'development' or 'production'`);
    process.exit(1);
  }

  // Check validation result
  if (!validation.valid) {
    error('ENVIRONMENT MISCONFIGURATION DETECTED');
    error(validation.error);
    
    if (validation.fix) {
      info(`\nFix:`);
      log(`  ${validation.fix}`, 'yellow');
      log(`  npm run build:${mode}`, 'yellow');
    }

    log(`\n${colors.bold}Build aborted to prevent misconfiguration.${colors.reset}`, 'red');
    process.exit(1);
  }

  if (validation.warning) {
    warning('Validation passed with warnings');
  } else {
    success('Environment validation passed');
  }

  // Additional checks
  const nodeEnv = getEnvVar('NODE_ENV');
  if (isProduction && nodeEnv !== 'production') {
    warning(`NODE_ENV is '${nodeEnv}' but building for production. Consider setting NODE_ENV=production`);
  }

  if (isDevelopment && nodeEnv === 'production') {
    warning(`NODE_ENV is 'production' but building for development. This may cause issues.`);
  }

  log(`\n${colors.bold}✅ Safe to proceed with build${colors.reset}`, 'green');
  process.exit(0);
}

// Run validation
try {
  validate();
} catch (err) {
  error(`Validation script error: ${err.message}`);
  console.error(err);
  process.exit(1);
}



/**
 * Multi-Entity Zoho Books Configuration
 * 
 * Each entity can have its own Zoho Books account.
 * In sandbox, use mock=true for testing without real API calls.
 * In production, set mock=false and provide real credentials.
 */

export interface ZohoAccountConfig {
  entityName: string;
  enabled: boolean;
  mock: boolean; // If true, simulates Zoho API without real calls
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  organizationId: string;
  organizationName: string;
  expenseAccountName: string;
  paidThroughAccountName: string;
  apiBaseUrl?: string;
  accountsBaseUrl?: string;
}

/**
 * Load Zoho account configuration from environment variables
 * Supports multiple entities with their own Zoho accounts
 */
export function loadZohoAccountsConfig(): Map<string, ZohoAccountConfig> {
  const accounts = new Map<string, ZohoAccountConfig>();

  // ========== ENTITY: HAUTE (Real Account in Sandbox & Production) ==========
  if (process.env.ZOHO_HAUTE_ENABLED === 'true' || process.env.ZOHO_CLIENT_ID) {
    accounts.set('haute', {
      entityName: 'haute',
      enabled: true,
      mock: process.env.ZOHO_HAUTE_MOCK === 'true',
      clientId: process.env.ZOHO_CLIENT_ID || process.env.ZOHO_HAUTE_CLIENT_ID || '',
      clientSecret: process.env.ZOHO_CLIENT_SECRET || process.env.ZOHO_HAUTE_CLIENT_SECRET || '',
      refreshToken: process.env.ZOHO_REFRESH_TOKEN || process.env.ZOHO_HAUTE_REFRESH_TOKEN || '',
      organizationId: process.env.ZOHO_ORGANIZATION_ID || process.env.ZOHO_HAUTE_ORGANIZATION_ID || '',
      organizationName: process.env.ZOHO_HAUTE_ORG_NAME || 'Haute Brands',
      expenseAccountName: process.env.ZOHO_EXPENSE_ACCOUNT_NAME || process.env.ZOHO_HAUTE_EXPENSE_ACCOUNT || 'Travel Expenses',
      paidThroughAccountName: process.env.ZOHO_PAID_THROUGH_ACCOUNT || process.env.ZOHO_HAUTE_PAID_THROUGH || 'Petty Cash',
      apiBaseUrl: process.env.ZOHO_API_BASE_URL || 'https://www.zohoapis.com/books/v3',
      accountsBaseUrl: process.env.ZOHO_ACCOUNTS_BASE_URL || 'https://accounts.zoho.com/oauth/v2',
    });
  }

  // ========== ENTITY: ALPHA (Mock Account for Sandbox) ==========
  if (process.env.ZOHO_ALPHA_ENABLED === 'true') {
    accounts.set('alpha', {
      entityName: 'alpha',
      enabled: true,
      mock: process.env.ZOHO_ALPHA_MOCK !== 'false', // Default to mock
      clientId: process.env.ZOHO_ALPHA_CLIENT_ID || 'mock.alpha.client.id',
      clientSecret: process.env.ZOHO_ALPHA_CLIENT_SECRET || 'mock_alpha_secret',
      refreshToken: process.env.ZOHO_ALPHA_REFRESH_TOKEN || 'mock.alpha.refresh.token',
      organizationId: process.env.ZOHO_ALPHA_ORGANIZATION_ID || '100001',
      organizationName: process.env.ZOHO_ALPHA_ORG_NAME || 'Alpha Corporation (Mock)',
      expenseAccountName: process.env.ZOHO_ALPHA_EXPENSE_ACCOUNT || 'Business Expenses',
      paidThroughAccountName: process.env.ZOHO_ALPHA_PAID_THROUGH || 'Corporate Account',
      apiBaseUrl: 'https://www.zohoapis.com/books/v3',
      accountsBaseUrl: 'https://accounts.zoho.com/oauth/v2',
    });
  }

  // ========== ENTITY: BETA (Mock Account for Sandbox) ==========
  if (process.env.ZOHO_BETA_ENABLED === 'true') {
    accounts.set('beta', {
      entityName: 'beta',
      enabled: true,
      mock: process.env.ZOHO_BETA_MOCK !== 'false', // Default to mock
      clientId: process.env.ZOHO_BETA_CLIENT_ID || 'mock.beta.client.id',
      clientSecret: process.env.ZOHO_BETA_CLIENT_SECRET || 'mock_beta_secret',
      refreshToken: process.env.ZOHO_BETA_REFRESH_TOKEN || 'mock.beta.refresh.token',
      organizationId: process.env.ZOHO_BETA_ORGANIZATION_ID || '100002',
      organizationName: process.env.ZOHO_BETA_ORG_NAME || 'Beta Industries (Mock)',
      expenseAccountName: process.env.ZOHO_BETA_EXPENSE_ACCOUNT || 'Operating Expenses',
      paidThroughAccountName: process.env.ZOHO_BETA_PAID_THROUGH || 'Main Account',
      apiBaseUrl: 'https://www.zohoapis.com/books/v3',
      accountsBaseUrl: 'https://accounts.zoho.com/oauth/v2',
    });
  }

  // ========== ENTITY: GAMMA (Mock Account for Sandbox) ==========
  if (process.env.ZOHO_GAMMA_ENABLED === 'true') {
    accounts.set('gamma', {
      entityName: 'gamma',
      enabled: true,
      mock: process.env.ZOHO_GAMMA_MOCK !== 'false', // Default to mock
      clientId: process.env.ZOHO_GAMMA_CLIENT_ID || 'mock.gamma.client.id',
      clientSecret: process.env.ZOHO_GAMMA_CLIENT_SECRET || 'mock_gamma_secret',
      refreshToken: process.env.ZOHO_GAMMA_REFRESH_TOKEN || 'mock.gamma.refresh.token',
      organizationId: process.env.ZOHO_GAMMA_ORGANIZATION_ID || '100003',
      organizationName: process.env.ZOHO_GAMMA_ORG_NAME || 'Gamma Enterprises (Mock)',
      expenseAccountName: process.env.ZOHO_GAMMA_EXPENSE_ACCOUNT || 'General Expenses',
      paidThroughAccountName: process.env.ZOHO_GAMMA_PAID_THROUGH || 'Business Checking',
      apiBaseUrl: 'https://www.zohoapis.com/books/v3',
      accountsBaseUrl: 'https://accounts.zoho.com/oauth/v2',
    });
  }

  // ========== ENTITY: DELTA (Mock Account for Sandbox) ==========
  if (process.env.ZOHO_DELTA_ENABLED === 'true') {
    accounts.set('delta', {
      entityName: 'delta',
      enabled: true,
      mock: process.env.ZOHO_DELTA_MOCK !== 'false', // Default to mock
      clientId: process.env.ZOHO_DELTA_CLIENT_ID || 'mock.delta.client.id',
      clientSecret: process.env.ZOHO_DELTA_CLIENT_SECRET || 'mock_delta_secret',
      refreshToken: process.env.ZOHO_DELTA_REFRESH_TOKEN || 'mock.delta.refresh.token',
      organizationId: process.env.ZOHO_DELTA_ORGANIZATION_ID || '100004',
      organizationName: process.env.ZOHO_DELTA_ORG_NAME || 'Delta Solutions (Mock)',
      expenseAccountName: process.env.ZOHO_DELTA_EXPENSE_ACCOUNT || 'Company Expenses',
      paidThroughAccountName: process.env.ZOHO_DELTA_PAID_THROUGH || 'Operating Account',
      apiBaseUrl: 'https://www.zohoapis.com/books/v3',
      accountsBaseUrl: 'https://accounts.zoho.com/oauth/v2',
    });
  }

  return accounts;
}

/**
 * Get all enabled Zoho accounts (real or mock)
 */
export function getEnabledZohoAccounts(): ZohoAccountConfig[] {
  const accounts = loadZohoAccountsConfig();
  return Array.from(accounts.values()).filter(account => account.enabled);
}

/**
 * Get Zoho account config for a specific entity
 */
export function getZohoAccountForEntity(entityName: string): ZohoAccountConfig | undefined {
  const accounts = loadZohoAccountsConfig();
  return accounts.get(entityName.toLowerCase());
}

/**
 * Check if Zoho integration is configured for an entity
 */
export function isZohoConfiguredForEntity(entityName: string): boolean {
  const account = getZohoAccountForEntity(entityName);
  return account !== undefined && account.enabled;
}

/**
 * Check if entity uses mock Zoho account
 */
export function isEntityMocked(entityName: string): boolean {
  const account = getZohoAccountForEntity(entityName);
  return account !== undefined && account.mock;
}


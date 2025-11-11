/**
 * Dashboard Services Index
 * Re-exports all dashboard-related services
 */

export { VersionService } from './VersionService';
export { SessionService } from './SessionService';
export { OCRMetricsService } from './OCRMetricsService';

// Note: Additional services (Summary, Metrics, Alerts, Analytics, Audit) 
// remain in DevDashboardService.ts for now due to complexity and interdependencies.
// Future refactor can extract these as well.


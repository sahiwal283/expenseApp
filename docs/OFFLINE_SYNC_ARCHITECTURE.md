# 🔄 Offline-First Sync Architecture

## Overview

This document outlines the comprehensive offline-first architecture implementation for the ExpenseApp, designed specifically for trade show environments with intermittent connectivity.

## Problem Statement

Users at trade shows experience:
- Poor or intermittent network connectivity
- Data loss when app restarts or cache clears before sync
- No automated sync process when connectivity returns
- Stale local data vs. remote database inconsistencies
- Privacy risks from cached data on shared devices

## Architecture Components

### 1. Persistent Storage Layer

**Technology**: IndexedDB via Dexie.js (web) / SQLite (mobile)

**Schema**:
```typescript
// Sync Queue Schema
interface SyncQueueItem {
  id: string;              // UUID
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE';
  entity: 'expense' | 'user' | 'event';
  data: any;               // The actual payload
  localId?: string;        // Temporary UUID for new items
  remoteId?: string;       // Backend ID after sync
  timestamp: number;       // When action was queued
  retryCount: number;      // Number of sync attempts
  lastAttempt?: number;    // Timestamp of last sync attempt
  error?: string;          // Last error message
  status: 'pending' | 'syncing' | 'failed' | 'success';
  deviceId: string;        // For conflict resolution
  userId: string;          // User who made the change
}

// Local Data Cache
interface CachedExpense extends Expense {
  _localId?: string;       // Temporary ID before backend sync
  _syncStatus: 'synced' | 'pending' | 'failed';
  _lastModified: number;   // Client timestamp
  _version: number;        // For conflict resolution
}
```

### 2. Sync Queue Manager

**Responsibilities**:
- Queue all offline actions (create, update, delete, approve)
- Process queue when connectivity restored
- Retry failed syncs with exponential backoff
- Track sync status and errors
- Reconcile temporary IDs with backend IDs

**Retry Strategy**:
- Max retries: 5
- Backoff: 2^retryCount * 1000ms (1s, 2s, 4s, 8s, 16s)
- After max retries, mark as "failed" for manual resolution

### 3. Network Detection

**Methods**:
- `navigator.onLine` API (basic browser connectivity)
- Periodic health check pings to backend (`/api/health`)
- WebSocket connection status (if implemented)
- Service Worker fetch event monitoring

**States**:
- `online`: Full connectivity, sync active
- `offline`: No connectivity, queue only
- `degraded`: Slow/unstable connection, queue with warning

### 4. Conflict Resolution

**Strategy**: Last-Write-Wins with timestamp arbitration

**Process**:
1. Each record has `updated_at` timestamp (backend authoritative)
2. Local changes track `_lastModified` timestamp
3. On sync, compare timestamps:
   - Local newer: Apply local changes
   - Remote newer: Discard local, fetch remote
   - Same: No action needed
4. For critical fields, prompt user for manual resolution

**Edge Cases**:
- Multiple devices editing same record
- Backend changes during offline period
- Deleted records that were edited offline

### 5. Temporary ID Management

**Process**:
1. Generate UUID for locally created records
2. Store mapping: `localId → remoteId`
3. On successful sync, replace local ID with backend ID
4. Update all references (foreign keys, relationships)
5. Mark as synced and remove from queue

**Deduplication**:
- Check for duplicate submissions before sync
- Backend should implement upsert logic
- Use idempotency keys in API requests

### 6. Data Encryption

**Web (IndexedDB)**:
- Use Web Crypto API for AES-GCM encryption
- Derive key from user session token + device fingerprint
- Encrypt sensitive fields: amounts, merchant names, receipt data
- Decrypt on read, encrypt on write

**Mobile (SQLite)**:
- Use native OS encryption (SQLCipher for SQLite)
- Platform-specific secure storage for keys

**On Logout**:
- Delete all encryption keys
- Clear all local data
- Purge sync queue

### 7. Background Sync

**Web (Service Worker)**:
```javascript
// Register for background sync
if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
  await registration.sync.register('expense-sync');
}

// In service worker
self.addEventListener('sync', event => {
  if (event.tag === 'expense-sync') {
    event.waitUntil(syncQueueManager.processQueue());
  }
});
```

**Fallback for iOS Safari**:
- Use visibility change events
- Use page focus/blur events
- Manual "Sync Now" button

**Mobile Native**:
- Use background tasks (WorkManager on Android, BGTaskScheduler on iOS)
- Schedule periodic sync attempts
- Wake on connectivity change

### 8. User Feedback & UI

**Components to Add**:

1. **Sync Status Bar** (persistent header/footer)
   - 🟢 Online - All synced
   - 🟡 Syncing - X items pending
   - 🔴 Offline - Working offline
   - ⚠️ Sync failed - X items failed

2. **Notification Banner** (dismissible toast)
   - "Expense saved locally - will sync when online"
   - "Failed to save expense - [error details]"
   - "Synced 5 expenses successfully"
   - "Conflict detected - please review"

3. **Pending Actions View** (new page/modal)
   - List all queued items with status
   - Manual retry button per item
   - Clear/delete failed items
   - "Retry All" button

4. **Sync Controls**
   - "Sync Now" button (manual trigger)
   - "Clear Cache" button (with warning)
   - Sync settings (auto-sync on/off, retry limits)

5. **Data Source Indicators**
   - Badge on expense list: "Local" vs "Synced"
   - Timestamp of last sync
   - Warning before logout if unsync data exists

## Implementation Phases

### Phase 1: Foundation (Tasks 1-3)
- Install Dexie.js: `npm install dexie`
- Create IndexedDB schema and database wrapper
- Implement network detection utility
- Set up sync queue data structure

### Phase 2: Sync Engine (Tasks 4-6)
- Build SyncQueueManager class
- Implement queue processing logic
- Add retry mechanism with exponential backoff
- Handle temporary ID reconciliation
- Implement conflict resolution

### Phase 3: Security (Task 7)
- Add encryption utilities (Web Crypto API)
- Encrypt sensitive data on write
- Decrypt on read
- Implement secure logout/cleanup

### Phase 4: UI/UX (Tasks 8-11)
- Create notification/toast system
- Build sync status indicator component
- Add Pending Actions page
- Implement manual sync controls
- Add data source badges

### Phase 5: Service Worker (Task 12)
- Update service worker for background sync
- Add fallback for unsupported browsers
- Test on iOS Safari, Chrome, Firefox

### Phase 6: Backend Updates (Tasks 13-14)
- Make expense endpoints idempotent
- Add batch create/update endpoints
- Implement upsert logic
- Add version info to health check
- Return better error messages for conflicts

### Phase 7: Testing & Deployment (Tasks 15-17)
- Test offline scenarios in sandbox
- Test sync with multiple devices
- Test conflict resolution
- Verify encryption/security
- Document all features
- Deploy to production

## API Changes Required

### 1. Health Check Endpoint
```typescript
GET /api/health
Response: {
  status: 'ok',
  version: '1.0.9',
  timestamp: '2025-10-14T20:00:00Z',
  database: 'connected'
}
```

### 2. Batch Operations
```typescript
POST /api/expenses/batch
Body: {
  items: [
    { action: 'create', data: {...}, idempotencyKey: 'uuid' },
    { action: 'update', id: 'xxx', data: {...} }
  ]
}
Response: {
  success: [{ localId: 'uuid1', remoteId: 'db-id-1', ... }],
  failed: [{ localId: 'uuid2', error: 'Validation failed' }]
}
```

### 3. Sync Endpoint
```typescript
POST /api/sync
Body: {
  lastSyncTime: '2025-10-14T19:00:00Z',
  items: [ /* queued changes */ ]
}
Response: {
  updates: [ /* server changes since lastSyncTime */ ],
  conflicts: [ /* items with conflicts */ ],
  success: [ /* successfully applied items */ ],
  failed: [ /* items that failed */ ]
}
```

## Database Schema Changes

### Add Sync Metadata to All Tables
```sql
ALTER TABLE expenses ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE expenses ADD COLUMN device_id VARCHAR(255);
ALTER TABLE expenses ADD COLUMN last_sync_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE users ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN device_id VARCHAR(255);
ALTER TABLE users ADD COLUMN last_sync_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE events ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE events ADD COLUMN device_id VARCHAR(255);
ALTER TABLE events ADD COLUMN last_sync_at TIMESTAMP WITH TIME ZONE;
```

### Create Idempotency Table
```sql
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key VARCHAR(255) PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP + INTERVAL '7 days'
);

CREATE INDEX idx_idempotency_expires ON idempotency_keys(expires_at);
```

## Security Considerations

1. **Encryption Keys**:
   - Derive from user session + device fingerprint
   - Never store keys in plain text
   - Rotate on password change

2. **Shared Devices**:
   - Force logout after inactivity (already implemented)
   - Clear all local data on logout
   - Option to "Sign out of all devices"

3. **Data Leakage**:
   - Encrypt all PII (amounts, merchant names, receipts)
   - Use secure deletion (overwrite, not just delete)
   - Implement data retention policies

4. **Audit Trail**:
   - Log all sync events (success, failure, conflicts)
   - Track device IDs and timestamps
   - Include in developer dashboard

## Browser/Platform Support

| Feature | Chrome | Firefox | Safari | iOS Safari | Android WebView |
|---------|--------|---------|--------|------------|-----------------|
| IndexedDB | ✅ | ✅ | ✅ | ✅ | ✅ |
| Service Worker | ✅ | ✅ | ✅ | ⚠️ Limited | ✅ |
| Background Sync | ✅ | ✅ | ❌ | ❌ | ✅ |
| Web Crypto API | ✅ | ✅ | ✅ | ✅ | ✅ |

**Fallbacks**:
- iOS Safari: Use visibility change + manual sync
- All platforms: Periodic sync on app open/focus

## Testing Scenarios

1. **Offline Creation**:
   - Create expense while offline
   - Restart app
   - Go online
   - Verify expense syncs and gets backend ID

2. **Conflict Resolution**:
   - Edit expense on device A (offline)
   - Edit same expense on device B (online)
   - Bring device A online
   - Verify conflict is detected and resolved

3. **Batch Operations**:
   - Create 10 expenses offline
   - Go online
   - Verify all sync in batch
   - Verify partial failure handling

4. **Security**:
   - Create expense with sensitive data
   - Inspect IndexedDB
   - Verify data is encrypted
   - Logout and verify data is cleared

5. **Edge Cases**:
   - Intermittent connectivity (flaky network)
   - Backend errors during sync
   - App crash during sync
   - Multiple tabs open
   - Device time change

## Performance Considerations

1. **Queue Size**:
   - Limit queue to 100 items max
   - Archive old completed items
   - Warn user if queue is full

2. **Batch Size**:
   - Send max 20 items per batch
   - Prevent overwhelming backend
   - Show progress indicator

3. **Encryption Overhead**:
   - Encrypt only sensitive fields
   - Use async encryption to avoid blocking UI
   - Cache decrypted data in memory (with limits)

4. **IndexedDB Performance**:
   - Use indexes for frequent queries
   - Batch reads/writes
   - Clean up old data periodically

## Monitoring & Metrics

Track in developer dashboard:
- Total items in sync queue
- Sync success/failure rate
- Average sync time
- Conflict rate
- Queue age (oldest item)
- Network uptime percentage
- Encryption performance

## Rollback Plan

If issues arise in production:
1. Feature flag to disable offline mode
2. Fall back to original localStorage + API
3. Export queued data before rollback
4. Manual sync after rollback
5. Analyze logs and fix issues
6. Re-enable with fixes

## Version History

- **v1.0.9**: Initial offline-first architecture implementation
  - IndexedDB setup
  - Sync queue manager
  - Network detection
  - Basic conflict resolution

- **v1.1.0**: Enhanced sync features
  - Background sync (Service Worker)
  - Data encryption
  - Batch operations
  - Pending actions UI

- **v1.2.0**: Advanced features
  - Multi-device conflict resolution
  - Comprehensive audit trail
  - Performance optimizations

## References

- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Dexie.js Documentation](https://dexie.org/)
- [Service Worker Background Sync](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [Offline First Patterns](https://offlinefirst.org/)

---

**Document Version**: 1.0  
**Last Updated**: October 14, 2025  
**Author**: AI Assistant  
**Status**: Implementation in Progress


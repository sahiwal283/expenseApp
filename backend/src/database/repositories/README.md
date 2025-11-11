# Repository Pattern Documentation

## Overview

The Repository Pattern provides a clean abstraction layer for database operations, separating data access logic from business logic in routes and services. This improves code maintainability, testability, and reusability.

## Architecture

```
┌─────────────────┐
│  Routes/        │  ← HTTP request handling
│  Controllers    │  ← Input validation
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Services       │  ← Business logic
│  (Optional)     │  ← Orchestration
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Repositories   │  ← Data access layer
│                 │  ← Query building
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  PostgreSQL     │  ← Database
└─────────────────┘
```

## Benefits

### 1. **Separation of Concerns**
- Routes focus on HTTP logic and validation
- Services focus on business logic
- Repositories focus on data access

### 2. **Code Reusability**
- Common queries are centralized
- No duplicate query code across routes
- Consistent data access patterns

### 3. **Maintainability**
- Easy to update queries in one place
- Type-safe interfaces for data structures
- Self-documenting method names

### 4. **Testability**
- Repositories can be mocked for unit testing
- Integration tests can target specific repositories
- Easier to test business logic independently

### 5. **Query Optimization**
- Performance improvements in one place
- Consistent use of indexes
- Centralized JOIN optimization

## Available Repositories

### 1. BaseRepository
Base class providing common CRUD operations for all repositories.

**Methods:**
- `findById(id)` - Find single record by ID
- `findAll()` - Get all records
- `findBy(column, value)` - Find by column value
- `count()` - Count total records
- `exists(id)` - Check if record exists
- `delete(id)` - Delete by ID
- `buildQuery(options)` - Build complex queries

### 2. ExpenseRepository
Handles all expense-related database operations.

**Key Methods:**
- `findByUserId(userId)` - Get user's expenses
- `findByEventId(eventId)` - Get event expenses
- `findByStatus(status)` - Filter by status
- `create(data)` - Create new expense
- `update(id, data)` - Update expense
- `updateStatus(id, status)` - Update approval status
- `findWithFilters(filters)` - Advanced filtering
- `findAllWithDetails()` - Expenses with JOINs
- `getUserStats(userId)` - User expense statistics

### 3. UserRepository
Handles all user-related database operations.

**Key Methods:**
- `findByEmail(email)` - Find by email
- `findByEmailSafe(email)` - Without password
- `findByRole(role)` - Get users by role
- `findAllSafe()` - All users without passwords
- `create(data)` - Create new user
- `update(id, data)` - Update user
- `updatePassword(id, hash)` - Change password
- `emailExists(email)` - Check email uniqueness
- `countByRole(role)` - Count users per role

### 4. EventRepository
Handles all event (trade show) database operations.

**Key Methods:**
- `findByStatus(status)` - Events by status
- `findByZohoEntity(entity)` - By Zoho entity
- `findActive()` - Active/upcoming events
- `findUpcoming(days)` - Next N days
- `findByDateRange(start, end)` - Date filtering
- `create(data)` - Create event
- `update(id, data)` - Update event
- `updateStatus(id, status)` - Change status
- `findByIdWithStats(id)` - Event with statistics
- `findAllWithStats()` - All events with stats
- `getTotalBudget()` - Sum of all budgets

### 5. AuditLogRepository
Handles all audit log database operations.

**Key Methods:**
- `create(data)` - Log new audit entry
- `findByUserId(userId)` - User's actions
- `findByAction(action)` - Filter by action
- `findByEntity(type, id)` - Entity history
- `findWithFilters(filters)` - Advanced filtering
- `getRecent(limit)` - Latest logs
- `getActionStats(timeRange)` - Action analytics
- `getFailures(timeRange)` - Failed actions
- `deleteOlderThan(days)` - Cleanup old logs

### 6. ApiRequestRepository
Handles all API request tracking and analytics.

**Key Methods:**
- `create(data)` - Log API request
- `findByUserId(userId)` - User's requests
- `findByPath(path)` - Requests to endpoint
- `findSlowRequests(threshold)` - Performance issues
- `findFailedRequests()` - 5xx errors
- `getStats(timeRange)` - API analytics
- `getEndpointMetrics(timeRange)` - Per-endpoint stats
- `getHourlyStats(hours)` - Time series data
- `deleteOlderThan(days)` - Cleanup

### 7. ChecklistRepository
Handles all event checklist database operations (flights, hotels, car rentals, etc.).

**Key Methods:**
- `findByEventId(eventId)` - Get checklist
- `create(eventId)` - New checklist
- `updateMainFields(id, data)` - Update booth/electricity
- `getFlights(checklistId)` - All flights
- `createFlight(data)` - Add flight
- `updateFlight(id, data)` - Modify flight
- `deleteFlight(id)` - Remove flight
- `getHotels(checklistId)` - All hotels
- `createHotel(data)` - Add hotel
- `getCarRentals(checklistId)` - All rentals
- `createCarRental(data)` - Add rental
- `getBoothShipping(checklistId)` - Shipping info
- `getCustomItems(checklistId)` - Custom tasks
- `createCustomItem(data)` - Add custom task

## Usage Examples

### Example 1: Simple CRUD in Route

**Before (Direct Queries):**
```typescript
// routes/users.ts
router.get('/:id', async (req, res) => {
  const result = await query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  res.json(result.rows[0]);
});
```

**After (Using Repository):**
```typescript
// routes/users.ts
import { userRepository } from '../database/repositories';

router.get('/:id', async (req, res) => {
  const user = await userRepository.findByIdSafe(req.params.id);
  res.json(user);
});
```

### Example 2: Complex Queries in Service

**Before (Direct Queries):**
```typescript
// services/ReportService.ts
async getExpenseReport(filters: Filters) {
  const conditions = [];
  const params = [];
  // ... complex query building logic ...
  const result = await query(queryString, params);
  return result.rows;
}
```

**After (Using Repository):**
```typescript
// services/ReportService.ts
import { expenseRepository } from '../database/repositories';

async getExpenseReport(filters: Filters) {
  return await expenseRepository.findWithFiltersAndDetails(filters);
}
```

### Example 3: Transactional Operations

```typescript
import { pool } from '../config/database';
import { expenseRepository, auditLogRepository } from '../database/repositories';

async function approveExpense(expenseId: string, userId: string) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Update expense status
    const expense = await expenseRepository.updateStatus(expenseId, 'approved');
    
    // Log the approval
    await auditLogRepository.create({
      userId,
      action: 'expense_approved',
      entityType: 'expense',
      entityId: expenseId,
      status: 'success'
    });
    
    await client.query('COMMIT');
    return expense;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

### Example 4: Using Statistics Methods

```typescript
import { eventRepository } from '../database/repositories';

// Get event with participant count and expense stats
const event = await eventRepository.findByIdWithStats(eventId);

console.log(`Event: ${event.name}`);
console.log(`Participants: ${event.participant_count}`);
console.log(`Total Expenses: ${event.total_expenses}`);
console.log(`Pending: ${event.pending_expenses}`);
```

## Migration Guide

### Refactoring Existing Routes

1. **Identify database queries** in your route handler
2. **Check if repository method exists** for that operation
3. **If yes:** Replace query with repository call
4. **If no:** Add new method to appropriate repository
5. **Test** to ensure functionality remains the same

### Creating New Repositories

1. **Extend BaseRepository**
```typescript
export class MyRepository extends BaseRepository<MyType> {
  protected tableName = 'my_table';
}
```

2. **Define TypeScript interface**
```typescript
export interface MyType {
  id: string;
  name: string;
  created_at: string;
}
```

3. **Add custom methods**
```typescript
async findByName(name: string): Promise<MyType | null> {
  const result = await this.executeQuery<MyType>(
    `SELECT * FROM ${this.tableName} WHERE name = $1`,
    [name]
  );
  return result.rows[0] || null;
}
```

4. **Export singleton instance**
```typescript
export const myRepository = new MyRepository();
```

5. **Add to index.ts**
```typescript
export { MyRepository, myRepository } from './MyRepository';
export type { MyType } from './MyRepository';
```

## Best Practices

### ✅ DO:
- Use repositories in services and routes
- Add type definitions for all return values
- Use singleton instances for repositories
- Keep repository methods focused and single-purpose
- Use transactions for multi-step operations
- Document complex query logic
- Use `executeQuery` for error handling

### ❌ DON'T:
- Put business logic in repositories
- Execute raw queries in routes when repository method exists
- Create repositories for every table (use BaseRepository for simple cases)
- Return internal database errors to clients
- Expose password fields in User queries

## Testing

### Unit Tests
```typescript
import { userRepository } from '../repositories';

describe('UserRepository', () => {
  it('should find user by email', async () => {
    const user = await userRepository.findByEmail('test@example.com');
    expect(user).toBeDefined();
    expect(user?.email).toBe('test@example.com');
  });
});
```

### Integration Tests
```typescript
describe('UserRepository Integration', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  it('should create and retrieve user', async () => {
    const newUser = await userRepository.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashed_password',
      role: 'user'
    });

    const found = await userRepository.findById(newUser.id);
    expect(found?.email).toBe('test@example.com');
  });
});
```

## Performance Considerations

### Query Optimization
- Repositories use indexes defined in migrations
- JOINs are optimized in `findWithDetails` methods
- Pagination is built into `buildQuery` method
- Use `LIMIT` to prevent large result sets

### Caching Strategy
- Repositories focus on data access, not caching
- Implement caching at the service layer
- Use Redis for frequently accessed data
- Cache invalidation on write operations

## Future Improvements

- [ ] Add query result caching layer
- [ ] Implement soft delete support in BaseRepository
- [ ] Add bulk insert/update methods
- [ ] Create repository generator CLI tool
- [ ] Add query performance logging
- [ ] Implement read replica support
- [ ] Add database connection pooling metrics
- [ ] Create repository usage analytics

## Contributing

When adding new repositories:
1. Follow the existing patterns
2. Add comprehensive JSDoc comments
3. Include usage examples
4. Update this README
5. Add TypeScript interfaces
6. Export from index.ts
7. Write tests

---

**Last Updated:** November 10, 2025  
**Maintainer:** Database Agent  
**Version:** 1.0.0


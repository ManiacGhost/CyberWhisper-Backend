# Audit Logger Integration Guide

This guide explains how to integrate the audit logging system into your existing CRUD operations.

## Overview

The audit logging system automatically tracks:
- **All CRUD operations** (Create, Read, Update, Delete)
- **Status changes** (User activation/deactivation, Content publish/draft)
- **User information** (Who made the change, IP address, timestamp)
- **Change details** (Before and after values for updates)

## Quick Start Examples

### 1. Blog CRUD Operations

#### Create Blog
```typescript
// In src/routes/blogRoutes.ts - POST /api/blogs
router.post('/', async (req: Request, res: Response) => {
  try {
    const blogData: CreateBlogRequest = { /* ... */ };
    
    const blog = await BlogRepository.createBlog(blogData);

    // Log the creation
    const authReq = req as AuthRequest;
    await logAudit({
      userId: authReq.user?.userId,
      action: 'CREATE',
      entityType: 'BLOG',
      entityId: blog.id,
      entityName: blog.title,
      newValues: blog,
      req,
    });

    res.json({ success: true, data: blog });
  } catch (error) {
    // Log failed attempt
    await logAudit({
      userId: authReq?.user?.userId,
      action: 'CREATE',
      entityType: 'BLOG',
      entityId: 0,
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      req,
    });
    res.status(500).json({ success: false, error: error?.message });
  }
});
```

#### Update Blog
```typescript
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const oldBlog = await BlogRepository.getBlogById(id);
    
    if (!oldBlog) {
      return res.status(404).json({ success: false, error: 'Blog not found' });
    }

    const updatedBlog = await BlogRepository.updateBlog(id, req.body);

    // Log the update with before/after values
    const authReq = req as AuthRequest;
    const { oldValues, newValues } = getChangedFields(oldBlog, updatedBlog);
    
    await logAudit({
      userId: authReq.user?.userId,
      action: 'UPDATE',
      entityType: 'BLOG',
      entityId: id,
      entityName: updatedBlog.title,
      oldValues,
      newValues,
      req,
    });

    res.json({ success: true, data: updatedBlog });
  } catch (error) {
    res.status(500).json({ success: false, error: error?.message });
  }
});
```

#### Delete Blog
```typescript
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const blog = await BlogRepository.getBlogById(id);
    
    if (!blog) {
      return res.status(404).json({ success: false, error: 'Blog not found' });
    }

    const deleted = await BlogRepository.deleteBlog(id);

    // Delete associated images and log
    if (blog.thumbnail_url) {
      const thumbnailPublicId = extractPublicIdFromUrl(blog.thumbnail_url);
      await deleteImageFromCloudinary(thumbnailPublicId);
    }

    const authReq = req as AuthRequest;
    await logAudit({
      userId: authReq.user?.userId,
      action: 'DELETE',
      entityType: 'BLOG',
      entityId: id,
      entityName: blog.title,
      oldValues: blog,
      req,
    });

    res.json({ success: true, message: 'Blog deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error?.message });
  }
});
```

#### Update Blog Status (with logging)
```typescript
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    
    const blog = await BlogRepository.getBlogById(id);
    if (!blog) {
      return res.status(404).json({ success: false, error: 'Blog not found' });
    }

    const updatedBlog = await BlogRepository.updateBlog(id, { status });

    // Log status change
    const authReq = req as AuthRequest;
    await logContentStatusChange(
      'BLOG',
      id,
      blog.title,
      blog.status,
      status,
      authReq.user?.userId,
      getClientIp(req),
      `Status changed from ${blog.status} to ${status}`
    );

    res.json({ success: true, data: updatedBlog });
  } catch (error) {
    res.status(500).json({ success: false, error: error?.message });
  }
});
```

### 2. Course CRUD Operations

```typescript
// Similar pattern for courses
import { logAudit, getChangedFields, logContentStatusChange, getClientIp } from '../utils/auditLogger';

// Create Course
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const course = await CourseRepository.createCourse(req.body);

    await logAudit({
      userId: req.user?.userId,
      action: 'CREATE',
      entityType: 'COURSE',
      entityId: course.id,
      entityName: course.title,
      newValues: course,
      req,
    });

    res.json({ success: true, data: course });
  } catch (error) {
    res.status(500).json({ success: false, error: error?.message });
  }
});

// Update Course
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const oldCourse = await CourseRepository.getCourseById(id);
    const updatedCourse = await CourseRepository.updateCourse(id, req.body);

    const { oldValues, newValues } = getChangedFields(oldCourse, updatedCourse);

    await logAudit({
      userId: req.user?.userId,
      action: 'UPDATE',
      entityType: 'COURSE',
      entityId: id,
      entityName: updatedCourse.title,
      oldValues,
      newValues,
      req,
    });

    res.json({ success: true, data: updatedCourse });
  } catch (error) {
    res.status(500).json({ success: false, error: error?.message });
  }
});

// Delete Course
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const course = await CourseRepository.getCourseById(id);
    await CourseRepository.deleteCourse(id);

    await logAudit({
      userId: req.user?.userId,
      action: 'DELETE',
      entityType: 'COURSE',
      entityId: id,
      entityName: course.title,
      oldValues: course,
      req,
    });

    res.json({ success: true, message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error?.message });
  }
});
```

### 3. User Management with Status Changes

```typescript
import { logAudit, logUserStatusChange, getClientIp } from '../utils/auditLogger';

// Activate User
router.post('/:id/activate', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const user = await UserRepository.getUserById(id);

    if (user.status === 'ACTIVE') {
      return res.status(400).json({ success: false, error: 'User already active' });
    }

    const updatedUser = await UserRepository.updateUser(id, { status: 'ACTIVE' });

    // Log both audit and user status change
    await logAudit({
      userId: req.user?.userId,
      action: 'ACTIVATE',
      entityType: 'USER',
      entityId: id,
      entityName: `${user.first_name} ${user.last_name}`,
      oldValues: { status: user.status },
      newValues: { status: 'ACTIVE' },
      req,
    });

    await logUserStatusChange(
      id,
      user.status,
      'ACTIVE',
      req.user?.userId,
      getClientIp(req),
      'User activated by admin'
    );

    res.json({ success: true, data: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, error: error?.message });
  }
});

// Deactivate User
router.post('/:id/deactivate', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const user = await UserRepository.getUserById(id);

    if (user.status === 'INACTIVE') {
      return res.status(400).json({ success: false, error: 'User already inactive' });
    }

    const updatedUser = await UserRepository.updateUser(id, { status: 'INACTIVE' });

    await logAudit({
      userId: req.user?.userId,
      action: 'DEACTIVATE',
      entityType: 'USER',
      entityId: id,
      entityName: `${user.first_name} ${user.last_name}`,
      oldValues: { status: user.status },
      newValues: { status: 'INACTIVE' },
      req,
    });

    await logUserStatusChange(
      id,
      user.status,
      'INACTIVE',
      req.user?.userId,
      getClientIp(req),
      'User deactivated by admin'
    );

    res.json({ success: true, data: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, error: error?.message });
  }
});

// Delete User
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const user = await UserRepository.getUserById(id);
    
    await UserRepository.deleteUser(id);

    await logAudit({
      userId: req.user?.userId,
      action: 'DELETE',
      entityType: 'USER',
      entityId: id,
      entityName: `${user.first_name} ${user.last_name}`,
      oldValues: user,
      req,
    });

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error?.message });
  }
});
```

### 4. Batch CRUD Operations

```typescript
import { logAudit, getChangedFields } from '../utils/auditLogger';

// Create Batch
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const batch = await BatchRepository.createBatch(req.body);

    await logAudit({
      userId: req.user?.userId,
      action: 'CREATE',
      entityType: 'BATCH',
      entityId: batch.id,
      entityName: batch.program_name,
      newValues: batch,
      req,
    });

    res.json({ success: true, data: batch });
  } catch (error) {
    res.status(500).json({ success: false, error: error?.message });
  }
});

// Update Batch
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const oldBatch = await BatchRepository.getBatchById(id);
    const updatedBatch = await BatchRepository.updateBatch(id, req.body);

    const { oldValues, newValues } = getChangedFields(oldBatch, updatedBatch);

    await logAudit({
      userId: req.user?.userId,
      action: 'UPDATE',
      entityType: 'BATCH',
      entityId: id,
      entityName: updatedBatch.program_name,
      oldValues,
      newValues,
      req,
    });

    res.json({ success: true, data: updatedBatch });
  } catch (error) {
    res.status(500).json({ success: false, error: error?.message });
  }
});

// Delete Batch
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const batch = await BatchRepository.getBatchById(id);
    
    await BatchRepository.deleteBatch(id);

    await logAudit({
      userId: req.user?.userId,
      action: 'DELETE',
      entityType: 'BATCH',
      entityId: id,
      entityName: batch.program_name,
      oldValues: batch,
      req,
    });

    res.json({ success: true, message: 'Batch deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error?.message });
  }
});
```

## Available API Endpoints

### Fetch Audit Logs
```
GET /api/audit-logs?page=1&limit=50&entityType=BLOG&action=CREATE&startDate=2024-01-01&endDate=2024-12-31
```

### Get Logs for Specific Entity
```
GET /api/audit-logs/entity/BLOG/123
```

### Get Logs Created by Specific User
```
GET /api/audit-logs/user/456
```

### Get User Status History
```
GET /api/audit-logs/user/456/status-history
```

### Get Content Status History
```
GET /api/audit-logs/content/BLOG/123/status-history
```

### Get Activity Summary (Dashboard)
```
GET /api/audit-logs/activity-summary?daysBack=7
```

### Export Audit Logs
```
GET /api/audit-logs/export?startDate=2024-01-01&endDate=2024-12-31&entityType=BLOG
```

### Cleanup Old Logs
```
POST /api/audit-logs/cleanup
Body: { "daysOld": 90 }
```

## Important Notes

1. **User ID Extraction**: Use the `AuthRequest` interface to access `req.user?.userId`
2. **IP Address & User Agent**: The `logAudit()` function automatically extracts these from the request
3. **Failed Operations**: Set `status: 'FAILED'` and include `errorMessage` when logging errors
4. **Changed Fields**: Use `getChangedFields()` to compare old and new values for updates
5. **Admin Only**: All audit log endpoints are protected with `adminOnlyMiddleware`

## Implementation Checklist

- [ ] Run migration: `006_create_audit_logs_table.sql`
- [ ] Install audit logger utility
- [ ] Add audit logger imports to route files
- [ ] Add `logAudit()` calls to blog CRUD routes
- [ ] Add `logAudit()` calls to course CRUD routes
- [ ] Add `logAudit()` + `logUserStatusChange()` calls to user management routes
- [ ] Add `logAudit()` calls to batch CRUD routes
- [ ] Test audit logs via admin API
- [ ] Review audit logs in admin dashboard

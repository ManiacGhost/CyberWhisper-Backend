# Admin Course Management APIs

All admin course endpoints require authentication and admin role. Include the JWT token in the `Authorization` header as: `Bearer <token>`

---

## 1. Create Course
**POST** `/api/courses/admin`

### Authentication
- Required: `authMiddleware` + `adminOnlyMiddleware`
- Header: `Authorization: Bearer <token>`

### Request Body
```json
{
  "title": "string (required)",
  "faqs": "string (required)",
  "short_description": "string (optional)",
  "description": "string (optional)",
  "outcomes": "string (optional)",
  "language": "string (optional)",
  "category_id": "number (optional)",
  "sub_category_id": "number (optional)",
  "section": "string (optional)",
  "requirements": "string (optional)",
  "price": "number (optional)",
  "discount_flag": "number (optional, default: 0)",
  "discounted_price": "number (optional)",
  "level": "string (optional) - e.g., 'beginner', 'intermediate', 'advanced'",
  "user_id": "string (optional)",
  "thumbnail": "string (optional)",
  "video_url": "string (optional)",
  "course_type": "string (optional)",
  "is_top_course": "number (optional, default: 0)",
  "is_admin": "number (optional)",
  "status": "string (optional, default: 'draft') - e.g., 'draft', 'published'",
  "course_overview_provider": "string (optional)",
  "meta_keywords": "string (optional)",
  "meta_description": "string (optional)",
  "is_free_course": "number (optional)",
  "multi_instructor": "number (optional, default: 0)",
  "enable_drip_content": "number (optional, default: 0)",
  "creator": "number (optional)",
  "expiry_period": "number (optional)",
  "upcoming_image_thumbnail": "string (optional)",
  "publish_date": "string (optional)"
}
```

### Response (Success - 201)
```json
{
  "success": true,
  "message": "Course created successfully",
  "data": {
    "id": 1,
    "title": "Python Basics",
    "faqs": "...",
    "price": 49.99,
    "status": "draft",
    "date_added": 1708000000,
    "last_modified": 1708000000,
    ...
  }
}
```

### Response (Error)
```json
{
  "success": false,
  "error": "Title and FAQs are required"
}
```

---

## 2. Update Course
**PUT** `/api/courses/admin/:id`

### Authentication
- Required: `authMiddleware` + `adminOnlyMiddleware`
- Header: `Authorization: Bearer <token>`

### URL Parameters
- `id` (required): Course ID

### Request Body
```json
{
  "title": "string (optional)",
  "short_description": "string (optional)",
  "description": "string (optional)",
  "price": "number (optional)",
  "status": "string (optional)",
  "is_top_course": "number (optional)",
  "is_free_course": "number (optional)",
  ...
}
```

### Response (Success - 200)
```json
{
  "success": true,
  "message": "Course updated successfully",
  "data": {
    "id": 1,
    "title": "Updated Title",
    "faqs": "...",
    "last_modified": 1708001000,
    ...
  }
}
```

### Response (Error)
```json
{
  "success": false,
  "error": "Course not found"
}
```

---

## 3. Delete Course
**DELETE** `/api/courses/admin/:id`

### Authentication
- Required: `authMiddleware` + `adminOnlyMiddleware`
- Header: `Authorization: Bearer <token>`

### URL Parameters
- `id` (required): Course ID

### Response (Success - 200)
```json
{
  "success": true,
  "message": "Course deleted successfully"
}
```

### Response (Error)
```json
{
  "success": false,
  "error": "Course not found"
}
```

---

## 4. Fetch All Courses (with pagination and filters)
**GET** `/api/courses?page=1&limit=10&category_id=1&status=published&level=beginner`

### Query Parameters
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 10): Items per page
- `category_id` (optional): Filter by category
- `status` (optional): Filter by status (e.g., 'draft', 'published')
- `level` (optional): Filter by level

### Response (Success - 200)
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Python Basics",
      "status": "published",
      "price": 49.99,
      ...
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "pages": 3
  }
}
```

---

## 5. Fetch Single Course
**GET** `/api/courses/:id`

### URL Parameters
- `id` (required): Course ID

### Response (Success - 200)
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Python Basics",
    "description": "...",
    "price": 49.99,
    "status": "published",
    ...
  }
}
```

### Response (Error)
```json
{
  "success": false,
  "error": "Course not found"
}
```

---

## Example Usage

### Create Course (cURL)
```bash
curl -X POST http://localhost:3000/api/courses/admin \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Advanced TypeScript",
    "faqs": "Q: Is this course for beginners? A: No, this is for experienced developers.",
    "price": 99.99,
    "level": "advanced",
    "status": "draft",
    "category_id": 1
  }'
```

### Update Course (cURL)
```bash
curl -X PUT http://localhost:3000/api/courses/admin/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "price": 79.99,
    "status": "published"
  }'
```

### Delete Course (cURL)
```bash
curl -X DELETE http://localhost:3000/api/courses/admin/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Error Status Codes
- `400 Bad Request`: Invalid input or missing required fields
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: User is not an admin
- `404 Not Found`: Course not found
- `500 Internal Server Error`: Server error

---

## Notes
- All timestamps (`date_added`, `last_modified`) are in Unix seconds
- When creating a course without specifying `date_added`, it defaults to the current timestamp
- When updating a course, `last_modified` is automatically updated to the current timestamp
- Empty/null optional fields can be sent as `null` or omitted
- The `discount_flag` (0 or 1) indicates if discount is applied
- The `multi_instructor` field indicates if course has multiple instructors (0 or 1)

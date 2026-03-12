Creator module backend contract (short)

1) GET /api/creator/courses/:id
- Response: { id, title, chapters, content }
- content: string (Markdown) or empty

2) PUT /api/creator/courses/:id
- Request: { content: string }  // markdown string
- Response: 200 OK with updated course

3) POST /api/creator/uploads/image
- Request: multipart/form-data; field name: `image`
- Response (success): { url: 'https://cdn.example.com/uploads/abc.jpg' }
  - The returned `url` will be inserted directly into editor content as absolute URL.

4) POST /api/creator/courses/:id/thumbnail
- Request: multipart/form-data; field name: `thumbnail`
- Response: 200 OK

Notes:
- The frontend converts HTML -> Markdown when saving (using Turndown) and converts Markdown -> HTML when loading (using marked).
- Image URLs embedded in markdown should be absolute URLs returned by the upload endpoint.
- If the backend wants a different response shape, adjust `ViewCourseComponent` to read the URL accordingly.

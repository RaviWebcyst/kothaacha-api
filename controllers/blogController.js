// controllers/blogController.js
const fs = require('fs');
const path = require('path');
const Blog = require('../models/Blog');

// Best-effort delete of an uploaded file (never let cleanup failures break
// a request) — only touches paths under /uploads, never external URLs.
const deleteUploadedFile = (url) => {
  if (!url || !url.startsWith('/uploads/')) return;
  fs.unlink(path.join(__dirname, '..', url), () => {});
};

// GET /api/admin/blogs
exports.getBlogs = async (req, res) => {
  try {
    // Sort ascending first so we can hand out stable auto-increment numbers
    // in creation order, then reverse for newest-first display.
    const blogs = await Blog.find().sort({ createdAt: 1 }).lean();
    const shaped = blogs.map((b, i) => ({ ...b, serial: i + 1 }));
    shaped.reverse();
    return res.json({ success: true, blogs: shaped });
  } catch (error) {
    console.error('Get blogs error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load blog posts' });
  }
};

// POST /api/admin/blogs
// multipart/form-data — the cover image arrives on req.file (field name "image").
exports.createBlog = async (req, res) => {
  try {
    const { title, author, category, content, status } = req.body;

    if (!title || !author) {
      if (req.file) deleteUploadedFile(`/uploads/${req.file.filename}`);
      return res.status(400).json({ success: false, message: 'Title and author are required' });
    }

    const blog = await Blog.create({
      title: title.trim(),
      image: req.file ? `/uploads/${req.file.filename}` : '',
      author: author.trim(),
      category: (category || '').trim(),
      content: content || '',
      status: status === 'published' ? 'published' : 'draft',
    });

    return res.status(201).json({ success: true, blog });
  } catch (error) {
    console.error('Create blog error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create blog post' });
  }
};

// PUT /api/admin/blogs/:id
// multipart/form-data — send `removeImage: "true"` to clear the cover
// photo without replacing it; a new uploaded file otherwise takes over.
exports.updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, author, category, content, status, removeImage } = req.body;

    const blog = await Blog.findById(id);
    if (!blog) {
      if (req.file) deleteUploadedFile(`/uploads/${req.file.filename}`);
      return res.status(404).json({ success: false, message: 'Blog post not found' });
    }

    if (title) blog.title = title.trim();
    if (author) blog.author = author.trim();
    if (category !== undefined) blog.category = category.trim();
    if (content !== undefined) blog.content = content;
    if (status && ['draft', 'published'].includes(status)) blog.status = status;

    if (req.file) {
      deleteUploadedFile(blog.image);
      blog.image = `/uploads/${req.file.filename}`;
    } else if (removeImage === 'true') {
      deleteUploadedFile(blog.image);
      blog.image = '';
    }

    await blog.save();

    return res.json({ success: true, blog });
  } catch (error) {
    console.error('Update blog error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update blog post' });
  }
};

// DELETE /api/admin/blogs/:id
exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog post not found' });
    }
    deleteUploadedFile(blog.image);
    return res.json({ success: true });
  } catch (error) {
    console.error('Delete blog error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete blog post' });
  }
};

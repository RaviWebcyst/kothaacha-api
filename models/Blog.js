const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    image: { type: String, trim: true, default: '' }, // cover photo URL shown in the admin table/details page
    author: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: '' },
    content: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Blog', blogSchema);

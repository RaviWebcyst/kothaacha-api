// seedBlogs.js
// Run with: node seedBlogs.js
//
// Seeds a handful of sample posts into the Blogs collection so the admin
// console's Blog Management tab has something to show. Safe to re-run — it
// skips any title that already exists (though it will backfill a missing
// `image` on an existing match) instead of creating duplicates. Field shape
// matches server/models/Blog.js and the admin form in
// src/pages/AdminDashboard/sections/BlogSection.jsx. Images are placeholder
// photos from picsum.photos, seeded by slug so each post gets a stable,
// distinct image.

const mongoose = require('mongoose');
const dotenv = require('dotenv');

const Blog = require('./models/Blog');

dotenv.config();

const img = (seed) => `https://picsum.photos/seed/${seed}/800/450`;

const BLOGS = [
  {
    title: 'Top 10 Homestays to Experience Authentic Nepali Hospitality',
    image: img('kothaacha-blog-homestays'),
    author: 'Kothaa Cha Team',
    category: 'Travel Guides',
    content: 'Nepal\'s homestays offer a window into local life you simply can\'t get from a hotel room. From the terraced hills of Bandipur to the lakeside villages near Pokhara, here are ten homestays that showcase the warmth of Nepali hospitality...',
    status: 'published',
  },
  {
    title: 'A Weekend Guide to Bandipur: Nepal\'s Hidden Hill Town',
    image: img('kothaacha-blog-bandipur'),
    author: 'Sita Gurung',
    category: 'Destinations',
    content: 'Perched on a ridge between Kathmandu and Pokhara, Bandipur is a preserved Newari town with cobblestone streets and Himalayan views. Here\'s how to spend a perfect weekend there...',
    status: 'published',
  },
  {
    title: 'How to Book the Perfect Trekking Lodge in the Everest Region',
    image: img('kothaacha-blog-everest-lodge'),
    author: 'Pemba Sherpa',
    category: 'Trekking',
    content: 'Choosing the right lodge can make or break your Everest Base Camp trek. This guide covers what to look for, when to book, and our favorite tea houses along the way...',
    status: 'published',
  },
  {
    title: 'Chitwan National Park: Wildlife Safaris and Where to Stay',
    image: img('kothaacha-blog-chitwan'),
    author: 'Kothaa Cha Team',
    category: 'Wildlife',
    content: 'From jungle safaris to canoe rides along the Rapti River, Chitwan National Park is one of Nepal\'s best wildlife destinations. Here are the top resorts and lodges near the park...',
    status: 'published',
  },
  {
    title: 'Newari Architecture 101: What to Look for in Bhaktapur',
    image: img('kothaacha-blog-bhaktapur'),
    author: 'Rajesh Shrestha',
    category: 'Culture',
    content: 'Bhaktapur\'s Durbar Square is a living museum of Newari craftsmanship. Learn to spot the details in the wood carvings, pagoda roofs, and courtyard houses on your next visit...',
    status: 'draft',
  },
  {
    title: 'Budget Travel Nepal: Hostels and Guest Houses Under NPR 2000',
    image: img('kothaacha-blog-budget-travel'),
    author: 'Anisha Rai',
    category: 'Budget Travel',
    content: 'Traveling Nepal on a budget doesn\'t mean sacrificing comfort. We rounded up the best hostels and guest houses across Kathmandu, Pokhara, and Chitwan that won\'t break the bank...',
    status: 'draft',
  },
  {
    title: 'Nagarkot Sunrise: Best Villas and Viewpoints for Mountain Views',
    image: img('kothaacha-blog-nagarkot'),
    author: 'Kothaa Cha Team',
    category: 'Destinations',
    content: 'Nagarkot is famous for its panoramic sunrise views of the Himalayan range. Here\'s where to stay for the best vantage point, and how to plan your early morning hike...',
    status: 'published',
  },
];

const seedBlogs = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    let created = 0;
    let backfilled = 0;
    let skipped = 0;

    for (const data of BLOGS) {
      const existing = await Blog.findOne({ title: data.title });
      if (existing) {
        if (!existing.image && data.image) {
          existing.image = data.image;
          await existing.save();
          backfilled += 1;
        } else {
          skipped += 1;
        }
        continue;
      }
      await Blog.create(data);
      created += 1;
    }

    console.log(`Blog posts seeded: ${created} created, ${backfilled} backfilled with an image, ${skipped} already up to date.`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding blogs:', error);
    process.exit(1);
  }
};

seedBlogs();

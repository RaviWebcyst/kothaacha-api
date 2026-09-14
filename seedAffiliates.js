// seedAffiliates.js
// Run with: node seedAffiliates.js
//
// Mirrors the hardcoded TOP_AFFILIATES array from src/pages/Affiliate/Affiliate.js
// and the single hardcoded "Raj Sharma" profile from
// src/pages/AffiliateProfile/AffiliateProfile.js into a real Affiliates
// collection — same names, areas, and specialties — so both public pages
// read from one source of truth instead of static arrays. Rating/review
// counts are NOT stored here — they're always computed live from real
// AffiliateReview rows (see seedAffiliateReviews.js and
// server/controllers/publicController.js), never a fabricated number.
//
// This REPLACES whatever is currently in the collection (it wipes it
// first).

const mongoose = require('mongoose');
const dotenv = require('dotenv');

const Affiliate = require('./models/Affiliate');

dotenv.config();

const AFFILIATES = [
  {
    name: 'Raj Sharma',
    role: 'Broker',
    area: 'Kathmandu Valley',
    specialty: 'Heritage Houses',
    tags: ['Broker', 'Long-term rentals', 'Flexible stays', 'Heritage properties'],
    areasServed: ['Kathmandu', 'Lalitpur', 'Bhaktapur'],
    categoriesServed: ['House', 'Apartment', 'Villa'],
    servicesOffered: ['Viewings', 'Negotiation', 'Move-in support'],
    responseRate: 96,
    completedTransactions: 62,
    managedPropertyTitles: ['Basantapur Heritage House', 'Thamel Courtyard House', 'Jhamsikhel Modern Villa'],
    featured: true,
    status: 'active',
  },
  {
    name: 'Sunita Gurung',
    role: 'Affiliate',
    area: 'Pokhara',
    specialty: 'Lakeside Resorts',
    tags: ['Affiliate', 'Resort stays', 'Lakeside properties'],
    areasServed: ['Pokhara'],
    categoriesServed: ['Resort', 'Lodge'],
    servicesOffered: ['Viewings', 'Booking assistance'],
    responseRate: 90,
    completedTransactions: 34,
    managedPropertyTitles: [],
    featured: true,
    status: 'active',
  },
  {
    name: 'Bishnu Thapa',
    role: 'Affiliate',
    area: 'Chitwan',
    specialty: 'Jungle Stays',
    tags: ['Affiliate', 'Jungle stays', 'Wildlife tours'],
    areasServed: ['Chitwan'],
    categoriesServed: ['Campsite', 'Lodge'],
    servicesOffered: ['Property viewing', 'Local area guidance'],
    responseRate: 88,
    completedTransactions: 21,
    managedPropertyTitles: [],
    featured: true,
    status: 'active',
  },
  {
    name: 'Mina Adhikari',
    role: 'Affiliate',
    area: 'Bhaktapur',
    specialty: 'Guest Houses',
    tags: ['Affiliate', 'Guest houses', 'Heritage stays'],
    areasServed: ['Bhaktapur'],
    categoriesServed: ['Guest House'],
    servicesOffered: ['Negotiation', 'Move-in support'],
    responseRate: 92,
    completedTransactions: 28,
    managedPropertyTitles: [],
    featured: true,
    status: 'active',
  },
];

const seedAffiliates = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const { deletedCount } = await Affiliate.deleteMany({});
    await Affiliate.insertMany(AFFILIATES);

    console.log(`Affiliates reseeded: removed ${deletedCount} old record(s), inserted ${AFFILIATES.length}.`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding affiliates:', error);
    process.exit(1);
  }
};

seedAffiliates();

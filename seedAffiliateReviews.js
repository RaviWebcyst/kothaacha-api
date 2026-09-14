// seedAffiliateReviews.js
// Run with: node seedAffiliateReviews.js
//
// Seeds sample affiliate/service-provider reviews (mixed ratings +
// moderation statuses) so the admin Affiliate Review Management tab and
// Analytics charts have real data. Affiliate names match the providers
// shown on the public Services page. Safe to re-run — skips any
// (reviewerEmail, affiliateName) pair that already exists.

const mongoose = require('mongoose');
const dotenv = require('dotenv');

const AffiliateReview = require('./models/AffiliateReview');

dotenv.config();

const AFFILIATE_REVIEWS = [
  { affiliateName: 'Anish Studios', reviewerName: 'Sabin Rai', reviewerEmail: 'sabin.rai@example.com', rating: 5, comment: 'The Kathmandu heritage photo walk produced our favorite travel photos ever.', status: 'approved' },
  { affiliateName: 'Himalayan Frames', reviewerName: 'Anjali Thapa', reviewerEmail: 'anjali.thapa@example.com', rating: 5, comment: 'Sunrise shoot on Phewa Lake was magical — quick turnaround too.', status: 'approved' },
  { affiliateName: 'Chef Suman Maharjan', reviewerName: 'Prakash KC', reviewerEmail: 'prakash.kc@example.com', rating: 5, comment: 'Our Newari feast was the highlight of the whole trip.', status: 'approved' },
  { affiliateName: 'Chef Bina Gurung', reviewerName: 'Menuka Adhikari', reviewerEmail: 'menuka.adhikari@example.com', rating: 4, comment: 'Delicious home-style cooking, arrived a little later than scheduled.', status: 'approved' },
  { affiliateName: 'Himalayan Wellness', reviewerName: 'Rajan Shrestha', reviewerEmail: 'rajan.shrestha@example.com', rating: 5, comment: 'Best post-trek massage — the mustard oil treatment is no joke.', status: 'approved' },
  { affiliateName: 'Pokhara Spa House', reviewerName: 'Bishal Gurung', reviewerEmail: 'bishal.gurung@example.com', rating: 3, comment: 'Relaxing, but the studio was a bit noisy from the street.', status: 'pending' },
  { affiliateName: "Ama's Kitchen", reviewerName: 'Sunita Lama', reviewerEmail: 'sunita.lama@example.com', rating: 4, comment: 'Consistent, tasty daily dal bhat — great for a longer stay.', status: 'approved' },
  { affiliateName: 'Shanti Yoga House', reviewerName: 'Kabita Karki', reviewerEmail: 'kabita.karki@example.com', rating: 5, comment: 'Perfect beginner-friendly session on a beautiful rooftop.', status: 'approved' },
  { affiliateName: 'Glow by Rita', reviewerName: 'Nisha Gurung', reviewerEmail: 'nisha.gurung@example.com', rating: 5, comment: 'Bridal makeup held up perfectly through a full day of photos.', status: 'pending' },
  { affiliateName: 'Salon Namaste', reviewerName: 'Suresh Bhandari', reviewerEmail: 'suresh.bhandari@example.com', rating: 2, comment: 'Stylist arrived over an hour late with no notice.', status: 'rejected' },
  { affiliateName: 'Kathmandu Catering Co.', reviewerName: 'Kiran Maharjan', reviewerEmail: 'kiran.maharjan2@example.com', rating: 4, comment: 'Handled our 50-guest event smoothly, food ran out a bit early.', status: 'pending' },
  { affiliateName: 'Kathmandu Cooking School', reviewerName: 'Sarita Karki', reviewerEmail: 'sarita.karki2@example.com', rating: 5, comment: 'Hands-on momo and dal bhat class was a trip highlight.', status: 'approved' },

  // Broker/agent reviews (src/pages/Affiliate/Affiliate.js's TOP_AFFILIATES
  // and src/pages/AffiliateProfile/AffiliateProfile.js's AFF_REVIEWS) —
  // same "affiliateName" field, just a different kind of target (a
  // person helping with a purchase/rental, not a photographer or chef).
  { affiliateName: 'Raj Sharma', reviewerName: 'Anisha K.', reviewerEmail: 'anisha.k@example.com', rating: 5, service: 'Purchase negotiation', comment: 'Raj helped me find the property, arranged the viewing and communicated clearly throughout the process. Would use him again.', status: 'approved' },
  { affiliateName: 'Raj Sharma', reviewerName: 'Bikash T.', reviewerEmail: 'bikash.t@example.com', rating: 5, service: 'Long-term rental', comment: "Very responsive and honest about the property's condition before I signed anything. Made the whole move-in process painless.", status: 'approved' },
  { affiliateName: 'Raj Sharma', reviewerName: 'Sarita M.', reviewerEmail: 'sarita.m@example.com', rating: 4, service: 'Flexible-stay booking', comment: 'Good communication, took a day longer than expected to confirm the booking but everything worked out fine.', status: 'approved' },
  { affiliateName: 'Raj Sharma', reviewerName: 'Prakash D.', reviewerEmail: 'prakash.d@example.com', rating: 5, service: 'Property viewing', comment: "Knew the neighborhood well and pointed out things about road access I wouldn't have noticed myself.", status: 'approved' },
  { affiliateName: 'Raj Sharma', reviewerName: 'Kabita Karki', reviewerEmail: 'kabita.karki@example.com', rating: 5, service: 'Long-term rental', comment: 'Second time working with Raj — consistently transparent about pricing and timelines from day one.', status: 'approved' },
  { affiliateName: 'Raj Sharma', reviewerName: 'Suresh Bhandari', reviewerEmail: 'suresh.bhandari@example.com', rating: 4, service: 'Purchase negotiation', comment: 'Solid negotiation help and always picked up the phone when we had questions about the paperwork.', status: 'approved' },
  { affiliateName: 'Raj Sharma', reviewerName: 'Mina Rai', reviewerEmail: 'mina.rai@example.com', rating: 5, service: 'Property viewing', comment: 'Arranged three viewings in one afternoon and never once felt rushed through any of them.', status: 'approved' },
  { affiliateName: 'Raj Sharma', reviewerName: 'Deepak Shrestha', reviewerEmail: 'deepak.shrestha@example.com', rating: 5, service: 'Flexible-stay booking', comment: 'Booked a short stay through Raj and he checked in personally to make sure everything matched the listing.', status: 'approved' },
  { affiliateName: 'Sunita Gurung', reviewerName: 'Prakash D.', reviewerEmail: 'prakash.d2@example.com', rating: 4, service: 'Long-term rental', comment: 'Very responsive during the search, took a little longer than expected to finalize paperwork.', status: 'approved' },
  { affiliateName: 'Bishnu Thapa', reviewerName: 'Mina Rai', reviewerEmail: 'mina.rai2@example.com', rating: 5, service: 'Property viewing', comment: 'Knew the jungle-stay area extremely well and answered every question about access roads before we booked.', status: 'approved' },
  { affiliateName: 'Mina Adhikari', reviewerName: 'Suresh Bhandari', reviewerEmail: 'suresh.bhandari2@example.com', rating: 4, service: 'Purchase negotiation', comment: 'Solid negotiation help, a bit slow to reply on weekends but got us a fair price.', status: 'approved' },
];

const seedAffiliateReviews = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    let created = 0;
    let skipped = 0;

    for (const data of AFFILIATE_REVIEWS) {
      const existing = await AffiliateReview.findOne({ reviewerEmail: data.reviewerEmail, affiliateName: data.affiliateName });
      if (existing) {
        skipped += 1;
        continue;
      }
      await AffiliateReview.create(data);
      created += 1;
    }

    console.log(`Affiliate reviews seeded: ${created} created, ${skipped} already existed.`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding affiliate reviews:', error);
    process.exit(1);
  }
};

seedAffiliateReviews();

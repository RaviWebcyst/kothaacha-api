// seedReviews.js
// Run with: node seedReviews.js
//
// Seeds sample property reviews (mixed ratings + moderation statuses) so
// the admin Review Moderation tab and Analytics charts have real data.
// Safe to re-run — skips any (reviewerEmail, propertyTitle) pair that
// already exists instead of creating duplicates.

const mongoose = require('mongoose');
const dotenv = require('dotenv');

const Review = require('./models/Review');

dotenv.config();

const REVIEWS = [
  { propertyTitle: 'Thamel Boutique Homestay', reviewerName: 'Sabin Rai', reviewerEmail: 'sabin.rai@example.com', rating: 5, comment: 'Host was incredibly welcoming and the location made exploring Thamel effortless.', status: 'approved' },
  { propertyTitle: 'Thamel Boutique Homestay', reviewerName: 'Menuka Adhikari', reviewerEmail: 'menuka.adhikari@example.com', rating: 4, comment: 'Clean and cozy, though the stairs were a bit steep with luggage.', status: 'approved' },
  { propertyTitle: 'Annapurna View Lodge', reviewerName: 'Anjali Thapa', reviewerEmail: 'anjali.thapa@example.com', rating: 5, comment: 'Woke up to the Annapurna range right outside the window. Unreal.', status: 'approved' },
  { propertyTitle: 'Phewa Lakeside Resort', reviewerName: 'Bishal Gurung', reviewerEmail: 'bishal.gurung@example.com', rating: 5, comment: 'Worth every rupee — the review breakdown matched reality perfectly.', status: 'approved' },
  { propertyTitle: 'Phewa Lakeside Resort', reviewerName: 'Kabita Karki', reviewerEmail: 'kabita.karki@example.com', rating: 4, comment: 'Gorgeous resort, breakfast could use more variety.', status: 'approved' },
  { propertyTitle: 'Chitwan Jungle Campsite', reviewerName: 'Deepa Tamang', reviewerEmail: 'deepa.tamang@example.com', rating: 4, comment: 'Loved falling asleep to jungle sounds. Bathroom was shared but clean.', status: 'approved' },
  { propertyTitle: 'Jhamsikhel Modern Villa', reviewerName: 'Prakash KC', reviewerEmail: 'prakash.kc2@example.com', rating: 5, comment: 'Stunning villa, perfect for our family reunion.', status: 'approved' },
  { propertyTitle: 'Boudha Peaceful Homestay', reviewerName: 'Sunita Lama', reviewerEmail: 'sunita.lama@example.com', rating: 3, comment: 'Nice stay but Wi-Fi kept dropping during our week there.', status: 'approved' },
  { propertyTitle: 'Friends Home Hotel', reviewerName: 'Suresh Bhandari', reviewerEmail: 'suresh.bhandari@example.com', rating: 2, comment: 'Room was smaller than the photos suggested.', status: 'rejected' },
  { propertyTitle: 'Bhaktapur Durbar Guest House', reviewerName: 'Rajan Shrestha', reviewerEmail: 'rajan.shrestha@example.com', rating: 5, comment: 'Right on Durbar Square — verified badge gave us real confidence.', status: 'approved' },
  { propertyTitle: 'Kathmandu City Apartment', reviewerName: 'Nisha Gurung', reviewerEmail: 'nisha.gurung@example.com', rating: 4, comment: 'Great central location for a short business trip.', status: 'pending' },
  { propertyTitle: 'Begnas Hillside Resort', reviewerName: 'Anisha Rai', reviewerEmail: 'anisha.rai2@example.com', rating: 5, comment: 'Peaceful, spotless, and the staff arranged a boat trip for us.', status: 'pending' },
  { propertyTitle: 'Swayambhu Hillside Villa', reviewerName: 'Bikash Shrestha', reviewerEmail: 'bikash.shrestha2@example.com', rating: 1, comment: 'Booking was cancelled last minute with no explanation.', status: 'pending' },
  { propertyTitle: 'Basantapur Heritage House', reviewerName: 'Kiran Maharjan', reviewerEmail: 'kiran.maharjan2@example.com', rating: 5, comment: 'Carved wood interiors were even more beautiful in person.', status: 'approved' },
  { propertyTitle: 'Thamel Courtyard House', reviewerName: 'Sarita Karki', reviewerEmail: 'sarita.karki2@example.com', rating: 3, comment: 'Good for groups, but street noise carried into the courtyard at night.', status: 'pending' },
];

const seedReviews = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    let created = 0;
    let skipped = 0;

    for (const data of REVIEWS) {
      const existing = await Review.findOne({ reviewerEmail: data.reviewerEmail, propertyTitle: data.propertyTitle });
      if (existing) {
        skipped += 1;
        continue;
      }
      await Review.create(data);
      created += 1;
    }

    console.log(`Reviews seeded: ${created} created, ${skipped} already existed.`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding reviews:', error);
    process.exit(1);
  }
};

seedReviews();

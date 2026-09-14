// seedBookings.js
// Run with: node seedBookings.js
//
// Seeds sample bookings spread across the last few months (mixed statuses)
// so the admin Bookings tab and Analytics charts have real data to show —
// there's no public booking flow yet (the property page's "Request to
// Book" is a demo-only toast), so this is the system of record for now.
// Safe to re-run — it skips any (guestEmail, checkIn) pair that already
// exists instead of creating duplicates.

const mongoose = require('mongoose');
const dotenv = require('dotenv');

const Booking = require('./models/Booking');

dotenv.config();

// Same property titles seeded in seedProperties.js.
const PROPERTIES = [
  'Thamel Boutique Homestay', 'Boudha Peaceful Homestay', 'Annapurna View Lodge',
  'Basantapur Heritage House', 'Thamel Courtyard House', 'Kathmandu City Apartment',
  'Phewa Lakeside Resort', 'Begnas Hillside Resort', 'Chitwan Jungle Campsite',
  'Swayambhu Hillside Villa', 'Jhamsikhel Modern Villa', 'Friends Home Hotel',
  'Boudha Serenity Guest House', 'Bhaktapur Durbar Guest House',
];

const GUESTS = [
  { name: 'Sabin Rai', email: 'sabin.rai@example.com' },
  { name: 'Anjali Thapa', email: 'anjali.thapa@example.com' },
  { name: 'Prakash KC', email: 'prakash.kc@example.com' },
  { name: 'Menuka Adhikari', email: 'menuka.adhikari@example.com' },
  { name: 'Rajan Shrestha', email: 'rajan.shrestha@example.com' },
  { name: 'Bishal Gurung', email: 'bishal.gurung@example.com' },
  { name: 'Sunita Lama', email: 'sunita.lama@example.com' },
  { name: 'Kabita Karki', email: 'kabita.karki@example.com' },
  { name: 'Suresh Bhandari', email: 'suresh.bhandari@example.com' },
  { name: 'Nisha Gurung', email: 'nisha.gurung@example.com' },
];

const STATUSES = ['pending', 'confirmed', 'cancelled', 'completed'];

// Deterministic pseudo-random so re-running produces the same dataset.
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const rand = seededRandom(42);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const BOOKING_COUNT = 30;
const MONTHS_BACK = 6;

const BOOKINGS = Array.from({ length: BOOKING_COUNT }, (_, i) => {
  const guest = pick(GUESTS);
  const property = pick(PROPERTIES);
  // Spread bookings across the last MONTHS_BACK months, oldest-first.
  const monthsAgo = MONTHS_BACK - 1 - Math.floor((i / BOOKING_COUNT) * MONTHS_BACK);
  const day = 2 + Math.floor(rand() * 25);
  const checkIn = new Date();
  checkIn.setMonth(checkIn.getMonth() - monthsAgo, day);
  checkIn.setHours(0, 0, 0, 0);
  const nights = 1 + Math.floor(rand() * 6);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + nights);
  const guests = 1 + Math.floor(rand() * 4);
  const pricePerNight = 1000 + Math.floor(rand() * 6000);

  // Older months skew toward "completed", the current month skews toward
  // "pending"/"confirmed" — reads like a real booking pipeline.
  const status = monthsAgo === 0
    ? pick(['pending', 'confirmed'])
    : monthsAgo === MONTHS_BACK - 1
      ? pick(['completed', 'completed', 'cancelled'])
      : pick(STATUSES);

  return {
    propertyTitle: property,
    guestName: guest.name,
    guestEmail: guest.email,
    checkIn,
    checkOut,
    guests,
    price: pricePerNight * nights,
    status,
    notes: '',
    // Backdate createdAt to the booking month so month-bucketed analytics
    // (grouped by createdAt) line up with when the stay actually happened.
    createdAt: checkIn,
  };
});

const seedBookings = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    let created = 0;
    let skipped = 0;

    for (const data of BOOKINGS) {
      const existing = await Booking.findOne({ guestEmail: data.guestEmail, checkIn: data.checkIn, propertyTitle: data.propertyTitle });
      if (existing) {
        skipped += 1;
        continue;
      }
      const booking = new Booking(data);
      // `timestamps: true` would otherwise overwrite createdAt with "now".
      await booking.save({ timestamps: false });
      created += 1;
    }

    console.log(`Bookings seeded: ${created} created, ${skipped} already existed.`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding bookings:', error);
    process.exit(1);
  }
};

seedBookings();

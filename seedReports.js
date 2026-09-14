// seedReports.js
// Run with: node seedReports.js
//
// Seeds a handful of sample user-submitted reports into the Reports
// collection so the admin console's Reports tab has something to show.
// Safe to re-run — it skips any (reporterEmail, targetName) pair that
// already exists instead of creating duplicates. Field shape matches
// server/models/Report.js and the admin form in
// src/pages/AdminDashboard/sections/ReportsSection.jsx.

const mongoose = require('mongoose');
const dotenv = require('dotenv');

const Report = require('./models/Report');

dotenv.config();

const REPORTS = [
  {
    reporterName: 'Anisha Rai',
    reporterEmail: 'anisha.rai@example.com',
    targetType: 'property',
    targetName: 'Lakeside Apartment',
    reason: 'Listing photos don\'t match the property',
    description: 'The photos show a lake view but the room I was shown on arrival faced a parking lot. Felt misleading.',
    status: 'pending',
  },
  {
    reporterName: 'Suman Thapa',
    reporterEmail: 'suman.thapa@example.com',
    targetType: 'review',
    targetName: 'Review on "Boutique Hotel Kathmandu"',
    reason: 'Suspected fake review',
    description: 'This review was posted the same day as three others with near-identical wording, possibly from a bot or a paid reviewer.',
    status: 'reviewing',
  },
  {
    reporterName: 'Kiran Maharjan',
    reporterEmail: 'kiran.maharjan@example.com',
    targetType: 'account',
    targetName: 'Account: prakash_host99',
    reason: 'Host requesting payment outside the platform',
    description: 'Host messaged me asking to pay half the booking directly via bank transfer to "avoid fees". Reporting for safety.',
    status: 'pending',
  },
  {
    reporterName: 'Sarita Karki',
    reporterEmail: 'sarita.karki@example.com',
    targetType: 'property',
    targetName: 'Cozy Pet-Friendly Hostel',
    reason: 'Listing marked active but property is closed',
    description: 'Called ahead and the owner said they closed down two months ago, but the listing still shows as bookable.',
    status: 'resolved',
  },
  {
    reporterName: 'Bikash Shrestha',
    reporterEmail: 'bikash.shrestha@example.com',
    targetType: 'review',
    targetName: 'Review on "Chitwan Jungle Resort"',
    reason: 'Review contains offensive language',
    description: 'The review uses inappropriate language directed at the staff. Requesting moderation.',
    status: 'dismissed',
  },
  {
    reporterName: 'Nisha Gurung',
    reporterEmail: 'nisha.gurung@example.com',
    targetType: 'account',
    targetName: 'Account: guest_traveler22',
    reason: 'Repeated no-shows without cancelling',
    description: 'This guest has booked and not shown up twice at my property without cancelling or messaging. Requesting a review of the account.',
    status: 'pending',
  },
];

const seedReports = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    let created = 0;
    let skipped = 0;

    for (const data of REPORTS) {
      const existing = await Report.findOne({ reporterEmail: data.reporterEmail, targetName: data.targetName });
      if (existing) {
        skipped += 1;
        continue;
      }
      await Report.create(data);
      created += 1;
    }

    console.log(`Reports seeded: ${created} created, ${skipped} already existed.`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding reports:', error);
    process.exit(1);
  }
};

seedReports();

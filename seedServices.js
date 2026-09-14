// seedServices.js
// Run with: node seedServices.js
//
// Mirrors the hardcoded `services` array that used to live in
// src/pages/Services/Services.js and src/pages/ServiceDetails/ServiceDetails.js
// into a real Services collection — same title, provider, location,
// pricing, and gallery photos — so the public Services/ServiceDetails
// pages and the admin Services tab both read from one source of truth
// instead of a hardcoded array with fake ratings/review counts baked in.
//
// This REPLACES whatever is currently in the collection (it wipes it
// first). Star ratings/review counts were deliberately dropped — there is
// no real service-review system yet, so nothing fabricates one.

const mongoose = require('mongoose');
const dotenv = require('dotenv');

const Service = require('./models/Service');

dotenv.config();

const commonsImg = (filename, width = 700) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=${width}`;

const WM = {
  thamelDetail: commonsImg('Architectural Detail - Thamel District - Kathmandu - Nepal (13422331933).jpg'),
  thamelWalk: commonsImg('A walk through Thamel.jpg'),
  phewaLake: commonsImg('Phewa Lake of Pokhara city.jpg'),
  annapurnaView: commonsImg('AnapurnaFromPokhara.jpg'),
  newariThali: commonsImg('Traditional Newari Thali.jpg'),
  nepaliThali: commonsImg('Traditional Nepali Thali.jpg'),
  momoCloseup: commonsImg('Momo Nepali cuisine.jpg'),
  dalBhatTarkari: commonsImg('Nepali dal-bhat-tarkari.jpg'),
  chefCookingOutdoor: commonsImg('A skilled chef in gloves focuses on cooking at an outdoor gathering, surrounded by fresh ingredients and kitchen tools.jpg'),
  chefKitchenTeam: commonsImg('Cooking, 2015.jpg'),
  backMassageSpa: commonsImg('Back Rub massage at a spa.jpg'),
  thaiMassage: commonsImg('Ostentrop Germany Chanchai-Thaimassage-04.jpg'),
  massageAmma: commonsImg('AMMA ASSIS.jpg'),
  massageEmotionsSpa: commonsImg('Massage at Emotions Spa.jpg'),
  spaRelaxRoom: commonsImg('Couples relaxation room at Emotions Spa Kampala.jpg'),
  yogaHome: commonsImg('Woman practicing yoga at home on a mat in a living room.jpg'),
  bridalMakeup: commonsImg('Makeup artist.jpg'),
  dashainTika: commonsImg('Dashain Festival Nepal, Putting Tika in forehead 01.jpg'),
  salonStations: commonsImg('Hair Salon Stations.jpg'),
  salonGroupPortrait: commonsImg('Scarlet Studios Ug 01.jpg'),
  hairdresserShaving: commonsImg('Attractive hairdresser is shaving male beard with the knife.jpg'),
  cateringSpread: commonsImg('Catering.jpg'),
  hotelBuffetSpread: commonsImg('Buffet spread at 1911 restaurant, the Imperial Hotel, New Delhi.jpg'),
  weddingPhotographer: commonsImg('Wedding photographer preparing shot.jpg'),
  bridalPortraitShot: commonsImg('Bride lying on grand staircase - Dejan Nikolić.jpg'),
};

const SERVICES = [
  { title: 'Kathmandu Heritage Photo Walk', category: 'photography', provider: 'Anish Studios', city: 'Kathmandu', area: 'Thamel', price: 6000, unit: 'session', duration: '2 hours', verified: true, featured: true, images: [WM.weddingPhotographer, WM.thamelDetail, WM.thamelWalk], description: "A guided photo session through Kathmandu's heritage lanes — Durbar Square, Thamel's backstreets, and golden-hour rooftop shots, edited and delivered within 48 hours.", includes: ['2-hour guided shoot', '30+ edited digital photos', 'Delivery within 48 hours', 'Location scouting included'], status: 'active' },
  { title: 'Pokhara Sunrise Photoshoot', category: 'photography', provider: 'Himalayan Frames', city: 'Pokhara', area: 'Lakeside', price: 5500, unit: 'session', duration: '90 minutes', verified: true, featured: false, images: [WM.bridalPortraitShot, WM.phewaLake, WM.annapurnaView], description: 'Sunrise portrait and couple photography on Phewa Lake with the Annapurna range as backdrop, including a rowboat session on request.', includes: ['90-minute sunrise session', '20+ edited photos', 'Optional rowboat add-on', 'Same-day preview gallery'], status: 'active' },
  { title: 'Private Newari Dinner Chef', category: 'chefs', provider: 'Chef Suman Maharjan', city: 'Kathmandu', area: 'Patan', price: 4500, unit: 'event', duration: '3-4 hours', verified: true, featured: true, images: [WM.newariThali, WM.chefKitchenTeam, WM.chefCookingOutdoor], description: 'A private chef cooks a full multi-course traditional Newari feast at your accommodation, sourcing ingredients fresh the same day.', includes: ['Multi-course Newari menu', 'Fresh same-day ingredients', 'On-site cooking & serving', 'Cleanup included'], status: 'active' },
  { title: 'In-Villa Nepali Chef Service', category: 'chefs', provider: 'Chef Bina Gurung', city: 'Pokhara', area: 'Lakeside', price: 4000, unit: 'event', duration: '3 hours', verified: true, featured: false, images: [WM.chefCookingOutdoor, WM.dalBhatTarkari, WM.momoCloseup], description: 'Home-style Nepali cooking in your villa or homestay kitchen — dal bhat, momos, and regional specialties tailored to dietary needs.', includes: ['Custom home-style menu', 'Dietary needs accommodated', 'Groceries sourced by chef', 'Kitchen cleanup included'], status: 'active' },
  { title: 'Traditional Nepali Massage', category: 'massage', provider: 'Himalayan Wellness', city: 'Kathmandu', area: 'Boudha', price: 2500, unit: 'hour', duration: '60 minutes', verified: true, featured: false, images: [WM.backMassageSpa, WM.thaiMassage, WM.massageEmotionsSpa], description: 'Full-body traditional Nepali massage using warm mustard oil, ideal for post-trek recovery. In-room service available.', includes: ['60-minute full-body massage', 'Warm mustard oil treatment', 'In-room service available', 'Certified therapist'], status: 'active' },
  { title: 'Lakeside Thai Massage', category: 'massage', provider: 'Pokhara Spa House', city: 'Pokhara', area: 'Lakeside', price: 2800, unit: 'hour', duration: '60 minutes', verified: false, featured: false, images: [WM.thaiMassage, WM.massageEmotionsSpa, WM.massageAmma], description: 'Traditional Thai-style stretching massage performed lakeside or in-studio, popular after long trekking days.', includes: ['60-minute Thai massage', 'Lakeside or studio setting', 'Stretching & pressure-point technique'], status: 'active' },
  { title: 'Daily Dal Bhat Delivery', category: 'meals', provider: "Ama's Kitchen", city: 'Kathmandu', area: 'New Baneshwor', price: 350, unit: 'meal', duration: 'Daily delivery', verified: true, featured: false, images: [WM.dalBhatTarkari, WM.nepaliThali, WM.newariThali], description: 'Home-cooked dal bhat delivered daily to your stay — a rotating weekly menu of vegetarian and meat options.', includes: ['Fresh daily delivery', 'Rotating weekly menu', 'Vegetarian & meat options', 'Reusable containers'], status: 'active' },
  { title: "Trekker's Meal Prep Box", category: 'meals', provider: 'Sherpa Kitchen', city: 'Pokhara', area: 'Lakeside', price: 1200, unit: 'day', duration: 'Full-day supply', verified: true, featured: false, images: [WM.annapurnaView, WM.dalBhatTarkari, WM.momoCloseup], description: 'Pre-packed high-energy meals designed for trekking days, delivered to your guesthouse before an early departure.', includes: ['High-energy trekking meals', 'Pre-dawn delivery available', 'Lightweight packaging', 'Custom calorie options'], status: 'active' },
  { title: 'Beginner Yoga & Meditation', category: 'training', provider: 'Shanti Yoga House', city: 'Kathmandu', area: 'Thamel', price: 1500, unit: 'session', duration: '60 minutes', verified: true, featured: false, images: [WM.yogaHome, WM.spaRelaxRoom], description: 'A one-on-one or small-group yoga and meditation session suited to complete beginners, held on a rooftop studio.', includes: ['60-minute guided session', 'Beginner-friendly pacing', 'Rooftop studio setting', 'Mats & props provided'], status: 'active' },
  { title: 'Nepali Cooking Class', category: 'training', provider: 'Kathmandu Cooking School', city: 'Kathmandu', area: 'Patan', price: 2200, unit: 'session', duration: '3 hours', verified: true, featured: true, images: [WM.momoCloseup, WM.nepaliThali, WM.dalBhatTarkari], description: 'Hands-on class covering momos, dal bhat, and achar — includes a market visit and a shared meal at the end.', includes: ['3-hour hands-on class', 'Local market visit', 'Recipe booklet to take home', 'Shared meal at the end'], status: 'active' },
  { title: 'Bridal Makeup Artist', category: 'makeup', provider: 'Glow by Rita', city: 'Kathmandu', area: 'Lazimpat', price: 8000, unit: 'event', duration: '2-3 hours', verified: true, featured: false, images: [WM.bridalMakeup, WM.salonGroupPortrait], description: "Full bridal makeup with trial session included, using long-wear products suited to Nepal's climate and photography lighting.", includes: ['Trial session included', 'Long-wear, climate-suited products', 'On-location service', 'Touch-up kit provided'], status: 'active' },
  { title: 'Traditional Tihar/Dashain Makeup', category: 'makeup', provider: 'Makeup by Sunita', city: 'Bhaktapur', area: 'Durbar Square', price: 4500, unit: 'event', duration: '90 minutes', verified: false, featured: false, images: [WM.bridalMakeup, WM.dashainTika], description: 'Festival-ready traditional makeup and tika styling for Dashain, Tihar, or other cultural celebrations.', includes: ['Traditional festival look', 'Tika & accessory styling', 'On-location service'], status: 'active' },
  { title: 'Mobile Hair Styling', category: 'hair', provider: 'Salon Namaste', city: 'Kathmandu', area: 'Thamel', price: 2000, unit: 'session', duration: '60-90 minutes', verified: true, featured: false, images: [WM.salonStations, WM.hairdresserShaving], description: 'A stylist comes to your accommodation for a wash, cut, or blow-dry — no salon visit required.', includes: ['In-room service', 'Wash, cut, or blow-dry', 'Professional styling tools'], status: 'active' },
  { title: 'Wedding Hair & Updo', category: 'hair', provider: 'Style by Anjali', city: 'Pokhara', area: 'Lakeside', price: 3500, unit: 'event', duration: '2 hours', verified: true, featured: false, images: [WM.salonGroupPortrait, WM.salonStations, WM.bridalMakeup], description: 'Formal event hair styling and updos, typically booked alongside bridal or festival makeup services.', includes: ['Formal updo styling', 'Trial available on request', 'Pairs with makeup services'], status: 'active' },
  { title: 'Full Body Ayurvedic Spa', category: 'spa', provider: 'Himalayan Ayurveda Spa', city: 'Kathmandu', area: 'Boudha', price: 4200, unit: 'session', duration: '90 minutes', verified: true, featured: true, images: [WM.backMassageSpa, WM.thaiMassage, WM.massageEmotionsSpa], description: 'A 90-minute Ayurvedic treatment combining herbal oils, steam, and traditional massage techniques.', includes: ['90-minute Ayurvedic treatment', 'Herbal oil & steam therapy', 'Certified practitioner', 'Quiet private room'], status: 'active' },
  { title: 'Couples Spa Retreat', category: 'spa', provider: 'Serenity Spa Pokhara', city: 'Pokhara', area: 'Lakeside', price: 7500, unit: 'session', duration: '2 hours', verified: true, featured: false, images: [WM.spaRelaxRoom, WM.massageEmotionsSpa, WM.massageAmma], description: 'A side-by-side couples spa package with massage, facial, and a private lakeside relaxation lounge.', includes: ['Side-by-side couples massage', 'Facial treatment included', 'Private lakeside lounge access'], status: 'active' },
  { title: 'Full Event Catering (50 guests)', category: 'catering', provider: 'Kathmandu Catering Co.', city: 'Kathmandu', area: 'New Baneshwor', price: 45000, unit: 'event', duration: 'Full event', verified: true, featured: false, images: [WM.hotelBuffetSpread, WM.cateringSpread, WM.newariThali], description: 'Full-service catering for larger gatherings — buffet setup, serving staff, and cleanup included.', includes: ['Buffet for up to 50 guests', 'Serving staff included', 'Full setup & cleanup', 'Custom menu planning'], status: 'active' },
  { title: 'Small Gathering Catering', category: 'catering', provider: 'Bhaktapur Feast Catering', city: 'Bhaktapur', area: 'Durbar Square', price: 18000, unit: 'event', duration: 'Full event', verified: false, featured: false, images: [WM.cateringSpread, WM.hotelBuffetSpread, WM.nepaliThali], description: 'Catering sized for smaller private gatherings — traditional Newari or general Nepali menus available.', includes: ['Catering for up to 20 guests', 'Newari or general Nepali menu', 'Delivery & setup included'], status: 'active' },
];

const seedServices = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const { deletedCount } = await Service.deleteMany({});
    await Service.insertMany(SERVICES);

    console.log(`Services reseeded: removed ${deletedCount} old record(s), inserted ${SERVICES.length}.`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding services:', error);
    process.exit(1);
  }
};

seedServices();

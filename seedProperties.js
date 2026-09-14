// seedProperties.js
// Run with: node seedProperties.js
//
// Mirrors the hardcoded `properties` array shown on the public "All
// Properties" page (src/pages/Properties/Properties.jsx) into the
// Properties collection, so the admin console's Properties tab shows the
// exact same listings — same title, location, type, capacity, and cover
// photo — instead of unrelated placeholder data.
//
// This REPLACES whatever is currently in the collection (it wipes it
// first) so the DB never drifts from what's shown on the frontend. If you
// add/edit listings in Properties.jsx, update this file to match and
// re-run it.
//
// Field shape matches server/models/Property.js. `price` is the cheapest
// duration shown on the frontend card for that listing (Properties.jsx
// itself picks the same "cheapest duration" price to display on the
// card), since the admin model only tracks a single per-night price.

const mongoose = require('mongoose');
const dotenv = require('dotenv');

const Property = require('./models/Property');

dotenv.config();

const commonsImg = (filename, width = 900) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=${width}`;

const WM = {
  kathmanduArch: commonsImg('Architecture of Kathmandu Nepal-IMG 4353.jpg'),
  thamelWalk: commonsImg('A walk through Thamel.jpg'),
  hotelCorridor: commonsImg('Corridor Hotel Friends Home, Thamel, Kathmandu (22636999986).jpg'),
  thamelHouses: commonsImg('CASAS EN THAMEL - panoramio.jpg'),
  phewaLake: commonsImg('Phewa Lake of Pokhara city.jpg'),
  annapurnaView: commonsImg('AnapurnaFromPokhara.jpg'),
  begnasLake: commonsImg('Begnas Lake, Pokhara, Kaski.jpg'),
  bhaktapurSquare: commonsImg('Kathmandu Bhaktapur Durbar Square.jpg'),
  chitwanPark: commonsImg('2016-04-03 Chitwan National Park, Nepal. 5861.jpg'),
  boudhaHeritage: commonsImg('Boudha Nepali Heritage.jpg'),
  thamelDetail: commonsImg('Architectural Detail - Thamel District - Kathmandu - Nepal (13422331933).jpg'),
  ktmMountainView: commonsImg('Beautiful mountain view from the city.jpg'),
  nagarkotSunrise: commonsImg('Sunrise View from Nagarkot - Flickr - anantal.jpg'),
  nagarkotDusk: commonsImg('Sunrise View from Nagarkot - Flickr - anantal (14).jpg'),
  dhulikhelHillView: commonsImg('View from Dhulikhel Height.jpg'),
  bandipurValley: commonsImg('Bandipur Nepal 01.jpg'),
  bandipurHillside: commonsImg('Nepal - Bandipur (6538699009).jpg'),
  hotelLobby: commonsImg('Hotel Lobby, Kathmandu, Nepal 2020.jpg'),
  hotelRoom: commonsImg('Room in Hotel.jpg'),
  manasluHotel: commonsImg('The Manaslu Hotel.jpg'),
  hostelDorm: commonsImg('Tatsat Hostel.jpg'),
  gorkhaHouse: commonsImg('A traditional house in Gorkha.jpg'),
  woodenHouse: commonsImg('Dudh Koshi Valley, Jorsale, Nepalese wooden house, Nepal.jpg'),
  ruralNepaliHouse: commonsImg('Typical rural Nepali house with Mt. Fistail in backfround.JPG'),
  guesthouseHomestay: commonsImg('Luza, Machhermo, Guesthouse, Homestay, Nepal.jpg'),
  campTent1: commonsImg('Annapurna Base Camp (10).JPG'),
  campTent2: commonsImg('Annapurna Base Camp (11).JPG'),
};

// Same 24 listings as Properties.jsx's `properties` array, reshaped for
// the Property schema (title/images/type/city/area/price/bedrooms/
// bathrooms/guests/status). `price` = cheapest duration price from the
// original entry (matches what the card badge shows on the frontend).
// Each listing gets 2-3 photos (drawn from the same WM set, mixed
// thematically by location) so the admin details page's photo gallery has
// something to actually show, instead of a single cover image.
const PROPERTIES = [
  { title: 'Thamel Boutique Homestay', images: [WM.thamelHouses, WM.thamelWalk, WM.thamelDetail, WM.ruralNepaliHouse], type: 'homestay', city: 'Kathmandu', area: 'Thamel', price: 1800, bedrooms: 2, bathrooms: 1, guests: 4, durations: [{ key: 'daily', price: 1800 }, { key: 'weekly', price: 11000 }], amenities: ['wifi', 'furnished', 'security', 'parking', 'garden', 'balcony'], featured: false, verified: true, roadAccess: 'Blacktopped access road', roadWidth: '4.5 meters', nearbyHospital: '1.6 km', nearbySchool: '0.9 km', nearbyMarket: '0.6 km', nearbyAirport: '7 km', status: 'active' },
  { title: 'Boudha Peaceful Homestay', images: [WM.boudhaHeritage, WM.kathmanduArch, WM.ruralNepaliHouse, WM.guesthouseHomestay], type: 'homestay', city: 'Kathmandu', area: 'Boudha', price: 2000, bedrooms: 1, bathrooms: 1, guests: 2, durations: [{ key: 'daily', price: 2000 }, { key: 'weekly', price: 12000 }, { key: 'monthly', price: 32000 }], amenities: ['wifi', 'heating', 'parking', 'security', 'furnished', 'garden'], featured: false, verified: true, roadAccess: 'Gravel road, seasonal', roadWidth: '3.5 meters', nearbyHospital: '2.2 km', nearbySchool: '1.3 km', nearbyMarket: '0.9 km', nearbyAirport: '10 km', status: 'active' },
  { title: 'Annapurna View Lodge', images: [WM.annapurnaView, WM.phewaLake, WM.guesthouseHomestay, WM.hotelRoom], type: 'lodge', city: 'Pokhara', area: 'Sarangkot', price: 2500, bedrooms: 1, bathrooms: 1, guests: 2, durations: [{ key: 'daily', price: 2500 }, { key: 'weekly', price: 14500 }], amenities: ['wifi', 'heating', 'garden', 'parking', 'security', 'furnished'], featured: false, verified: true, roadAccess: 'Paved highway frontage', roadWidth: '8 meters', nearbyHospital: '2.8 km', nearbySchool: '1.7 km', nearbyMarket: '1.2 km', nearbyAirport: '13 km', status: 'active' },
  { title: 'Begnas Lakeside Lodge', images: [WM.begnasLake, WM.annapurnaView, WM.phewaLake, WM.hotelRoom], type: 'lodge', city: 'Pokhara', area: 'Begnas', price: 2200, bedrooms: 2, bathrooms: 1, guests: 4, durations: [{ key: 'daily', price: 2200 }, { key: 'weekly', price: 13000 }], amenities: ['wifi', 'garden', 'parking', 'heating', 'security', 'furnished'], featured: false, verified: false, roadAccess: 'Paved city road, all-weather access', roadWidth: '6 meters (2 lanes)', nearbyHospital: '1 km', nearbySchool: '0.5 km', nearbyMarket: '0.3 km', nearbyAirport: '4 km', status: 'active' },
  { title: 'Basantapur Heritage House', images: [WM.kathmanduArch, WM.bhaktapurSquare, WM.thamelWalk, WM.gorkhaHouse], type: 'house', city: 'Kathmandu', area: 'Basantapur', price: 3800, bedrooms: 3, bathrooms: 2, guests: 6, durations: [{ key: 'daily', price: 3800 }, { key: 'weekly', price: 21000 }, { key: 'monthly', price: 52000 }], amenities: ['garden', 'parking', 'wifi', 'security', 'furnished', 'balcony'], featured: false, verified: true, roadAccess: 'Blacktopped access road', roadWidth: '4.5 meters', nearbyHospital: '1.6 km', nearbySchool: '0.9 km', nearbyMarket: '0.6 km', nearbyAirport: '7 km', status: 'active' },
  { title: 'Thamel Courtyard House', images: [WM.thamelHouses, WM.thamelDetail, WM.thamelWalk, WM.gorkhaHouse], type: 'house', city: 'Kathmandu', area: 'Thamel', price: 4200, bedrooms: 4, bathrooms: 3, guests: 8, durations: [{ key: 'daily', price: 4200 }, { key: 'weekly', price: 24000 }, { key: 'monthly', price: 58000 }], amenities: ['garden', 'parking', 'security', 'wifi', 'furnished', 'balcony'], featured: false, verified: true, roadAccess: 'Gravel road, seasonal', roadWidth: '3.5 meters', nearbyHospital: '2.2 km', nearbySchool: '1.3 km', nearbyMarket: '0.9 km', nearbyAirport: '10 km', status: 'active' },
  { title: 'Kathmandu City Apartment', images: [WM.kathmanduArch, WM.ktmMountainView, WM.hotelRoom, WM.hotelLobby], type: 'apartment', city: 'Kathmandu', area: 'New Baneshwor', price: 3000, bedrooms: 1, bathrooms: 1, guests: 2, durations: [{ key: 'daily', price: 3000 }, { key: 'weekly', price: 18000 }, { key: 'monthly', price: 60000 }], amenities: ['wifi', 'ac', 'furnished', 'security', 'parking', 'balcony'], featured: false, verified: true, roadAccess: 'Paved highway frontage', roadWidth: '8 meters', nearbyHospital: '2.8 km', nearbySchool: '1.7 km', nearbyMarket: '1.2 km', nearbyAirport: '13 km', status: 'active' },
  { title: 'Thamel Detail Apartment', images: [WM.thamelDetail, WM.thamelHouses, WM.hotelRoom, WM.ktmMountainView], type: 'apartment', city: 'Kathmandu', area: 'Thamel', price: 1600, bedrooms: 1, bathrooms: 1, guests: 3, durations: [{ key: 'daily', price: 1600 }, { key: 'weekly', price: 9500 }, { key: 'monthly', price: 19500 }], amenities: ['wifi', 'furnished', 'balcony', 'ac', 'security', 'parking'], featured: false, verified: true, roadAccess: 'Paved city road, all-weather access', roadWidth: '6 meters (2 lanes)', nearbyHospital: '1 km', nearbySchool: '0.5 km', nearbyMarket: '0.3 km', nearbyAirport: '4 km', status: 'active' },
  { title: 'Phewa Lakeside Resort', images: [WM.phewaLake, WM.begnasLake, WM.annapurnaView, WM.manasluHotel], type: 'resort', city: 'Pokhara', area: 'Lakeside', price: 7500, bedrooms: 4, bathrooms: 3, guests: 8, durations: [{ key: 'daily', price: 7500 }, { key: 'weekly', price: 45000 }, { key: 'monthly', price: 150000 }], amenities: ['wifi', 'ac', 'garden', 'parking', 'security', 'washer'], featured: true, verified: true, roadAccess: 'Blacktopped access road', roadWidth: '4.5 meters', nearbyHospital: '1.6 km', nearbySchool: '0.9 km', nearbyMarket: '0.6 km', nearbyAirport: '7 km', status: 'active' },
  { title: 'Begnas Hillside Resort', images: [WM.begnasLake, WM.phewaLake, WM.ktmMountainView, WM.manasluHotel], type: 'resort', city: 'Pokhara', area: 'Begnas Lake', price: 6200, bedrooms: 3, bathrooms: 2, guests: 6, durations: [{ key: 'daily', price: 6200 }, { key: 'weekly', price: 36000 }], amenities: ['garden', 'parking', 'ac', 'wifi', 'security', 'washer'], featured: false, verified: true, roadAccess: 'Gravel road, seasonal', roadWidth: '3.5 meters', nearbyHospital: '2.2 km', nearbySchool: '1.3 km', nearbyMarket: '0.9 km', nearbyAirport: '10 km', status: 'active' },
  { title: 'Chitwan Jungle Campsite', images: [WM.chitwanPark, WM.campTent1, WM.campTent2, WM.ktmMountainView], type: 'campsite', city: 'Chitwan', area: 'Sauraha', price: 1800, bedrooms: 1, bathrooms: 1, guests: 2, durations: [{ key: 'daily', price: 1800 }, { key: 'weekly', price: 10500 }], amenities: ['security', 'parking', 'wifi', 'garden', 'heating', 'furnished'], featured: false, verified: true, roadAccess: 'Paved highway frontage', roadWidth: '8 meters', nearbyHospital: '2.8 km', nearbySchool: '1.7 km', nearbyMarket: '1.2 km', nearbyAirport: '13 km', status: 'active' },
  { title: 'Rapti Riverside Campsite', images: [WM.chitwanPark, WM.campTent2, WM.campTent1, WM.begnasLake], type: 'campsite', city: 'Chitwan', area: 'Rapti River', price: 1500, bedrooms: 1, bathrooms: 1, guests: 2, durations: [{ key: 'daily', price: 1500 }, { key: 'weekly', price: 9000 }], amenities: ['security', 'parking', 'wifi', 'garden', 'heating', 'furnished'], featured: false, verified: false, roadAccess: 'Paved city road, all-weather access', roadWidth: '6 meters (2 lanes)', nearbyHospital: '1 km', nearbySchool: '0.5 km', nearbyMarket: '0.3 km', nearbyAirport: '4 km', status: 'active' },
  { title: 'Baneshwor Cosy Flat', images: [WM.kathmanduArch, WM.thamelDetail, WM.hotelRoom, WM.ktmMountainView], type: 'flat', city: 'Kathmandu', area: 'New Baneshwor', price: 14000, bedrooms: 2, bathrooms: 1, guests: 4, durations: [{ key: 'monthly', price: 15000 }, { key: 'longterm', price: 14000 }], amenities: ['parking', 'wifi', 'furnished', 'security', 'balcony', 'washer'], featured: false, verified: true, roadAccess: 'Blacktopped access road', roadWidth: '4.5 meters', nearbyHospital: '1.6 km', nearbySchool: '0.9 km', nearbyMarket: '0.6 km', nearbyAirport: '7 km', status: 'active' },
  { title: 'Thamel Studio Flat', images: [WM.thamelDetail, WM.thamelWalk, WM.hotelRoom, WM.thamelHouses], type: 'flat', city: 'Kathmandu', area: 'Thamel', price: 19000, bedrooms: 1, bathrooms: 1, guests: 2, durations: [{ key: 'monthly', price: 19000 }], amenities: ['wifi', 'furnished', 'parking', 'security', 'balcony', 'washer'], featured: false, verified: false, roadAccess: 'Gravel road, seasonal', roadWidth: '3.5 meters', nearbyHospital: '2.2 km', nearbySchool: '1.3 km', nearbyMarket: '0.9 km', nearbyAirport: '10 km', status: 'active' },
  { title: 'Thamel Traveller Hostel', images: [WM.thamelWalk, WM.hotelCorridor, WM.hostelDorm, WM.thamelHouses], type: 'hostel', city: 'Kathmandu', area: 'Thamel', price: 700, bedrooms: 1, bathrooms: 1, guests: 1, durations: [{ key: 'daily', price: 700 }, { key: 'weekly', price: 4000 }], amenities: ['wifi', 'security', 'parking', 'furnished', 'washer', 'heating'], featured: false, verified: false, roadAccess: 'Paved highway frontage', roadWidth: '8 meters', nearbyHospital: '2.8 km', nearbySchool: '1.7 km', nearbyMarket: '1.2 km', nearbyAirport: '13 km', status: 'active' },
  { title: 'Friends Home Hostel', images: [WM.hotelCorridor, WM.thamelWalk, WM.hostelDorm, WM.thamelHouses], type: 'hostel', city: 'Kathmandu', area: 'Thamel', price: 900, bedrooms: 1, bathrooms: 1, guests: 1, durations: [{ key: 'daily', price: 900 }, { key: 'weekly', price: 5200 }], amenities: ['wifi', 'security', 'parking', 'furnished', 'washer', 'heating'], featured: false, verified: true, roadAccess: 'Paved city road, all-weather access', roadWidth: '6 meters (2 lanes)', nearbyHospital: '1 km', nearbySchool: '0.5 km', nearbyMarket: '0.3 km', nearbyAirport: '4 km', status: 'active' },
  { title: 'Swayambhu Hillside Villa', images: [WM.ktmMountainView, WM.kathmanduArch, WM.gorkhaHouse, WM.woodenHouse], type: 'villa', city: 'Kathmandu', area: 'Swayambhu', price: 5200, bedrooms: 4, bathrooms: 3, guests: 8, durations: [{ key: 'daily', price: 5200 }, { key: 'weekly', price: 30000 }, { key: 'monthly', price: 78000 }], amenities: ['garden', 'parking', 'wifi', 'ac', 'security', 'furnished'], featured: false, verified: true, roadAccess: 'Blacktopped access road', roadWidth: '4.5 meters', nearbyHospital: '1.6 km', nearbySchool: '0.9 km', nearbyMarket: '0.6 km', nearbyAirport: '7 km', status: 'active' },
  { title: 'Jhamsikhel Modern Villa', images: [WM.ktmMountainView, WM.manasluHotel, WM.gorkhaHouse, WM.kathmanduArch], type: 'villa', city: 'Lalitpur', area: 'Jhamsikhel', price: 8500, bedrooms: 5, bathrooms: 4, guests: 10, durations: [{ key: 'daily', price: 8500 }, { key: 'weekly', price: 48000 }], amenities: ['garden', 'parking', 'security', 'ac', 'wifi', 'furnished'], featured: true, verified: true, roadAccess: 'Gravel road, seasonal', roadWidth: '3.5 meters', nearbyHospital: '2.2 km', nearbySchool: '1.3 km', nearbyMarket: '0.9 km', nearbyAirport: '10 km', status: 'active' },
  { title: 'Cozy Corner Pet Hostel', images: [WM.boudhaHeritage, WM.thamelHouses, WM.hostelDorm, WM.ruralNepaliHouse], type: 'pethostel', city: 'Kathmandu', area: 'Boudha', price: 1200, bedrooms: 1, bathrooms: 1, guests: 1, durations: [{ key: 'daily', price: 1200 }, { key: 'weekly', price: 7000 }], amenities: ['garden', 'security', 'pet', 'parking', 'wifi', 'furnished'], featured: false, verified: true, roadAccess: 'Paved highway frontage', roadWidth: '8 meters', nearbyHospital: '2.8 km', nearbySchool: '1.7 km', nearbyMarket: '1.2 km', nearbyAirport: '13 km', status: 'active' },
  { title: 'Paws & Stay Pet Hostel', images: [WM.thamelHouses, WM.boudhaHeritage, WM.hostelDorm, WM.ruralNepaliHouse], type: 'pethostel', city: 'Kathmandu', area: 'Thamel', price: 1000, bedrooms: 1, bathrooms: 1, guests: 1, durations: [{ key: 'daily', price: 1000 }, { key: 'weekly', price: 6000 }], amenities: ['garden', 'pet', 'security', 'parking', 'wifi', 'furnished'], featured: false, verified: false, roadAccess: 'Paved city road, all-weather access', roadWidth: '6 meters (2 lanes)', nearbyHospital: '1 km', nearbySchool: '0.5 km', nearbyMarket: '0.3 km', nearbyAirport: '4 km', status: 'active' },
  { title: 'Friends Home Hotel', images: [WM.hotelCorridor, WM.thamelWalk, WM.thamelHouses, WM.hotelLobby], type: 'hotel', city: 'Kathmandu', area: 'Thamel', price: 3200, bedrooms: 1, bathrooms: 1, guests: 2, durations: [{ key: 'daily', price: 3200 }, { key: 'weekly', price: 19000 }], amenities: ['wifi', 'ac', 'security', 'furnished', 'parking', 'heating'], featured: false, verified: true, roadAccess: 'Blacktopped access road', roadWidth: '4.5 meters', nearbyHospital: '1.6 km', nearbySchool: '0.9 km', nearbyMarket: '0.6 km', nearbyAirport: '7 km', status: 'active' },
  { title: 'Thamel Heritage Hotel', images: [WM.thamelWalk, WM.hotelCorridor, WM.hotelLobby, WM.manasluHotel], type: 'hotel', city: 'Kathmandu', area: 'Thamel', price: 2800, bedrooms: 1, bathrooms: 1, guests: 2, durations: [{ key: 'daily', price: 2800 }, { key: 'weekly', price: 16500 }], amenities: ['wifi', 'furnished', 'ac', 'security', 'parking', 'heating'], featured: false, verified: false, roadAccess: 'Gravel road, seasonal', roadWidth: '3.5 meters', nearbyHospital: '2.2 km', nearbySchool: '1.3 km', nearbyMarket: '0.9 km', nearbyAirport: '10 km', status: 'active' },
  { title: 'Boudha Serenity Guest House', images: [WM.boudhaHeritage, WM.kathmanduArch, WM.guesthouseHomestay, WM.ruralNepaliHouse], type: 'guesthouse', city: 'Kathmandu', area: 'Boudha', price: 2200, bedrooms: 1, bathrooms: 1, guests: 2, durations: [{ key: 'daily', price: 2200 }, { key: 'weekly', price: 12500 }], amenities: ['wifi', 'heating', 'furnished', 'security', 'parking', 'garden'], featured: false, verified: false, roadAccess: 'Paved highway frontage', roadWidth: '8 meters', nearbyHospital: '2.8 km', nearbySchool: '1.7 km', nearbyMarket: '1.2 km', nearbyAirport: '13 km', status: 'active' },
  { title: 'Bhaktapur Durbar Guest House', images: [WM.bhaktapurSquare, WM.kathmanduArch, WM.thamelWalk, WM.guesthouseHomestay], type: 'guesthouse', city: 'Bhaktapur', area: 'Durbar Square', price: 2600, bedrooms: 2, bathrooms: 1, guests: 4, durations: [{ key: 'daily', price: 2600 }, { key: 'weekly', price: 15000 }], amenities: ['wifi', 'furnished', 'heating', 'security', 'parking', 'garden'], featured: false, verified: true, roadAccess: 'Paved city road, all-weather access', roadWidth: '6 meters (2 lanes)', nearbyHospital: '1 km', nearbySchool: '0.5 km', nearbyMarket: '0.3 km', nearbyAirport: '4 km', status: 'active' },
  { title: 'Nagarkot Sunrise View Lodge', images: [WM.nagarkotSunrise, WM.nagarkotDusk, WM.guesthouseHomestay, WM.hotelRoom], type: 'lodge', city: 'Nagarkot', area: 'View Tower', price: 3200, bedrooms: 2, bathrooms: 1, guests: 4, durations: [{ key: 'daily', price: 3200 }, { key: 'weekly', price: 19000 }], amenities: ['wifi', 'heating', 'garden', 'parking', 'security', 'furnished'], featured: true, verified: true, roadAccess: 'Blacktopped access road', roadWidth: '4.5 meters', nearbyHospital: '1.6 km', nearbySchool: '0.9 km', nearbyMarket: '0.6 km', nearbyAirport: '7 km', status: 'active' },
  { title: 'Dhulikhel Hillside Homestay', images: [WM.dhulikhelHillView, WM.ruralNepaliHouse, WM.gorkhaHouse, WM.guesthouseHomestay], type: 'homestay', city: 'Dhulikhel', area: 'Kavre', price: 2400, bedrooms: 1, bathrooms: 1, guests: 3, durations: [{ key: 'daily', price: 2400 }, { key: 'weekly', price: 14000 }], amenities: ['wifi', 'kitchen', 'garden', 'parking', 'security', 'heating'], featured: false, verified: true, roadAccess: 'Gravel road, seasonal', roadWidth: '3.5 meters', nearbyHospital: '2.2 km', nearbySchool: '1.3 km', nearbyMarket: '0.9 km', nearbyAirport: '10 km', status: 'active' },
  { title: 'Bandipur Heritage Guest House', images: [WM.bandipurValley, WM.bandipurHillside, WM.gorkhaHouse, WM.guesthouseHomestay], type: 'guesthouse', city: 'Bandipur', area: 'Tundikhel', price: 2800, bedrooms: 2, bathrooms: 2, guests: 4, durations: [{ key: 'daily', price: 2800 }, { key: 'weekly', price: 16000 }, { key: 'monthly', price: 45000 }], amenities: ['wifi', 'furnished', 'garden', 'parking', 'security', 'tv'], featured: false, verified: false, roadAccess: 'Paved highway frontage', roadWidth: '8 meters', nearbyHospital: '2.8 km', nearbySchool: '1.7 km', nearbyMarket: '1.2 km', nearbyAirport: '13 km', status: 'active' },
];

const seedProperties = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Replace the collection wholesale so it never drifts from what's
    // actually shown on the public Properties page.
    const { deletedCount } = await Property.deleteMany({});
    await Property.insertMany(PROPERTIES);

    console.log(`Properties reseeded: removed ${deletedCount} old record(s), inserted ${PROPERTIES.length} matching the frontend.`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding properties:', error);
    process.exit(1);
  }
};

seedProperties();

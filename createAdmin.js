// createAdmin.js
// Run with: node createAdmin.js
//
// Seeds one super admin (role: 'super_admin') account so you have a way into
// the console the first time. Override the seeded credentials with env vars
// instead of editing this file: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FIRST_NAME,
// ADMIN_LAST_NAME.

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

const User = require('./models/User');

dotenv.config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const email = (process.env.ADMIN_EMAIL || 'admin@kothaacha.com').trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD || 'Admin@12345';
    const firstName = process.env.ADMIN_FIRST_NAME || 'Kothaa Cha';
    const lastName = process.env.ADMIN_LAST_NAME || 'Admin';

    const existingAdmin = await User.findOne({ email });

    if (existingAdmin) {
      console.log('Admin already exists');
      console.log('Email:', existingAdmin.email);
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const admin = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: 'super_admin',
      status: 'active',
    });

    console.log('Admin created successfully');
    console.log('Email:', admin.email);
    console.log('Password:', password);
    console.log('Role:', admin.role);
    console.log('\nChange this password after first login — it is only meant to get you in the first time.');

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
};

createAdmin();

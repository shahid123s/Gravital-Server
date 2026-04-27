const crypto = require('crypto');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const User = require('../src/modules/user/userModel');
const { hashPassword } = require('../src/modules/auth/utils/bcryptUtils');

const users = [
  {
    email: 'admin@gravital.com',
    password: 'Admin@Gravital123',
    username: 'gravital_admin',
    fullName: 'Gravital Admin',
    role: 'admin',
    dob: new Date('2000-01-01'),
  },
  {
    email: 'shahidnoushad13s@gmail.com',
    password: 'Shahid@12',
    username: 'shahidnoushad13s',
    fullName: 'Shahid Noushad',
    role: 'user',
    dob: new Date('2000-01-01'),
  },
];

const ensureUsernameAvailable = async (username, email) => {
  const existingUser = await User.findOne({ username }).select('email').lean();

  if (existingUser && existingUser.email !== email) {
    throw new Error(`Username "${username}" is already used by ${existingUser.email}`);
  }
};

const upsertSeedUser = async (seedUser) => {
  await ensureUsernameAvailable(seedUser.username, seedUser.email);

  const password = await hashPassword(seedUser.password);
  const existingUser = await User.findOne({ email: seedUser.email }).select('_id').lean();

  const update = {
    username: seedUser.username,
    email: seedUser.email,
    password,
    fullName: seedUser.fullName,
    role: seedUser.role,
    dob: seedUser.dob,
    isVerified: true,
    isBan: false,
    isBlock: false,
  };

  if (!existingUser) {
    update.userID = crypto.randomUUID();
  }

  const user = await User.findOneAndUpdate(
    { email: seedUser.email },
    { $set: update },
    { new: true, upsert: true, runValidators: true }
  ).select('email username role');

  return {
    email: user.email,
    username: user.username,
    role: user.role,
    action: existingUser ? 'updated' : 'created',
  };
};

const seedUsers = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is missing in .env');
  }

  await mongoose.connect(process.env.MONGO_URI);

  const results = [];
  for (const user of users) {
    results.push(await upsertSeedUser(user));
  }

  return results;
};

seedUsers()
  .then((results) => {
    console.table(results);
    console.log('User seed completed');
  })
  .catch((error) => {
    console.error(`User seed failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });

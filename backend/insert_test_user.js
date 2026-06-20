import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from './src/models.js';

const MONGODB_URI = 'mongodb://database:27017/gounion';

async function main() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to DB inside container');

    const password_hash = await bcrypt.hash('password123', 10);
    
    // Clear existing if any
    await User.deleteOne({ email: 'josenero51@gmail.com' });

    const user = await User.create({
      username: 'josenero51',
      email: 'josenero51@gmail.com',
      password_hash: password_hash,
      email_verified: true,
      profile: {
        full_name: 'Jose Nero',
      }
    });

    console.log('User inserted successfully:', user.email);
  } catch (error) {
    console.error('Error inserting user:', error);
  } finally {
    await mongoose.disconnect();
  }
}

main();

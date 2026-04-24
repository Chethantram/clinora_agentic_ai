const mongoose = require('mongoose');

let isConnected = false;

async function connectDB() {
  if (isConnected) {
    console.log('Using existing MongoDB connection');
    return;
  }

  try {
    const mongoUri = process.env.MONGO_URI;
    const mongoDbName = process.env.MONGO_DB_NAME || 'clinora';

    if (!mongoUri) {
      throw new Error(
        'MONGO_URI environment variable is not set. Please add it to your .env file.\n' +
        'Example: MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority'
      );
    }

    await mongoose.connect(mongoUri, {
      dbName: mongoDbName,
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      retryWrites: true,
      w: 'majority',
    });

    isConnected = true;
    console.log(`✓ Connected to MongoDB Atlas database: ${mongoDbName}`);
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

async function disconnectDB() {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  console.log('Disconnected from MongoDB');
}

function getConnection() {
  return mongoose.connection;
}

module.exports = {
  connectDB,
  disconnectDB,
  getConnection,
  isConnected: () => isConnected,
};

/**
 * Prisma Seed Script
 *
 * Seeds the database with initial data for development and testing.
 *
 * Run with: npm run prisma:seed
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data (useful for development)
  await prisma.notification.deleteMany();
  await prisma.userFlight.deleteMany();
  await prisma.connection.deleteMany();
  await prisma.flightChangeLog.deleteMany();
  await prisma.flight.deleteMany();
  await prisma.deviceToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.airport.deleteMany();

  // Create Airports
  console.log('✈️ Creating airports...');
  const airports = await prisma.airport.createMany({
    data: [
      {
        id: 'sfo',
        code: 'SFO',
        name: 'San Francisco International Airport',
        city: 'San Francisco',
        country: 'United States',
        latitude: 37.6213,
        longitude: -122.379,
        timezone: 'America/Los_Angeles',
      },
      {
        id: 'jfk',
        code: 'JFK',
        name: 'John F. Kennedy International Airport',
        city: 'New York',
        country: 'United States',
        latitude: 40.6413,
        longitude: -73.7781,
        timezone: 'America/New_York',
      },
      {
        id: 'lax',
        code: 'LAX',
        name: 'Los Angeles International Airport',
        city: 'Los Angeles',
        country: 'United States',
        latitude: 33.9425,
        longitude: -118.4081,
        timezone: 'America/Los_Angeles',
      },
      {
        id: 'ord',
        code: 'ORD',
        name: "O'Hare International Airport",
        city: 'Chicago',
        country: 'United States',
        latitude: 41.9742,
        longitude: -87.9073,
        timezone: 'America/Chicago',
      },
      {
        id: 'den',
        code: 'DEN',
        name: 'Denver International Airport',
        city: 'Denver',
        country: 'United States',
        latitude: 39.8561,
        longitude: -104.6737,
        timezone: 'America/Denver',
      },
    ],
    skipDuplicates: true,
  });

  console.log(`  Created ${airports.count} airports`);

  // Create test user
  console.log('👤 Creating test user...');
  const bcrypt = require('bcrypt');
  const hashedPassword = await bcrypt.hash('password123', 10);

  const testUser = await prisma.user.create({
    data: {
      email: 'test@aerosense.app',
      password: hashedPassword,
      name: 'Test User',
      role: 'FREE',
      emailVerified: true,
    },
  });

  console.log(`  Created user: ${testUser.email}`);

  // Create flights
  console.log('✈️ Creating flights...');
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const flights = [
    {
      airlineCode: 'AA',
      airlineName: 'American Airlines',
      flightNumber: '1234',
      originId: 'sfo',
      destinationId: 'jfk',
      scheduledDeparture: tomorrow.toISOString(),
      scheduledArrival: new Date(tomorrow.getTime() + 5 * 60 * 60 * 1000).toISOString(),
      departureGate: 'A12',
      arrivalGate: 'B22',
      terminal: 'Terminal 1',
      status: 'SCHEDULED',
      delayMinutes: 0,
      aircraftType: 'Boeing 737-800',
      flightDistance: 2586,
    },
    {
      airlineCode: 'UA',
      airlineName: 'United Airlines',
      flightNumber: '5678',
      originId: 'lax',
      destinationId: 'ord',
      scheduledDeparture: tomorrow.toISOString(),
      scheduledArrival: new Date(tomorrow.getTime() + 4 * 60 * 60 * 1000).toISOString(),
      departureGate: 'B5',
      arrivalGate: 'C15',
      terminal: 'Terminal 2',
      status: 'SCHEDULED',
      delayMinutes: 0,
      aircraftType: 'Airbus A320',
      flightDistance: 1745,
    },
    {
      airlineCode: 'DL',
      airlineName: 'Delta Air Lines',
      flightNumber: '9012',
      originId: 'jfk',
      destinationId: 'den',
      scheduledDeparture: new Date(tomorrow.getTime() + 6 * 60 * 60 * 1000).toISOString(),
      scheduledArrival: new Date(tomorrow.getTime() + 11 * 60 * 60 * 1000).toISOString(),
      departureGate: 'C3',
      arrivalGate: 'A8',
      terminal: 'Terminal 4',
      status: 'DELAYED',
      delayMinutes: 45,
      aircraftType: 'Boeing 757-300',
      flightDistance: 1621,
    },
  ];

  const createdFlights = await prisma.flight.createMany({
    data: flights,
    skipDuplicates: true,
  });

  console.log(`  Created ${createdFlights.count} flights`);

  // Assign flights to test user
  console.log('🔗 Assigning flights to user...');
  const allFlights = await prisma.flight.findMany();

  for (const flight of allFlights) {
    await prisma.userFlight.create({
      data: {
        userId: testUser.id,
        flightId: flight.id,
        isPrimary: true,
      },
    });
  }

  console.log(`  Assigned ${allFlights.length} flights to test user`);

  console.log('✅ Seed completed successfully!');
  console.log('');
  console.log('Test credentials:');
  console.log('  Email: test@aerosense.app');
  console.log('  Password: password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

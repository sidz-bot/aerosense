-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('FREE', 'PREMIUM', 'ADMIN');

-- CreateEnum
CREATE TYPE "OAuthProvider" AS ENUM ('GOOGLE', 'APPLE');

-- CreateEnum
CREATE TYPE "FlightStatus" AS ENUM ('SCHEDULED', 'DELAYED', 'IN_AIR', 'LANDED', 'CANCELED', 'BOARDING', 'DEPARTED', 'DIVERTED');

-- CreateEnum
CREATE TYPE "ConnectionRiskLevel" AS ENUM ('ON_TRACK', 'AT_RISK', 'HIGH_RISK', 'CRITICAL');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('GATE_CHANGE', 'DELAY', 'BOARDING_SOON', 'CONNECTION_RISK', 'CONNECTION_STATUS_CHANGE', 'FLIGHT_CANCELED');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "ChangeType" AS ENUM ('GATE_CHANGE', 'TIME_CHANGE', 'STATUS_CHANGE', 'DELAY_UPDATE', 'CANCELLATION');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "password" TEXT,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'FREE',
    "avatarUrl" TEXT,
    "oauthProvider" "OAuthProvider",
    "oauthProviderId" TEXT,
    "refreshToken" TEXT,
    "notificationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "gateChangeAlerts" BOOLEAN NOT NULL DEFAULT true,
    "delayAlerts" BOOLEAN NOT NULL DEFAULT true,
    "boardingAlerts" BOOLEAN NOT NULL DEFAULT true,
    "connectionRiskAlerts" BOOLEAN NOT NULL DEFAULT true,
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "airports" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "timezone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "airports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flights" (
    "id" TEXT NOT NULL,
    "airlineCode" TEXT NOT NULL,
    "airlineName" TEXT NOT NULL,
    "flightNumber" TEXT NOT NULL,
    "originId" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "scheduledDeparture" TEXT NOT NULL,
    "scheduledArrival" TEXT NOT NULL,
    "estimatedDeparture" TEXT,
    "estimatedArrival" TEXT,
    "actualDeparture" TEXT,
    "actualArrival" TEXT,
    "departureGate" TEXT,
    "arrivalGate" TEXT,
    "terminal" TEXT,
    "baggageClaim" TEXT,
    "status" "FlightStatus" NOT NULL DEFAULT 'SCHEDULED',
    "delayMinutes" INTEGER NOT NULL DEFAULT 0,
    "aircraftType" TEXT,
    "flightDistance" INTEGER,
    "lastFetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_flights" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "flightId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "notificationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "gateChangeAlerts" BOOLEAN NOT NULL DEFAULT true,
    "delayAlerts" BOOLEAN NOT NULL DEFAULT true,
    "boardingAlerts" BOOLEAN NOT NULL DEFAULT true,
    "connectionRiskAlerts" BOOLEAN NOT NULL DEFAULT true,
    "connectionFlightId" TEXT,
    "connectionRisk" "ConnectionRiskLevel",
    "connectionRiskCalculatedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_flights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connections" (
    "id" TEXT NOT NULL,
    "incomingFlightId" TEXT NOT NULL,
    "outgoingFlightId" TEXT NOT NULL,
    "bufferMinutes" INTEGER NOT NULL,
    "effectiveBuffer" INTEGER NOT NULL,
    "riskLevel" "ConnectionRiskLevel" NOT NULL,
    "riskFactors" JSONB,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "incomingGate" TEXT,
    "outgoingGate" TEXT,
    "terminalChange" BOOLEAN NOT NULL DEFAULT false,
    "estimatedWalkTime" INTEGER,
    "historicalOnTimeRate" DOUBLE PRECISION,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "flightId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flight_change_logs" (
    "id" TEXT NOT NULL,
    "flightId" TEXT NOT NULL,
    "type" "ChangeType" NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "source" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flight_change_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_refreshToken_key" ON "users"("refreshToken");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_oauthProvider_oauthProviderId_idx" ON "users"("oauthProvider", "oauthProviderId");

-- CreateIndex
CREATE INDEX "device_tokens_token_idx" ON "device_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "device_tokens_userId_token_key" ON "device_tokens"("userId", "token");

-- CreateIndex
CREATE UNIQUE INDEX "airports_code_key" ON "airports"("code");

-- CreateIndex
CREATE INDEX "airports_code_idx" ON "airports"("code");

-- CreateIndex
CREATE INDEX "flights_airlineCode_flightNumber_idx" ON "flights"("airlineCode", "flightNumber");

-- CreateIndex
CREATE INDEX "flights_scheduledDeparture_idx" ON "flights"("scheduledDeparture");

-- CreateIndex
CREATE INDEX "flights_status_idx" ON "flights"("status");

-- CreateIndex
CREATE UNIQUE INDEX "flights_airlineCode_flightNumber_scheduledDeparture_key" ON "flights"("airlineCode", "flightNumber", "scheduledDeparture");

-- CreateIndex
CREATE INDEX "user_flights_userId_idx" ON "user_flights"("userId");

-- CreateIndex
CREATE INDEX "user_flights_flightId_idx" ON "user_flights"("flightId");

-- CreateIndex
CREATE UNIQUE INDEX "user_flights_userId_flightId_key" ON "user_flights"("userId", "flightId");

-- CreateIndex
CREATE INDEX "connections_incomingFlightId_idx" ON "connections"("incomingFlightId");

-- CreateIndex
CREATE INDEX "connections_outgoingFlightId_idx" ON "connections"("outgoingFlightId");

-- CreateIndex
CREATE UNIQUE INDEX "connections_incomingFlightId_outgoingFlightId_key" ON "connections"("incomingFlightId", "outgoingFlightId");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_flightId_idx" ON "notifications"("flightId");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

-- CreateIndex
CREATE INDEX "flight_change_logs_flightId_detectedAt_idx" ON "flight_change_logs"("flightId", "detectedAt");

-- AddForeignKey
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flights" ADD CONSTRAINT "flights_originId_fkey" FOREIGN KEY ("originId") REFERENCES "airports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flights" ADD CONSTRAINT "flights_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "airports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_flights" ADD CONSTRAINT "user_flights_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_flights" ADD CONSTRAINT "user_flights_flightId_fkey" FOREIGN KEY ("flightId") REFERENCES "flights"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connections" ADD CONSTRAINT "connections_incomingFlightId_fkey" FOREIGN KEY ("incomingFlightId") REFERENCES "flights"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connections" ADD CONSTRAINT "connections_outgoingFlightId_fkey" FOREIGN KEY ("outgoingFlightId") REFERENCES "flights"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

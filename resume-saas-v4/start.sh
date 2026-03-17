#!/bin/sh

echo "Waiting for database to be ready..."
# Giving the database a few seconds to start up just in case
sleep 5

echo "Pushing database schema..."
# Automatically create the tables in the database if they don't exist
npx prisma db push --accept-data-loss

echo "Starting Next.js server..."
# Start the production server
node server.js

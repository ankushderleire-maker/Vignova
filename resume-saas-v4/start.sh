#!/bin/sh

echo "Waiting for database to be ready..."
# Giving the database a few seconds to start up just in case
sleep 5

echo "Pushing database schema..."
# Automatically create the tables in the database if they don't exist
npx prisma@6 db push --accept-data-loss

echo "Applying raw SQL migrations (idempotent)..."
# Tables that live outside schema.prisma (queried via $queryRawUnsafe) are
# created/updated here. Each file is safe to re-run.
for sql in /app/prisma/migrations/*.sql prisma/migrations/*.sql; do
    [ -f "$sql" ] || continue
    echo "  - applying $sql"
    npx prisma@6 db execute --file "$sql" --schema prisma/schema.prisma || {
        echo "    ! $sql failed — continuing"
    }
done

echo "Starting Next.js server..."
# Start the production server
node server.js

#!/bin/sh
set -e

echo "==================================="
echo "Starting Backend Container"
echo "==================================="

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
max_retries=30
retry_count=0

until npx prisma db push --skip-generate 2>/dev/null || [ $retry_count -eq $max_retries ]; do
  retry_count=$((retry_count + 1))
  echo "PostgreSQL is unavailable - attempt $retry_count/$max_retries"
  sleep 2
done

if [ $retry_count -eq $max_retries ]; then
  echo "ERROR: PostgreSQL did not become ready in time"
  exit 1
fi

echo "PostgreSQL is ready!"

# Clean up Synology NAS artifacts (if any slipped through)
echo "Cleaning up system artifacts..."
find /app/prisma/migrations -type d -name "@eaDir" -exec rm -rf {} + 2>/dev/null || true
find /app/prisma/migrations -name ".DS_Store" -delete 2>/dev/null || true
find /app/prisma/migrations -name "Thumbs.db" -delete 2>/dev/null || true

# Run migrations
echo "Running database migrations..."
npx prisma migrate deploy

if [ $? -eq 0 ]; then
  echo "✓ Migrations completed successfully"
else
  echo "ERROR: Migration failed"
  exit 1
fi

# Start the application
echo "Starting application..."
exec npm start

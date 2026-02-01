#!/bin/bash
# Setup local development environment

set -e

echo "🔧 Setting up local development environment..."

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed."; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed."; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose is required but not installed."; exit 1; }

echo "✅ Prerequisites checked"

# Install npm dependencies
echo "📦 Installing npm dependencies..."
npm install

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
  echo "📝 Creating .env.local from example..."
  cp .env.local.example .env.local
  echo "⚠️  Please edit .env.local with your Azure credentials"
fi

# Start Docker services
echo "🐳 Starting Docker services..."
docker-compose up -d

# Wait for Redis to be ready
echo "⏳ Waiting for Redis to be ready..."
sleep 5

# Check if services are running
echo "🔍 Checking service health..."
docker-compose ps

echo "✅ Local development environment is ready!"
echo ""
echo "Next steps:"
echo "  1. Edit .env.local with your Azure credentials"
echo "  2. Run 'npm run dev' to start the development server"
echo "  3. Visit http://localhost:3000/health to verify"

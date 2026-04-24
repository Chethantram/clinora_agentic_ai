#!/bin/bash

# Clinora MongoDB Atlas Quick Start Setup Script
# This script sets up both backend and frontend for development

set -e

echo "======================================"
echo "🚀 Clinora MongoDB Atlas Setup"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
echo "📋 Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# Check MongoDB connection
check_mongodb() {
    echo "🔌 Checking MongoDB connection..."
    if [ -z "$MONGO_URI" ]; then
        echo -e "${RED}✗ MONGO_URI not set in environment${NC}"
        return 1
    fi
    echo -e "${GREEN}✓ MONGO_URI configured${NC}"
    return 0
}

# Setup Backend
setup_backend() {
    echo ""
    echo "⚙️  Setting up Backend..."
    cd backend1
    
    if [ ! -f ".env" ]; then
        echo "📝 Creating .env from .env.example..."
        if [ -f ".env.example" ]; then
            cp .env.example .env
            echo -e "${YELLOW}⚠️  Please update .env with your MongoDB URI${NC}"
            echo "   Edit: backend1/.env"
            exit 0
        else
            echo -e "${RED}✗ .env.example not found${NC}"
            exit 1
        fi
    fi
    
    # Install dependencies
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing dependencies..."
        npm install
        echo -e "${GREEN}✓ Dependencies installed${NC}"
    else
        echo -e "${GREEN}✓ Dependencies already installed${NC}"
    fi
    
    # Run seed script
    echo "🌱 Seeding MongoDB with sample data..."
    node scripts/seed.js
    
    cd ..
    echo -e "${GREEN}✓ Backend setup complete${NC}"
}

# Setup Frontend
setup_frontend() {
    echo ""
    echo "⚙️  Setting up Frontend..."
    cd v0-hackathon-development-order
    
    if [ ! -f ".env.local" ]; then
        echo "📝 Creating .env.local..."
        cat > .env.local << 'EOF'
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
EOF
        echo -e "${GREEN}✓ .env.local created${NC}"
    fi
    
    # Install dependencies
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing dependencies..."
        npm install
        echo -e "${GREEN}✓ Dependencies installed${NC}"
    else
        echo -e "${GREEN}✓ Dependencies already installed${NC}"
    fi
    
    cd ..
    echo -e "${GREEN}✓ Frontend setup complete${NC}"
}

# Start servers
start_servers() {
    echo ""
    echo "======================================"
    echo "🎉 Setup Complete!"
    echo "======================================"
    echo ""
    echo "📍 Next steps:"
    echo ""
    echo "1. Terminal 1 - Start Backend:"
    echo "   cd backend1 && npm run dev"
    echo "   Backend: http://localhost:4000"
    echo ""
    echo "2. Terminal 2 - Start Frontend:"
    echo "   cd v0-hackathon-development-order && npm run dev"
    echo "   Frontend: http://localhost:3000"
    echo ""
    echo "3. Open browser:"
    echo "   http://localhost:3000"
    echo ""
    echo "======================================"
}

# Main execution
main() {
    # Ask for MongoDB URI if not set
    if [ -z "$MONGO_URI" ]; then
        echo -e "${YELLOW}⚠️  MongoDB URI not configured${NC}"
        echo ""
        echo "You need a MongoDB Atlas account:"
        echo "1. Go to https://www.mongodb.com/cloud/atlas"
        echo "2. Create a free cluster"
        echo "3. Get your connection string"
        echo ""
        read -p "Enter your MongoDB URI: " MONGO_URI
        export MONGO_URI
    fi
    
    # Setup backend
    setup_backend
    
    # Setup frontend  
    setup_frontend
    
    # Start servers
    start_servers
}

# Run main
main

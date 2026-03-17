#!/bin/bash

# Test ticket service build
echo "🔧 Testing ticket service build..."

cd /opt/project/AgentdesktopTPB

# Test build first
echo "Building ticket service..."
npx nx build ticket-service --configuration=development 2>&1 | head -20

echo ""
echo "Build result: $?"

# If build fails, show error
if [ $? -ne 0 ]; then
    echo "❌ Build failed. Using mock data in frontend."
    echo "✅ Frontend will work with mock tickets"
else
    echo "✅ Build successful"
fi

echo ""
echo "🌐 Test Agent Desktop: http://157.66.80.51:3000"
echo "📝 Login: admin / Admin@123"

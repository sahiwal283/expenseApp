#!/bin/bash

# Test OCR + Ollama Integration
# Usage: ./test-ocr-ollama.sh [receipt-image.jpg]

SANDBOX_URL="http://192.168.1.144"
API_URL="${SANDBOX_URL}/api"

echo "=== OCR + Ollama Integration Test ==="
echo ""

# 1. Login
echo "1. Authenticating as developer..."
TOKEN=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"developer","password":"sandbox123"}' | jq -r '.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Authentication failed"
  exit 1
fi
echo "✓ Authenticated"
echo ""

# 2. Test health endpoint
echo "2. Checking backend health..."
HEALTH=$(curl -s "${API_URL}/health" | jq -r '.status')
if [ "$HEALTH" = "healthy" ]; then
  echo "✓ Backend is healthy"
else
  echo "⚠ Backend status: $HEALTH"
fi
echo ""

# 3. Create a simple test receipt if none provided
RECEIPT_FILE="${1:-test-receipt.txt}"
if [ ! -f "$RECEIPT_FILE" ]; then
  echo "3. Creating test receipt text file..."
  cat > test-receipt.txt << 'RECEIPT'
WAL-MART SUPERCENTER
Store #1234
1234 Main Street
Anytown, CA 12345

Date: 10/16/2025
Time: 14:30

Item 1...................$5.99
Item 2...................$12.49
Item 3...................$8.99

Subtotal:................$27.47
Tax:.....................$2.20
Total:..................$29.67

Card ending in 5678
Auth Code: 123456

Thank you for shopping!
RECEIPT
  RECEIPT_FILE="test-receipt.txt"
  echo "✓ Test receipt created"
fi
echo ""

# 4. Test OCR v2 endpoint
echo "4. Testing enhanced OCR endpoint..."
echo "   (This will initialize Ollama if fields have low confidence)"
echo ""

RESPONSE=$(curl -s -X POST "${API_URL}/ocr/v2/process" \
  -H "Authorization: Bearer $TOKEN" \
  -F "receipt=@${RECEIPT_FILE}")

echo "$RESPONSE" | jq '.'
echo ""

# 5. Check for LLM enhancements
echo "5. Analyzing results..."
HAS_LLM=$(echo "$RESPONSE" | jq -r '.fields | to_entries[] | select(.value.source == "llm") | .key' | head -1)

if [ -n "$HAS_LLM" ]; then
  echo "✅ LLM enhancement detected!"
  echo "   Enhanced fields:"
  echo "$RESPONSE" | jq -r '.fields | to_entries[] | select(.value.source == "llm") | "   - \(.key): \(.value.value) (confidence: \(.value.confidence))"'
else
  echo "ℹ️  No LLM enhancement (all fields had high confidence)"
  echo "   Field confidence scores:"
  echo "$RESPONSE" | jq -r '.fields | to_entries[] | "   - \(.key): \(.value.confidence)"'
fi
echo ""

# 6. Check quality assessment
NEEDS_REVIEW=$(echo "$RESPONSE" | jq -r '.quality.needsReview')
if [ "$NEEDS_REVIEW" = "true" ]; then
  echo "⚠️  Receipt flagged for manual review"
  REASONS=$(echo "$RESPONSE" | jq -r '.quality.reviewReasons[]' | sed 's/^/   - /')
  echo "   Reasons:"
  echo "$REASONS"
else
  echo "✓ Receipt passed quality checks"
fi
echo ""

# 7. Show category suggestions
echo "6. Category suggestions:"
echo "$RESPONSE" | jq -r '.categories[] | "   \(.category) (confidence: \(.confidence), keywords: \(.keywordsMatched | join(", ")))"'
echo ""

echo "=== Test Complete ==="

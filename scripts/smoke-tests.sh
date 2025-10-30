#!/bin/bash
# Smoke tests for Advisory Status Tracker API
# Usage: ./scripts/smoke-tests.sh [BASE_URL]
# Default BASE_URL: http://localhost:3000

BASE_URL=${1:-"http://localhost:3000"}
PROGRAM_ID=${NEXT_PUBLIC_PROGRAM_ID:-""}

if [ -z "$PROGRAM_ID" ]; then
  echo "Error: NEXT_PUBLIC_PROGRAM_ID not set"
  exit 1
fi

echo "Running smoke tests against $BASE_URL"
echo "Program ID: $PROGRAM_ID"
echo ""

# Test 1: Dry-Run Parser
echo "=== Test 1: Dry-Run Parse ==="
RESPONSE=$(curl -s -X POST "$BASE_URL/api/parse" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Data Ingest slipped 2 days; now 70%. New target Fri. Modeling on track at 45%. Next milestone dimension conformance next Wed. QA blocker—need mock data by Mon (Jo). Add MEDIUM risk on vendor API throughput."
  }')

if echo "$RESPONSE" | jq -e '.workstreams' > /dev/null 2>&1; then
  echo "✅ Parse test passed"
  echo "$RESPONSE" | jq '.workstreams | length' | xargs echo "  Workstreams found:"
else
  echo "❌ Parse test failed"
  echo "$RESPONSE" | jq '.'
  exit 1
fi
echo ""

# Test 2: Apply Update
echo "=== Test 2: Apply Update ==="
RESPONSE=$(curl -s -X POST "$BASE_URL/api/apply-update" \
  -H "Content-Type: application/json" \
  -d "{
    \"programId\": \"$PROGRAM_ID\",
    \"notes\": \"Data Ingest slipped 2 days; now 70%. New target Fri. Modeling on track at 45%. Next milestone dimension conformance next Wed. QA blocker—need mock data by Mon (Jo). Add MEDIUM risk on vendor API throughput.\",
    \"appliedBy\": \"Smoke Test\"
  }")

if echo "$RESPONSE" | jq -e '.ok == true' > /dev/null 2>&1; then
  echo "✅ Apply update test passed"
  echo "$RESPONSE" | jq -r '.overall' | xargs echo "  Overall status:"
else
  echo "❌ Apply update test failed"
  echo "$RESPONSE" | jq '.'
  exit 1
fi
echo ""

# Test 3: Weekly Summary
echo "=== Test 3: Explain Weekly ==="
RESPONSE=$(curl -s -X POST "$BASE_URL/api/explain-weekly" \
  -H "Content-Type: application/json" \
  -d "{\"programId\":\"$PROGRAM_ID\"}")

if echo "$RESPONSE" | jq -e '.ok == true' > /dev/null 2>&1; then
  echo "✅ Weekly summary test passed"
  WORD_COUNT=$(echo "$RESPONSE" | jq -r '.text' | wc -w)
  echo "  Word count: $WORD_COUNT"
else
  echo "❌ Weekly summary test failed"
  echo "$RESPONSE" | jq '.'
  exit 1
fi
echo ""

echo "✅ All smoke tests passed!"


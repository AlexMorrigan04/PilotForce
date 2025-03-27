#!/bin/bash

# Define colors for better readability
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Formspree endpoint
FORMSPREE_URL="https://formspree.io/f/mvgkqjvr"

# Email data
TEST_EMAIL="test@example.com"
TO_EMAIL="admin@pilotforceapp.com"

echo -e "${YELLOW}Testing Formspree connection to: ${FORMSPREE_URL}${NC}"

# Create JSON payload
echo -e "${YELLOW}Creating test email payload...${NC}"
PAYLOAD=$(cat <<EOF
{
  "to": "${TO_EMAIL}",
  "_cc": "${TEST_EMAIL}",
  "subject": "Formspree Connection Test",
  "message": "<p>This is a test email to verify the Formspree connection.</p>"
}
EOF
)

echo -e "${YELLOW}Payload:${NC}"
echo $PAYLOAD | jq || echo $PAYLOAD

# Make the request
echo -e "${YELLOW}Sending test request to Formspree...${NC}"
RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "$PAYLOAD" \
  "${FORMSPREE_URL}")

# Check response
HTTP_CODE=$?

if [ $HTTP_CODE -eq 0 ]; then
  echo -e "${GREEN}Request sent successfully${NC}"
  echo -e "${YELLOW}Response:${NC}"
  echo $RESPONSE | jq || echo $RESPONSE
  
  # Check if the response contains "ok": true (fixed this condition)
  if echo $RESPONSE | grep -q '"ok": true'; then
    echo -e "${GREEN}Formspree connection test PASSED! Email sent successfully.${NC}"
  else
    echo -e "${RED}Formspree connection test FAILED. Check response for details.${NC}"
  fi
else
  echo -e "${RED}Failed to connect to Formspree. HTTP Code: ${HTTP_CODE}${NC}"
fi

echo -e "${YELLOW}Test complete.${NC}"

# Note: Make the script executable with: chmod +x scripts/test-formspree.sh

#!/bin/bash

# Display environment for debugging
echo "NODE_ENV: $NODE_ENV"
echo "REACT_APP_MAPBOX_ACCESS_TOKEN is defined: $(if [ -n "$REACT_APP_MAPBOX_ACCESS_TOKEN" ]; then echo "yes"; else echo "no"; fi)"

# Ensure .env.production exists
if [ ! -f .env.production ]; then
  echo "Creating .env.production file"
  echo "REACT_APP_MAPBOX_ACCESS_TOKEN=$REACT_APP_MAPBOX_ACCESS_TOKEN" > .env.production
fi

# Run the build with extra debugging
GENERATE_SOURCEMAP=true npm run build

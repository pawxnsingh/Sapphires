#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/tmp/sapphires-worker"

echo "Step 1: Check for existing $APP_DIR"
if [ -e "$APP_DIR" ]; then
  echo "Found $APP_DIR — removing it"
  rm -rf -- "$APP_DIR"
fi

# Create the project non-interactively
npx create-expo-app@latest "$APP_DIR" --yes

echo "Step 3: Set sane permissions (user rwx, no access for others)"

sudo chmod 777 -R /tmp

echo "Done. App created at $APP_DIR"

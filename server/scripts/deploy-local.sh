#!/usr/bin/env bash
set -euo pipefail

# Build both frontend and backend, then run backend in production mode.
# This script is designed for simple VM/VPS hosting where DNS points to this host.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CLIENT_DIR="${ROOT_DIR}/client"
SERVER_DIR="${ROOT_DIR}/server"

echo "Building frontend..."
cd "${CLIENT_DIR}"
npm ci
npm run build

echo "Building backend..."
cd "${SERVER_DIR}"
npm ci
npm run build

echo "Starting server..."
PORT="${PORT:-4000}" \
HOSTNAME="${HOSTNAME:-0.0.0.0}" \
CLIENT_DIST_PATH="${CLIENT_DIST_PATH:-${CLIENT_DIR}/dist}" \
node dist/index.js

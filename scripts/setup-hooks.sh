#!/bin/sh
# ==============================================================
# Setup Git Hooks for RocoTools
# Run this once after cloning the repository
# ==============================================================

echo "🔧 Setting up git hooks..."

# Set hooks path
git config core.hooksPath scripts/git-hooks

# Verify
HOOKS_PATH=$(git config core.hooksPath)

if [ "$HOOKS_PATH" = "scripts/git-hooks" ]; then
  echo "✅ Git hooks activated successfully!"
  echo ""
  echo "   Hooks path: scripts/git-hooks/"
  echo "   Active hooks:"
  echo "     - pre-commit  (code checks + auto-build)"
  echo "     - commit-msg  (message format validation)"
  echo ""
  echo "   To bypass hooks: git commit --no-verify"
else
  echo "❌ Failed to set hooks path"
  exit 1
fi

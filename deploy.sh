#!/bin/bash
# Deploy: GitHub + Vercel
# Run: bash deploy.sh

echo "Starting deploy..."

git config --global user.email "pedro@pedroafonso.dev"
git config --global user.name "Pedro Afonso"

git init 2>/dev/null || true
git checkout -b main 2>/dev/null || true
git add .
git commit -m "feat: post preview app" 2>/dev/null || echo "Nothing to commit"

echo ""
echo "Creating GitHub repo..."
gh repo create post-preview --public --source=. --push --description "Post preview app for LinkedIn + Instagram" 2>/dev/null \
  || git push -u origin main 2>/dev/null \
  || echo "GitHub: configure manually if needed"

echo ""
echo "Deploying to Vercel..."
npx vercel --prod --yes 2>/dev/null \
  || npx vercel@latest --prod --yes

echo ""
echo "Done! Copy the URL above and set it in n8n."

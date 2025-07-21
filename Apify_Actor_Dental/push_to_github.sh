#!/bin/bash

# Script to push Dental Keyword Scraper to GitHub
# Replace YOUR_GITHUB_USERNAME with your actual GitHub username

echo "🚀 Pushing Dental Keyword Scraper to GitHub..."

# Replace this with your GitHub username
GITHUB_USERNAME="YOUR_GITHUB_USERNAME"
REPO_NAME="dental-keyword-scraper"

echo "📝 Instructions:"
echo "1. Go to https://github.com/new"
echo "2. Repository name: $REPO_NAME"
echo "3. Make it public (or private)"
echo "4. DON'T initialize with README, .gitignore, or license"
echo "5. Click 'Create repository'"
echo ""
echo "Then run this script with your GitHub username:"
echo "bash push_to_github.sh YOUR_GITHUB_USERNAME"
echo ""

if [ "$1" != "" ]; then
    GITHUB_USERNAME=$1
    echo "✅ Using GitHub username: $GITHUB_USERNAME"
    
    # Add remote origin
    git remote add origin https://github.com/$GITHUB_USERNAME/$REPO_NAME.git
    
    # Push to GitHub
    git branch -M main
    git push -u origin main
    
    echo "🎉 Successfully pushed to GitHub!"
    echo "🌐 View your repository at: https://github.com/$GITHUB_USERNAME/$REPO_NAME"
else
    echo "❌ Please provide your GitHub username as an argument"
    echo "Usage: bash push_to_github.sh YOUR_GITHUB_USERNAME"
fi 
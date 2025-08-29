# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2025-08-28

### 🔧 Fixed
- **AI Discovery Fallback Issues**: Resolved critical problem causing AI discovery to fall back to generic "Fallback Analysis" instead of using Claude AI
- **Claude Model Configuration**: Fixed invalid model name `claude-3-sonnet-20240229` that was causing 404 Not Found errors
- **API Key Authentication**: Resolved Claude API key issues and updated to valid key
- **Authentication & API Access Issues**: Fixed critical authentication problems preventing access to Apify Integration page
- **PrismaClient Consolidation**: Resolved multiple PrismaClient instances causing database connection issues
- **Environment Variable Configuration**: Fixed VITE_API_URL from direct backend calls to proper Vite proxy usage
- **Token Key Consistency**: Standardized all services to use 'bbds_access_token' instead of inconsistent 'token' keys
- **Database Connection**: Fixed database URL mismatch between Docker and local development environments
- **Analytics Service**: Fixed PostgreSQL date functions and column naming issues in analytics queries
- **API Endpoint Access**: Resolved 401 Unauthorized errors on authenticated API endpoints

### ✅ Added
- **Enhanced Error Handling**: Implemented comprehensive error handling for AI configuration issues with user-friendly error messages
- **Configuration Error Notifications**: Users now receive clear notifications when AI services have configuration problems
- **Smart Fallback System**: Improved fallback logic that provides actionable guidance instead of silent failures
- **Working Apify Integration**: Existing APIFY - BING SCRAPER now visible and accessible
- **Consolidated Database Layer**: All services now use shared PrismaClient instance
- **Proper Authentication Flow**: Frontend now correctly authenticates with backend API

### 🚀 Technical Improvements
- **Current Claude Model**: Updated to use `claude-sonnet-4-20250514` (latest available model)
- **AI Service Diagnostics**: Added comprehensive logging and error analysis for AI service failures
- **User Experience Improvements**: Clear error messages guide users to fix configuration issues
- **Vite Proxy Configuration**: API calls now properly route through Vite proxy with authentication
- **Service Layer Consistency**: Standardized authentication token handling across all services
- **Database Schema Compatibility**: Fixed PostgreSQL-specific query syntax and column references

## [Previous Versions]
- Initial project setup and configuration 
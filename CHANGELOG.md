# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2025-08-24

### 🔧 Fixed
- **Authentication & API Access Issues**: Fixed critical authentication problems preventing access to Apify Integration page
- **PrismaClient Consolidation**: Resolved multiple PrismaClient instances causing database connection issues
- **Environment Variable Configuration**: Fixed VITE_API_URL from direct backend calls to proper Vite proxy usage
- **Token Key Consistency**: Standardized all services to use 'bbds_access_token' instead of inconsistent 'token' keys
- **Database Connection**: Fixed database URL mismatch between Docker and local development environments
- **Analytics Service**: Fixed PostgreSQL date functions and column naming issues in analytics queries
- **API Endpoint Access**: Resolved 401 Unauthorized errors on authenticated API endpoints

### ✅ Added
- **Working Apify Integration**: Existing APIFY - BING SCRAPER now visible and accessible
- **Consolidated Database Layer**: All services now use shared PrismaClient instance
- **Proper Authentication Flow**: Frontend now correctly authenticates with backend API

### 🚀 Technical Improvements
- **Vite Proxy Configuration**: API calls now properly route through Vite proxy with authentication
- **Service Layer Consistency**: Standardized authentication token handling across all services
- **Database Schema Compatibility**: Fixed PostgreSQL-specific query syntax and column references

## [Previous Versions]
- Initial project setup and configuration 
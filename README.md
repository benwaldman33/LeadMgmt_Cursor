# Universal Lead Scoring Platform - MVP

A universal, AI-powered web scraping and scoring platform that enables systematic lead evaluation across any industry vertical.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- PostgreSQL 15+ (provided via Docker)
- Redis 7+ (provided via Docker)

### Database Configuration

**Current Setup**: PostgreSQL 15 running in Docker
- **Database Name**: `leadmgmt`
- **Container**: `leadmgmt_cursor-postgres-1`
- **Access**: `localhost:5433` (mapped from container's 5432)
- **ORM**: Prisma configured for PostgreSQL
- **Data Persistence**: Docker volumes

**Important**: This system uses PostgreSQL in Docker. Do not attempt to use SQLite or other databases as the schema is specifically configured for PostgreSQL.

### Local Development Setup

1. **Clone and navigate to the project:**
   ```bash
   cd "BBDS Project"
   ```

2. **Start the development environment:**
   ```bash
   docker-compose up -d
   ```

3. **Set up the database:**
   ```bash
   cd backend
   npm run db:generate
   npm run db:push
   ```

   **Note**: The database is PostgreSQL 15 running in Docker. The schema is automatically applied when you run `npm run db:push`.

4. **Install dependencies:**
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

5. **Start the development servers:**
   ```bash
   # Backend (in backend directory)
   npm run dev
   
   # Frontend (in frontend directory)
   npm run dev
   ```

6. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Health Check: http://localhost:3001/health
   - Database: localhost:5433 (PostgreSQL)

7. **Verify database connection:**
   ```bash
   # Check if database is accessible
   docker exec leadmgmt_cursor-postgres-1 psql -U dev -d leadmgmt -c "SELECT COUNT(*) FROM users;"
   ```

## 📁 Project Structure

```
BBDS Project/
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── controllers/     # Route controllers
│   │   ├── middleware/      # Auth & validation middleware
│   │   ├── models/          # Data models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Utility functions
│   │   └── types/           # TypeScript type definitions
│   ├── prisma/              # Database schema & migrations
│   └── Dockerfile           # Backend container
├── frontend/                # React TypeScript application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API services
│   │   ├── utils/           # Utility functions
│   │   └── types/           # TypeScript types
│   └── Dockerfile           # Frontend container
├── docker-compose.yml       # Development environment
└── README.md               # This file
```

## 🛠️ MVP Features

### ✅ Included in MVP

- **User Management**: JWT authentication, role-based access (Super Admin, Analyst, Viewer)
- **Campaign Management**: Create and manage lead generation campaigns
- **Lead Management**: Import, track, and manage leads with status workflow
- **Scoring System**: Up to 5 criteria per model with weighted scoring
- **Web Scraping**: Basic website content extraction
- **Integrations**: HubSpot CRM, Clearbit enrichment, Claude AI
- **Basic Reporting**: Dashboard with key metrics and export functionality

### ❌ Excluded from MVP

- Multi-industry features (focus on dental initially)
- Advanced user management (complex hierarchies, SSO)
- Advanced integrations (multiple CRMs, Wayback Machine)
- Advanced analytics and reporting
- Mobile application
- Advanced compliance features

## 🔧 Development

### Backend Development

```bash
cd backend

# Start development server
npm run dev

# Database operations
npm run db:generate    # Generate Prisma client
npm run db:push        # Push schema to database
npm run db:migrate     # Run migrations
npm run db:studio      # Open Prisma Studio

# Testing
npm test

# Linting
npm run lint
npm run lint:fix
```

### Frontend Development

```bash
cd frontend

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🗄️ Database

The application uses PostgreSQL with Prisma ORM. The schema includes:

- **Users**: Authentication and role management
- **Teams**: Organization structure
- **Campaigns**: Lead generation campaigns
- **Scoring Models**: AI-powered scoring criteria
- **Leads**: Lead data and scoring results
- **Enrichment**: External data enrichment

## 🔐 Authentication

- JWT-based authentication
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Token expiration and refresh

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Create new user (Super Admin only)
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/logout` - Logout

### Users
- `GET /api/users` - Get all users (Super Admin only)
- `GET /api/users/:id` - Get user by ID (Super Admin only)
- `PUT /api/users/:id` - Update user (Super Admin only)

### Teams
- `GET /api/teams` - Get all teams
- `POST /api/teams` - Create team

### Campaigns
- `GET /api/campaigns` - Get all campaigns
- `POST /api/campaigns` - Create campaign

### Leads
- `GET /api/leads` - Get leads with filtering and pagination
- `POST /api/leads` - Create lead

### Scoring
- `GET /api/scoring` - Get scoring models
- `POST /api/scoring` - Create scoring model

## 🔧 Environment Variables

Create a `.env` file in the backend directory:

```env
# Server Configuration
NODE_ENV=development
PORT=3001

# Database
DATABASE_URL="postgresql://dev:devpass@localhost:5432/leadscoring_dev"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"

# API Keys (Add your actual keys)
CLAUDE_API_KEY="your-claude-api-key"
HUBSPOT_CLIENT_ID="your-hubspot-client-id"
HUBSPOT_CLIENT_SECRET="your-hubspot-client-secret"
CLEARBIT_API_KEY="your-clearbit-api-key"

# CORS
CORS_ORIGIN="http://localhost:3000"

# Logging
LOG_LEVEL="info"
```

## 🚀 Deployment

### Production Build

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
```

### Docker Production

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 📊 Health Checks

- Backend: `GET /health`
- Database: PostgreSQL connection
- Redis: Connection status

## 🔍 Troubleshooting

### Common Issues

1. **Database connection failed**
   - Ensure PostgreSQL is running: `docker-compose up postgres`
   - Check DATABASE_URL in .env file

2. **JWT token issues**
   - Verify JWT_SECRET is set in .env
   - Check token expiration

3. **CORS errors**
   - Verify CORS_ORIGIN in backend .env
   - Check frontend API URL configuration

4. **Prisma errors**
   - Run `npm run db:generate` to regenerate client
   - Run `npm run db:push` to sync schema

## 📝 Next Steps

1. **Frontend Development**: Create React components and pages
2. **Web Scraping**: Implement basic scraping functionality
3. **AI Integration**: Connect Claude API for scoring suggestions
4. **CRM Integration**: Implement HubSpot integration
5. **Testing**: Add comprehensive test suites
6. **Documentation**: API documentation and user guides

## 🤝 Contributing

1. Follow the existing code structure
2. Add tests for new features
3. Update documentation as needed
4. Use conventional commit messages

## 📄 License

This project is proprietary to Bob Bradley Data Systems (BBDS).

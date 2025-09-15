# StudyMates

Web-based platform for students to create study groups, share resources, and collaborate efficiently. Includes modular backend, frontend, and database components, with Docker-based environment for easy setup and reproducibility.

## Project Overview

**StudyMate / StudyTogether** is a lightweight web-based platform that allows students to create study groups, share resources, chat in real-time, and track collaborative study sessions.

### Key Objectives
- Enable peer-to-peer learning
- Provide a centralized platform for study resources
- Deliver a modular, lightweight, and fully functional system with real-time features

## Technology Stack

### Programming Language
- **Node.js** (Backend)
- **JavaScript** (Frontend)

### Web Development
- **HTML5**, **CSS3**, **JavaScript** (Core frontend)
- **Materialize CSS** (Lightweight UI components)
- **EJS** (Server-side rendering)
- **Passport.js** (Authentication)

### Backend
- **Express.js** – Server and API routes
- **Node.js modules** – Controllers, routes, middleware

### Database
- **MongoDB** – Cloud or local instance
- **Mongoose** – ODM for modeling and interacting with MongoDB

### Containerization
- **Docker** – Backend + MongoDB containers
- **docker-compose** – Manage multi-container setup

### Tools
- **Git/GitHub** – Version control with feature branches
- **Trello** – Task management, progress tracking
- **Postman** – API testing
- **VSCode** – Recommended IDE

## Features

- **Authentication** – Registration, login, JWT-based session management
- **Role-based Access Control** – Admin vs Member permissions
- **CRUD Operations** – Users, Rooms, Notes, Chat messages
- **Pomodoro Timer** – Per-room timer with session tracking
- **Real-time Chat** – Room-specific message persistence
- **Real-time Notifications** – Visual/audio alerts for session start/end
- **Responsive UI** – Mobile-first design for dashboard and room

## Folder Structure

```
StudyMate/
│
├── backend/             # Backend server code (Node.js + Express)
│   ├── controllers/     # Request handlers
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API routes
│   ├── middleware/      # Authentication, validation, roles
│   ├── utils/           # Helper functions
│   └── app.js           # Main server file
│
├── frontend/            # Frontend HTML/CSS/JS + Materialize + EJS
│   ├── views/           # EJS templates
│   └── public/          # Static CSS, JS, images
│
├── database/            # MongoDB setup notes or local seed data
│
├── docker/              # Docker setup
│   ├── Dockerfile       # Backend Dockerfile
│   └── docker-compose.yml
│
├── docs/                # Documentation: API docs, UI/UX notes, SRS
│
└── README.md
```

## Branch Strategy

- **main**: Stable, tested version
- **dev**: Integration branch for ongoing development
- **feature/***: Individual feature branches matching Trello tasks
  - Example: `feature/auth-api-setup`, `feature/timer-ui-component`

> Use pull requests to merge features into `dev`. Fully test before merging into `main`.

## Getting Started

### Prerequisites

- **Node.js** (v16.0 or higher)
- **npm** or **yarn**
- **MongoDB** (local installation or MongoDB Atlas)
- **Docker Desktop** (for containerized setup)
- **Git**

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/StudyMate.git
   cd StudyMate
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Create .env file with environment variables**
   ```env
   PORT=5000
   MONGO_URI=<your-mongodb-uri>
   JWT_SECRET=<your-jwt-secret>
   NODE_ENV=development
   ```

4. **Start the server (development)**
   ```bash
   npm run dev
   ```

5. **Access the frontend via the Express routes or EJS templates**
   - Application: `http://localhost:5000`

## Docker Setup

1. **Install Docker Desktop**

2. **Navigate to the `docker/` folder**
   ```bash
   cd docker/
   ```

3. **Build Docker images**
   ```bash
   docker-compose build
   ```

4. **Run containers**
   ```bash
   docker-compose up
   ```

5. **Verify backend and MongoDB services are running and accessible**
   - Backend: `http://localhost:5000`
   - MongoDB: `localhost:27017`

6. **Stop containers**
   ```bash
   docker-compose down
   ```

## Available Scripts

```bash
# Development
npm run dev          # Start development server with nodemon
npm start           # Start production server

# Testing
npm test            # Run unit tests
npm run test:watch  # Run tests in watch mode

# Docker
docker-compose up   # Start all services
docker-compose down # Stop all services
```

## Testing

- **Unit tests** using Jest or Mocha
- **End-to-end testing** with Cypress (optional)
- Document all test scripts in `/docs/testing.md`

### Test Structure
```
tests/
├── unit/           # Unit tests for controllers and utilities
├── integration/    # API endpoint tests
└── fixtures/       # Test data and mocks
```

## Contribution Guidelines

1. **Task Management**: Each feature/task corresponds to a Trello card
2. **Branch Workflow**: Use feature branches and pull requests
3. **Code Quality**: Include inline documentation and code comments
4. **Time Tracking**: Log hours in Trello for each task
5. **Documentation**: Update `/docs/` with relevant API changes, UI updates, and design notes

### Workflow

1. Assign yourself to a Trello card
2. Create feature branch from `dev`
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feature/your-feature-name
   ```
3. Develop and test your feature
4. Create pull request to `dev` branch
5. Request review from team member
6. Merge after approval and testing

## Documentation

- **`/docs/api.md`** → API endpoints, request/response examples
- **`/docs/uiux.md`** → Wireframes, color palettes, UI decisions
- **`/docs/srs.md`** → Functional & non-functional requirements
- **`/docs/testing.md`** → Test cases, scripts, results

## Team

**Project: StudyMate / StudyTogether**

- **Bisheshwar** - Full Stack Developer
- **Anusha** - Frontend Developer & UI/UX Designer
- **Mehakpreet Singh** - Backend Developer & DevOps

## Resources

- **GitHub Repository**: https://github.com/BikuDas-Deakin/StudyMate
- **Trello Board**: https://trello.com/invite/b/68b7ef1e0722ebe79760e74d/ATTI0bc6f91b8f3d0256dd20099cbbb1c5e9E5E19FF6/studymate
- **API Documentation**: See `/docs/api.md`
- **Design Guidelines**: See `/docs/uiux.md`

## Support

For questions or issues:
1. Check existing GitHub Issues
2. Create a new issue with detailed description
3. Contact team members via project communication channels
4. Refer to documentation in `/docs/` folder


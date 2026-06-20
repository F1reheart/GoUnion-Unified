# GoUnion Unified

GoUnion is a comprehensive school social hub platform. This repository is a monorepo containing both the frontend client and the backend API, along with infrastructure and deployment configurations.

## 🌟 Features

- **Real-time Chat & Messaging:** Powered by Socket.io for instant communication.
- **Social Feed & Posts:** Share statuses, images, and updates with connections.
- **Groups & Communities:** Create and manage distinct groups for different subjects, clubs, or alumni.
- **Mobile-Ready:** Built as a Progressive Web App (PWA) with native mobile wrapping via Capacitor.
- **Secure Authentication:** JWT-based authentication with secure password hashing.
- **Media Uploads:** Seamless integration with Cloudinary for handling avatars and post images.

## 💻 Tech Stack

### Frontend
- **Framework:** React 19 + Vite
- **Styling:** Tailwind CSS 4, Framer Motion
- **State Management:** Zustand, React Query
- **Routing:** React Router DOM
- **Mobile/PWA:** Capacitor, Vite PWA Plugin

### Backend
- **Framework:** Node.js + Express
- **Database:** MongoDB + Mongoose
- **Real-time:** Socket.io
- **Authentication:** JSON Web Tokens (JWT), bcryptjs
- **Storage:** Cloudinary

## 📁 Project Structure

```text
GoUnion-Unified/
├── backend/          # Node.js + Express API server
├── frontend/         # React + Vite web application
├── infra/            # Infrastructure as Code (e.g., Bicep)
├── docker-compose.yml# Multi-container Docker configuration
└── README.md         # Project documentation
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB (running locally or via MongoDB Atlas)
- Docker & Docker Compose (optional, for containerized deployment)
- Cloudinary Account (for media uploads)

### 1. Clone the repository
```bash
git clone https://github.com/F1reheart/GoUnion-Unified.git
cd GoUnion-Unified
```

### 2. Setup Environment Variables

#### Backend Environment Setup
Create a `.env` file in the `backend/` directory based on the `.env.template`:
```bash
cd backend
cp .env.template .env
```
Ensure you fill out the following keys in `backend/.env`:
- `PORT` (e.g., 8001)
- `MONGODB_URI`
- `JWT_SECRET`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- Email credentials for Nodemailer (if applicable)

#### Frontend Environment Setup
Create a `.env` file in the `frontend/` directory based on the `.env.example`:
```bash
cd ../frontend
cp .env.example .env
```
Ensure you configure the `VITE_API_URL` to point to your backend (e.g., `http://localhost:8001`).

### 3. Run Locally (Without Docker)

**Start the Backend:**
```bash
cd backend
npm install
npm run dev
```

**Start the Frontend:**
```bash
cd frontend
npm install
npm run dev
```

The frontend will typically be available at `http://localhost:5173`, and the backend API at `http://localhost:8001`.

## 🐳 Docker Deployment

The project includes a `docker-compose.yml` file to easily spin up the entire stack, including a local MongoDB instance.

1. Ensure Docker is running.
2. From the root directory, run:
```bash
docker-compose up -d --build
```
3. The services will be exposed at:
   - Frontend: `http://localhost:80`
   - Backend: `http://localhost:8001`
   - MongoDB: `localhost:27017`

## 📱 Mobile Application (Capacitor)

The frontend is configured with Capacitor to generate native mobile apps (Android/iOS). 

```bash
cd frontend
npm run build
npx cap sync
npx cap open android   # Or 'ios'
```
*Note: Refer to the `deploy_mobile.ps1` script for automated Android builds.*

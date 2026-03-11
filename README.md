# 🗳️ Real-time Polling & Chat Application

A high-performance, full-stack **MERN** application that combines real-time voting systems with an interactive chat interface. Built with a focus on modern architecture, dependency injection, and scalable design patterns.

Users can create polls, vote in real-time, and engage in conversations with typing indicators and image sharing — all protected by a secure authentication system.

---

## 🚀 Features

### 🔐 Authentication & Authorization
- **User Registration with OTP Verification** (via **Nodemailer** and **Redis**)
- **JWT-based Authentication** (Access & Refresh Tokens with HttpOnly cookies)
- **Password Reset Functionality**
- **Profile Management** – Upload and edit profile images via S3.

### 📊 Real-time Polling System
- **Create Polls**: Users can create questions with multiple options.
- **Real-time Voting**: Leverages **Socket.io** for instant vote count updates across all connected clients.
- **Filtered Views**: Browse polls by status (Active, History, or My Polls).
- **Vote Tracking**: Prevents multiple votes from the same user if configured.

### 💬 Real-time Chat Feature
- **Instant Messaging**: Real-time communication using **Socket.io**.
- **Typing Indicator**: Visual feedback when other users are typing.
- **Image Sharing**: Bulk upload and share images within the chat using **AWS S3 Presigned URLs**.
- **Message Management**: Users can **edit** (once/within constraints) or **delete** their own messages globally.
- **Message History**: Persistent chat history with optimized pagination.

### 🧩 Architecture & Design
- **Repository Pattern**: Strict separation of data access and business logic.
- **Dependency Injection**: Powered by **InversifyJS** for better testability and modularity.
- **Clean Code & SOLID**: Adheres to repository architecture principles for long-term maintainability.
- **Type Safety**: End-to-end TypeScript implementation.

---

## 🧠 Tech Stack

### 🖥️ Frontend
- **React 19 (Vite + TypeScript)**
- **Tailwind CSS** for modern, responsive UI
- **Redux Toolkit** for sophisticated state management
- **Axios** for API communication with interceptors
- **Socket.io-client** for real-time events
- **Lucide React** for consistent iconography

### ⚙️ Backend
- **Node.js + Express.js**
- **MongoDB Atlas** with Mongoose ODM
- **AWS S3** for secure image storage
- **Redis** for OTP caching and performance
- **Socket.io** for bi-directional event handling
- **InversifyJS** for Dependency Injection
- **Nodemailer** for email services
- **JWT** for secure authentication

---

## ⚙️ Getting Started

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/nandalalm/Message-App.git
cd Message-App
```

### 2️⃣ Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
AWS_BUCKET_NAME=your_s3_bucket_name

# JWT Configuration
ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Email Configuration (Nodemailer)
EMAIL_USER=your_email_address
EMAIL_PASS=your_email_app_password

# Client URL for CORS
CLIENT_URL=http://localhost:5173
```

Start the backend server:

```bash
npm run dev
```

### 3️⃣ Frontend Setup

```bash
cd ../frontend
npm install
```

Create a `.env` file in the `frontend` directory:

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_BACKEND_URL=http://localhost:5000
```

Start the frontend development server:

```bash
npm run dev
```

---

## 👨‍💻 Author

**Nandalal M**  
Self-taught MERN Stack Developer
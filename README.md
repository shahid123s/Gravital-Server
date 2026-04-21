# 🌌 Gravital Server

> A feature-rich, production-grade **Node.js REST API** and real-time backend for a social media platform — built with Express.js, MongoDB, Redis, Socket.IO, and AWS S3.

---

## 📖 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Features](#features)
- [API Reference](#api-reference)
- [Data Models](#data-models)
- [Authentication Flow](#authentication-flow)
- [Real-time Features (Socket.IO)](#real-time-features-socketio)
- [File Uploads (AWS S3)](#file-uploads-aws-s3)
- [Caching Strategy (Redis)](#caching-strategy-redis)
- [Security](#security)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)

---

## Overview

**Gravital** is a full-featured social media backend server. It powers a complete social networking experience including user authentication (with OTP verification), post creation & management, real-time chat, notifications, follow/unfollow mechanics, likes, comments, content reporting, post archiving, and user/post administration — all served over a secure, rate-limited REST API.

The server also includes a **Mediasoup-based WebRTC live streaming** module (currently commented out but fully implemented) for real-time video/audio broadcasts.

---

## 💡 Motivation

Built to explore scalable backend architecture, caching strategies, and real-world system design challenges in social media platforms.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js (CommonJS) |
| **Framework** | Express.js v4 |
| **Database** | MongoDB via Mongoose ODM |
| **Cache / Session** | Redis v4 |
| **Real-time** | Socket.IO v4 |
| **Authentication** | JSON Web Tokens (JWT) — Access + Refresh Token pattern |
| **Password Hashing** | bcrypt / bcryptjs |
| **OTP** | otp-generator |
| **Email** | Nodemailer (Gmail SMTP) |
| **File Storage** | AWS S3 (via AWS SDK v3) |
| **File Upload Middleware** | Multer (in-memory storage) |
| **Rate Limiting** | express-rate-limit |
| **Live Streaming** | Mediasoup v3 (WebRTC SFU — implemented, inactive) |
| **ID Generation** | uuid v10 |
| **Dev Tool** | Nodemon |

---

## Architecture

The server follows a **modular MVC-like architecture**, where each feature domain (auth, user, post, chat, etc.) is encapsulated inside its own module folder under `src/modules/`. Cross-cutting concerns like configuration, middleware, and utilities live in `src/config/`, `src/middlewares/`, and `src/utils/` respectively. Shared constants (HTTP codes, error codes, roles, messages) reside in the top-level `Constants/` directory.

```
Client (HTTP / WebSocket)
        │
        ▼
   [ Express App ]
        │
   ┌────┴─────────────────────────────────┐
   │  Rate Limiter → CORS → Cookie Parser │
   │    JSON Body Parser → Auth Middleware │
   └────┬─────────────────────────────────┘
        │
   ┌────▼──────────────────────┐
   │       Route Layer         │ ← Module Routers
   └────┬──────────────────────┘
        │
   ┌────▼──────────────────────┐
   │    Controller Layer       │ ← Business Logic
   └────┬──────────────────────┘
        │
   ┌────▼──────────────────────┐
   │    Service Layer          │ ← DB Queries, 3rd-party
   └────┬──────────────────────┘
        │
   ┌────┴──────────┬───────────┐
   │               │           │
 MongoDB         Redis       AWS S3
```

**Startup Sequence:**
1. Redis client connects explicitly
2. Only after Redis is ready, the HTTP server starts listening
3. MongoDB connects asynchronously after server start
4. Socket.IO is initialized on the same HTTP server

---

## Project Structure

```
Gravital-Server/
├── server.js                   # App entry point — Express setup, route mounting, server boot
├── package.json
│
├── Constants/                  # Shared application constants
│   ├── errorCodes.js           # App-specific error codes
│   ├── httpStatus.js           # HTTP status code map
│   ├── predefinedUserDetails.js# Default user profile shape
│   ├── responseMessage.js      # All success/error response messages
│   └── roles.js                # USER / ADMIN role constants
│
├── validations/
│   └── inputValidation.js      # Input validation (email, username, password, phone, name)
│
└── src/
    ├── config/
    │   ├── appConfig.js        # Central config object (reads all env vars)
    │   ├── awsS3Config.js      # AWS S3 client initialization
    │   ├── corsConfig.js       # CORS policy
    │   ├── dbConfig.js         # MongoDB connection
    │   ├── mediasoupConfig.js  # Mediasoup WebRTC router/transport config
    │   ├── redisConfig.js      # Redis client creation
    │   └── socketConfig.js     # Socket.IO server initialization & event handlers
    │
    ├── middlewares/
    │   ├── adminAuth.middleware.js   # Admin JWT authentication middleware
    │   ├── error.middleware.js       # Global error handler (last middleware)
    │   └── userAuthMiddleware.js     # User JWT (Bearer token) authentication middleware
    │
    ├── utils/
    │   ├── actionButtonUtils.js  # Utility for action button logic
    │   ├── aswS3Utils.js         # S3 pre-signed URL generation & file upload
    │   ├── customError.js        # CustomError class (message, statusCode, errorCode)
    │   ├── dateUtils.js          # Date/time helper functions
    │   ├── dbUtils.js            # Mongoose query helper utilities
    │   ├── jwtUtils.js           # JWT generate/decode for access & refresh tokens
    │   ├── multerUtils.js        # Dynamic Multer middleware (memory storage)
    │   └── redisUtils.js         # Redis CRUD helpers (OTP, tokens, pre-signed URL cache)
    │
    └── modules/
        ├── auth/               # Authentication module
        ├── user/               # User profile management
        ├── post/               # Post creation & feed
        ├── comments/           # Post comments
        ├── like/               # Post likes
        ├── follows/            # Follow / Unfollow
        ├── chat/               # 1-on-1 messaging
        ├── savedPost/          # Save/unsave posts
        ├── archive/            # Archive/publish posts
        ├── block/              # Block/unblock users
        ├── restriction/        # Restrict users
        ├── report/             # Report users & posts
        ├── admin/              # Admin dashboard APIs
        └── liveStream/         # Mediasoup live streaming (inactive)
```

---

## Features

### 👤 User Management
- OTP-based email verification during registration (via Gmail SMTP + Nodemailer)
- Secure registration with UUID-based user IDs
- Profile viewing & updating (with profile picture upload to AWS S3)
- Password change & forgot-password flow (OTP → reset)
- User search and suggestions
- Online status tracking via Socket.IO room joining

### 🔐 Authentication & Authorization
- JWT-based dual-token system: short-lived **Access Token** + long-lived **Refresh Token**
- Refresh tokens stored & validated in **Redis** (token rotation security)
- Separate login for **Users** and **Admins**
- Refresh tokens delivered via **HttpOnly cookies**
- Access tokens sent as `Authorization: Bearer <token>` headers
- Role-based access control (`user` / `admin`)

### 📸 Posts
- Create posts with media (images/videos) uploaded to AWS S3
- Fetch all posts, user-specific posts, trending posts, and liked posts
- Share posts (increments share count)
- Delete posts
- Admin can restrict or boost posts

### 💬 Real-time Chat
- Create 1-on-1 chat rooms
- Send and retrieve messages
- Real-time message delivery via Socket.IO (`sendMessage` → `receiveMessage`)

### 🔔 Notifications
- Real-time push notifications via Socket.IO (`sendNotification` → `receiveNotification`)
- Username-based rooms for targeted delivery

### ❤️ Likes
- Toggle like/unlike on posts

### 💾 Saved Posts
- Toggle save/unsave posts

### 📁 Archive
- Archive posts (hide from public feed)
- Publish archived posts back to the feed
- List all archived posts

### 👥 Follow System
- Toggle follow/unfollow users
- Get following list

### 🚫 Block & Restriction
- Block/unblock users
- Restrict/unrestrict users (soft moderation)

### 🚨 Reporting
- Report users or posts (with reasons)

### 🛡️ Admin Panel
- List & search all users
- View user details
- Ban/unban users
- Block/unblock users
- Manage posts (list, view, restrict, boost)
- View and manage all reports (update report status)
- Separate admin authentication flow

### 📡 Live Streaming (Implemented / Inactive)
- Full Mediasoup v3 WebRTC SFU integration
- Stream model: title, description, streamer, viewers, embedded comments
- Configurable codecs: Opus (audio), VP8 (video)
- WebRTC transport with configurable bitrate and port range (10000–10100)
- Socket.IO integration service for live stream signaling

---

## API Reference

All protected user routes require the header:
```
Authorization: Bearer <accessToken>
```

### 🔑 Auth — `/api/auth`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/send-otp` | Send OTP to email (validates username, email, password; stores hashed password in Redis) | ❌ |
| `POST` | `/otp-verification` | Verify submitted OTP against Redis-stored OTP | ❌ |
| `POST` | `/register` | Complete registration (retrieves data from Redis, creates user in DB) | ❌ |
| `POST` | `/user/login` | User login → returns `accessToken`, sets `refreshToken` cookie | ❌ |
| `POST` | `/user/logout` | Clear user `refreshToken` cookie | ❌ |
| `POST` | `/user/refresh-token` | Exchange valid refresh token for new access token | ❌ |
| `POST` | `/user/sent-otp/forget-password` | Send OTP for password reset | ❌ |
| `POST` | `/user/reset-password` | Reset password using new password + email | ❌ |
| `POST` | `/admin/login` | Admin login → returns `accessToken`, sets `adminToken` cookie | ❌ |
| `POST` | `/admin/logout` | Clear admin `adminToken` cookie | ❌ |

---

### 👤 User — `/api/user` *(JWT Protected)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/suggest-users` | Get suggested users to follow |
| `GET` | `/details` | Get current user's profile details |
| `PATCH` | `/update-profile` | Update profile info + upload profile picture to S3 |
| `GET` | `/about-profile` | Get another user's profile details |
| `GET` | `/status` | Get user's online/activity status |
| `GET` | `/search` | Search users by keyword |
| `PATCH` | `/change-password` | Change password (requires current password verification) |

---

### 📸 Post — `/api/post` *(JWT Protected)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Get a specific post |
| `POST` | `/create` | Create a new post (with media upload via Multer → S3) |
| `GET` | `/get-post` | Get all posts (feed) |
| `GET` | `/user` | Get posts by a specific user |
| `POST` | `/delete` | Delete a post |
| `GET` | `/get-trending` | Get trending/boosted posts |
| `PATCH` | `/share` | Share a post (increments share count) |
| `GET` | `/liked-posts` | Get all posts liked by current user |

---

### 💬 Comments — `/api/comment` *(JWT Protected)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/add-comment` | Add a comment to a post |
| `GET` | `/get-comments` | Get all comments for a post |

---

### ❤️ Likes — `/api/like` *(JWT Protected)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| `PATCH` | `/post/toggle-like` | Toggle like/unlike on a post |

---

### 💾 Saved Posts — `/api/save` *(JWT Protected)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| `PATCH` | `/post` | Toggle save/unsave a post |

---

### 📁 Archive — `/api/archive` *(JWT Protected)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Get all archived posts for current user |
| `POST` | `/` | Archive a post |
| `POST` | `/publish` | Publish (un-archive) a post |

---

### 👥 Follows — `/api/follow` *(JWT Protected)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/toggle-follow` | Follow or unfollow a user |
| `GET` | `/followings` | Get list of users the current user follows |

---

### 🚫 Block — `/api/block` *(JWT Protected)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/toggle-block` | Block or unblock a user |

---

### 🔒 Restriction — `/api/restriction` *(JWT Protected)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/user` | Toggle restrict/unrestrict a user |

---

### 🚨 Report — `/api/report` *(JWT Protected)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/user` | Report a user |
| `POST` | `/post` | Report a post |

---

### 💬 Chat — `/api/chat` *(JWT Protected)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Get all chat conversations for current user |
| `POST` | `/` | Create a new chat with a user |
| `GET` | `/message` | Get messages for a chat room |
| `POST` | `/message` | Send a message to a chat room |

---

### 🛡️ Admin — `/admin/api`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/users` | List all users | ❌* |
| `PATCH` | `/user/toggle-ban` | Ban or unban a user | ❌* |
| `GET` | `/user/user-details` | Get a specific user's details | ❌* |
| `PATCH` | `/user/toggle-block` | Block/unblock a user (admin action) | ❌* |
| `GET` | `/posts` | List all posts | ❌* |
| `GET` | `/post` | Get a specific post's details | ❌* |
| `PATCH` | `/post/toggleRestriction` | Restrict or unrestrict a post | ❌* |
| `PATCH` | `/post/boost-post` | Boost or un-boost a post | ❌* |
| `GET` | `/reports` | Get all content reports | ❌* |
| `GET` | `/report` | Get a specific report's details | ❌* |
| `PATCH` | `/report` | Update a report's status | ❌* |

> *Admin routes currently rely on `adminAuth.middleware.js` — verify current middleware attachment in `adminRoute.js`.

---

## Data Models

### User
| Field | Type | Notes |
|-------|------|-------|
| `userID` | String | UUID, unique |
| `username` | String | Unique, trimmed |
| `email` | String | Unique, lowercase |
| `password` | String | Bcrypt hashed |
| `role` | String | `user` or `admin` |
| `fullName` | String | Required |
| `profileImage` | String | S3 key, default placeholder |
| `bio` | String | Default empty |
| `dob` | Date | Required |
| `gender` | String | `Male`, `Female`, `None` |
| `isBan` | Boolean | Admin ban flag |
| `isBlock` | Boolean | Admin block flag |
| `isPrivate` | Boolean | Profile privacy setting |
| `isVerified` | Boolean | Email verification status |
| `refreshToken` | String | Active refresh token |
| `lastLogin` | Date | Last login timestamp |

### Post
| Field | Type | Notes |
|-------|------|-------|
| `userId` | ObjectId | Ref: User |
| `fileName` | String | S3 key for media file |
| `caption` | String | Post text |
| `uploadDate` | Date | Creation date |
| `isRestricted` | Boolean | Admin restriction flag |
| `isPostBoost` | Boolean | Admin boost flag |
| `shareCount` | Number | Share counter |

### Stream (Live Streaming)
| Field | Type | Notes |
|-------|------|-------|
| `title` | String | Required |
| `description` | String | Optional |
| `streamerId` | ObjectId | Ref: User |
| `startTime` | Date | Auto-set |
| `endTime` | Date | Set on stream end |
| `isLive` | Boolean | Current live status |
| `viewers` | [ObjectId] | Array of viewer User refs |
| `comments` | [Object] | Embedded live comments |

> Additional models: **Chat**, **Message**, **Follow**, **Like**, **Block**, **Restriction**, **Report**, **SavedPost**, **Archive**, **Comment**

---

## Authentication Flow

```
Registration:
  POST /send-otp  →  Validate inputs  →  Check duplicate username/email
       → Hash password  →  Store {username, email, hashedPassword} in Redis (TTL: 1000s)
       → Generate OTP  →  Store OTP in Redis (TTL: 300s / 5 min)
       → Send OTP email via Nodemailer

  POST /otp-verification  →  Retrieve OTP from Redis  →  Compare OTP

  POST /register  →  Retrieve user data from Redis
       → Add (fullName, dob, phoneNumber, userID: uuid())
       → Save to MongoDB

Login:
  POST /user/login  →  Find user by email  →  Compare bcrypt password
       → Check role === 'user'  →  Check !isBlock
       → Generate accessToken (JWT, short-lived)  →  Generate refreshToken (JWT, 7 days)
       → Store refreshToken in Redis (key: token<email>, TTL: 7 days)
       → Set refreshToken as HttpOnly cookie
       → Return { accessToken, username }

Token Refresh:
  POST /user/refresh-token  →  Read refreshToken from cookie
       → Decode refreshToken  →  Find user  →  Compare token vs Redis
       → Generate new accessToken  →  Return { accessToken }
```

---

## Real-time Features (Socket.IO)

The `socketConfig.js` initializes Socket.IO on the same HTTP server. Events:

| Event (Client → Server) | Description |
|--------------------------|-------------|
| `createOnlineUser` | User joins their personal room (keyed by username) |
| `sendNotification` | Send a notification to a specific user's room |
| `joinRoom` | Join a chat room by `roomId` |
| `sendMessage` | Send a message to a chat room |

| Event (Server → Client) | Description |
|--------------------------|-------------|
| `receiveNotification` | Receive notification in personal room |
| `receiveMessage` | Receive message in chat room |

---

## File Uploads (AWS S3)

Media files are handled with **Multer** (in-memory storage) and uploaded to **AWS S3** via `@aws-sdk/client-s3`:

- **Profile images** → `AWS_S3_BUCKET_NAME` bucket under key `images/<userId>_<filename>`
- **Post media** → `AWS_S3_POST_BUCKET_NAME` bucket under key `images/<userId>_<filename>` or `videos/<userId>_<filename>`

**Pre-signed URLs** are generated on-demand using `@aws-sdk/s3-request-presigner` (1-hour expiry) and cached in Redis to avoid repeated S3 calls:
- Profile image URL cached for ~56 minutes (`profileImage<userId>`)
- Post URL cached for ~58 minutes (`post<postId>`)

---

## Caching Strategy (Redis)

| Key Pattern | Data | TTL |
|-------------|------|-----|
| `<email>` | Temporary registration data (hashed pwd, username) | 1000 seconds |
| `otp:<email>` | OTP for verification | 300 seconds (5 min) |
| `token<email>` | Refresh token | 604800 seconds (7 days) |
| `profileImage<userId>` | Pre-signed S3 URL for profile image | 3400 seconds (~56 min) |
| `post<postId>` | Pre-signed S3 URL for post media | 3500 seconds (~58 min) |

---

## Security

| Mechanism | Details |
|-----------|---------|
| **Rate Limiting** | 10,000 requests per 15 minutes per IP (express-rate-limit) |
| **CORS** | Restricted to `https://gravital.shahidnoushad.com` with credentials |
| **JWT** | Signed with separate secrets for access and refresh tokens |
| **HttpOnly Cookies** | Refresh tokens not accessible via JavaScript |
| **Password Hashing** | Bcrypt with salt rounds |
| **Input Validation** | Email regex, username (alphanumeric + underscore, min 5), password strength (uppercase, lowercase, digit, special char, min 8), phone (10 digits), full name (alpha + spaces, min 3) |
| **Role Check** | JWT payload includes `role` — verified on every protected route |
| **Token Revocation** | Logout clears both the cookie and the Redis-stored token |
| **Custom Error Handling** | Global `errorHandler` middleware returns structured JSON with `statusCode`, `message`, and `errorCode` |

---

## Getting Started

### Prerequisites

- **Node.js** >= 18.x
- **MongoDB** (local or Atlas)
- **Redis** (local or cloud — e.g., Redis Cloud, Upstash)
- **AWS Account** with two S3 buckets (profile images + post media)
- **Gmail account** with an App Password for Nodemailer SMTP

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/shahid123s/Gravital-Server.git
cd Gravital-Server

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your actual credentials

# 4. Start the development server
npm run dev
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in all values:

```env
# Application
PORT=8000
NODE_ENV=development
ORIGIN_URL=http://localhost:3000

# MongoDB
MONGO_URI=mongodb://localhost:27017/gravital

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
ACCESS_TOKEN_SECRET=your_access_token_secret
ACCESS_TOKEN_LIFETIME=15m
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_LIFETIME=7d

# Nodemailer (Gmail)
NODEMAILER_EMAIL=your_email@gmail.com
NODEMAILER_PASSWORD=your_gmail_app_password

# AWS S3
AWS_S3_ACCESS_KEY_ID=your_aws_access_key
AWS_S3_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET_NAME=your-profile-images-bucket
AWS_S3_POST_BUCKET_NAME=your-post-media-bucket
AWS_S3_BUCKET_REGION=ap-south-1

# Mediasoup (WebRTC Live Streaming)
ANNOUNCED_IP=127.0.0.1
```

See [`.env.example`](./.env.example) for the full annotated template.

---

## Scripts

```bash
npm run dev     # Start server with nodemon (auto-restart on changes)
npm run start   # Start server with plain node (production)
```

---

## Author

**Shahid** — [GitHub](https://github.com/shahid123s)

---

## License

ISC

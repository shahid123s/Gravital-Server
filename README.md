# Gravital Backend

Backend service for Gravital, a social media system that supports authentication, feed delivery, post interactions, messaging, moderation workflows, media storage, and real-time events.

This repository is used as the backend submodule inside the `Gravital-system` monorepo.

## Overview

Gravital is designed as a full-stack social platform with a backend-first focus. The API handles identity, content, interactions, moderation, and real-time communication while keeping media and temporary state outside the database.

The backend is structured to show system design thinking rather than only feature implementation:

- Express handles routing and middleware orchestration.
- Controllers handle HTTP request/response boundaries.
- Services own business operations and database access.
- MongoDB stores durable domain data.
- Redis stores short-lived state such as OTPs, refresh tokens, and cached media URLs.
- AWS S3 stores uploaded profile and post media.
- Socket.IO handles chat, online presence, and notification events.

## Tech Stack

| Area | Technology |
| --- | --- |
| Runtime | Node.js, CommonJS |
| Framework | Express.js |
| Database | MongoDB with Mongoose |
| Cache / Temporary State | Redis |
| Authentication | JWT access token + JWT refresh token |
| Token Storage | HttpOnly cookies for refresh token, Redis for server-side validation |
| Password Hashing | bcrypt / bcryptjs |
| Realtime | Socket.IO |
| Media Storage | AWS S3 |
| Upload Middleware | Multer memory storage |
| Email / OTP | Nodemailer, otp-generator |
| Rate Limiting | express-rate-limit |
| WebRTC Experiment | Mediasoup module |

## System Architecture

```text
Client
  |
  | HTTP / WebSocket
  v
Express API
  |
  |-- Middleware
  |   |-- CORS
  |   |-- Cookie parser
  |   |-- JSON parser
  |   |-- Rate limiter
  |   |-- JWT authentication
  |
  |-- Module routes
  |-- Controllers
  |-- Services
  |-- Models
  |
  |-- MongoDB   durable application data
  |-- Redis     OTPs, refresh tokens, cached S3 URLs
  |-- AWS S3    profile images and post media
  |-- Socket.IO realtime delivery
```

The service starts Redis before accepting traffic because OTP verification, token refresh, and cached media URL flows depend on Redis. MongoDB is initialized during server startup, and Socket.IO is attached to the same HTTP server.

## Request Flow

Protected user APIs follow a consistent controller-service-database flow:

```text
Client request
  |
  | Authorization: Bearer <accessToken>
  v
Route
  |
  v
authenticateUser middleware
  |
  | verifies JWT signature
  | verifies role = user
  | attaches decoded user data to req.user
  v
Controller
  |
  | reads req.body / req.query / req.params
  | performs request-level checks
  | coordinates services
  v
Service
  |
  | executes MongoDB queries
  | calls Redis/S3 utilities when required
  | throws CustomError for expected failures
  v
Database / Cache / Storage
  |
  v
JSON response
```

### Feed Request Flow

```text
GET /api/post/get-post?page=1
  |
  v
authenticateUser
  |
  v
postController.getAllPosts
  |
  |-- archiveService.getArchivedPostIds()
  |-- blockService.getUsersWhoBlockedCurrentUser()
  |-- blockService.getBlockedUsersByCurrentUser()
  v
postService.fetchPosts()
  |
  | MongoDB query:
  |-- excludes restricted posts
  |-- excludes archived posts
  |-- excludes blocked users
  |-- applies skip/limit pagination
  v
postUtils.enrichPosts()
  |
  | adds interaction/profile data needed by UI
  v
response: { posts, hasMore }
```

### Authentication Flow

```text
Register
  |
  |-- validate username/email/password
  |-- hash password
  |-- store temporary registration data in Redis
  |-- generate OTP
  |-- store OTP in Redis with TTL
  |-- send OTP through email
  v
Verify OTP
  |
  |-- compare submitted OTP with Redis value
  v
Complete profile
  |
  |-- read temporary registration data from Redis
  |-- create MongoDB user document
```

```text
Login
  |
  |-- find user by email
  |-- compare password hash
  |-- reject blocked users
  |-- issue access token
  |-- issue refresh token
  |-- store refresh token in Redis
  |-- set refresh token in HttpOnly cookie
```

```text
Refresh token
  |
  |-- read refresh token from cookie
  |-- verify JWT signature
  |-- load user
  |-- compare cookie token with Redis token
  |-- issue new access token
```

### Post Creation Flow

```text
POST /api/post/create
  |
  v
authenticateUser
  |
  v
Multer memory upload
  |
  v
uploadFileToS3()
  |
  v
postService.createPost()
  |
  v
MongoDB stores userId, caption, and S3 file key
```

## Core Features

- OTP based registration and password reset.
- Access-token and refresh-token authentication.
- Redis-backed refresh-token validation.
- User profile, privacy, password, and profile image management.
- Paginated feed, user posts, trending posts, liked posts, and single-post views.
- Post creation, deletion, sharing, likes, comments, saves, and archive/publish.
- Follow, block, restrict, and report workflows.
- Admin user, post, and report management APIs.
- One-to-one chat models and Socket.IO message delivery.
- Username-based Socket.IO rooms for notifications and online presence.
- Mediasoup live streaming module kept as an experimentation area for WebRTC transport design.

## Performance Optimizations

- Feed APIs use pagination instead of loading all posts.
- Feed reads exclude archived posts and blocked users before response enrichment.
- Redis caches OTPs, refresh tokens, and S3 pre-signed URLs with TTLs.
- Read-heavy MongoDB queries use `.lean()` where Mongoose document methods are not needed.
- Post deletion removes related archive, like, save, and report records in parallel with `Promise.all`.
- S3 keeps media objects outside MongoDB, reducing document size and database bandwidth.
- Rate limiting is applied globally to reduce repeated abusive requests.

## Database Design

The data model is split by domain rather than storing all interaction data inside the post document.

| Collection | Purpose |
| --- | --- |
| `User` | Account, credentials, role, profile, privacy, moderation flags |
| `Post` | Author, caption, S3 media key, restriction flag, boost flag, share count |
| `Comment` | Post comments with user reference and timestamps |
| `Likes` | User-post like relationship |
| `SavedPost` | User-post saved relationship |
| `Archive` | User-post archive relationship |
| `Follow` | Follower/following relationship |
| `Block` | User block relationship |
| `Restriction` | User restriction relationship |
| `Report` | User/post reports and moderation status |
| `Chat` | Personal chat room metadata |
| `Message` | Chat messages |

Implemented indexing:

- `User.userID`, `User.username`, and `User.email` are unique.
- `Comment` has a compound index on `{ postId: 1, createdAt: -1 }` to support comment reads by post.

Indexing direction for high-traffic usage:

- Add `{ userId: 1, uploadDate: -1 }` on posts for profile and author-based reads.
- Add `{ postId: 1, userId: 1 }` unique indexes on likes and saves to prevent duplicate toggles.
- Add `{ follower: 1, following: 1 }` unique index on follows.
- Add report status and created timestamp indexes for moderation queues.
- Add counters or materialized interaction scores if trending becomes a high-read path.

## Design Decisions

- **Controller-service separation:** Controllers stay focused on HTTP behavior; services own persistence and external integrations. This keeps request handling readable and makes business operations easier to test.
- **Redis for expiring state:** OTPs, temporary registration data, refresh tokens, and cached media URLs all need expiration. Redis fits those workloads better than storing short-lived values in MongoDB.
- **Refresh token validation through Redis:** JWTs are normally stateless, but refresh tokens need server-side revocation. Mirroring refresh tokens in Redis allows logout and mismatch detection.
- **S3 object keys in MongoDB:** MongoDB stores references to media, not the media itself. This keeps database documents small and lets file delivery scale independently.
- **Separate interaction collections:** Likes, saves, follows, blocks, and archives are modeled as relationships. This avoids unbounded arrays on user or post documents.
- **Socket rooms for targeted events:** Notifications and messages are emitted to rooms/users instead of broadcasting to every socket.
- **Mediasoup kept isolated:** WebRTC streaming has different lifecycle and scaling concerns from REST APIs, so it is separated into the `liveStream` module.

## Scalability Considerations

- REST traffic can be horizontally scaled when MongoDB, Redis, and S3 are external services.
- Socket.IO needs a Redis adapter or pub/sub layer before running multiple backend instances.
- Feed reads should eventually move toward precomputed feed candidates or cursor-based pagination.
- Trending should eventually use denormalized counters or scheduled aggregation instead of computing scores from multiple relationship collections on demand.
- Direct client-to-S3 pre-signed uploads would reduce API memory pressure for larger media files.
- Interaction collections should use compound unique indexes to protect data consistency under concurrent requests.
- Admin/report dashboards need indexed filtering as moderation volume grows.

## Folder Structure

```text
backend/
├── server.js
├── Constants/
├── validations/
└── src/
    ├── config/
    ├── middlewares/
    ├── utils/
    └── modules/
        ├── auth/
        ├── user/
        ├── post/
        ├── comments/
        ├── like/
        ├── follows/
        ├── savedPost/
        ├── archive/
        ├── chat/
        ├── report/
        ├── block/
        ├── restriction/
        ├── admin/
        └── liveStream/
```

## API Design

Routes are grouped by business domain:

| Base Path | Responsibility |
| --- | --- |
| `/api/auth` | OTP, registration, login, logout, access-token refresh |
| `/api/user` | Profile, search, suggestions, status, password changes |
| `/api/post` | Feed, post creation, post details, sharing, trending, liked posts |
| `/api/comment` | Add and fetch comments |
| `/api/like` | Toggle post likes |
| `/api/save` | Toggle saved posts |
| `/api/archive` | Archive and publish posts |
| `/api/follow` | Follow/unfollow and following list |
| `/api/chat` | Chat rooms and messages |
| `/api/report` | User and post reports |
| `/api/block` | Block/unblock users |
| `/api/restriction` | Restrict user interactions |
| `/admin/api` | Admin users, posts, and report management |

Representative endpoints:

```text
POST   /api/auth/send-otp
POST   /api/auth/otp-verification
POST   /api/auth/register
POST   /api/auth/user/login
POST   /api/auth/user/refresh-token

GET    /api/post/get-post?page=1
POST   /api/post/create
GET    /api/post/user?username=<username>
GET    /api/post/get-trending
PATCH  /api/post/share

PATCH  /api/like/post/toggle-like
PATCH  /api/save/post
POST   /api/comment/add-comment
GET    /api/comment/get-comments?postId=<postId>

GET    /admin/api/users
GET    /admin/api/posts
GET    /admin/api/reports
PATCH  /admin/api/report
```

## Error Handling

Expected failures are represented with `CustomError`, which carries:

- message
- HTTP status code
- application error code

The global error middleware returns a consistent JSON response:

```json
{
  "success": false,
  "message": "Error message",
  "errorCode": "APPLICATION_ERROR_CODE"
}
```

## Setup / Getting Started

```bash
cd Gravital-system/backend
npm install
cp .env.example .env
npm run dev
```

Required services:

- MongoDB
- Redis
- AWS S3 bucket credentials
- SMTP/Gmail app password for OTP delivery

Scripts:

```bash
npm run dev
npm start
```

Environment groups:

- `PORT`, `NODE_ENV`, `ORIGIN_URL`
- `MONGO_URI`
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- `ACCESS_TOKEN_SECRET`, `ACCESS_TOKEN_LIFETIME`
- `REFRESH_TOKEN_SECRET`, `REFRESH_TOKEN_LIFETIME`
- `NODEMAILER_EMAIL`, `NODEMAILER_PASSWORD`
- `AWS_S3_ACCESS_KEY_ID`, `AWS_S3_SECRET_ACCESS_KEY`
- `AWS_S3_BUCKET_NAME`, `AWS_S3_POST_BUCKET_NAME`, `AWS_S3_BUCKET_REGION`
- `ANNOUNCED_IP`

## Future Improvements

- Add automated tests for authentication, post interactions, token refresh, and moderation flows.
- Add route-level validation middleware for every public endpoint.
- Add compound unique indexes for interaction collections.
- Add Redis adapter support for multi-instance Socket.IO deployments.
- Move large media uploads to backend-issued pre-signed S3 URLs.
- Add structured logging, request IDs, and production monitoring.
- Use stricter production cookie settings over HTTPS.
- Convert trending computation to cached counters or scheduled materialized results.

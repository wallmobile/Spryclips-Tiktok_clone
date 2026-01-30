# TECHNICAL — Spryclips (Deep Dive)

This document targets developers and operators. It provides architecture reasoning, data models, API examples, operational commands, deployment recipes, and best practices.

## Table of Contents
1. Overview & Goals
2. Architecture & Components
3. Data model (summary) and indexes
4. API Reference (selected endpoints with examples)
5. Video processing pipeline (detailed)
6. Jobs, queues and worker behavior
7. Deployment & Docker
8. CI/CD (example GitHub Actions)
9. Observability & Monitoring
10. Security & Compliance
11. Troubleshooting & FAQ
12. Contributing & Development Workflows

---

## 1. Overview & Goals
Sproyclips is designed to be a horizontally scalable short-video platform with clear separation between request serving (Express), background processing (Bull/Redis), and storage (MongoDB + object storage). Primary goals: low-latency playback, resilient processing, easy local development, and safe production operations.

## 2. Architecture & Components
- API (Express): stateless API for REST endpoints and authentication.
- Realtime (Socket.io): real-time events (notifications, live chat, presence).
- Storage: MongoDB for metadata; object storage (S3) for video assets in prod; local `uploads/` & `processed/` for dev.
- Jobs: Bull queues backed by Redis to handle video processing, notifications, email sending.
- Worker: Node process that consumes jobs from Bull and runs FFmpeg + postprocessing functions.

Components & key files:
- `backend/index.js` - server bootstrap and sockets
- `backend/routes/` - endpoints (`auth.js`, `videos.js`, `users.js`, `admin.js`)
- `backend/models/` - Mongoose models (see Data model section)
- `backend/jobs/videoProcessing.js` - queue job definitions and worker code
- `backend/config/` - db, cors, mailer, and security config

---

## 3. Data model (summary)
Below are simplified schemas to help understand shape of documents (omitted types are simple scalars):

User
- _id
- username (unique)
- email (unique, indexed)
- passwordHash
- displayName
- bio
- avatarUrl
- followersCount, followingCount
- settings, privacy
- roles (e.g., admin, moderator)

Video
- _id
- uploader (ref User)
- title, description
- status (uploaded|processing|ready|failed)
- sources: {original, transcoded: [{res:'720p', url, bitrate}], poster, thumbnails:[]}
- visibility (public|private|unlisted)
- stats: {views, likes, comments}
- createdAt, updatedAt

Comment
- _id
- video (ref Video)
- user (ref User)
- message
- parent (for threaded replies)
- status (visible|flagged|removed)

Indexes
- Users: email (unique), username (unique)
- Videos: uploader + createdAt compound index, status
- Comments: video index

---

## 4. API Reference (selected)
Note: The server exposes a Swagger UI at `/api-docs` when `NODE_ENV` allows.

Register
- POST /api/auth/register
- Body: {username, email, password}
- Response: 201 Created, {user, message}

Login
- POST /api/auth/login
- Body: {email, password}
- Response: {accessToken, refreshToken}

Refresh token
- POST /api/auth/refresh
- Body: {refreshToken}
- Response: {accessToken}

Upload Video
- POST /api/videos
- Headers: Authorization: Bearer <token>
- Multipart: file (video), title, description, visibility
- Response: 202 Accepted, {jobId, videoId}

Get Feed
- GET /api/videos?page=1&limit=10
- Response: {videos:[], pagination}

Delete Video
- DELETE /api/videos/:id
- Auth: Owner or admin
- Response: 204 No Content

Example cURL — Upload
curl -X POST "http://localhost:5000/api/videos" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@./sample.mp4" \
  -F "title=Hello"

---

## 5. Video processing pipeline (detailed)
1. Upload handler writes file to disk or S3 and creates a Video document with status `uploaded`.
2. API pushes a job to `video-processing` queue with videoId and file location.
3. Worker picks job, sets status `processing`, runs FFmpeg commands to transcode and generate thumbnails.
   - Example FFmpeg transcode (720p):
     ffmpeg -i input.mp4 -c:v libx264 -preset veryfast -vf "scale=-2:720" -b:v 1500k -maxrate 1500k -bufsize 3000k -c:a aac -b:a 128k output_720.mp4
4. If success: upload processed outputs to storage, update Video document with URLs and set status `ready`.
5. If failure: set status `failed`, capture error stack and retry based on configured retry policy.
6. Emit events (notifications, analytics) after video is `ready`.

Retry behavior
- Jobs should be retried with exponential backoff (e.g., 3 attempts) and failures logged to `ErrorLog`.

---

## 6. Jobs & Workers
- Queues: `video-processing`, `notification`, `email`, `analytics`.
- Worker scaling: run N workers, each can process one job concurrently (use environment variable to set concurrency).
- Monitor queue depths (Redis metrics) to autoscale workers.

---

## 7. Deployment & Docker
Sample `docker-compose.yml` (conceptual):

version: '3.8'
services:
  mongo:
    image: mongo:6
    volumes:
      - mongo-data:/data/db
  redis:
    image: redis:7
  backend:
    build: ./backend
    env_file: ./backend/.env
    ports:
      - "5000:5000"
    depends_on:
      - mongo
      - redis
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
volumes:
  mongo-data:

Production notes
- Replace local volumes with persistent volumes or managed services.
- Use S3 for storage and CDN for serving processed media.
- Use a TLS terminator (Nginx or Cloud Load Balancer) in front of the app.

Process manager (PM2) sample
- `ecosystem.config.js` is present in `backend/` to run multiple instances and define env variables.

---

## 8. CI/CD (example)
A simple GitHub Actions job should:
- Install deps
- Run lint
- Run unit tests
- Build frontend
- Run integration or e2e tests (optional)
- On success: build and push Docker images and trigger deployment

Example workflow snippet (conceptual):

name: CI
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Install
        run: npm run install:all
      - name: Run tests
        run: npm test

---

## 9. Observability & Monitoring
- Logs: structured JSON logs to stdout for collection by ELK/Datadog
- Metrics: request rate, error rates, queue depth, job duration and success/failure counts
- Tracing: instrument critical flows (video processing and API) with OpenTelemetry or APM

---

## 10. Security & Compliance
- Secrets: use secret manager (AWS Secrets Manager / Azure Key Vault) in prod; do not commit secrets
- Input validation: use Joi or express-validator; validate uploads by MIME type and size
- Rate limiting: apply per-IP rate limits to public endpoints
- Headers: apply Helmet, CORS policy locked to required origins
- Sensitive logs: avoid logging passwords or tokens

---

## 11. Troubleshooting & FAQ
- Video stuck in processing: check worker logs (`backend/jobs`) and Bull queue depth in Redis
- Failed transcoding: inspect error logs and confirm `ffmpeg` is installed with required codecs
- Email not sending: verify SMTP credentials and that the host allows SMTP from your environment

---

## 12. Contributing & development workflows
- Branch naming: `feature/*`, `bugfix/*`, `hotfix/*`
- Tests: add unit tests for new features and integration tests for API changes
- PR Review: require at least one approval and green CI

---

**Back to product README**: For a user-facing summary, quick start, and product feature overview see `README.md`.

---

*End of technical reference — keep this file updated with architecture, key design decisions and operational runbooks.*
# Respondy

AI-powered outbound phone call assistant. Calls a phone number with a goal, uses an LLM (Groq) to drive the conversation, and guards against prompt injection in real time.

## How It Works

```
POST /api/user/calls
         │
       async
         │
         ├─ Groq generates greeting
         └─ Twilio initiates call
                  │
                  ▼
           Call answered → <Say> greeting → <Gather> listens ←──────────────────────┐
                                                  │                                 │
                                                  ▼                                 │
                                            Caller speaks                           │
                                                  │                                 │
                                                  ▼                                 │
                                  ┌─ promptGuard (local ONNX model) ─┐              │
                                  │                                  │              │
                              INJECTION                            CLEAN            │
                                  │                                  │              │
                                  ▼                                  ▼              │
                        "Injection detected.                Groq (same session)     │
                         Goodbye." → Hangup                          │              │
                                                                     ▼              │
                                                              <Say> response ───────┘
```

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, Vite |
| Backend | Node.js, Express |
| Database | SQLite (sql.js) |
| LLM | Groq (Llama 3.3 70B) |
| Telephony | Twilio Voice |
| Prompt Guard | ProtectAI/deberta-v3-base-prompt-injection-v2 (ONNX, local) |
| Real-time | WebSocket (transcript streaming) |
| Auth | JWT + bcrypt |

## Project Structure

```
├── client/                     # React frontend (Vite)
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── context/            # Auth context
│   │   ├── components/         # Dashboard components
│   │   └── pages/              # Auth page
│   └── vite.config.js
├── server/                     # Express backend
│   ├── index.js                # Server entry, CORS, WebSocket setup
│   ├── db.js                   # SQLite (sql.js) setup
│   ├── llm.js                  # Groq API client
│   ├── callStore.js            # In-memory call state + transcript
│   ├── routes/
│   │   ├── auth.js             # Register, login, logout
│   │   ├── calls.js            # Twilio call management + webhooks
│   │   └── userCalls.js        # Goal-based guarded calls
│   └── middleware/
│       ├── auth.js             # JWT auth + quota check
│       └── promptGuard.js      # Prompt injection detection (local model)
└── pnpm-workspace.yaml
```

## Setup

### Prerequisites

- Node.js 18+
- pnpm
- Twilio account with a phone number
- Groq API key
- A public URL for Twilio webhooks

### Install

```bash
pnpm install --frozen-lockfile
```

### Environment Variables

Create a `.env` file in the project root:

```env
# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

# Public URL for Twilio webhooks
BASE_URL=https://example.com

# Groq LLM
GROQ_API_KEY=gsk_...

# Auth
JWT_SECRET=your_secret_here

# Client origin (for CORS in dev)
CLIENT_ORIGIN=http://localhost:5173
```

### Run

```bash
# Development (both client + server)
pnpm run dev

# Server only
pnpm run dev:server

# Client only
pnpm run dev:client

# Production
pnpm run --filter client build
pnpm run start
```

## API Reference

### Auth

#### `POST /api/auth/register`

Create a new user account. Returns a JWT token and user object.

- **Auth:** None
- **Body:** `{ "name": "John", "email": "john@example.com", "password": "secret" }`
- **Response:** `{ "user": { "id", "name", "email" }, "token": "eyJ..." }`

#### `POST /api/auth/login`

Authenticate with email and password. Returns a JWT token valid for 7 days.

- **Auth:** None
- **Body:** `{ "email": "john@example.com", "password": "secret" }`
- **Response:** `{ "user": { "id", "name", "email" }, "token": "eyJ..." }`

#### `POST /api/auth/logout`

Logout the current user. JWT is stateless so this is a no-op acknowledgement.

- **Auth:** Bearer token

---

### Calls

#### `POST /api/calls`

Start an outbound call with a custom greeting and optional system prompt. The greeting is spoken when the call is answered, then Groq handles the conversation. Decrements the user's quota by 1.

- **Auth:** Bearer token
- **Body:** `{ "to": "+1234567890", "greeting": "Hello!", "systemPrompt": "You are a helpful assistant." }`
- **Response:** `{ "callSid": "CA...", "status": "initiated" }`

#### `GET /api/calls/:callSid`

Get the current state of a call including status, full transcript, and timestamps.

- **Auth:** Bearer token
- **Response:** `{ "callSid", "status", "transcript": [{ "role", "text", "timestamp" }], "startedAt", "endedAt" }`

#### `POST /api/calls/:callSid/say`

Interrupt the current conversation and speak the given text to the caller. The call then resumes listening for the caller's response. Useful for manual intervention during an LLM-driven call.

- **Auth:** Bearer token
- **Body:** `{ "text": "Please hold on.", "voice": "Polly.Amy" }`
- **Response:** `{ "status": "speaking", "text": "Please hold on." }`

#### `POST /api/calls/:callSid/hangup`

Immediately end an active call.

- **Auth:** Bearer token
- **Response:** `{ "status": "ended" }`

---

### User Calls (goal-based with prompt guard)

#### `POST /api/user/calls`

Start a guarded outbound call with a goal. Groq generates the opening greeting based on the goal (in parallel with call initiation). Every utterance from the answerer is checked by the local prompt injection model before being sent to Groq. Decrements the user's quota by 1.

- **Auth:** Bearer token
- **Body:** `{ "to": "+1234567890", "goal": "Book a table for 2 at 7pm this Friday" }`
- **Response:** `{ "callSid": "CA...", "status": "initiated", "goal": "...", "greeting": "...", "guardEnabled": true }`

#### `GET /api/user/calls/:callSid`

Get call state and transcript. Only accessible by the user who initiated the call.

- **Auth:** Bearer token (owner only)
- **Response:** `{ "callSid", "status", "transcript": [...], "guardEnabled", "startedAt", "endedAt" }`

#### `POST /api/user/calls/:callSid/hangup`

End the call. Only accessible by the user who initiated the call.

- **Auth:** Bearer token (owner only)
- **Response:** `{ "status": "ended" }`

---

### WebSocket

#### `ws://host/ws/transcript?callSid=CA...`

Connect to receive the real-time transcript of an active call. On connection, all existing transcript entries are sent immediately, then new entries stream as they happen. Each message is a JSON object:

```json
{ "role": "caller", "text": "Hello?", "timestamp": "2025-01-01T00:00:00.000Z" }
```

Roles are `caller` (the person on the phone) or `assistant` (Groq's responses / TTS output).

---

### Twilio Webhooks (internal)

These endpoints are called by Twilio's servers during a call. They do not require authentication.

#### `POST /api/calls/twiml/connect`

Called when the call is answered. Returns TwiML that speaks the stored greeting and starts listening for speech via `<Gather>`.

#### `POST /api/calls/twiml/listen`

Called when no speech is detected or after processing. Returns TwiML that continues listening in a loop.

#### `POST /api/calls/gather`

Called when Twilio captures the caller's speech. This is where the main loop runs:

1. Stores the caller's transcript
2. If guard is enabled, checks for prompt injection (local model)
3. If injection detected, warns the caller and hangs up
4. If clean, sends the full conversation to Groq and speaks the response
5. Resumes listening

#### `POST /api/calls/status`

Called by Twilio when the call status changes (initiated, ringing, answered, completed, failed, etc.). Updates the call state in memory.

## Usage Examples

### Start a goal-based call

```bash
curl -X POST http://localhost:3001/api/user/calls \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"to": "+1234567890", "goal": "Book a table for 2 at 7pm this Friday"}'
```

### Manually say something mid-call

```bash
curl -X POST http://localhost:3001/api/calls/CA.../say \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "Actually, make that 3 people instead of 2."}'
```

## Prompt Guard

Every utterance from the call answerer is checked by `ProtectAI/deberta-v3-base-prompt-injection-v2` running locally via ONNX (Transformers.js). If an injection attempt is detected (confidence > 0.9), the call is terminated immediately.

The model (~200MB) downloads automatically on first server start and is cached locally.

## Quota System

Each user starts with 20 API calls. Every call initiation decrements the quota by 1. When quota reaches 0, further requests are rejected with HTTP 429.

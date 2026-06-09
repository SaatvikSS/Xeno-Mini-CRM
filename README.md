# Xeno CRM: AI-Native Mini CRM 🚀

An AI-native Mini CRM built for a simulated Direct-to-Consumer coffee brand ("Brew & Co.") that helps marketers intelligently reach their shoppers. This project was built for the Xeno Engineering Take-Home Assignment.

## 🌟 Key Features

1. **Dashboard & Analytics**: Track KPI metrics like total customers, total revenue, campaign performance, and channel delivery rates in real-time.
2. **Customer Explorer**: Search, filter, and view detailed profiles of your shoppers, including their transaction history, tags, and preferred communication channels.
3. **Audience Builder**: Create detailed customer segments using a visual AND/OR rule builder, or simply describe the audience in natural language and let the AI generate the rules.
4. **Campaign Studio & Channel Service Simulation**: Create campaigns to send personalized messages to specific segments. The system integrates with a stubbed **Channel Service** that asynchronously simulates the full message lifecycle (queued → sent → delivered → opened → read → clicked) over various channels (WhatsApp, SMS, Email, RCS).
5. **AI Copilot**: A pervasive sidebar assistant powered by Google Gemini that can:
   - Create audience segments from plain English.
   - Draft highly personalized, channel-specific campaign messages.
   - Analyze campaign performance and offer actionable insights.

## 🏗️ Architecture & System Design

This project is built as a **three-service monorepo** to mirror real-world integrations where a CRM talks to external vendors (like Twilio, MSG91, Gupshup).

```mermaid
graph TB
    subgraph Frontend["Frontend — React + Vite"]
        Dashboard["Dashboard"]
        Customers["Customer Explorer"]
        Segments["Audience Builder"]
        Campaigns["Campaign Studio"]
        Analytics["Performance Analytics"]
        Copilot["AI Copilot Sidebar"]
    end

    subgraph CRM["CRM API — Node.js + Express"]
        API["REST API Layer"]
        AI["AI Engine (Gemini)"]
        DB["MongoDB (Atlas)"]
        Queue["Message Queue (Bull/Redis)"]
    end

    subgraph Channel["Channel Service — Express"]
        Receiver["Receive Send Requests"]
        Simulator["Outcome Simulator"]
        Callback["Callback to CRM"]
    end

    Frontend --> |HTTP / WebSocket| CRM
    CRM --> |POST /send| Channel
    Channel --> |POST /receipt (async)| CRM
    AI --> |Gemini API| Google["Google Gemini"]
```

### Tradeoffs & Decisions
- **Three-service architecture:** The `channel-service` runs independently and communicates with the `server` exclusively via HTTP and webhooks, ensuring an authentic simulation of the async delivery lifecycle.
- **Queue-based processing:** At scale, sending thousands of messages directly in a loop would crash the Node process. While simulated inline for this demo, the architecture supports dropping dispatches into a Redis-backed Bull queue for resilient, rate-limited execution.
- **Database Choice:** Used MongoDB because customer attributes are highly variable and order data fits well into nested documents. Indexed fields ensure fast segment evaluations.

## 🛠️ Tech Stack

- **Frontend:** React 18, Vite, React Router, Recharts, Lucide-React, Vanilla CSS (Glassmorphism design system).
- **Backend (CRM & Channel Service):** Node.js, Express.js.
- **Database:** MongoDB (with Mongoose).
- **AI Integration:** Google Gemini API (`@google/genai`).

## 🚀 Running Locally

### Prerequisites
- Node.js (v18+)
- MongoDB running locally (or provide a connection URI in `.env`)
- A Google Gemini API Key

### 1. Setup Environment Variables

In `server/.env`, configure the following:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/xeno-crm
FRONTEND_URL=http://localhost:5173
CHANNEL_SERVICE_URL=http://localhost:3001
CRM_CALLBACK_URL=http://localhost:3000
GEMINI_API_KEY=your_gemini_api_key_here
NODE_ENV=development
```

In `channel-service/.env`:
```env
PORT=3001
NODE_ENV=development
```

In `frontend/.env`:
```env
VITE_API_URL=http://localhost:3000/api
```

### 2. Install Dependencies

Install dependencies for all three projects:
```bash
cd frontend && npm install
cd ../server && npm install
cd ../channel-service && npm install
```

### 3. Seed the Database
```bash
cd server
npm run seed
```
This generates 500 realistic Indian customer personas and over 1,800 orders to demonstrate the dashboard metrics and segmentation engine immediately.

### 4. Start the Services

Open three terminal windows and start each service:

**Terminal 1 (Channel Service):**
```bash
cd channel-service
npm run dev
```

**Terminal 2 (CRM Server):**
```bash
cd server
npm run dev
```

**Terminal 3 (Frontend):**
```bash
cd frontend
npm run dev
```

The application will be accessible at `http://localhost:5173`.

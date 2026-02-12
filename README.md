# Live Market Tracker

Real-time stock price tracker with AI-powered news insights.

## Tech Stack

**Backend:** NestJS, TypeScript, Socket.IO, WebSocket (ws)

**Frontend:** HTML, CSS, JavaScript, Socket.IO Client

**APIs:** Finnhub (market data & news), Groq (AI analysis - LLaMA 3.3 70B)

## Environment Variables

Copy `.env.example` to `.env` in the `backend/` directory and fill in your keys:

```
PORT=your_port
FINNHUB_API_KEY=your_finnhub_api_key
GROQ_API_KEY=your_groq_api_key
```

Get your API keys:
- Finnhub: https://finnhub.io/
- Groq: https://console.groq.com/

## Installation

```bash
cd backend
npm install
```

## Running

```bash
# Backend (development)
cd backend
npm run start:dev

# Frontend
Open frontend/index.html with Live Server or any static file server
```

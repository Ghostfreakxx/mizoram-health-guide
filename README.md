# Mizoram Health Guide

A digital public health awareness platform for citizens of Mizoram. It gives
simple, easy-to-read information on early warning signs, harmful habits, and
when to see a doctor, plus an AI assistant for basic health questions.

> For awareness only. This site does not diagnose disease or prescribe
> medicine. In an emergency, call **108**.

## Features

- **Health topics:** cancer, tobacco & oral health, diabetes, heart health,
  and mental wellbeing, each with warning signs and simple advice.
- **AI Health Guide:** a chatbot (Google Gemini) that answers general health
  awareness questions in plain English, with safety rules that prevent
  diagnosis, prescriptions, and dosage advice.
- **Hospital & help directory:** emergency numbers and key hospitals.
- **Citizen health awareness survey:** planned.

## Tech stack

- [Next.js](https://nextjs.org) (App Router) with TypeScript
- Tailwind CSS
- Google Gemini via `@google/genai`

## Running locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` in the project root with your Gemini API key:

   ```bash
   GEMINI_API_KEY=your-key-here
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

   Open <http://localhost:3000>.

## Scripts

| Command         | What it does                     |
| --------------- | -------------------------------- |
| `npm run dev`   | Start the development server     |
| `npm run build` | Build for production             |
| `npm run start` | Run the production build         |
| `npm run lint`  | Check the code with ESLint       |

## Deployment

The site is deployed on Vercel. Set `GEMINI_API_KEY` in the Vercel project's
environment variables.

## Project structure

```
app/
  page.tsx              Homepage
  layout.tsx            Shared layout (header, footer, chatbot)
  topics.ts             List of health topics
  <topic>/page.tsx      Health topic pages
  hospitals/page.tsx    Hospital & help directory
  api/chat/route.ts     AI chatbot API (Gemini)
  components/           Shared UI components
  lib/rateLimit.ts      Rate limiting for the chatbot API
```

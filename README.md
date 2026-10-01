# Mizoram Health Guide

A digital public health awareness platform for citizens of Mizoram. It gives
simple, easy-to-read information on early warning signs, harmful habits, and
when to see a doctor, plus a Health Assistant chatbot for basic health questions.

> For awareness only. This site does not diagnose disease or prescribe
> medicine. In an emergency, call **108**.

## Features

- **Health topics:** cancer, tobacco & oral health, diabetes, heart health,
  and mental wellbeing, each with warning signs and simple advice.
- **Health Assistant:** a chatbot that answers common health awareness
  questions in plain English. It runs entirely in the browser from a built-in
  answer library (`app/components/healthAnswers.ts`), so it needs no API key
  and has no running cost. It never diagnoses or suggests medicines, and
  points to 108 / Tele-MANAS 14416 for emergencies.
- **Hospital & help directory:** emergency numbers and key hospitals.
- **Citizen health awareness survey:** planned.

## Tech stack

- [Next.js](https://nextjs.org) (App Router) with TypeScript
- Tailwind CSS

## Running locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

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

The site is deployed on Vercel. No environment variables are needed.

## Project structure

```
app/
  page.tsx              Homepage
  layout.tsx            Shared layout (header, footer, chatbot)
  topics.ts             List of health topics
  <topic>/page.tsx      Health topic pages
  hospitals/page.tsx    Hospital & help directory
  components/           Shared UI components
  components/healthAnswers.ts  Health Assistant answer library
```

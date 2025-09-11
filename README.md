# Calendo  

Calendo is a **text-to-calendar assistant** that transforms natural-language input into structured Google Calendar events.  
Built with **Next.js, TypeScript, and AI-powered parsing**, Calendo demonstrates full-stack development, API integration, and authentication flows in a production-ready app.  

Currently in **closed beta**, Calendo is being refined and prepared for public release.  

---

## 🎯 Project Overview  

- 📝 **Natural-Language Event Parsing** – Converts free-form text like *“Dinner with team next Thursday at 7pm”* into calendar events.  
- 📅 **Google Calendar API Integration** – Secure event creation directly in users’ calendars.  
- 🔐 **Authentication with NextAuth.js** – OAuth 2.0 login flow using Google as a provider.  
- ⚡ **Full-Stack with Next.js 15** – App Router architecture with serverless API routes.  
- 🤖 **AI-Assisted Parsing** – Integrates OpenAI API for reliable interpretation of ambiguous event text.  
- 🚀 **Deployed on Vercel** – Serverless hosting and CI/CD pipeline.  

---

## 🛠️ Tech Stack  

- **Frontend & Backend**: [Next.js 15](https://nextjs.org/) (App Router, TypeScript)  
- **Authentication**: [NextAuth.js](https://next-auth.js.org/) with Google OAuth  
- **Calendar API**: [Google Calendar API](https://developers.google.com/calendar/api)  
- **AI Parsing**: [OpenAI API](https://openai.com/)  
- **Hosting**: [Vercel](https://vercel.com/)  

---

## 📂 Project Structure  

```plaintext
src/
  app/
    api/
      calendar/create/route.ts   # Google Calendar event creation endpoint
      parseEvent/route.ts        # Natural-language parsing endpoint
      auth/[...nextauth]/        # Authentication routes
    dashboard/page.tsx           # User dashboard
    layout.tsx                   # Root layout
    page.tsx                     # Landing page
    providers.tsx                # Global providers
  components/
    ClientDashboard.tsx           # Dashboard UI component
  public/                        # Static assets
  types/                         # Shared TypeScript types


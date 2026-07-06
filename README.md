# 💊 MedReminder — Your Health Companion

A modern medication-reminder **web app** built with Spring Boot and a hand-crafted vanilla JS frontend. Track medications, get smart reminders, monitor adherence with analytics, log health data, and ask a built-in assistant about your meds — all in a polished, responsive UI with dark mode and PWA support.

![Java 17](https://img.shields.io/badge/Java-17-orange) ![Spring Boot 3.5](https://img.shields.io/badge/Spring%20Boot-3.5-green) ![PWA](https://img.shields.io/badge/PWA-ready-blue)

## ✨ Features

- **Dashboard** — AI daily health summary, today's schedule timeline, progress ring, adherence charts, calendar, streaks, refill alerts, recent activity, quick actions
- **Medication management** — categories, color coding, doctor/pharmacy/Rx info, take-with-food & before-bed flags, notes, prescription-label auto-fill
- **Pill inventory** — remaining-pill tracking with automatic refill-date estimates and low-supply alerts
- **Smart reminders** — browser notifications, snooze (10/30 min), skip-today, take-from-toast
- **Calendar** — full month view with taken/partial/missed dots; click any day for its dose history
- **Analytics** — daily trend line, weekly bars, adherence heatmap, dose-outcome donut, per-medication adherence, most-missed, average response time
- **AI Assistant** — plain-language answers about your medications (missed dose, too much, side effects, food rules, what pairs well) plus an interaction checker. Educational only — always confirm with a professional.
- **Health tracking** — blood pressure, blood sugar, weight, heart rate, mood, sleep, water, symptoms, with trend sparklines
- **Gamification** — streaks, achievements, confetti when you finish your day 🎉
- **Reports** — date-ranged adherence reports, printable / save-as-PDF
- **Dark mode**, notification center, floating action button, skeleton loading, ripple effects, and full mobile responsiveness
- **PWA** — installable, offline shell caching
- **Persistent storage** — file-based H2 database survives restarts (`demo/data/`, auto-created)

## 🚀 Getting Started

**Prerequisites:** Java 17+ and Maven 3.x

```bash
git clone https://github.com/varunshashivarnam/MedReminderApp.git
cd MedReminderApp/demo
mvn spring-boot:run
```

Then open **http://localhost:8080** in your browser. That's it — the database is created and seeded automatically on first run.

## 🔌 API Overview

| Endpoint | Description |
|---|---|
| `GET/POST /api/medications`, `PUT/DELETE /api/medications/{id}` | Medication CRUD |
| `POST /api/medications/{id}/take` · `/skip` | Mark dose taken / skip today |
| `GET /api/stats` | Dashboard stats (streaks, refills, missed) |
| `GET /api/adherence?days=N` · `GET /api/analytics?days=N` | Adherence series & full analytics |
| `GET /api/doses?date=YYYY-MM-DD` | Dose history for one day |
| `GET /api/notifications` · `GET /api/achievements` | Notification center & badges |
| `GET/POST /api/health`, `DELETE /api/health/{id}` | Health tracking entries |
| `GET /api/export` | Full data export (JSON) |

## 🛠 Tech

Java 17 · Spring Boot 3.5 · Spring Data JPA · H2 (file mode) · Vanilla JS (no framework) · CSS custom properties for theming · Service Worker (PWA)

> ⚠️ **Disclaimer:** The assistant and interaction checker provide general educational information only, not medical advice. Always consult your doctor or pharmacist.

## License

MIT

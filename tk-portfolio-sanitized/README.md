# Retail Visit Quality Tracker

A portfolio-safe demo of a mobile-first PWA for planning, completing and analysing retail quality visits.

## Why this project exists

The original tool was created to solve a real operational problem: organising field visits, collecting structured quality data, generating reports and analysing recurring issues across multiple retail locations.

This repository contains **synthetic demo data only**. Real names, store identifiers, addresses, photos and internal business information have been removed.

## Key features

- Role-based login for manager and field users
- Visit planning and assignment
- Short and extended quality-check flows
- Structured scoring and corrective recommendations
- Photo upload flow using demo data only
- Historical visit analysis
- Recurring-issue alerts
- PDF report generation
- Store navigation workflow using synthetic locations
- Mobile-friendly PWA interface
- SQLite-backed persistence

## Tech stack

- Next.js
- TypeScript
- SQLite / better-sqlite3
- React
- Vitest
- PDFKit
- PWA
- AI-assisted development with ChatGPT and Codex

## Demo data

The application ships with synthetic regions, users and stores only.

Examples:
- `Demo Partner 1`
- Store `D1001`
- `Demo City, Example Street 1`

No production or employer data is included.

## AI-assisted workflow

AI tools were used as development accelerators for:
- implementation iterations
- debugging
- refactoring
- test generation
- UI improvements

The project owner defined the product requirements, workflow, validation rules, testing priorities and iterative improvements.

## Local setup

Requirements: Node.js and pnpm.

```bash
pnpm install
```

Copy `.env.example` to `.env.local`, then run:

```bash
pnpm dev
```

Open `http://localhost:3000`.

Demo manager account:
- login: `manager`
- initial password: `demo1234`

On first login the application may ask you to set a new password.

## Quality checks

Before publishing or deploying:

```bash
pnpm test
pnpm lint
pnpm build
```

For a production-style local run after a successful build:

```bash
pnpm start --hostname 0.0.0.0 --port 3010
```

## Privacy

This public portfolio version is intentionally sanitized. It must not contain:
- real employee or partner names
- real store identifiers
- real addresses or coordinates
- real customer or employee data
- real operational photos
- credentials, API keys or production URLs

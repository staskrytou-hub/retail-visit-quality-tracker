# Retail Visit Quality Tracker

A mobile-first PWA built to solve a real operational problem: planning field visits, collecting structured quality data, generating reports, and identifying recurring issues across multiple retail locations.

> **Portfolio note:** this repository is a sanitized public demo. It contains synthetic users, stores, addresses and images only. No employer, partner or production data is included.

## What this project demonstrates

This project is not a tutorial clone. It started from a real business workflow and was iteratively designed, tested and improved around practical operational needs.

It demonstrates my ability to:

- translate a business problem into a working technical solution
- define workflows, validation rules and user roles
- use ChatGPT and Codex as development tools rather than simple query engines
- iterate through implementation, debugging, testing and refinement
- build a full-stack application with persistent data and generated reports
- think about privacy, sanitization and safe public presentation of internal-use software

## Problem

Managing recurring quality visits across many locations creates several operational challenges:

- assigning visits to the right people
- keeping the process consistent
- collecting comparable quality data
- tracking repeated issues over time
- generating clear reports for follow-up
- making the workflow practical on mobile devices in the field

The application brings these steps into one structured workflow.

## Key features

- role-based login for manager and field users
- visit planning and assignment
- short and extended quality-check flows
- structured scoring and corrective recommendations
- photo upload workflow using demo content only
- historical visit analysis
- recurring-issue alerts
- PDF report generation
- store navigation workflow using synthetic locations
- mobile-first PWA interface
- SQLite-backed persistence

## Example workflow

1. A manager assigns a location visit.
2. A field user opens the assignment on a mobile device.
3. The user completes a structured quality checklist and can attach supporting photos.
4. The system stores the result and generates follow-up recommendations.
5. Historical results can be reviewed to identify recurring problems.
6. A PDF report can be generated for documentation and follow-up.

## Tech stack

- **Frontend / full stack:** Next.js, React, TypeScript
- **Database:** SQLite, better-sqlite3
- **Testing:** Vitest
- **Reporting:** PDFKit
- **Delivery:** Progressive Web App (PWA)
- **Development workflow:** ChatGPT, Codex, iterative AI-assisted development

## AI-assisted development workflow

AI was used as a development accelerator throughout the project, including:

- translating requirements into implementation tasks
- implementation iterations
- debugging and root-cause analysis
- refactoring
- test generation and validation
- UI and workflow improvements

My role was to define the problem, expected behaviour, business rules, priorities and acceptance criteria; evaluate the generated solutions; test the application; identify failures; and iterate until the workflow behaved as intended.

This is the way I prefer to work with AI tools: **problem → requirements → implementation → test → feedback → refinement → working solution**.

## Validation

The sanitized portfolio version was checked before publication:

- **26 automated tests passed**
- **production build completed successfully**
- privacy review performed before publishing
- real names, store IDs, addresses, coordinates, operational photos and internal data removed

## Demo data

The application ships with synthetic regions, users and stores only.

Examples:

- `Demo Partner 1`
- Store `D1001`
- `Demo City, Example Street 1`

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

```text
login: manager
initial password: demo1234
```

On first login the application may ask you to set a new password.

## Quality checks

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

This public portfolio version is intentionally sanitized and must not contain:

- real employee or partner names
- real store identifiers
- real addresses or coordinates
- customer or employee personal data
- real operational photos
- credentials, API keys or production URLs

The goal of this repository is to demonstrate the product thinking, technical workflow and implementation without exposing confidential business information.

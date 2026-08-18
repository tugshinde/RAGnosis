# 🩺 RAGnosis — AI-Powered Medical Report Analysis & Hospital Portal

> Extracts clinical values from lab reports, flags them against reference ranges, explains
> them in plain language, and answers follow-up questions through a report-aware chatbot —
> with role-based portals for patients, doctors, and receptionists.

[![.NET](https://img.shields.io/badge/Backend-.NET_8-512BD4?logo=dotnet)](https://dotnet.microsoft.com)
[![React](https://img.shields.io/badge/Frontend-React_18%2BVite-61dafb?logo=react)](https://vitejs.dev)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248?logo=mongodb)](https://www.mongodb.com)
[![ONNX](https://img.shields.io/badge/Embeddings-ONNX_Runtime-005CED?logo=onnx)](https://onnxruntime.ai)
[![Groq](https://img.shields.io/badge/LLM-Groq_GPT--OSS_120B-f97316)](https://groq.com)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [What You Can Do](#-what-you-can-do)
- [Quick Start](#-quick-start)
- [Configuration](#-configuration)
- [System Architecture](#-system-architecture)
- [Report Analysis Pipeline](#-report-analysis-pipeline)
- [RAG Chatbot](#-rag-chatbot)
- [Hospital Portal System](#-hospital-portal-system)
- [Tech Stack](#-tech-stack)
- [Frontend Pages](#-frontend-pages)
- [API Reference](#-api-reference)
- [Database Schema](#-database-schema)
- [Project Structure](#-project-structure)
- [Security & Authentication](#-security--authentication)
- [Error Handling](#-error-handling)
- [Optional Components](#-optional-components)
- [Tests](#-tests)
- [Demo Credentials](#-demo-credentials)
- [Implementation Notes](#-implementation-notes)
- [Status](#-status)
- [Disclaimer](#-disclaimer)

---

## 🌟 Overview

**RAGnosis** helps patients understand their lab reports. It extracts text from uploaded
PDFs or images, detects clinical parameters, flags them against standard reference ranges,
generates plain-language guidance, and answers follow-up questions through a report-aware
chatbot. Role-based portals cover appointment booking, digital prescriptions, and medicine
reminders — so a receptionist can book a visit, a doctor can prescribe, and the patient
sees both alongside their own reports in one dashboard.

| Feature | Details |
|---------|---------|
| 📐 **Reference-range analysis** | 25-parameter clinical catalogue with aliases, regex-based extraction from PDFs and images |
| 🚦 **Automatic flagging** | Every value classified low / normal / high; ranges printed on the report take precedence over catalogue defaults |
| 🤖 **RAG-powered chatbot** | ONNX-embedded query, cosine-similarity retrieval over cached knowledge chunks, answered by Groq's GPT-OSS 120B under a constrained, non-diagnostic system prompt |
| 📊 **Health metrics dashboard** | Detected values projected onto a flat metrics map, charted with Recharts |
| 🏥 **Hospital portal** | Doctor and receptionist roles for appointments, prescriptions, and uploading reports on a patient's behalf |
| 💊 **Medicine reminders** | Daily reminder times per medicine, auto-created from prescriptions |
| 🔐 **JWT authentication** | HS256, role-based access (patient / doctor / receptionist), BCrypt password hashing |
| 🌙 **Dark UI** | Navy/cyan glassmorphism with Framer Motion animation |

---

## 🎯 What You Can Do

### 👤 As a Patient
1. Register with a basic medical profile (age, blood group, height, weight, blood pressure).
2. Upload a lab report (PDF, JPG, or PNG) — analysis completes in seconds.
3. View detected parameters as status cards (low / normal / high), a plain-language summary,
   and per-value recommendations.
4. Track metrics over time on the **Health Metrics** tab (Recharts bar/line charts).
5. Ask the **AI Chatbot** questions about a specific report or general lab values.
6. View prescriptions written by a doctor and set daily **Medicine Reminders**.

### 🩺 As a Doctor
1. Register with specialization and hospital name.
2. View today's appointments booked by a linked receptionist.
3. Write prescriptions (medicine name, dosage, frequency, duration, instructions) — each
   medicine automatically becomes a reminder on the patient's dashboard.
4. Browse every patient you've seen and their prescription history.

### 🏥 As a Receptionist
1. Register linked to a specific doctor.
2. Search patients live (debounced) and book appointments.
3. Upload a patient's report on their behalf — the same analysis pipeline runs and the
   result appears instantly in that patient's dashboard.
4. View every appointment you've booked.

---

## 🚀 Quick Start

### Option 1 — Docker (nothing else to install)

```bash
docker compose up --build
```

Open **http://localhost:5173**.

### Option 2 — Run locally

Requires **.NET 8 SDK**, **Node 18+**, and **MongoDB** running on `localhost:27017`.

```bash
./start.sh          # macOS / Linux
start.bat           # Windows
```

Both scripts start the API on port 5000 and the frontend on port 5173, and install
frontend dependencies on first run.

Manually, if you prefer:

```bash
cd backend/RAGnosis.Api && dotnet run     # http://localhost:5000
cd frontend && npm install && npm run dev # http://localhost:5173
```

### First steps in the app

1. On the landing page, click **"⚡ Create Demo Accounts"** to seed the staff accounts
   (see [Demo Credentials](#-demo-credentials)).
2. Register a patient account, then upload a lab report (PDF or image) from the dashboard.
3. Detected values, flags, and recommendations appear immediately.

The chatbot needs a Groq API key (see [Configuration](#-configuration)); everything else
works without one.

---

## ⚙️ Configuration

Nothing is required to run locally — sensible development defaults are committed.

| Setting | Environment variable | Default |
|---|---|---|
| Mongo connection | `Mongo__ConnectionString` | `mongodb://localhost:27017` |
| Mongo database | `Mongo__Database` | `ragnosis` |
| JWT signing key | `Jwt__Key` | dev key in `appsettings.Development.json` |
| JWT expiry | `Jwt__ExpiryHours` | `24` |
| Groq API key | `Groq__ApiKey` | empty — chatbot returns 503 |
| Groq model | `Groq__Model` | `openai/gpt-oss-120b` |
| Max upload size | `Storage__MaxFileSizeBytes` | `26214400` (25 MB) |
| Allowed origins | `Cors__AllowedOrigins__0` | `http://localhost:5173` |
| Frontend API URL | `VITE_API_URL` | `http://localhost:5000` |

For Docker, copy `.env.example` to `.env` and set `JWT_KEY` / `GROQ_API_KEY`.

**Set a real `Jwt__Key` before deploying anywhere public.** The committed key is for
local development only.

Get a free Groq API key at [console.groq.com](https://console.groq.com).

---

## 🏗 System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     React 18 + Vite SPA (5173)                   │
│  Patient Dashboard   Doctor Dashboard   Receptionist Dashboard    │
│    /dashboard            /doctor           /receptionist          │
└──────────────────────────────┬───────────────────────────────────┘
                                │ Axios · Bearer JWT · snake_case JSON
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│               ASP.NET Core 8 Web API — RAGnosis.Api (5000)       │
│  /api/auth   /api/reports   /api/chat   /api/reminders           │
│  /api/hospital/{doctor,receptionist,appointments,prescriptions}  │
│                                                                    │
│  Controllers → Services → Data                                   │
│    TextExtractionService   (PdfPig, Tesseract, OpenCvSharp)      │
│    ParameterExtractionService  (regex vs. 25-parameter catalogue)│
│    RecommendationService   (rule-based, non-diagnostic guidance) │
│    OnnxEmbeddingService    (ONNX Runtime, MiniLM, WordPiece)     │
│    KnowledgeRetrievalService (cosine search + keyword fallback)  │
│    GroqLlmService          (Groq chat completions API)           │
└───────────────┬───────────────────────────────┬──────────────────┘
                │                                │
                ▼                                ▼
        ┌───────────────┐               ┌────────────────┐
        │    MongoDB     │               │    Groq API     │
        │  7 collections │               │ GPT-OSS 120B   │
        └───────────────┘               └────────────────┘
```

---

## 🧠 Report Analysis Pipeline

```
1. UPLOAD
   Report validated by extension and size (max 25 MB), stored outside the web root.

2. EXTRACT
   PDF  → PdfPig, with a custom line-reconstruction step (glyph concatenation would
          otherwise destroy row structure — words are regrouped by baseline).
   Image → OpenCvSharp preprocessing (denoise, adaptive threshold, deskew),
           then Tesseract OCR.

3. PARSE
   A line-oriented regex parser matches report lines against a 25-parameter reference
   catalogue (with common aliases), extracting each value, unit, and any printed
   reference range.

4. FLAG
   Each value classified low / normal / high against its reference range. A range
   printed on the report itself takes precedence over the catalogue default.

5. ADVISE
   A rule-based recommendation service turns out-of-range flags into plain-language,
   deliberately non-diagnostic guidance.
```

Detected values are also projected onto a flat `metrics` map (`hemoglobin`, `ldl`, `tsh`, …)
that the dashboard charts directly with Recharts.

### Reference catalogue (25 parameters)

Haemoglobin, White Blood Cell Count, Red Blood Cell Count, Platelet Count, Fasting Blood
Glucose, HbA1c, Total Cholesterol, LDL Cholesterol, HDL Cholesterol, Triglycerides, Serum
Creatinine, Blood Urea Nitrogen, TSH, Vitamin D, Vitamin B12, Serum Iron, Ferritin, SGPT
(ALT), SGOT (AST), Total Bilirubin, Serum Albumin, Uric Acid, Sodium, Potassium, Calcium.

---

## 💬 RAG Chatbot

```
1. EMBED    Query is tokenized by a custom WordPiece tokenizer and run through a
            384-dim ONNX MiniLM model (all-MiniLM-L6-v2), with attention-masked
            mean pooling and L2 normalization.

2. RETRIEVE Compared by cosine similarity against 27 cached knowledge-chunk
            embeddings (25 reference parameters + 2 general guidance chunks) —
            top 4 above a similarity floor of 0.25 are kept.

3. FALLBACK If no ONNX model is present, or embeddings return nothing useful,
            retrieval falls back to keyword (term-overlap) search so answers
            stay grounded either way.

4. ANSWER   Retrieved passages plus the patient's own measured values are passed
            to Groq's openai/gpt-oss-120b (temperature 0.2, max 1024 tokens)
            under a system prompt that forbids diagnosis, medication names, and
            dosing, and closes by recommending a clinician.
```

Without a configured Groq API key, `/api/chat` returns a clear `503` instead of a broken
response. Without the ONNX model files, `/health` reports `embeddings_available: false`
and retrieval uses keyword matching only — the chatbot still works.

---

## 🏥 Hospital Portal System

### Receptionist workflow
1. **Register**, linked to a specific doctor by ID.
2. **Book appointments** — live debounced patient search, date/time picker.
3. **Upload reports** on a patient's behalf — same AI pipeline runs, and the result appears
   instantly in that patient's "My Reports" tab.
4. **View all appointments** booked by that receptionist's linked doctor.

### Doctor workflow
1. **Register** with specialization and hospital name.
2. **View today's appointments**.
3. **Write prescriptions** — multiple medicines per prescription, each with dosage,
   frequency, duration, and instructions. Saving a prescription automatically creates a
   medicine reminder for the patient.
4. **Browse all patients** ever seen and their prescription history.

### What the patient sees
- **My Reports** — includes reports the patient uploaded themselves *and* reports a
  receptionist uploaded on their behalf.
- **Prescriptions** — every prescription a doctor has written, with medicines and notes.
- **Medicine Reminders** — auto-created from prescriptions, or added manually.

---

## 🛠 Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18 + Vite, Framer Motion, Recharts, React Router v6, Axios, react-dropzone, react-hot-toast |
| **Backend** | ASP.NET Core 8 Web API (C#), MongoDB.Driver 3.11, BCrypt.Net-Next |
| **Authentication** | JWT (HS256) via `Microsoft.AspNetCore.Authentication.JwtBearer`, role-based access (patient / doctor / receptionist) |
| **PDF extraction** | PdfPig 0.1.15 with custom baseline-grouped line reconstruction |
| **OCR** | Tesseract 5.2.0 + OpenCvSharp4 4.13 preprocessing (denoise, adaptive threshold, deskew) |
| **Embeddings** | Microsoft.ML.OnnxRuntime 1.29, `all-MiniLM-L6-v2` (384-dim), custom WordPiece tokenizer |
| **RAG retrieval** | Cosine similarity over cached MongoDB-stored vectors, keyword-overlap fallback |
| **LLM chat** | Groq API → `openai/gpt-oss-120b`, OpenAI-compatible chat completions |
| **Database** | MongoDB, 7 collections |
| **API docs** | Swashbuckle / Swagger UI at `/swagger` (Development only) |
| **Containers** | Docker Compose — MongoDB + API + Vite dev server |

---

## 📄 Frontend Pages

### Patient-facing

| Page | Route | Description |
|------|-------|-------------|
| Landing Page | `/` | Hero, feature grid, hospital portal cards, demo-seed button |
| How It Works | `/system` | Animated 6-step pipeline walkthrough with technical deep-dives |
| Register / Login | `/register`, `/login` | Full medical profile on signup; login accepts email **or** mobile |
| Patient Dashboard | `/dashboard` | Overview, Health Card, Upload Report, My Reports, Health Metrics, Medicine Reminders, Prescriptions, AI Chatbot, My Profile |

### Hospital portal

| Page | Route | Description |
|------|-------|-------------|
| Doctor Login/Register | `/doctor/login` | Specialization, hospital, issues doctor JWT |
| Doctor Dashboard | `/doctor` | Today's appointments, prescribe, all patients |
| Receptionist Login/Register | `/receptionist/login` | Links to a doctor by ID |
| Receptionist Dashboard | `/receptionist` | Book appointment, upload report, all appointments |

---

## 🔌 API Reference

All JSON is snake_case (`JsonNamingPolicy.SnakeCaseLower`). All endpoints except `/health`,
the auth endpoints, and the demo seed require `Authorization: Bearer <token>`. Swagger UI
is available at `/swagger` in Development.

### Auth
| Method | Route |
|---|---|
| POST | `/api/auth/register` |
| POST | `/api/auth/login` — accepts email **or** mobile |
| GET / PATCH | `/api/auth/me` |
| POST | `/api/auth/change-password` |

### Reports
| Method | Route |
|---|---|
| POST | `/api/reports/upload` — multipart `file`, max 25 MB |
| GET | `/api/reports/` |
| GET / DELETE | `/api/reports/{id}` |
| GET | `/api/reports/{id}/file` |
| POST | `/api/reports/{id}/reanalyze` |

### Chat
| Method | Route |
|---|---|
| POST | `/api/chat/` — optional `report_id` scopes the answer |
| GET / DELETE | `/api/chat/history` |

### Reminders
| Method | Route |
|---|---|
| GET / POST | `/api/reminders/` |
| GET | `/api/reminders/today` |
| PUT / PATCH / DELETE | `/api/reminders/{id}` |

### Hospital
| Method | Route |
|---|---|
| POST | `/api/hospital/doctor/register` · `/doctor/login` |
| GET | `/api/hospital/doctor/me` |
| POST | `/api/hospital/receptionist/register` · `/receptionist/login` |
| GET | `/api/hospital/receptionist/me` |
| GET | `/api/hospital/patients/search?q=` |
| POST | `/api/hospital/appointments` |
| GET | `/api/hospital/appointments/today` · `/all-patients` |
| GET | `/api/hospital/receptionist/my-patients` |
| POST | `/api/hospital/reports/upload` — on a patient's behalf, max 30 MB |
| POST | `/api/hospital/prescriptions` |
| GET | `/api/hospital/prescriptions/me` · `/patient/{id}` |
| POST | `/api/hospital/demo/seed` |

### Health
| Method | Route |
|---|---|
| GET | `/health` — `status`, `utc`, `embeddings_available`, `llm_configured` |
| GET | `/health/live` — liveness; touches no dependency |
| GET | `/health/ready` — readiness; fails when MongoDB is unreachable |

### Pagination

The reports, reminders, prescriptions, and appointment list endpoints accept `page`
(1-based) and `page_size` query parameters and return a `pagination` object alongside the
existing list key. Omitting both returns the first 50 items; `page_size` is clamped to 200.
Out-of-range values are corrected rather than rejected.

```json
{
  "reports": [ /* ... */ ],
  "pagination": { "page": 1, "page_size": 50, "total_items": 2, "total_pages": 1, "has_next": false }
}
```

### Request correlation

Every response carries an `X-Correlation-ID` header, echoing the inbound value when one is
supplied and safe (alphanumerics, `-`, `_`, `.`, up to 64 characters) and generating one
otherwise. The id is attached to every log line produced while handling that request.

---

## 📊 Database Schema

MongoDB, 7 collections (`backend/RAGnosis.Api/Data/MongoContext.cs`):

| Collection | Model | Key fields |
|---|---|---|
| `users` | `User` | `Name`, `Email`, `PasswordHash`, `Role` (patient/doctor/receptionist/admin), `Mobile`, `Age`, `Gender`, `HeightInches`, `WeightKg`, `BloodPressure`, `BloodGroup`, `Specialization`/`Hospital` (doctor), `DoctorId` (receptionist), `Reports` (denormalized stubs) |
| `reports` | `Report` | `UserId`, `FileName`, `Status`, `ExtractedText`, `Parameters[]`, `Metrics{}`, `Recommendations[]`, `Summary`, `UploadedAt`, `AnalyzedAt` |
| `reminders` | `Reminder` | `UserId`, `MedicineName`, `Dosage`, `Times[]` (`"HH:mm"`), `Frequency`, `IsActive` |
| `appointments` | `Appointment` | `PatientId`, `DoctorId`, `PatientName`, `DoctorName`, `AppointmentDate`, `AppointmentTime`, `Status` |
| `prescriptions` | `Prescription` | `PatientId`, `DoctorId`, `Items[]` (medicine, dosage, frequency, duration, instructions), `Notes`, `IssuedAt` |
| `chat_messages` | `ChatMessage` | `UserId`, `ReportId?`, `Role` (user/assistant/system), `Content`, `Citations[]` |
| `knowledge_chunks` | `KnowledgeChunk` | `Title`, `Content`, `Source`, `Embedding[]` (384-dim, cached) |
| `audit_events` | `AuditEvent` | `Action`, `ActorId`, `ActorRole`, `SubjectUserId`, `ResourceId`, `SelfAccess`, `CorrelationId`, `IpAddress`, `OccurredAt` |

---

## 📁 Project Structure

```
RAGnosis/
├── frontend/                       React + Vite SPA
│   └── src/
│       ├── pages/
│       │   ├── LandingPage.jsx         Homepage + hospital portal cards
│       │   ├── SystemAnimation.jsx     Animated pipeline walkthrough
│       │   ├── RegisterPage.jsx / LoginPage.jsx
│       │   ├── Dashboard.jsx           Patient dashboard (8 tabs)
│       │   ├── DoctorLogin.jsx / DoctorDashboard.jsx
│       │   └── ReceptionistLogin.jsx / ReceptionistDashboard.jsx
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── HealthCard.jsx
│       │   └── MedicineRemindersTab.jsx
│       └── context/
│           └── AuthContext.jsx         JWT auth state
│
├── backend/
│   ├── RAGnosis.Api/
│   │   ├── Controllers/            HTTP surface, authorization, DTO mapping
│   │   │   ├── AuthController.cs
│   │   │   ├── ReportsController.cs
│   │   │   ├── ChatController.cs
│   │   │   ├── RemindersController.cs
│   │   │   └── HospitalController.cs
│   │   ├── Services/                OCR, parsing, clinical rules, embeddings, retrieval, LLM
│   │   │   ├── TextExtractionService.cs
│   │   │   ├── ImagePreprocessor.cs
│   │   │   ├── ParameterExtractionService.cs
│   │   │   ├── ReferenceRanges.cs
│   │   │   ├── RecommendationService.cs
│   │   │   ├── OnnxEmbeddingService.cs
│   │   │   ├── WordPieceTokenizer.cs
│   │   │   ├── KnowledgeRetrievalService.cs
│   │   │   ├── KnowledgeSeeder.cs
│   │   │   ├── GroqLlmService.cs
│   │   │   ├── TokenService.cs
│   │   │   └── FileStorageService.cs
│   │   ├── Models/                  MongoDB documents
│   │   ├── Dtos/                    Request/response contracts
│   │   ├── Data/                    MongoContext and index initialization
│   │   ├── Configuration/           Strongly-typed settings
│   │   ├── Models/onnx/             (optional) ONNX model + vocab, not committed
│   │   └── tessdata/                (optional) Tesseract language data, not committed
│   └── RAGnosis.Tests/               70 unit tests
│
├── docker-compose.yml
├── start.sh / start.bat
└── .env.example
```

---

## 🔐 Security & Authentication

**JWT (HS256).** Claims: `sub`, `user_id`, `email`, `role`, `name`, `jti`. Default issuer
`ragnosis`, audience `ragnosis-client`, 24-hour expiry. `DefaultMapInboundClaims = false`
(plus `MapInboundClaims = false` on the bearer handler) stops the short `role` / `sub` /
`user_id` claims being rewritten to WS-Federation URIs, which would silently break every
role check.

**Key stretching.** Keys shorter than 256 bits are stretched with SHA-256 rather than
rejected, deterministically, so a short configured secret still yields a valid signing key
across restarts.

**Password hashing.** BCrypt at work factor 12. Verification is wrapped so a malformed or
foreign hash fails the login instead of throwing a 500.

**Role-based access.** No attribute-based `[Authorize(Roles=...)]` — every controller
checks the caller's role imperatively. Patients see only their own records; doctors read
their patients' reports and issue prescriptions; receptionists book appointments and
upload reports on a patient's behalf but cannot read clinical records. File paths are
resolved against the upload root and rejected if they escape it.

**Fail-fast configuration.** The API refuses to start outside Development if `Jwt:Key` is
missing, shorter than 32 characters, or set to the signing key committed to this
repository — a published key would let anyone forge a token for any role.

**Signing key precedence.** `appsettings.json` leaves `Jwt:Key` empty on purpose so a
deployment must supply its own; `appsettings.Development.json` carries a local fallback that
is public by virtue of being committed. For local work prefer .NET user-secrets, which
override both and live outside the repository:

```bash
dotnet user-secrets set "Jwt:Key" "<a long random value>" --project backend/RAGnosis.Api
```

Changing the key invalidates every token already issued, so existing sessions must sign in
again. The `UserSecretsId` must be compiled in, so rebuild rather than `--no-build` the
first time.

**Development-only endpoints.** `POST /api/hospital/demo/seed` creates staff accounts with
a published password, so it returns `404` in any environment other than Development.
Swagger is likewise Development-only.

**Rate limiting.** Registration and sign-in (patient, doctor, and receptionist) are capped
at 10 attempts per minute per client IP, answered with a `429` in the standard envelope.

**Audit trail.** Access to clinical data is recorded to the `audit_events` collection:
report reads, downloads, deletes and uploads, prescription reads and issues, patient
directory searches, and report-scoped chat. Each entry carries the actor and role, the
subject patient, the resource, the correlation id, the caller's IP, and a `self_access`
flag — the entries where that flag is false are staff reading someone else's records.
Routine list calls are deliberately not recorded; the dashboard polls them on every render.

**CORS.** Restricted to configured origins (`http://localhost:5173` by default).

---

## 🚨 Error Handling

Every error response shares one envelope:

```json
{
  "error": "Invalid email or password.",
  "message": "Invalid email or password.",
  "errors": { "email": ["The Email field is required."] }
}
```

`errors` is only present for field-level validation failures. Common cases:

| Status | When |
|---|---|
| `400` | Validation failure (missing/invalid field) |
| `401` | Missing, expired, or invalid JWT — or wrong credentials |
| `403` | Authenticated but wrong role for the action |
| `404` | Resource not found or not owned by the caller |
| `503` | Chat requested but no Groq API key configured |

---

## 🧩 Optional Components

Neither is committed; both degrade gracefully when absent.

**ONNX embedding model** — download `all-MiniLM-L6-v2` (ONNX export) and its `vocab.txt`
into `backend/RAGnosis.Api/Models/onnx/`. Without it, `/health` reports
`embeddings_available: false` and the chatbot uses keyword retrieval.

**Tesseract language data** — place `eng.traineddata` in `backend/RAGnosis.Api/tessdata/`.
Without it, image uploads return a clear error; PDF uploads are unaffected.

---

## 🧪 Tests

```bash
cd backend && dotnet test        # 81 tests
```

Covers parameter extraction and flagging, reference-range matching, PDF line
reconstruction, JWT signing and claim handling, BCrypt verification, the WordPiece
tokenizer, cosine similarity, recommendation generation, and pagination clamping.

### Known advisories

`npm audit` reports two moderate advisories against `react-router` 6.x. Neither is
reachable here: one requires server-side rendering, which this SPA does not use, and the
other requires an attacker-controlled navigation target, while every `navigate()` and
`<Link to>` in the app resolves to a hardcoded path. Clearing them needs a React Router
major upgrade, which is a routing-level change not worth making for no change in exposure.

---

## 🔑 Demo Credentials

Click **"⚡ Create Demo Accounts"** on the landing page first, then:

| Portal | URL | Email | Password |
|--------|-----|-------|----------|
| 👤 Patient | `/register` | Create your own | — |
| 🩺 Doctor | `/doctor/login` | `doctor@ragnosis.dev` | `demo1234` |
| 🏥 Receptionist | `/receptionist/login` | `reception@ragnosis.dev` | `demo1234` |

The demo receptionist is pre-linked to the demo doctor — no manual setup needed.

### Full demo flow
1. Go to `/` → click "⚡ Create Demo Accounts".
2. Register as a patient at `/register`.
3. Log in as Receptionist → "Book Appointment" → search your patient → book.
4. Log in as Receptionist → "Upload Report" → upload a blood test PDF for the patient.
5. Log in as Doctor → see the appointment → write a prescription.
6. Log in as Patient → see the report in "My Reports" and the prescription (plus its
   auto-created reminder) in "Prescriptions" / "Medicine Reminders".

---

## 📝 Implementation Notes

**snake_case contract.** A global `JsonNamingPolicy.SnakeCaseLower` covers request and
response bodies, validation error keys, and dictionary keys. Multipart form binding does
*not* honour that policy, so form fields carry explicit `[FromForm(Name = "...")]`
attributes. Mongo documents are mapped independently via `[BsonElement]`, and `_id` is
surfaced with `[JsonPropertyName]` where the client expects it.

**Two-write pattern.** Report creation writes the `reports` document (source of truth) and
pushes a denormalised stub onto the owning user so the dashboard lists reports without a
second query. A failure on the second write is logged, not surfaced — the report is still
valid. Deletion mirrors this.

**PDF text extraction.** PdfPig's `page.Text` concatenates every glyph on a page into one
unbroken string, which destroys the row structure the parser depends on. Extraction
regroups words by baseline and pads column gaps instead; a regression test covers it.

---

## 📌 Status

Implemented and exercised end to end: authentication, report upload and analysis, PDF
extraction, parameter detection and flagging, recommendations, reminders, appointments,
prescriptions with automatic reminder creation, and chat orchestration with persistence.

**Tesseract OCR and OpenCvSharp preprocessing now run against real input.** A scanned PNG
lab report is preprocessed, OCR'd at ~80–86% mean character confidence, and parsed into the
same flagged parameters a PDF produces. The OpenCvSharp native runtime is selected per
platform in the csproj — without it, every OpenCV call throws and preprocessing silently
degrades to the raw scan, which is easy to miss because OCR still broadly works.

**Semantic retrieval is active once model weights are supplied.** With
`all-MiniLM-L6-v2.onnx` and `vocab.txt` present, the service loads at startup and backfills
embeddings onto all 27 knowledge chunks automatically; `/health` then reports
`embeddings_available: true`. Neither file is committed — see Optional components.

**The chatbot still needs a Groq API key.** Without one, `/api/chat` returns a clear 503 and
the rest of the application is unaffected.

---

## ⚠️ Disclaimer

RAGnosis explains laboratory values. It does not diagnose conditions, recommend
medication, or replace a clinician.

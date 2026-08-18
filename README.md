# RAGnosis — AI-Powered Medical Report Analysis Platform

RAGnosis helps patients understand their lab reports. It extracts text from uploaded
reports, detects clinical parameters, flags them against standard reference ranges,
generates plain-language guidance, and answers follow-up questions through a
report-aware RAG chatbot. Role-based portals cover appointment booking, digital
prescriptions, and medicine reminders.

**Stack:** ASP.NET Core 8 Web API (C#) · React · MongoDB

---

## Quick start

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

1. On the landing page, click the demo-seed button to create the staff accounts:
   - Doctor — `doctor@ragnosis.dev` / `demo1234`
   - Receptionist — `reception@ragnosis.dev` / `demo1234`
2. Register a patient account, then upload a lab report (PDF) from the dashboard.
3. Detected values, flags, and recommendations appear immediately.

The chatbot needs a Groq API key (see Configuration); everything else works without one.

---

## Configuration

Nothing is required to run locally — sensible development defaults are committed.

| Setting | Environment variable | Default |
|---|---|---|
| Mongo connection | `Mongo__ConnectionString` | `mongodb://localhost:27017` |
| JWT signing key | `Jwt__Key` | dev key in `appsettings.Development.json` |
| Groq API key | `Groq__ApiKey` | empty — chatbot returns 503 |
| Allowed origins | `Cors__AllowedOrigins__0` | `http://localhost:5173` |
| Frontend API URL | `VITE_API_URL` | `http://localhost:5000` |

For Docker, copy `.env.example` to `.env` and set `JWT_KEY` / `GROQ_API_KEY`.

**Set a real `Jwt__Key` before deploying anywhere public.** The committed key is for
local development only.

---

## Architecture

```
frontend/                React + Vite SPA
backend/
  RAGnosis.Api/
    Controllers/         HTTP surface, authorization, DTO mapping
    Services/            OCR, parsing, clinical rules, embeddings, retrieval, LLM
    Models/              MongoDB documents
    Dtos/                Request/response contracts
    Data/                MongoContext and index initialization
  RAGnosis.Tests/        70 unit tests
```

### Report analysis pipeline

1. **Upload** — validated by extension and size, stored outside the web root
2. **Extract** — PdfPig for digital PDFs, Tesseract (with OpenCvSharp preprocessing) for images
3. **Parse** — line-oriented parser matches labels against a 25-parameter reference catalogue
4. **Flag** — each value classified `low` / `normal` / `high`; ranges printed on the report take precedence over catalogue defaults
5. **Advise** — plain-language guidance, deliberately non-diagnostic

Detected values are also projected onto a flat `metrics` map (`hemoglobin`, `ldl`, `tsh`, …)
that the dashboard charts directly.

### RAG chatbot

The query is embedded via ONNX Runtime (MiniLM, WordPiece tokenizer, attention-masked mean
pooling, L2 normalisation), scored against cached chunk vectors by cosine similarity, and the
top passages plus the patient's own measured values are passed to the Groq LLM under a
constrained system prompt. Without an ONNX model present, retrieval falls back to keyword
overlap so answers stay grounded.

---

## Tests

```bash
cd backend && dotnet test        # 70 tests
```

Covers parameter extraction and flagging, reference-range matching, PDF line
reconstruction, JWT signing and claim handling, BCrypt verification, the WordPiece
tokenizer, cosine similarity, and recommendation generation.

---

## Optional components

Neither is committed; both degrade gracefully when absent.

**ONNX embedding model** — download `all-MiniLM-L6-v2` (ONNX export) and its `vocab.txt`
into `backend/RAGnosis.Api/Models/onnx/`. Without it, `/health` reports
`embeddings_available: false` and the chatbot uses keyword retrieval.

**Tesseract language data** — place `eng.traineddata` in `backend/RAGnosis.Api/tessdata/`.
Without it, image uploads return a clear error; PDF uploads are unaffected.

---

## API

All JSON is snake_case. All endpoints except `/health`, the auth endpoints and the demo
seed require `Authorization: Bearer <token>`.

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
| POST | `/api/reports/upload` — multipart `file` |
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
| PUT / DELETE | `/api/reminders/{id}` |

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
| POST | `/api/hospital/reports/upload` — on a patient's behalf |
| POST | `/api/hospital/prescriptions` |
| GET | `/api/hospital/prescriptions/me` · `/patient/{id}` |
| POST | `/api/hospital/demo/seed` |

Swagger UI is available at `/swagger` in Development.

---

## Implementation notes

**snake_case contract.** A global `JsonNamingPolicy.SnakeCaseLower` covers request and
response bodies, validation error keys, and dictionary keys. Multipart form binding does
*not* honour that policy, so form fields carry explicit `[FromForm(Name = "...")]`
attributes. Mongo documents are mapped independently via `[BsonElement]`, and `_id` is
surfaced with `[JsonPropertyName]` where the client expects it.

**JWT claim names.** `JwtSecurityTokenHandler.DefaultMapInboundClaims = false` (plus
`MapInboundClaims = false` on the bearer handler) stops the short `role` / `sub` /
`user_id` claims being rewritten to WS-Federation URIs, which would silently break every
role check. A dedicated test asserts the failure mode.

**HS256 key length.** Keys shorter than 256 bits are stretched with SHA-256 rather than
rejected, deterministically, so a short configured secret still yields a valid signing key
across restarts.

**Two-write pattern.** Report creation writes the `reports` document (source of truth) and
pushes a denormalised stub onto the owning user so the dashboard lists reports without a
second query. A failure on the second write is logged, not surfaced — the report is still
valid. Deletion mirrors this.

**PDF text extraction.** PdfPig's `page.Text` concatenates every glyph on a page into one
unbroken string, which destroys the row structure the parser depends on. Extraction
regroups words by baseline and pads column gaps instead; a regression test covers it.

**Password hashing.** BCrypt at work factor 12. Verification is wrapped so a malformed or
foreign hash fails the login instead of throwing a 500.

**Access control.** Patients see only their own records; doctors read their patients'
reports and issue prescriptions; receptionists book appointments and upload reports on a
patient's behalf but cannot read clinical records. File paths are resolved against the
upload root and rejected if they escape it.

---

## Status

Implemented and tested: authentication, report upload and analysis, PDF extraction,
parameter detection and flagging, recommendations, reminders, appointments, prescriptions
with automatic reminder creation, and chat orchestration with persistence.

Written but not yet exercised against real inputs: Tesseract OCR (needs language data) and
OpenCvSharp preprocessing (needs native binaries).

The ONNX embedding layer is implemented — tokenizer, inference, pooling and cosine search
are all in place and unit-tested — but ships without model weights, so semantic retrieval
is inactive until a model is supplied.

## Disclaimer

RAGnosis explains laboratory values. It does not diagnose conditions, recommend
medication, or replace a clinician.

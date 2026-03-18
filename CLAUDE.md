# Notify — EchoAlert Sound Detection App

## Project Overview
Notify is a real-time sound detection web app for deaf users. It listens to microphone input, classifies sounds using YAMNet (via TensorFlow.js), and alerts the user visually. Built with React + Vite + TailwindCSS on the frontend and Supabase for auth, database, and (later) edge functions.

---

## Tech Stack
- **Frontend:** React + Vite + TailwindCSS
- **Sound Detection:** TensorFlow.js + YAMNet model
  - Load from: `https://tfhub.dev/google/tfjs-model/yamnet/tfjs/1`
- **Auth / Database:** Supabase (credentials in `secrets.txt`)
- **Email:** Supabase Edge Functions + Resend — **NOT YET IMPLEMENTED, skip for now**

---

## Supabase Tables
> Tables are already created. Do NOT recreate or run any table creation SQL.

### `profiles`
| Column | Type |
|---|---|
| id | uuid (references auth.users, primary key) |
| email | text |
| flash_alerts_enabled | boolean (default true) |
| email_alerts_enabled | boolean (default true) |
| created_at | timestamptz |

### `sound_preferences`
| Column | Type |
|---|---|
| id | uuid (primary key) |
| user_id | uuid (references profiles) |
| yamnet_class_index | integer |
| sound_label | text |
| enabled | boolean (default true) |

### `sound_events`
| Column | Type |
|---|---|
| id | uuid (primary key) |
| user_id | uuid (references profiles) |
| yamnet_class_index | integer |
| sound_label | text |
| confidence | float |
| detected_at | timestamptz |

---

## Supported Sound Categories
These are the only 16 YAMNet classes the app should detect and act on. All others should be ignored. Default all to enabled on first signup.

| Index | Label | Category |
|---|---|---|
| 394 | Fire alarm | Critical |
| 393 | Smoke detector | Critical |
| 390 | Siren | Critical |
| 317 | Emergency vehicle | Critical |
| 349 | Doorbell | Alerts |
| 353 | Knock | Alerts |
| 382 | Alarm | Alerts |
| 384 | Telephone ringing | Alerts |
| 389 | Alarm clock | Alerts |
| 392 | Buzzer | Alerts |
| 437 | Glass shatter | Impacts |
| 420 | Explosion | Impacts |
| 460 | Bang | Impacts |
| 463 | Smash/crash | Impacts |
| 313 | Reversing beeps | Impacts |
| 352 | Door slam | Impacts |

---

## Pages & Routes

### `/login` — Auth Page
- Email + password login and signup via Supabase Auth
- Clean centered card UI
- On first signup: create a `profiles` row AND seed `sound_preferences` with all 16 sounds enabled
- Redirect to `/` after successful login

### `/` — Listen Page (requires auth)
- Large **START / STOP** button, centered, prominent (min 120px wide)
  - Green when idle, red when actively listening
- On START:
  1. Request microphone permission — show clear error if denied
  2. Load YAMNet model — show "Loading model..." indicator while loading
  3. Begin continuous audio capture via Web Audio API
  4. Every 1 second, run inference on a 0.975s audio chunk
  5. Get the top prediction from YAMNet's 521-class output
  6. Check if that class index is in the user's enabled sounds list
  7. If confidence > 0.5 AND sound is enabled:
     - Insert row into `sound_events`
     - If `flash_alerts_enabled`: flash entire screen background white 3 times (~150ms per flash). **Debounce: max once per sound per 3 seconds**
- Show a **pulsing indicator** for current listening status
- Show a **live SESSION LOG** below the button:
  - Detections from this browser session only (not from DB)
  - Columns: Sound Label | Confidence % | Time
  - Newest at top, max 50 rows visible
  - Critical sounds → red text, Moderate sounds → amber text

### `/stats` — Stats Page (requires auth)
- Query `sound_events` for current user
- **Date filter toggle:** 1d / 7d / 30d (default 7d)
- **Bar chart:** top sounds by frequency (use `recharts`)
- **Timeline scatter chart:** x = time of day, y = sound type, dot size = confidence
- **Summary table:** Sound Label | Count | Last Detected | Avg Confidence

### `/settings` — Settings Page (requires auth)
- Show current user email at top
- **Sound Toggles section:**
  - List all 16 sounds with a toggle switch each
  - Group by category: Critical / Alerts / Impacts
  - Changes save immediately to `sound_preferences` in Supabase
- **Accessibility section:**
  - "Flash alerts" toggle → saves to `profiles.flash_alerts_enabled`
  - Label: *"Disable if you have photosensitive epilepsy"*
  - "Email alerts" toggle → saves to `profiles.email_alerts_enabled`
- **Logout button**

---

## YAMNet Implementation
- Load model **once** on START, reuse it across all subsequent inferences
- Use `AudioContext` + `ScriptProcessorNode` for audio capture
- YAMNet requires **mono Float32Array at 16kHz** — resample from device sample rate if needed
- Model outputs scores for 521 classes — **only check the 16 listed above**, ignore the rest
- Show "Loading model..." while the model is fetching and initializing

---

## Design System
- **Background:** `#0F172A`
- **Card background:** `#1E293B`
- **Accent / primary:** `#1A56DB` (blue)
- **Critical sound color:** `#DC2626` (red)
- **Moderate sound color:** `#D97706` (amber)
- **Theme:** Dark throughout — no light mode needed
- **Navigation bar** at top with links: Listen | Stats | Settings
- **Responsive** — must work on mobile
- All interactive elements must have proper `aria-label` attributes
- Maintain good contrast ratios throughout

---

## Email Alerts
> **NOT IMPLEMENTED YET — skip entirely for now.**
> The `email_alerts_enabled` toggle in settings should exist in the UI and save to the DB, but no edge function should be created or called at this stage. This will be added in a future session.

---

## What "Done" Looks Like
- `npm install && npm run dev` starts the app with no errors
- User can sign up, log in, and log out
- YAMNet loads in the browser and detects sounds from the microphone
- Detections appear in the session log in real time
- Flash alert fires on detection (if enabled)
- Sound toggles in settings persist across sessions via Supabase
- Stats page shows real data from `sound_events`
- App works on both desktop and mobile browsers

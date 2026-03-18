Build a web application called Notify — a real-time sound detection platform for deaf users. Use React (Vite) for the frontend and Supabase for auth, database, and edge functions. Here is the full spec:
TECH STACK
	•	Frontend: React + Vite + TailwindCSS
	•	Sound detection: TensorFlow.js + YAMNet model (load from: https://tfhub.dev/google/tfjs-model/yamnet/tfjs/1)
	•	Backend/Auth/DB: Supabase (env vars in secrets.txt file)
	•	Email: Supabase Edge Functions calling Resend API - WILL DO LATER, NOT NOW
	•	No other backend needed — everything goes through Supabase
SUPABASE TABLES (already created — do not recreate them)
	•	profiles: id, email, flash_alerts_enabled, email_alerts_enabled, created_at
	•	sound_preferences: id, user_id, yamnet_class_index, sound_label, enabled
	•	sound_events: id, user_id, yamnet_class_index, sound_label, confidence, detected_at
SOUND CATEGORIES TO SUPPORT Use these YAMNet class indices. Store user toggles in sound_preferences. Default all to enabled on first signup.
	•	349 - Doorbell
	•	353 - Knock
	•	382 - Alarm
	•	384 - Telephone ringing
	•	389 - Alarm clock
	•	352 - Door slam
	•	392 - Buzzer
	•	393 - Smoke detector
	•	394 - Fire alarm
	•	390 - Siren
	•	317 - Emergency vehicle
	•	313 - Reversing beeps
	•	437 - Glass shatter
	•	420 - Explosion
	•	460 - Bang
	•	463 - Smash/crash
PAGE 1 — AUTH PAGE (/login)
	•	Email + password login and signup via Supabase Auth
	•	Clean centered card UI
	•	On first signup, create a profiles row and seed sound_preferences with all 16 sounds enabled
PAGE 2 — MAIN LISTEN PAGE (/)
	•	Requires auth
	•	Large START / STOP button in the center
	•	When START is pressed: request microphone permission, load YAMNet via TensorFlow.js, begin continuous audio capture using Web Audio API
	•	Every 1 second run inference on a 0.975s audio chunk
	•	Get top prediction — check if its class index is in the user's enabled sounds list
	•	If confidence > 0.5 and sound is enabled: insert a row into sound_events, trigger flash alert if enabled, call the email edge function
	•	Flash alert: animate the entire screen background white 3 times rapidly (~150ms per flash). Debounce — do not flash for the same sound more than once every 3 seconds
	•	Show a live SESSION LOG below the button: list of detections in this browser session only, each row shows sound label / confidence % / time, newest at top, max 50 rows, color-code critical sounds red and moderate sounds amber
	•	Show a pulsing indicator for current listening status
	•	Show a "Loading model..." indicator while YAMNet loads
PAGE 3 — STATS PAGE (/stats)
	•	Requires auth
	•	Query sound_events for the last 7 days for this user
	•	Bar chart of top sounds by frequency (use recharts)
	•	Timeline scatter chart: x = time of day, y = sound type, dot size = confidence
	•	Summary table: Sound Label | Count (7d) | Last Detected | Avg Confidence
	•	Date filter toggle: 1d / 7d / 30d
PAGE 4 — SETTINGS PAGE (/settings)
	•	Requires auth
	•	Sound toggles section: list all 16 sounds with a toggle switch, changes save immediately to sound_preferences in Supabase, group by category: Critical (fire/smoke/siren/emergency), Alerts (doorbell/knock/telephone/alarm clock/buzzer), Impacts (glass/bang/explosion/smash/reversing/door slam)
	•	Accessibility section: "Flash alerts" toggle saving to profiles.flash_alerts_enabled — label it "Disable if you have photosensitive epilepsy". "Email alerts" toggle saving to profiles.email_alerts_enabled
	•	Show current user email at top
	•	Logout button
EDGE FUNCTION — send-alert-email
	•	SKIP EMAIL FOR NOW - WILL DO LATER
YAMNET IMPLEMENTATION NOTES
	•	Load model once on START, reuse across inferences
	•	Use AudioContext + ScriptProcessorNode
	•	YAMNet expects mono Float32Array at 16kHz — resample from device sample rate if needed
	•	Model outputs scores for 521 classes — only check the 16 listed above
	•	If microphone permission is denied show a clear error message
UI / DESIGN
	•	Dark theme throughout: background #0F172A, cards #1E293B
	•	Accent color #1A56DB (blue)
	•	Critical sounds use red #DC2626, moderate use amber #D97706
	•	Navigation bar at top: Listen | Stats | Settings
	•	Fully responsive, works on mobile
	•	The START button should be at least 120px wide, green when idle, red when listening
	•	Good contrast ratios and aria labels on all interactive elements

Take your time and make an amazing final product. 

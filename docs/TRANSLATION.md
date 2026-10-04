# Mizo translation workflow

Health and emergency information must be correct in Mizo, so translations go
through review before they appear on the website.

## Rules built into the website

- A Mizo string is shown **only** when its status is `reviewed` and it has a
  reviewer name and review date.
- A whole screen (for example **Emergency Mode**) switches to Mizo **only
  when 100% of its safety-critical strings are reviewed**. Until then it stays
  fully in English, so nobody sees a half-translated emergency screen.
- Emergency and helpline numbers (108, 112, 14416, …) must appear unchanged
  in the translation, or the row is rejected.
- The language menu shows Mizo as "translation in progress — N% reviewed"
  until the first screen is ready.

## Steps

1. Export the spreadsheet: `npm run i18n:export`
   → `docs/translation/mizo-translation.csv` (open in Excel or Google Sheets).
2. **Translator** (fluent Mizo speaker) fills the `mizo` column and sets
   `status` to `draft`. Keep sentences short and simple, as in the English.
3. **Reviewers**: a second fluent Mizo speaker **and** a health professional
   check each safety-critical row. For emergency rows, use *back-translation*:
   someone who has not seen the English translates the Mizo back to English,
   and the meanings are compared.
4. When both agree, set `status` to `reviewed`, and fill `reviewer` (names)
   and `reviewed_on` (YYYY-MM-DD).
5. Import: `npm run i18n:import -- path/to/mizo-translation.csv`
   Rejected rows are listed with the reason.
6. Run `npm test` — the safety tests check every translation again.

## Order of work

1. **Emergency Mode** (`emergency` screen) — highest priority.
2. **Consultation** (the room in text-only view): questions, answers, and results.
3. Everything else.

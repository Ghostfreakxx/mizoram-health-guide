# Adding hospital data to the AI Hospital Navigator

The Navigator must never show invented information. Every field of a hospital
record (`app/ai-hospital/data/hospitals.ts`) has its own `evidence`.

## Rules

1. Only use authoritative sources: the Health & Family Welfare Department,
   Mizoram; the National Health Mission; official hospital websites; official
   government directories (e.g. the National Health Facility Registry); or a
   written confirmation from the facility.
2. Every field you fill in must have `evidence` with:
   - `sourceTitle` and `organisation`
   - `url` when the source is online
   - `checked`: the ISO date (YYYY-MM-DD) you checked it.
3. Fields without evidence are hidden from the public automatically.
4. A hospital shows as **VERIFIED** only when `name`, `district`, `type`,
   `address`, `phone`, and `emergency` all have evidence and `lastVerified`
   is set. Otherwise it shows **NEEDS VERIFICATION**.
5. Never add opening hours, doctor names, or service availability unless the
   source states them explicitly. Re-check data at least every 6 months.

## Example

```ts
phone: {
  value: "0389-XXXXXXX",
  evidence: {
    sourceTitle: "List of health facilities",
    organisation: "Health & Family Welfare Department, Government of Mizoram",
    url: "https://health.mizoram.gov.in/...",
    checked: "2026-10-15",
  },
},
```

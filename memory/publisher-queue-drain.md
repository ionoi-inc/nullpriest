# Publisher Queue Drain Spec

## Overview
Publisher MUST check tweet-queue.json before posting new content each cycle.
If queue has items, post oldest entry first and remove it. Only then post new content.

## Algorithm
```
1. GET memory/tweet-queue.json from repo
2. Parse JSON array
3. If array.length > 0:
   a. Take queue[0] (oldest entry)
   b. Post queue[0].text to @nullPriest_ via X API
   c. Remove queue[0] from array
   d. Write updated array back to memory/tweet-queue.json
   e. Log: "QUEUE DRAIN: posted queued tweet, {queue.length} remaining"
   f. SKIP new content generation this cycle
4. If array.length === 0:
   a. Proceed with normal new content generation
   b. If X API returns 429 (rate limit):
      - Add tweet to queue instead of dropping it
      - Write to memory/tweet-queue.json
      - Log: "RATE LIMITED: queued for next cycle"
```

## tweet-queue.json format
```json
[
  {
    "id": "uuid",
    "text": "tweet content here",
    "queued_at": "2026-02-20T03:00:00Z",
    "reason": "rate_limited | scheduled | overflow",
    "priority": 1
  }
]
```

## Publisher recipe step order (REQUIRED)
1. Fetch tweet-queue.json
2. IF queue not empty → drain one item → commit updated queue → POST tweet → DONE
3. IF queue empty → generate new content → POST tweet → on 429: write to queue

## Rate limit recovery
- On 429: write failed tweet to queue with reason="rate_limited"
- Commit queue to GitHub immediately
- Next cycle will drain it first
- This ensures zero tweets are dropped even during rate limit events
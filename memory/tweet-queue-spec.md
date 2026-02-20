# Tweet Queue Protocol

**File:** `memory/tweet-queue.json`
**Purpose:** Rate limit recovery. When X API returns 429, tweets are queued here instead of dropped.

## Publisher Cycle Protocol

1. Fetch `memory/tweet-queue.json` via GitHub API
2. If `queue.length > 0`:
   - Try to post the OLDEST queued tweet (queue[0])
   - If SUCCESS: remove from queue[0], commit updated queue.json, continue
   - If 429 AGAIN: leave queue as-is, skip new post this cycle, log
3. If queue empty (or after draining one): post new content as normal
4. If NEW post gets 429: append to queue.json, commit, log

## Queue Entry Schema
```json
{
  "text": "tweet text here",
  "queued_at": "2026-02-20T01:00:00Z",
  "reason": "429 rate limit",
  "retry_count": 1
}
```

## Notes
- Always drain ONE queued tweet per cycle max (avoid burst)
- Close duplicate issues #33, #29, #25 after this ships
- Queue is visible at: https://github.com/iono-such-things/nullpriest/blob/master/memory/tweet-queue.json
- Served live at: https://nullpriest.xyz/memory/tweet-queue.json
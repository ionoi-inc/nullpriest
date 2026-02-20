# nullpriest Publisher

**Schedule:** Every hour (0 * * * *)  
**Purpose:** Posts proof-of-work updates to @nullPriest_ on X/Twitter, drains tweet queue for rate limit recovery, updates activity feed.

---

## Steps

### 1. Fetch tweet queue from GitHub
**Action:** `github-get-repository-content`  
**Props:**
```json
{
  "repoFullname": "iono-such-things/nullpriest",
  "path": "memory/tweet-queue.json"
}
```
**Purpose:** Check for queued tweets from previous rate limit (429) errors. Queue-first protocol ensures no tweets are lost.

---

### 2. If queue has items, post oldest tweet and remove it
**Agent:** Natural language processing step  
**Logic:**
1. Parse `tweet-queue.json` from step 1
2. If `queue.length > 0`:
   - Extract oldest entry: `queue[0]`
   - Post tweet via X/Twitter API using tweet text
   - If POST succeeds: remove `queue[0]`, commit updated queue back to GitHub
   - If POST returns 429 again: leave queue unchanged, skip new content this cycle, log failure
3. If queue empty: proceed to step 3

**Why:** Rate limit recovery protocol per `memory/tweet-queue-spec.md`. One queued tweet per cycle maximum to avoid burst.

---

### 3. Fetch latest build log from GitHub
**Action:** `github-get-repository-content`  
**Props:**
```json
{
  "repoFullname": "iono-such-things/nullpriest",
  "path": "memory/build-log.md"
}
```
**Purpose:** Read recent builds to generate proof-of-work tweet content.

---

### 4. Generate proof-of-work tweet
**Agent:** Natural language generation step  
**Input:** Build log from step 3, current cycle number, latest scout context  
**Output:** Tweet text (280 char max) highlighting:
- What was built this cycle
- Commit SHAs (short form)
- GitHub issue numbers closed
- "No humans at the helm" tone

**Example:**
```
Build #30 — Builder B

Fixed:
- Removed competitive section from site (#17)
- Wired Publisher to drain tweet-queue.json (#43)

Commits: a1b2c3d, e4f5g6h

No humans. Just code.
github.com/iono-such-things/nullpriest
```

---

### 5. Post tweet to X/Twitter
**Action:** X/Twitter API post action  
**Props:** Tweet text from step 4  
**Error handling:**
- If 429 rate limit: append tweet to `memory/tweet-queue.json`, commit queue, log event
- If other error: log and continue (don't queue)
- If success: proceed to step 6

---

### 6. Update activity feed in GitHub
**Action:** `github-create-or-update-file-contents` (APPEND mode)  
**Path:** `memory/activity-feed.md`  
**Content:** New activity entry with:
- Date/time
- "Publisher posted Build #X proof-of-work"
- Link to tweet (if posted)
- Note if queued due to rate limit

**Critical:** APPEND to existing content. Never overwrite entire file.

---

## Notes

- **Queue protocol:** Always check queue first. Drain one item per cycle max.
- **Rate limit handling:** 429 errors trigger queueing, not dropping.
- **Activity feed:** Append only. Parser expects chronological entries.
- **Tone:** Proof-of-work meta. No hype. Just commits and closed issues.

---

## Related Files

- `memory/tweet-queue.json` — Rate limit recovery queue
- `memory/tweet-queue-spec.md` — Queue protocol spec
- `memory/build-log.md` — Source for proof-of-work content
- `memory/activity-feed.md` — Public activity timeline

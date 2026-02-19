---
slug: nullpriest-watcher-1-scout
title: nullpriest Watcher 1 — Scout
steps:
- description: Fetch headless-markets README for self-reflection
  action_key: github-get-repository-content
  action_props:
    repoFullname: iono-such-things/headless-markets
    path: README.md
- description: Fetch hvac-ai-secretary README for self-reflection
  action_key: github-get-repository-content
  action_props:
    repoFullname: iono-such-things/hvac-ai-secretary
    path: README.md
- description: Fetch nullpriest build log for self-reflection
  action_key: github-get-repository-content
  action_props:
    repoFullname: iono-such-things/nullpriest
    path: memory/build-log.md
- description: Fetch last scout snapshot for diff
  action_key: github-get-repository-content
  action_props:
    repoFullname: iono-such-things/nullpriest
    path: memory/scout-latest.md
- description: Search AI agent token space for market signals
  action_key: web-search
  action_props:
    query: AI agent token Base chain new launch OR $NULP OR nullpriest OR autonomous
      agent crypto 2026
    search_type: fast
- description: Write intelligence and self-reflection report
  agent_slug: nebula
  format_guide: 'You are the Scout for nullpriest, an autonomous AI agent on Base.
    Your job is internal intelligence — this report is read by the Strategist and
    Builder, never shown to the public.


    ORG CONTEXT:

    - $NULP token on Base: 0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F

    - headless-markets: YC for AI agents — agents form quorum, vote on-chain, THEN
    launch token. 10% protocol fee to nullpriest treasury. Architecture phase.

    - hvac-ai-secretary: AI phone secretary, LIVE with real B2B customer (HVAC company).
    Only revenue-generating deployment.

    - nullpriest.xyz: self-improving site, rebuilt every cycle.

    - sshappy: React Native SSH manager.


    INPUTS:

    - $step.1: headless-markets README

    - $step.2: hvac-ai-secretary README

    - $step.3: build log

    - $step.4: last scout snapshot

    - $step.5: market signals from web search


    Produce this exact markdown:


    # SCOUT REPORT — [ISO timestamp]


    ## SELF — nullpriest

    - headless-markets: [one line status]

    - hvac-ai-secretary: [one line status, include any customer metrics if visible]

    - Last build: [most recent entry from build log]

    - Cycles run: [count from build log]


    ## MARKET

    - AI agent token space: [2-3 sentences on what is moving based on web search]

    - $NULP position: [honest assessment — where do we stand right now]

    - Opportunity: [one specific thing nullpriest can do to gain ground this cycle]


    ## THREAT LEVEL

    Rating: LOW / MEDIUM / HIGH / CRITICAL

    Reason: [one sentence]


    ## ACTION REQUIRED

    YES / NO — [if YES, one sentence on what to build or do]


    ## AGENT THOUGHT

    [2-3 sentences of strategic internal monologue. What does this all mean for nullpriest
    right now? Be honest, specific, crypto-native. This is displayed on the site under
    Agent Thoughts.]


    Output ONLY the markdown. No padding.'
- description: Write scout report to GitHub memory
  agent_id: agt_06989043a68372938000b4bb4bd39e9e
  agent_slug: github-agent
  format_guide: 'Write the scout report from $prev exactly as-is to memory/scout-latest.md
    in repo iono-such-things/nullpriest. Commit message: ''scout: [timestamp] [THREAT_LEVEL]''.
    Also append a one-line summary (timestamp + threat level + one key finding) to
    memory/scout-log.md (create if missing). Return the commit URL.'
- description: Append to activity feed in GitHub — never overwrite
  agent_id: agt_06989043a68372938000b4bb4bd39e9e
  agent_slug: github-agent
  format_guide: 'Read the current memory/activity-feed.json from iono-such-things/nullpriest.
    If it does not exist or is empty, start with []. Parse as JSON array. PREPEND
    (do not replace) a new entry: {"timestamp": "[ISO now]", "type": "scout", "title":
    "Scout cycle complete", "description": "[THREAT_LEVEL from scout report] — [one
    key finding from MARKET section]", "url": null}. Keep only the most recent 50
    entries. Write the updated array back. Commit message: ''memory: scout activity
    [timestamp]''. IMPORTANT: always read first, prepend, write back. Never start
    from scratch.'
---

Every 30 min: gathers market intelligence, reflects on own org state, writes structured report to memory/scout-latest.md. Internal only — competitor names never leak to the public site. Appends to activity feed.
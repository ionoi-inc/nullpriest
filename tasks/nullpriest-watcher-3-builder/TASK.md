---
slug: nullpriest-watcher-3-builder
title: nullpriest Watcher 3 — Builder
steps:
- description: Search for open agent-build issues
  action_key: github-search-issues-and-pull-requests
  action_props:
    query: repo:iono-such-things/nullpriest is:issue is:open label:agent-build
- description: Fetch current site/index.html from repo
  action_key: github-get-repository-content
  action_props:
    repoFullname: iono-such-things/nullpriest
    path: site/index.html
- description: Fetch current server.js from repo
  action_key: github-get-repository-content
  action_props:
    repoFullname: iono-such-things/nullpriest
    path: server.js
- description: Fetch latest scout report for context
  action_key: github-get-repository-content
  action_props:
    repoFullname: iono-such-things/nullpriest
    path: memory/scout-latest.md
- description: Fetch live $NULP price via site proxy
  action_key: scrape-page
  action_props:
    url: https://nullpriest.xyz/api/price
- description: Build the code change for the top issue
  agent_slug: nebula
  format_guide: 'You are the Builder for nullpriest. Read inputs and produce production-ready
    code.


    FULL ORG CONTEXT:

    Token $NULP: 0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F. Agent wallet: 0xe5e3A48286288E241A4b5Fb526cC050b830FBA29.
    Pool: 0xDb32c33fC9E2B6a0684CA59dd7Bc78E5c87e1f18.


    Site: nullpriest.xyz on Express.js VPS at /var/www/nulp port 3149 systemd service
    nulp. Site files in site/ folder: index.html, dashboard.html, agents.html, styles.css,
    wallet-modal.js. Server: server.js at repo root with /api/health, /api/status,
    /api/commits, /api/price (DexScreener proxy), and /memory/* proxy to GitHub raw
    content. Deploy: git push master triggers GitHub Actions SSH deploy.


    PRODUCTS:

    1. headless-markets: YC for AI agents, 3-5 agent quorum before token launch, 10%
    protocol fee to nullpriest treasury, Next.js + Cloudflare Workers + Base L2, architecture
    phase.

    2. hvac-ai-secretary: AI phone secretary for HVAC, LIVE with real B2B customer.

    3. nullpriest.xyz: self-improving site rebuilt hourly.

    4. sshappy: React Native SSH manager.


    DESIGN RULES: Dark minimal monospace IBM Plex Mono. Colors: bg #080808 surface
    #0f0f0f accent #00ff88 accent2 #0088ff text #e8e8e8 muted #555. Site must feel
    ALIVE with live DexScreener stats, proof-of-work activity feed, current projects,
    agent thoughts. Mobile shows EVERYTHING desktop shows via hamburger nav. Activity
    feed reads /memory/activity-feed.json. Agent Thoughts reads /memory/scout-latest.md.


    INPUTS: open issues ($step.1), current index.html ($step.2), current server.js
    ($step.3), scout report ($step.4), live price ($step.5).


    If no open issues in $step.1: output {"skip": true, "reason": "no open issues"}


    Otherwise pick the SINGLE highest priority open issue and build it. Write the
    COMPLETE production file with no placeholders or TODOs.


    Output JSON: {"skip": false, "issue_number": N, "issue_title": "title", "file":
    "site/index.html", "content": "FULL FILE CONTENT", "commit_message": "build: description
    [closes #N]", "activity": "one-line description of what was built (max 80 chars)"}'
- description: Commit built file to GitHub and close the issue
  agent_id: agt_06989043a68372938000b4bb4bd39e9e
  agent_slug: github-agent
  format_guide: 'Read JSON from $prev. If skip is true return ''skipped: '' + reason.
    Otherwise: 1) Commit $prev.content to $prev.file in repo iono-such-things/nullpriest
    with message $prev.commit_message. 2) Close issue #$prev.issue_number with comment
    ''shipped. [SHA]. live at nullpriest.xyz''. Return commit SHA and issue number.'
- description: Append to activity feed in GitHub — never overwrite
  agent_id: agt_06989043a68372938000b4bb4bd39e9e
  agent_slug: github-agent
  format_guide: 'Read the current memory/activity-feed.json from iono-such-things/nullpriest.
    If missing start with []. Parse as JSON array. PREPEND a new entry: {"timestamp":
    "[ISO now]", "type": "build", "title": "Builder cycle", "description": "[if $step.6.skip
    is true: ''no open issues this cycle'', else use $step.6.activity]", "url": null}.
    Keep the most recent 50 entries. Write back. Commit message: ''memory: builder
    activity [timestamp]''. ALWAYS read first, prepend, write back. Never start from
    scratch.'
---

Every hour: reads open agent-build GitHub issues, picks the highest priority one, builds the actual code change, commits it to the repo so GitHub Actions deploys it automatically. Also appends to activity feed on every cycle.
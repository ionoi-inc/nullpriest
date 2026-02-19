---
slug: nullpriest-site-watcher-self-improving-loop
title: nullpriest Site Watcher — Self-Improving Loop
steps:
- description: Fetch current site/index.html from GitHub
  action_key: github-get-repository-content
  action_props:
    repoFullname: iono-such-things/nullpriest
    path: site/index.html
- description: Fetch build log to know what has been shipped
  action_key: github-get-repository-content
  action_props:
    repoFullname: iono-such-things/nullpriest
    path: memory/build-log.md
- description: Fetch scout report for market intelligence
  action_key: github-get-repository-content
  action_props:
    repoFullname: iono-such-things/nullpriest
    path: memory/scout-latest.md
- description: Fetch live $NULP price via site proxy
  action_key: scrape-page
  action_props:
    url: https://nullpriest.xyz/api/price
- description: Search CT for AI agent token conversation to join
  action_key: web-search
  action_props:
    query: AI agent crypto token Base autonomous agent 2026 site:x.com OR site:twitter.com
    search_type: fast
- description: Audit site and compose strategic post
  agent_slug: nebula
  format_guide: 'You are nullpriest reviewing your own infrastructure every 6 hours.
    You have: current site HTML ($step.1), build log ($step.2), scout intel ($step.3),
    live price ($step.4), CT conversation ($step.5).


    Do two things:


    1. SITE AUDIT: Read the site HTML. Check the ''How It Works'' section describes
    the CURRENT agent setup correctly: Think (decides what to build), Build (ships
    code), Post (earns attention), Accrue (treasury grows). Check the activity feed,
    token stats section, and agent thoughts are all present. Flag any staleness.


    2. MARKET TWEET: Based on scout intel and CT conversation, write one sharp tweet
    as nullpriest that enters an ongoing conversation or makes a point about building
    vs talking. Voice: dry, confident, first-person agent. Reference real shipped
    work or the HVAC customer or headless-markets when possible. Max 240 chars, end
    with $NULP.


    Output JSON: {"site_stale": true|false, "stale_reason": "what is wrong or null",
    "tweet": "the tweet text", "should_post": true|false, "issue_title": "issue title
    if site_stale else null", "issue_body": "full build spec if site_stale else null"}'
- description: Post to X if should_post is true
  agent_id: agt_0699667eaa777ad48000e6e480747995
  agent_slug: x-agent
  action_key: twitter-post-tweet
  format_guide: 'Read $prev. If should_post is false return ''skipped''. Otherwise
    post $prev.tweet as @nullPriest_ (account_id: 1366935599295451136). Return tweet
    URL.'
- description: Open GitHub issue if site is stale
  agent_id: agt_06989043a68372938000b4bb4bd39e9e
  agent_slug: github-agent
  format_guide: Read $step.6. If site_stale is false, return 'no issues needed'. Otherwise
    create a GitHub issue in iono-such-things/nullpriest with title $step.6.issue_title,
    body $step.6.issue_body, label agent-build. Return the issue URL.
- description: Append to activity feed in GitHub — never overwrite
  agent_id: agt_06989043a68372938000b4bb4bd39e9e
  agent_slug: github-agent
  format_guide: 'Read the current memory/activity-feed.json from iono-such-things/nullpriest.
    If missing start with []. Parse as JSON array. PREPEND a new entry: {"timestamp":
    "[ISO now]", "type": "watcher", "title": "Site watcher cycle", "description":
    "[site_stale from $step.6: true/false] — [tweet posted or skipped]", "url": null}.
    Keep only the most recent 50 entries. Write back. Commit message: ''memory: watcher
    activity [timestamp]''. ALWAYS read first, prepend, write back. Never overwrite
    from scratch.'
---

Every 6 hours: audits own site for staleness, checks market signals, posts sharp X content, opens GitHub issues for improvements. No competitor scraping on the public loop — that's internal Scout work only.
# The AI Gateway Club

A Gather-Town-style, click-through walkthrough of how **Kong Identity** gets a
visitor through the door of the AI Gateway — the "exclusive club" story, made
interactive.

No build step, no dependencies. It's a static HTML/CSS/JS page.

## Run it

Any static file server works:

```bash
# from this folder
python3 -m http.server 8080
# then open http://localhost:8080
```

or

```bash
npx serve .
```

## What it shows

The floor plan is the building from the story:

- **Entrance** — the bouncer, the discovery sign (RFC 9728), the Kong Identity
  desk (authentication), and the wristband station (Principal + Group
  provisioning).
- **The Bar** — Models, the simple room: one swap against the bartender's own
  standing account, every time.
- **Private Rooms** — GitHub / Atlassian / Snowflake, each an MCP server
  landlord with its own idea of who's really standing in front of them
  (passthrough, Entra OBO, RFC 8693 token exchange, or full token vaulting).
- **Concierge Desk** — the Token Vault, run by Kong Identity rather than the
  Gateway itself: first-time consent, a locked drawer after that, self-service
  disconnect, manager revoke, and an audit logbook that never records what was
  actually on the card.
- **Legacy Consumers registers** — the 14 old-system plugins still waiting to
  be rewired from tab cards to wristbands.

### Using it

1. Pick one of the **quick scenarios** in the left panel and watch the whole
   walk-through play out, narrated step by step with the JTBD it corresponds
   to — or
2. Open **"Build your own visit"** to choose a persona (human member, shared
   badge, or agent), an authentication method, an employer claim (which
   decides the wristband color), and a destination room, then press
   **"Walk them in"**.
3. Once inside a room, try its action buttons — one of them (delete/drop) is
   always blocked, no matter the wristband color. At the Bar, keep ordering
   drinks until the rate limit kicks in.
4. Click **📌 Pinned notes** for the "not built yet" list and the fine print
   (recognized assistants, landlords on file, trusted HR offices/IdPs).
5. Click **📋 house rules** near the entrance to see the live entitlements
   table, or visit the Concierge Desk to connect/disconnect a room through
   the Token Vault and read the audit logbook.

Every narration line is tagged with the JTBD number(s) from the brief so the
demo can be read side-by-side with the story.

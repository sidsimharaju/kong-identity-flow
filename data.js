/* ============================================================
   data.js — the story, encoded.
   Every catalog here maps 1:1 to a chapter/JTBD in the brief.
   ============================================================ */

// ---- Chapter 8: the fine print behind the bar -------------------------
const AGENTS = {
  claude_code: { label: "Claude Code", supportsIdJag: true,  note: "Best-supported — works with every door style." },
  copilot:     { label: "GitHub Copilot / VS Code", supportsIdJag: false, note: "Needs the gateway to broker ID-JAG or use CIMD." },
  cursor:      { label: "Cursor", supportsIdJag: false, note: "Needs the gateway to broker ID-JAG or use CIMD." },
  insomnia:    { label: "Insomnia", supportsIdJag: false, note: "Needs the gateway to broker ID-JAG or use CIMD." },
  ms_hosted:   { label: "Microsoft hosted agent", supportsIdJag: false, note: "Hosted assistant; relies on brokered hall pass." },
  aws_hosted:  { label: "AWS hosted agent", supportsIdJag: false, note: "Hosted assistant; relies on brokered hall pass." },
  google_hosted:{ label: "Google hosted agent", supportsIdJag: false, note: "Hosted assistant; relies on brokered hall pass." },
};

const LANDLORDS = {
  github:    { label: "GitHub",            doorStyle: "oauth",  room: "github" },
  atlassian: { label: "Atlassian (API + Rovo)", doorStyle: "oauth", room: "atlassian" },
  snowflake: { label: "Snowflake",         doorStyle: "oauth",  room: "snowflake" },
  google:    { label: "Google",            doorStyle: "oauth",  room: null },
  figma:     { label: "Figma",             doorStyle: "oauth",  room: null },
  databricks:{ label: "Databricks",        doorStyle: "oauth",  room: null },
};

const TRUSTED_IDPS = {
  kong_identity: "Kong Identity",
  okta: "Okta",
  cognito: "AWS Cognito",
  ping: "Ping",
  keycloak: "Keycloak",
  auth0: "Auth0",
};

// ---- Chapter 1: personas & doors ---------------------------------------
const PERSONAS = {
  human:  { label: "Human member", icon: "🧑", blurb: "Walks in themselves." },
  shared: { label: "Shared badge (3 roommates)", icon: "👥", blurb: "One badge, three roommates — the manager allows it but rolls her eyes (discouraged)." },
  agent:  { label: "Agent (Claude Code, Cursor, …)", icon: "🤖", blurb: "A personal assistant sent ahead — either as itself, or on behalf of a member." },
};

// Auth methods. `personas` = which personas can use it.
// `agentModes` further restricts to 'self' and/or 'onbehalf' when persona === 'agent'.
const AUTH_METHODS = {
  virtual_key: {
    label: "Virtual key (laminated card)",
    jtbd: "JTBD-4, 6, 7",
    personas: ["human", "shared", "agent"],
    agentModes: ["self"],
    blurb: "The manager printed this once. She can revoke and reissue it, but never has to remember what's actually written on it.",
  },
  oidc: {
    label: "Corporate OIDC token (phone call to HR)",
    jtbd: "JTBD-9",
    personas: ["human"],
    agentModes: [],
    blurb: "You flash your employer's OIDC token; the bouncer verifies it's real with your own HR desk.",
  },
  id_jag: {
    label: "ID-JAG hall pass",
    jtbd: "JTBD-10",
    personas: ["agent"],
    agentModes: ["onbehalf"],
    requiresIdJagSupport: true,
    blurb: "A signed hall pass from your employer naming both you and your assistant at once.",
  },
  brokered_id_jag: {
    label: "Gateway-brokered ID-JAG",
    jtbd: "JTBD-13, 14",
    personas: ["agent"],
    agentModes: ["onbehalf"],
    blurb: "This assistant never learned the secret handshake, so the bouncer negotiates the hall pass with your employer on its behalf.",
  },
  cimd: {
    label: "CIMD self-registration (business card URL)",
    jtbd: "JTBD-12",
    personas: ["agent"],
    agentModes: ["self", "onbehalf"],
    blurb: "The assistant hands over a business card with a URL; the bouncer looks it up on the spot instead of requiring pre-registration.",
  },
  unknown: {
    label: "I don't know which door to use…",
    jtbd: "JTBD-8",
    personas: ["human", "shared", "agent"],
    agentModes: ["self", "onbehalf"],
    blurb: "A sign by the entrance points to exactly which office issues the right paperwork (RFC 9728 discovery redirect).",
  },
};

// ---- Chapter 2/3: wristbands & house rules -----------------------------
const CLAIM_TO_COLOR = {
  engineering: { color: "blue", hex: "#3b82f6" },
  payments:    { color: "gold", hex: "#d4a72c" },
};

const ENTITLEMENTS = {
  blue: { rooms: ["bar", "github", "atlassian"], drinkBudget: 5, spendBudget: 50 },
  gold: { rooms: ["bar", "github", "atlassian", "snowflake"], drinkBudget: 10, spendBudget: 150 },
};

// ---- Chapter 5: private-room handoff ladders ---------------------------
const OAUTH_HANDOFFS = {
  passthrough: { label: "Passthrough", jtbd: "Ch.5 §1", blurb: "The landlord already trusts your employer's exact ID — your original card is waved through unchanged." },
  obo:         { label: "Entra On-Behalf-Of", jtbd: "Ch.5 §2", blurb: "A Microsoft-specific side door: the doorman swaps your card for a narrower one, on the spot." },
  token_exchange: { label: "RFC 8693 token exchange", jtbd: "Ch.5 §3", blurb: "The general-purpose version of the same swap, for any landlord speaking the standard exchange protocol." },
  vaulting:    { label: "Token vaulting (separate OAuth)", jtbd: "Ch.6", blurb: "The landlord runs its own membership system entirely. This is the hard case — it needs the Concierge Desk." },
};

const APIKEY_HANDOFFS = {
  key_passthrough: { label: "Key passthrough", blurb: "Your key goes straight through." },
  shared_master_key: { label: "Shared master key", blurb: "The room shares one master key among everyone the club vouches for." },
  per_color_master_key: { label: "Per-wristband-color master key", blurb: "One master key per wristband color." },
};

// ---- Chapter 6: legacy plugin migration board --------------------------
const LEGACY_REGISTERS = [
  "Cash Till", "Loyalty Tracker", "Fraud-Alert Light",
  "Receipt Printer 1", "Receipt Printer 2", "Receipt Printer 3", "Receipt Printer 4",
  "Receipt Printer 5", "Receipt Printer 6", "Receipt Printer 7", "Receipt Printer 8",
  "VIP List", "Happy Hour Board", "Manager's Ledger",
];

// ---- Chapter 7: what the club isn't promising yet -----------------------
const NOT_BUILT_YET = [
  "Conditional house rules that change behavior mid-visit.",
  "Introductions between two rooms run by fellow club members (Agent-to-Agent) — out of scope.",
  "Automatic wristband roster sync with your employer's HR system (no SCIM sync) — wristbands are only ever made the moment you first show up.",
  "Running any of this at a location that isn't her own building (no self-hosted gateway support) — Principals only exist inside her club.",
];

const ROOMS = {
  bar:        { label: "The Bar (Models)", icon: "🍸" },
  github:     { label: "GitHub Room", icon: "🐙" },
  atlassian:  { label: "Atlassian Room", icon: "🗂️" },
  snowflake:  { label: "Snowflake Room", icon: "❄️" },
};

// ---- Scenario presets ----------------------------------------------------
const SCENARIOS = [
  {
    id: "human-bar",
    title: "Human member grabs a drink",
    desc: "A human member badges in with an OIDC token and orders at the Bar.",
    config: { persona: "human", authMethod: "oidc", idp: "okta", employerClaim: "engineering", destination: "bar" },
  },
  {
    id: "human-github-vault",
    title: "Human, first-time GitHub connect",
    desc: "A human member uses their virtual key, then connects GitHub through the Token Vault for the first time.",
    config: { persona: "human", authMethod: "virtual_key", employerClaim: "engineering", destination: "github", handoff: "vaulting", forceFirstConnect: true },
  },
  {
    id: "shared-snowflake",
    title: "Shared badge reaches for Snowflake",
    desc: "One of three roommates uses the shared badge and a gold (payments) wristband to reach Snowflake.",
    config: { persona: "shared", authMethod: "virtual_key", employerClaim: "payments", destination: "snowflake", handoff: "token_exchange" },
  },
  {
    id: "agent-onbehalf-idjag",
    title: "Claude Code, sent on your behalf",
    desc: "Claude Code carries a signed ID-JAG hall pass naming both member and agent, straight into the GitHub room.",
    config: { persona: "agent", agentId: "claude_code", agentMode: "onbehalf", authMethod: "id_jag", employerClaim: "engineering", destination: "github", handoff: "passthrough" },
  },
  {
    id: "agent-brokered",
    title: "Cursor, brokered hall pass",
    desc: "Cursor doesn't speak ID-JAG itself, so the gateway negotiates one on its behalf into the Atlassian room.",
    config: { persona: "agent", agentId: "cursor", agentMode: "onbehalf", authMethod: "brokered_id_jag", employerClaim: "engineering", destination: "atlassian", handoff: "obo" },
  },
  {
    id: "unknown-visitor",
    title: "A stranger who doesn't know the door",
    desc: "Someone wanders in with no idea which office issues the right paperwork — the discovery sign redirects them.",
    config: { persona: "human", authMethod: "unknown", employerClaim: "engineering", destination: "bar" },
  },
];

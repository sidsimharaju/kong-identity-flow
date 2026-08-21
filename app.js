/* ============================================================
   app.js — wiring, state machine, and the walk-through animation.
   ============================================================ */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Stage coordinates (must line up with the room boxes in styles.css)
const WAYPOINTS = {
  start:      { x: 75,   y: 460 },
  sign:       { x: 190,  y: 55  },
  desk:       { x: 300,  y: 325 },
  wristband:  { x: 300,  y: 500 },
  bar:        { x: 685,  y: 230 },
  github:     { x: 1030, y: 135 },
  atlassian:  { x: 1250, y: 135 },
  snowflake:  { x: 1470, y: 135 },
  vault:      { x: 685,  y: 570 },
  legacy:     { x: 1250, y: 680 },
};

const state = {
  persona: "human",
  agentId: "claude_code",
  agentMode: "onbehalf",
  authMethod: "virtual_key",
  idp: "okta",
  employerClaim: "engineering",
  destination: "bar",
  handoff: "passthrough",
  wristbandColor: null,
  budgetUsed: 0,
  vaultConnections: { github: false, atlassian: false, snowflake: false },
  auditLog: [],
  roomUnlocked: { bar: false, github: false, atlassian: false, snowflake: false },
  currentRoom: null,
  legacyMigrated: 0,
  running: false,
};

// ---------------- DOM shortcuts ----------------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const el = {
  avatar: $("#avatar"),
  log: $("#log"),
  statusbar: $("#statusbar"),
  wristbandChip: $("#wristband-chip"),
  btnGo: $("#btn-go"),
  scenarioList: $("#scenario-list"),
  personaList: $("#persona-list"),
  agentExtra: $("#agent-extra"),
  agentId: $("#agent-id"),
  agentMode: $("#agent-mode"),
  authMethod: $("#auth-method"),
  authBlurb: $("#auth-blurb"),
  idpField: $("#idp-field"),
  idp: $("#idp"),
  claimPicker: $("#claim-picker"),
  destinationList: $("#destination-list"),
  handoffField: $("#handoff-field"),
  handoff: $("#handoff"),
  handoffBlurb: $("#handoff-blurb"),
  barActions: $("#bar-actions"),
  barBudgetFill: $("#bar-budget-fill"),
  barBudgetText: $("#bar-budget-text"),
  btnOrderDrink: $("#btn-order-drink"),
  vaultDrawer: $("#vault-drawer"),
  legacyGrid: $("#legacy-grid"),
  btnMigrate: $("#btn-migrate"),
  modalBackdrop: $("#modal-backdrop"),
  modalBody: $("#modal-body"),
};

// ---------------- small helpers ----------------
function addLog(text, type = "", jtbd = "") {
  const li = document.createElement("li");
  if (type) li.className = type;
  li.innerHTML = `${text}${jtbd ? ` <span class="jtbd">${jtbd}</span>` : ""}`;
  el.log.appendChild(li);
  li.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function setStatus(text) {
  el.statusbar.textContent = text;
}

function moveAvatar(pointKey) {
  const p = WAYPOINTS[pointKey];
  el.avatar.style.left = p.x - 15 + "px";
  el.avatar.style.top = p.y - 15 + "px";
  return sleep(750);
}

function openModal(html) {
  el.modalBody.innerHTML = html;
  el.modalBackdrop.classList.add("open");
}
function closeModal() {
  el.modalBackdrop.classList.remove("open");
}
$("#modal-close").onclick = closeModal;
el.modalBackdrop.addEventListener("click", (e) => { if (e.target === el.modalBackdrop) closeModal(); });

// ================================================================
// Render: static option lists
// ================================================================
function renderScenarios() {
  el.scenarioList.innerHTML = "";
  SCENARIOS.forEach((s) => {
    const div = document.createElement("div");
    div.className = "scenario-card";
    div.innerHTML = `<b>${s.title}</b><span>${s.desc}</span>`;
    div.onclick = () => applyScenario(s);
    el.scenarioList.appendChild(div);
  });
}

function renderPersonaList() {
  el.personaList.innerHTML = "";
  Object.entries(PERSONAS).forEach(([key, def]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "option-btn" + (state.persona === key ? " selected" : "");
    b.innerHTML = `<span class="oi">${def.icon}</span>${def.label}`;
    b.title = def.blurb;
    b.onclick = () => { state.persona = key; onPersonaChanged(); };
    el.personaList.appendChild(b);
  });
  el.agentExtra.hidden = state.persona !== "agent";
}

function renderAgentControls() {
  el.agentId.innerHTML = Object.entries(AGENTS).map(([k, d]) =>
    `<option value="${k}" ${state.agentId === k ? "selected" : ""}>${d.label}${d.supportsIdJag ? "" : " (no native ID-JAG)"}</option>`
  ).join("");
  $$("#agent-mode button").forEach((b) => {
    b.classList.toggle("selected", b.dataset.mode === state.agentMode);
    b.onclick = () => { state.agentMode = b.dataset.mode; onAgentModeChanged(); };
  });
  el.agentId.onchange = () => { state.agentId = el.agentId.value; renderAuthMethodOptions(); };
}

function getAuthMethodEntries() {
  return Object.entries(AUTH_METHODS).map(([key, def]) => {
    let enabled = def.personas.includes(state.persona);
    let reason = "";
    if (enabled && state.persona === "agent") {
      enabled = def.agentModes.includes(state.agentMode);
      if (!enabled) reason = state.agentMode === "self" ? "only available when sent by a member" : "only available when representing itself";
    }
    if (enabled && def.requiresIdJagSupport) {
      const supports = AGENTS[state.agentId]?.supportsIdJag;
      if (!supports) { enabled = false; reason = `${AGENTS[state.agentId]?.label} doesn't speak ID-JAG itself`; }
    }
    return { key, def, enabled, reason };
  });
}

function renderAuthMethodOptions() {
  const entries = getAuthMethodEntries();
  if (!entries.find((e) => e.key === state.authMethod && e.enabled)) {
    const firstEnabled = entries.find((e) => e.enabled);
    state.authMethod = firstEnabled ? firstEnabled.key : entries[0].key;
  }
  el.authMethod.innerHTML = entries.map((e) =>
    `<option value="${e.key}" ${!e.enabled ? "disabled" : ""} ${state.authMethod === e.key ? "selected" : ""}>${e.def.label}${!e.enabled ? " — " + e.reason : ""}</option>`
  ).join("");
  el.authMethod.onchange = () => { state.authMethod = el.authMethod.value; onAuthMethodChanged(); };
  onAuthMethodChanged();
}

function onAuthMethodChanged() {
  const def = AUTH_METHODS[state.authMethod];
  el.authBlurb.innerHTML = `${def.blurb} <span class="tag">${def.jtbd}</span>`;
  el.idpField.hidden = state.authMethod !== "oidc";
}

function renderIdpSelect() {
  el.idp.innerHTML = Object.entries(TRUSTED_IDPS).map(([k, label]) =>
    `<option value="${k}" ${state.idp === k ? "selected" : ""}>${label}</option>`
  ).join("");
  el.idp.onchange = () => { state.idp = el.idp.value; };
}

function renderClaimPicker() {
  $$("#claim-picker button").forEach((b) => {
    b.classList.toggle("selected", b.dataset.claim === state.employerClaim);
    b.onclick = () => { state.employerClaim = b.dataset.claim; renderClaimPicker(); };
  });
}

function renderDestinationList() {
  el.destinationList.innerHTML = "";
  Object.entries(ROOMS).forEach(([key, def]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "option-btn" + (state.destination === key ? " selected" : "");
    b.innerHTML = `<span class="oi">${def.icon}</span>${def.label}`;
    b.onclick = () => { state.destination = key; onDestinationChanged(); };
    el.destinationList.appendChild(b);
  });
  el.handoffField.hidden = state.destination === "bar";
}

function onDestinationChanged() {
  renderDestinationList();
  if (state.destination !== "bar") renderHandoffOptions();
}

function renderHandoffOptions() {
  // All three interactive private rooms in this demo speak OAuth.
  const entries = Object.entries(OAUTH_HANDOFFS);
  if (!OAUTH_HANDOFFS[state.handoff]) state.handoff = "passthrough";
  el.handoff.innerHTML = entries.map(([k, d]) =>
    `<option value="${k}" ${state.handoff === k ? "selected" : ""}>${d.label}</option>`
  ).join("");
  el.handoff.onchange = () => { state.handoff = el.handoff.value; onHandoffChanged(); };
  onHandoffChanged();
}
function onHandoffChanged() {
  const d = OAUTH_HANDOFFS[state.handoff];
  el.handoffBlurb.innerHTML = `${d.blurb} <span class="tag">${d.jtbd}</span>`;
}

function onPersonaChanged() {
  renderPersonaList();
  renderAgentControls();
  renderAuthMethodOptions();
}
function onAgentModeChanged() { renderAgentControls(); renderAuthMethodOptions(); }

function renderVaultDrawer() {
  Object.keys(state.vaultConnections).forEach((landlord) => {
    const elC = document.getElementById(`conn-${landlord}`);
    const connected = state.vaultConnections[landlord];
    elC.textContent = connected ? "connected ✓" : "not connected";
    elC.classList.toggle("connected", connected);
  });
}

function renderLegacyGrid() {
  el.legacyGrid.innerHTML = "";
  LEGACY_REGISTERS.forEach((name, i) => {
    const div = document.createElement("div");
    div.className = "legacy-item" + (i < state.legacyMigrated ? " migrated" : "");
    div.textContent = name;
    el.legacyGrid.appendChild(div);
  });
  el.btnMigrate.disabled = state.legacyMigrated >= LEGACY_REGISTERS.length;
  el.btnMigrate.textContent = el.btnMigrate.disabled ? "All 14 registers rewired ✓" : "Rewire one register →";
}

// ================================================================
// The walk-through
// ================================================================
function personaWalkInLine() {
  if (state.persona === "human") return "A human member walks up to the door.";
  if (state.persona === "shared") return "One of three roommates walks up, badge in hand — the shared one.";
  const agent = AGENTS[state.agentId].label;
  return state.agentMode === "self"
    ? `${agent} shows up representing itself.`
    : `${agent} shows up, sent ahead by a member to run an errand.`;
}

async function runFlow() {
  if (state.running) return;
  state.running = true;
  el.btnGo.disabled = true;
  el.log.innerHTML = "";
  state.budgetUsed = 0;
  $$(".private-room").forEach((r) => r.classList.remove("highlight"));
  el.wristbandChip.className = "wristband-chip";
  el.wristbandChip.textContent = "—";

  try {
    await moveAvatar("start");
    addLog(`<b>${personaWalkInLine()}</b>`);
    await sleep(300);

    // ---- Chapter 1: the door ----
    let effectiveMethod = state.authMethod;
    if (effectiveMethod === "unknown") {
      await moveAvatar("sign");
      addLog("They don't know which door to use — a sign by the entrance points to exactly which office issues the right paperwork.", "warn", "JTBD-8 (RFC 9728 discovery)");
      await sleep(600);
      effectiveMethod = state.persona === "agent" ? "cimd" : "virtual_key";
      addLog(`They come back a moment later with the right paperwork: <b>${AUTH_METHODS[effectiveMethod].label}</b>.`);
    }

    await moveAvatar("desk");
    const methodDef = AUTH_METHODS[effectiveMethod];
    addLog(`Kong Identity checks their credential at the door: ${methodDef.blurb}`, "", methodDef.jtbd);

    if (state.persona === "shared") {
      addLog("The manager allows the shared badge in, but notes: if anything goes wrong tonight, nobody can say which roommate did it.", "warn", "JTBD-3 (discouraged)");
    }
    if (effectiveMethod === "brokered_id_jag") {
      addLog("This assistant never learned the secret handshake — the bouncer radios the member's employer and negotiates the hall pass on the assistant's behalf.", "", "JTBD-13/14");
    }
    if (effectiveMethod === "id_jag") {
      addLog("The hall pass names both the member and the assistant at once — one paper, two identities.", "", "JTBD-10");
    }
    if (effectiveMethod === "oidc") {
      addLog(`The bouncer phones ${TRUSTED_IDPS[state.idp]} to confirm the token is real.`, "", "JTBD-9");
    }
    addLog("Door check passed ✅ — Kong Identity radios the membership office.", "ok");
    await sleep(400);

    // ---- Chapter 2: the wristband ----
    await moveAvatar("wristband");
    const claimInfo = CLAIM_TO_COLOR[state.employerClaim];
    state.wristbandColor = claimInfo.color;
    el.wristbandChip.textContent = claimInfo.color.toUpperCase();
    el.wristbandChip.className = "wristband-chip " + claimInfo.color;
    addLog(`A <b>${claimInfo.color}</b> wristband snaps on — a durable Principal record, created automatically the moment they were first seen (JIT-provisioned). The color came straight from the "${state.employerClaim}" claim their employer's ID already carried — nobody sorted them manually.`, "ok", "JTBD-15, 16");
    await sleep(400);

    // ---- Chapter 3: house rules ----
    const ent = ENTITLEMENTS[state.wristbandColor];
    const destLabel = ROOMS[state.destination].label;
    if (!ent.rooms.includes(state.destination)) {
      addLog(`House rules: a ${state.wristbandColor} wristband can't get into ${destLabel} tonight. Turned away at the desk.`, "deny", "JTBD-17");
      setStatus(`Denied — ${state.wristbandColor} wristbands aren't entitled to ${destLabel}.`);
      return;
    }
    addLog(`House rules checked: ${state.wristbandColor} wristbands may enter ${ent.rooms.map((r) => ROOMS[r].label).join(", ")} tonight, up to ${ent.drinkBudget} drinks / $${ent.spendBudget}.`, "", "JTBD-17, 20, 21");

    // ---- Chapter 4/5: the room ----
    if (state.destination === "bar") {
      await moveAvatar("bar");
      addLog("The bartender doesn't hand your ID to the distributor — he's got his own standing account. Which bottle he pours, and which account he bills, depends only on the wristband color.", "ok", "JTBD-24, 25, 26");
      state.roomUnlocked.bar = true;
      updateBarUI();
      setStatus(`In the Bar — ${state.wristbandColor} wristband, budget ${ent.drinkBudget} drinks.`);
    } else {
      if (state.handoff === "vaulting") {
        await moveAvatar("vault");
        const landlordLabel = LANDLORDS[state.destination].label;
        if (!state.vaultConnections[state.destination]) {
          addLog(`No card on file yet with ${landlordLabel}. The concierge hands you a slip: go introduce yourself once, directly.`, "warn", "JTBD-27");
          const ok = await consentFlow(landlordLabel, state.destination);
          if (!ok) {
            addLog(`They declined the one-time introduction — no card filed, no entry.`, "deny");
            setStatus("Visit ended — vault connection declined.");
            return;
          }
          state.vaultConnections[state.destination] = true;
          logAudit(state.destination, "card issued (first-time consent)");
          renderVaultDrawer();
          addLog(`Card filed in the locked drawer — encrypted, never shown to the assistant or the bar staff, refreshed automatically before it expires.`, "ok", "JTBD-27, 28");
        } else {
          addLog(`The concierge quietly reaches into the drawer and pulls the ${landlordLabel} card. You never see it.`, "ok", "JTBD-28");
          logAudit(state.destination, "card handed to room (silent)");
        }
      }

      await moveAvatar(state.destination);
      document.querySelector(`.private-room[data-room="${state.destination}"]`).classList.add("highlight");

      if (state.handoff === "vaulting") {
        addLog(`The concierge hands the ${landlordLabelOf(state.destination)} doorman the card she just pulled.`, "ok");
      } else {
        const hDef = OAUTH_HANDOFFS[state.handoff];
        addLog(`At the ${landlordLabelOf(state.destination)} door: ${hDef.blurb}`, "", hDef.jtbd);
      }

      state.roomUnlocked[state.destination] = true;
      state.currentRoom = state.destination;
      addLog(`Inside the ${destLabel} — try an action below (one of them is always off-limits, no matter the wristband).`, "ok");
      setStatus(`In the ${destLabel} — ${state.wristbandColor} wristband.`);
    }
  } finally {
    state.running = false;
    el.btnGo.disabled = false;
  }
}

function landlordLabelOf(room) { return LANDLORDS[room]?.label || ROOMS[room].label; }

function updateBarUI() {
  const ent = ENTITLEMENTS[state.wristbandColor];
  el.btnOrderDrink.disabled = !state.roomUnlocked.bar || !ent;
  if (!state.roomUnlocked.bar || !ent) {
    el.barBudgetText.textContent = "no wristband yet";
    el.barBudgetFill.style.width = "0%";
    return;
  }
  el.barBudgetText.textContent = `${state.budgetUsed} of ${ent.drinkBudget} drinks ordered tonight`;
  el.barBudgetFill.style.width = `${(state.budgetUsed / ent.drinkBudget) * 100}%`;
  el.barBudgetFill.style.background = state.budgetUsed >= ent.drinkBudget ? "var(--danger)" : "var(--ok)";
}

el.btnOrderDrink.onclick = () => {
  const ent = ENTITLEMENTS[state.wristbandColor];
  if (!ent || state.budgetUsed >= ent.drinkBudget) {
    addLog("Rate limit hit — one overexcited guest (or a runaway assistant on autopilot) can't drink the whole bar dry.", "deny", "JTBD-20, 21");
    el.btnOrderDrink.classList.add("flash-deny");
    setTimeout(() => el.btnOrderDrink.classList.remove("flash-deny"), 600);
    return;
  }
  state.budgetUsed++;
  updateBarUI();
  addLog(`Drink #${state.budgetUsed} poured — swapped against the bartender's own standing account.`, "ok", "JTBD-24");
};

// ---- private room tool buttons ----
$$(".tool-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const room = btn.closest(".private-room").dataset.room;
    if (!state.roomUnlocked[room] || state.currentRoom !== room) {
      addLog(`You haven't been let into the ${ROOMS[room].label} yet — walk them in first.`, "warn");
      return;
    }
    if (btn.dataset.tool === "delete_files") {
      btn.classList.add("flash-deny");
      addLog(`The "${btn.textContent}" lever is taped over — nobody touches it, no matter their wristband color.`, "deny", "JTBD-18, 19 (CEL tool ACL)");
      setTimeout(() => btn.classList.remove("flash-deny"), 600);
    } else {
      btn.classList.add("flash-ok");
      addLog(`"${btn.textContent}" allowed in the ${ROOMS[room].label} — within the ${state.wristbandColor} wristband's entitlements.`, "ok");
      setTimeout(() => btn.classList.remove("flash-ok"), 600);
    }
  });
});

// ================================================================
// Token Vault — consent, disconnect, revoke, audit
// ================================================================
function consentFlow(landlordLabel, room) {
  return new Promise((resolve) => {
    openModal(`
      <h3>Connect with ${landlordLabel}</h3>
      <p>You're leaving the club's own login for a moment — this is a real consent screen with ${landlordLabel} itself, not Kong Identity.</p>
      <p style="background:#f6f6fb;border-radius:8px;padding:10px;font-size:13px;">"Kong AI Gateway would like to access your ${landlordLabel} account on your behalf. <b>Authorize</b> or <b>Cancel</b>?"</p>
      <div style="display:flex;gap:8px;margin-top:16px;">
        <button class="btn btn-primary" id="consent-yes">Authorize</button>
        <button class="btn" id="consent-no">Cancel</button>
      </div>
    `);
    $("#consent-yes").onclick = () => { closeModal(); resolve(true); };
    $("#consent-no").onclick = () => { closeModal(); resolve(false); };
  });
}

function logAudit(landlord, action) {
  state.auditLog.push({
    time: new Date().toLocaleTimeString(),
    principal: `${PERSONAS[state.persona].label}${state.wristbandColor ? " (" + state.wristbandColor + ")" : ""}`,
    landlord: LANDLORDS[landlord]?.label || landlord,
    action,
  });
}

$("#btn-disconnect").onclick = () => {
  const rows = Object.entries(state.vaultConnections)
    .filter(([, v]) => v)
    .map(([k]) => `<li>${LANDLORDS[k].label} <button class="btn btn-small" data-disc="${k}">Disconnect</button></li>`)
    .join("") || "<li>No landlords connected right now.</li>";
  openModal(`<h3>Self-service disconnect</h3><p>Ask the concierge what you've connected, and take a card out of the drawer yourself.</p><ul style="list-style:none;padding:0;display:flex;flex-direction:column;gap:8px;">${rows}</ul>`);
  $$("[data-disc]").forEach((b) => b.onclick = () => {
    const k = b.dataset.disc;
    state.vaultConnections[k] = false;
    logAudit(k, "disconnected by member (self-service)");
    renderVaultDrawer();
    closeModal();
    addLog(`Self-service: the ${LANDLORDS[k].label} card was pulled from the drawer at the member's own request.`, "warn", "JTBD-37");
  });
};

$("#btn-admin-revoke").onclick = () => {
  const rows = Object.entries(state.vaultConnections)
    .filter(([, v]) => v)
    .map(([k]) => `<li>${LANDLORDS[k].label} <button class="btn btn-small btn-warn" data-rev="${k}">Revoke</button></li>`)
    .join("") || "<li>Nothing to revoke right now.</li>";
  openModal(`<h3>Manager: revoke a card</h3><p>The manager can pull a member's card out of the drawer herself, if she needs to.</p><ul style="list-style:none;padding:0;display:flex;flex-direction:column;gap:8px;">${rows}</ul>`);
  $$("[data-rev]").forEach((b) => b.onclick = () => {
    const k = b.dataset.rev;
    state.vaultConnections[k] = false;
    logAudit(k, "revoked by manager");
    renderVaultDrawer();
    closeModal();
    addLog(`The manager revoked the ${LANDLORDS[k].label} card herself.`, "warn", "JTBD-44");
  });
};

$("#btn-audit").onclick = () => {
  const rows = state.auditLog.map((e) => `<tr><td>${e.time}</td><td>${e.principal}</td><td>${e.landlord}</td><td>${e.action}</td></tr>`).join("");
  openModal(`
    <h3>Concierge audit logbook</h3>
    <p>Who, which landlord, when — but never what was actually on the card. That's the compliance officer's best friend. <span class="tag">JTBD-45</span></p>
    <table><tr><th>Time</th><th>Who</th><th>Landlord</th><th>Action</th></tr>${rows || '<tr><td colspan="4">No entries yet — connect to a room through the Token Vault to see one.</td></tr>'}</table>
  `);
};

$("#btn-migrate").onclick = () => {
  if (state.legacyMigrated < LEGACY_REGISTERS.length) {
    state.legacyMigrated++;
    renderLegacyGrid();
    if (state.legacyMigrated === LEGACY_REGISTERS.length) {
      addLog("All 14 legacy Consumers registers are rewired to read wristbands instead of tab cards. End-to-end, done.", "ok", "JTBD-22, 23");
    }
  }
};

// ================================================================
// Bulletin boards / info modals
// ================================================================
$("#sign").onclick = () => {
  openModal(`
    <h3>🪧 Discovery sign</h3>
    <p>When a stranger wanders up without knowing which door to use at all, this sign tells them exactly which office issues the right paperwork — instead of leaving them guessing.</p>
    <p class="blurb">This is the RFC 9728 protected-resource metadata redirect. <span class="tag">JTBD-8</span></p>
  `);
};

$("#policy-board").onclick = () => {
  openModal(`
    <h3>📋 House rules</h3>
    <table>
      <tr><th>Wristband</th><th>Rooms</th><th>Drink budget</th><th>Spend cap</th></tr>
      ${Object.entries(ENTITLEMENTS).map(([color, e]) => `
        <tr ${state.wristbandColor === color ? 'style="background:#eef0ff"' : ""}>
          <td>${color}</td>
          <td>${e.rooms.map((r) => ROOMS[r].label).join(", ")}</td>
          <td>${e.drinkBudget}</td>
          <td>$${e.spendBudget}</td>
        </tr>`).join("")}
    </table>
    <p class="blurb" style="margin-top:12px;">Even inside a room, one specific action — deleting/dropping things — is off-limits for every wristband color, no exceptions. <span class="tag">JTBD-18, 19</span></p>
    <p class="blurb">Budgets and rate limits exist so one guest, or a runaway agent on autopilot, can't drink the bar dry or run up an infinite tab. <span class="tag">JTBD-20, 21</span></p>
  `);
};

$("#btn-notes").onclick = () => {
  openModal(`
    <h3>📌 Pinned notes</h3>
    <h4>What the club isn't promising yet</h4>
    <ul>${NOT_BUILT_YET.map((t) => `<li>${t}</li>`).join("")}</ul>
    <h4>Assistants the club recognizes</h4>
    <ul>${Object.values(AGENTS).map((a) => `<li><b>${a.label}</b> — ${a.note}</li>`).join("")}</ul>
    <h4>Landlords on file</h4>
    <ul>${Object.values(LANDLORDS).map((l) => `<li><b>${l.label}</b> — door style: ${l.doorStyle}</li>`).join("")}</ul>
    <h4>HR offices the club accepts a call from</h4>
    <ul>${Object.values(TRUSTED_IDPS).map((v) => `<li>${v}</li>`).join("")}</ul>
    <p class="blurb">To-do: 14 legacy Consumers registers still need rewiring — see the board at the bottom right of the floor. <span class="tag">JTBD-22, 23</span></p>
  `);
};

// ================================================================
// Scenario application & wiring
// ================================================================
function applyScenario(scenario) {
  const c = scenario.config;
  Object.assign(state, {
    persona: c.persona,
    agentId: c.agentId || state.agentId,
    agentMode: c.agentMode || state.agentMode,
    authMethod: c.authMethod,
    idp: c.idp || state.idp,
    employerClaim: c.employerClaim,
    destination: c.destination,
    handoff: c.handoff || state.handoff,
  });
  if (c.forceFirstConnect) state.vaultConnections[c.destination] = false;

  renderAll();
  setStatus(`Running: ${scenario.title}`);
  runFlow();
}

function renderAll() {
  renderPersonaList();
  renderAgentControls();
  renderAuthMethodOptions();
  renderIdpSelect();
  renderClaimPicker();
  renderDestinationList();
  if (state.destination !== "bar") renderHandoffOptions();
  renderVaultDrawer();
  renderLegacyGrid();
  updateBarUI();
}

el.btnGo.addEventListener("click", runFlow);
$("#btn-reset").addEventListener("click", () => location.reload());

renderScenarios();
renderAll();
moveAvatar("start");
setStatus("Pick a scenario, or build your own visit, then press \"Walk them in\".");

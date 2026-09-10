const state = {
  user: null,
  tab: "orders",
  orders: [],
  inventory: [],
  purchases: [],
  report: null,
  sound: false,
  seenNew: new Set(),
};

const app = document.querySelector("#app");
const api = async (path, options = {}) => {
  const response = await fetch(`/api/kitchen-portal${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "Request failed");
  return response.json();
};
const fmt = (amount) => `₦${Number(amount || 0).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
const qty = (value) => Number(value || 0).toLocaleString("en-NG", { maximumFractionDigits: 2 });
const esc = (value) => String(value ?? "").replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
const dateTime = (value) => value ? new Date(value).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" }) : "—";
const elapsed = (date) => {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60000));
  return mins < 1 ? "Just now" : `${mins} min ago`;
};

const ingredientCategories = ["protein", "vegetable", "spice", "soup", "swallow", "drink", "packaging", "other"];
const units = ["kg", "litre", "pieces", "whole animal", "bag", "crate", "bunch", "tubers", "carton", "pack"];
const options = (items, selected) => items.map((item) => `<option value="${esc(item)}"${item === selected ? " selected" : ""}>${esc(item)}</option>`).join("");
const ingredientOptions = () => state.inventory.map((item) => `<option value="${item.id}">${esc(item.name)} — ${qty(item.currentStock)} ${esc(item.unit)}</option>`).join("");

function login() {
  app.innerHTML = `<section class="login"><form class="login-card" id="login-form"><div class="mark"><img src="/kitchen-portal/logo.png" alt="Àmàlà Olúyòlé" /></div><div class="eyebrow">ÀMÀLÀ OLÚYÒLÉ</div><h1>Kitchen Portal</h1><p>Oluyole Town Planning kitchen operations. Sign in with your approved work email and the private kitchen access code.</p><label>Work email<input required name="email" type="email" autocomplete="email" placeholder="name@amalaoluyole.com" /></label><label>Kitchen access code<input required name="accessCode" type="password" inputmode="numeric" autocomplete="one-time-code" placeholder="Enter the code" /></label><button class="primary" type="submit">Open Kitchen Portal</button><p class="login-help">Do not have an approved account or code? Contact the Manager.</p></form></section>`;
  document.querySelector("#login-form").onsubmit = async (event) => {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget));
    const button = event.currentTarget.querySelector("button");
    button.disabled = true; button.textContent = "Signing in…";
    try {
      const response = await fetch("/api/kitchen-portal/session", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not sign in.");
      state.user = data.user; shell(); await load();
    } catch (error) {
      const message = document.createElement("p");
      message.className = "login-error"; message.textContent = error.message;
      document.querySelector("#login-form .login-error")?.remove(); event.currentTarget.append(message);
      button.disabled = false; button.textContent = "Open Kitchen Portal";
    }
  };
}

function shell() {
  app.innerHTML = `<div class="shell"><aside class="sidebar"><div class="brand">Àmàlà Olúyòlé<small>OLUYOLE KITCHEN</small></div><nav class="nav"><button data-tab="orders">Orders</button><button data-tab="ingredients">Ingredients & purchases</button><button data-tab="report">Monthly report</button></nav><button class="signout" id="signout">Sign out</button></aside><section class="content"><header class="top"><div><h1 id="title">Kitchen Orders</h1><p id="subtitle">Live paid orders for Oluyole Town Planning</p></div><div class="user" id="user"></div></header><div id="notice" class="notice hidden" role="status"></div><main id="view"></main></section></div>`;
  document.querySelectorAll("[data-tab]").forEach((button) => button.onclick = () => { state.tab = button.dataset.tab; render(); });
  document.querySelector("#signout").onclick = async () => { await fetch("/api/kitchen-portal/logout", { method: "POST", credentials: "include" }); location.reload(); };
}

function notify(message, tone = "info") {
  const node = document.querySelector("#notice");
  node.textContent = message;
  node.className = `notice ${tone}`;
  setTimeout(() => node.classList.add("hidden"), 4200);
}

function enableSound() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return notify("Browser sound is not supported. Keep the order board visible.", "warning");
  const context = new AudioContext();
  context.resume();
  state.sound = true;
  state.audio = context;
  notify("Kitchen sound alerts are enabled.", "success");
  render();
}

function chime() {
  if (!state.sound || !state.audio) return;
  const oscillator = state.audio.createOscillator();
  const gain = state.audio.createGain();
  oscillator.frequency.value = 880;
  gain.gain.setValueAtTime(0.12, state.audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, state.audio.currentTime + 0.42);
  oscillator.connect(gain); gain.connect(state.audio.destination); oscillator.start(); oscillator.stop(state.audio.currentTime + 0.42);
}

function orderCard(order) {
  const next = { payment_confirmed: ["Accept order", "accepted"], accepted: ["Start preparing", "preparing"], preparing: ["Mark ready", "ready"] }[order.status];
  return `<article class="card"><div class="card-head"><div><div class="order-id">#${esc(order.orderNumber)}</div><span class="order-type">${esc(order.orderType.replace("_", " "))}</span></div><span class="time">${elapsed(order.createdAt)}</span></div><div class="items">${(order.items || []).map((item) => `<div class="line-item"><span><b>${esc(item.quantity)}×</b> ${esc(item.mealName)}</span></div>${item.specialInstructions ? `<div class="note">${esc(item.specialInstructions)}</div>` : ""}`).join("") || "<div class=\"muted\">No items recorded</div>"}</div>${next ? `<button class="action" data-order="${order.id}" data-status="${next[1]}">${next[0]}</button>` : ""}</article>`;
}

function ordersView() {
  const groups = [["New orders", ["payment_confirmed"]], ["In progress", ["accepted", "preparing"]], ["Ready", ["ready"]]];
  return `<div class="toolbar"><span class="muted">Orders refresh every 10 seconds.</span><button class="movement" id="sound">${state.sound ? "Sound on" : "Enable sound"}</button></div><section class="board">${groups.map(([name, statuses]) => `<div class="column"><h2>${name} (${state.orders.filter((order) => statuses.includes(order.status)).length})</h2>${state.orders.filter((order) => statuses.includes(order.status)).map(orderCard).join("") || "<div class=\"empty\">No orders here.</div>"}</div>`).join("")}</section>`;
}

function ingredientTable() {
  return `<section class="table" aria-label="Current ingredient stock"><div class="table-head"><span>Ingredient</span><span>Available</span><span>Average cost</span><span>Supplier</span></div>${state.inventory.map((item) => {
    const low = Number(item.currentStock) <= Number(item.minimumStock);
    return `<div class="stock-row"><div><b>${esc(item.name)}</b><div class="muted">${esc(item.category)} · minimum ${qty(item.minimumStock)} ${esc(item.unit)}</div></div><div class="${low ? "low" : ""}">${qty(item.currentStock)} ${esc(item.unit)}${low ? "<div class=\"low-note\">Restock needed</div>" : ""}</div><div>${fmt(item.costPerUnit)}<div class="muted">per ${esc(item.unit)}</div></div><div>${esc(item.supplier || "Not recorded")}</div></div>`;
  }).join("") || "<div class=\"empty\">Add your first ingredient to begin stock tracking.</div>"}</section>`;
}

function purchasesTable(purchases = state.purchases) {
  return `<section class="table purchases" aria-label="Recent ingredient purchases"><div class="table-head purchases-head"><span>Purchase</span><span>Supplier / source</span><span>Cost</span><span>Date</span></div>${purchases.map((purchase) => {
    const source = purchase.sourceQuantity ? `${qty(purchase.sourceQuantity)} ${esc(purchase.sourceUnit || "source unit")}` : "Source not recorded";
    const pieces = purchase.pieceCount ? ` · ${qty(purchase.pieceCount)} pieces` : "";
    return `<div class="stock-row purchases-row"><div><b>${esc(purchase.ingredientName)}</b><div class="muted">${qty(purchase.stockQuantity)} added to stock${pieces}</div></div><div>${esc(purchase.supplier || "Supplier not recorded")}<div class="muted">${source}</div></div><div><b>${fmt(purchase.totalCost)}</b>${purchase.receiptReference ? `<div class="muted">Receipt ${esc(purchase.receiptReference)}</div>` : ""}</div><div class="muted">${dateTime(purchase.purchasedAt)}</div></div>`;
  }).join("") || "<div class=\"empty\">No purchases have been recorded yet.</div>"}</section>`;
}

function ingredientsView() {
  return `<div class="inventory-intro"><div><h2>Ingredients and purchases</h2><p>Record every kitchen ingredient, what was bought, the amount paid, and how much enters usable stock. For animals, record both the source purchase and prepared stock yield.</p></div><span class="stock-count">${state.inventory.length} active ingredients</span></div>
  <section class="form-grid two"><form class="panel form-panel" id="ingredient-form"><h2>Add ingredient</h2><p class="muted">Examples: Cow / Beef, Goat Meat, Croaker Fish, Palm Oil, Yam Flour, Fresh Pepper.</p><label>Ingredient name<input required name="name" maxlength="128" placeholder="e.g. Goat Meat" /></label><div class="form-columns"><label>Category<select name="category">${options(ingredientCategories, "protein")}</select></label><label>Stock unit<select name="unit">${options(units, "kg")}</select></label></div><div class="form-columns"><label>Opening stock<input required name="currentStock" type="number" min="0" step="0.01" value="0" /></label><label>Low-stock level<input required name="minimumStock" type="number" min="0" step="0.01" value="0" /></label></div><div class="form-columns"><label>Current cost per unit (₦)<input required name="costPerUnit" type="number" min="0" step="0.01" value="0" /></label><label>Usual supplier<input name="supplier" maxlength="128" placeholder="Optional" /></label></div><label>Notes<textarea name="notes" maxlength="1000" placeholder="Storage location, cut size, or quality notes"></textarea></label><button class="primary compact" type="submit">Save ingredient</button></form>
  <form class="panel form-panel" id="purchase-form"><h2>Record a purchase</h2><p class="muted">Use this for every market purchase. The total cost updates the ingredient's weighted average cost automatically.</p><label>Ingredient<select required name="inventoryId"><option value="">Select ingredient</option>${ingredientOptions()}</select></label><div class="form-columns"><label>Usable stock added<input required name="stockQuantity" type="number" min="0.01" step="0.01" placeholder="e.g. 45" /></label><label>Stock unit<span class="field-note">Uses the unit saved for this ingredient.</span></label></div><div class="form-columns"><label>Bought quantity<input name="sourceQuantity" type="number" min="0.01" step="0.01" placeholder="e.g. 1" /></label><label>Bought as<select name="sourceUnit"><option value="">Select source unit</option>${options(["whole cow", "whole goat", "whole fish", "bag", "crate", "carton", "pieces", "kg", "litre"], "")}</select></label></div><div class="form-columns"><label>Number of pieces<input name="pieceCount" type="number" min="1" step="1" placeholder="e.g. 4 quarters" /></label><label>Total amount paid (₦)<input required name="totalCost" type="number" min="1" step="0.01" placeholder="e.g. 320000" /></label></div><div class="form-columns"><label>Supplier<input name="supplier" maxlength="128" placeholder="Market or supplier name" /></label><label>Receipt / invoice number<input name="receiptReference" maxlength="64" placeholder="Optional" /></label></div><label>Purchase date and time<input name="purchasedAt" type="datetime-local" /></label><label>Purchase note<textarea name="notes" maxlength="1000" placeholder="Example: One whole cow cut into four quarters; 45 kg usable beef received."></textarea></label><button class="primary compact" type="submit">Record purchase and add stock</button></form></section>
  <form class="panel movement-panel" id="stock-form"><div><h2>Record kitchen use or wastage</h2><p class="muted">This reduces stock and records who made the entry. Use adjustment only for a verified physical count correction.</p></div><div class="movement-fields"><label>Ingredient<select required name="inventoryId"><option value="">Select ingredient</option>${ingredientOptions()}</select></label><label>Record<select required name="type"><option value="usage">Kitchen use</option><option value="waste">Wastage</option><option value="adjustment">Stock adjustment</option></select></label><label>Quantity<input required name="quantity" type="number" step="0.01" placeholder="e.g. 2.5" /></label><label>Reason / note<input name="note" maxlength="1000" placeholder="e.g. prep for lunch service" /></label><button class="movement submit-movement" type="submit">Save movement</button></div></form>
  <section class="section-heading"><div><h2>Current ingredient stock</h2><p>Available quantity, current weighted cost, supplier, and low-stock status.</p></div></section>${ingredientTable()}
  <section class="section-heading"><div><h2>Recent purchases</h2><p>A permanent record of money spent and the stock received.</p></div></section>${purchasesTable()}`;
}

function reportView() {
  const report = state.report || {};
  const summary = report.summary || {};
  const costs = report.ingredientCosts || {};
  return `<section class="grid"><div class="metric"><b>${esc(summary.totalOrders || 0)}</b><span>Orders this month</span></div><div class="metric"><b>${fmt(summary.totalRevenue)}</b><span>Sales revenue</span></div><div class="metric"><b>${fmt(costs.totalSpent)}</b><span>Ingredient purchases</span></div><div class="metric"><b>${fmt(costs.currentStockValue)}</b><span>Stock value on hand</span></div></section><section class="report-list"><div class="panel"><h2>Most ordered meals</h2>${(report.topMeals || []).map((meal) => `<div class="stock-row"><b>${esc(meal.mealName)}</b><span>${esc(meal.totalQuantity)} portions</span></div>`).join("") || "<div class=\"empty\">No monthly data yet.</div>"}</div><div class="panel"><h2>Low-stock watch</h2>${(report.lowStockItems || []).map((item) => `<div class="stock-row"><b>${esc(item.name)}</b><span class="low">${esc(item.currentStock)} ${esc(item.unit)}</span></div>`).join("") || "<div class=\"empty\">All stock is above its warning level.</div>"}</div></section><section class="section-heading"><div><h2>Recent ingredient spend</h2><p>${esc(costs.purchaseCount || 0)} purchase records for this reporting month.</p></div></section>${purchasesTable(costs.recentPurchases || [])}`;
}

async function load() {
  try {
    const [orders, inventory, report, purchases] = await Promise.all([api("/orders"), api("/inventory"), api("/report"), api("/purchases")]);
    const fresh = orders.filter((order) => order.status === "payment_confirmed" && !state.seenNew.has(order.id));
    if (state.seenNew.size && fresh.length) { notify(`${fresh.length} new order${fresh.length > 1 ? "s" : ""} received.`, "success"); chime(); }
    orders.forEach((order) => state.seenNew.add(order.id));
    state.orders = orders; state.inventory = inventory; state.report = report; state.purchases = purchases; render();
  } catch (error) { notify(error.message, "warning"); }
}

async function submitIngredient(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  try {
    await api("/ingredients", { method: "POST", body: JSON.stringify({ ...data, currentStock: Number(data.currentStock), minimumStock: Number(data.minimumStock), costPerUnit: Number(data.costPerUnit) }) });
    notify("Ingredient saved. Record a purchase when new stock arrives.", "success"); event.currentTarget.reset(); await load();
  } catch (error) { notify(error.message, "warning"); }
}

async function submitPurchase(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  const payload = { inventoryId: Number(data.inventoryId), stockQuantity: Number(data.stockQuantity), totalCost: Number(data.totalCost) };
  if (data.sourceQuantity) payload.sourceQuantity = Number(data.sourceQuantity);
  if (data.sourceUnit) payload.sourceUnit = data.sourceUnit;
  if (data.pieceCount) payload.pieceCount = Number(data.pieceCount);
  if (data.supplier) payload.supplier = data.supplier;
  if (data.receiptReference) payload.receiptReference = data.receiptReference;
  if (data.notes) payload.notes = data.notes;
  if (data.purchasedAt) payload.purchasedAt = new Date(data.purchasedAt).toISOString();
  try {
    await api("/purchases", { method: "POST", body: JSON.stringify(payload) });
    notify("Purchase recorded and usable stock updated.", "success"); event.currentTarget.reset(); await load();
  } catch (error) { notify(error.message, "warning"); }
}

async function submitStockMovement(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  const type = data.type;
  let quantity = Number(data.quantity);
  if (!Number.isFinite(quantity) || quantity === 0) return notify("Enter a valid quantity.", "warning");
  if (type === "usage" || type === "waste") quantity = -Math.abs(quantity);
  try {
    await api(`/inventory/${Number(data.inventoryId)}/movement`, { method: "POST", body: JSON.stringify({ type, quantity, note: data.note || undefined }) });
    notify("Stock movement recorded.", "success"); event.currentTarget.reset(); await load();
  } catch (error) { notify(error.message, "warning"); }
}

function render() {
  if (!state.user) return;
  document.querySelector("#user").textContent = `${state.user.name || state.user.email}\n${state.user.role}`;
  document.querySelectorAll("[data-tab]").forEach((button) => button.classList.toggle("active", button.dataset.tab === state.tab));
  const titles = {
    orders: ["Kitchen Orders", "Live paid orders for Oluyole Town Planning"],
    ingredients: ["Ingredients & Purchases", "Track every supply, animal, quantity, piece, supplier, and amount paid"],
    report: ["Monthly Kitchen Report", "Production, sales, ingredient spend, and stock review"],
  };
  document.querySelector("#title").textContent = titles[state.tab][0];
  document.querySelector("#subtitle").textContent = titles[state.tab][1];
  const view = document.querySelector("#view");
  view.innerHTML = state.tab === "orders" ? ordersView() : state.tab === "ingredients" ? ingredientsView() : reportView();
  const sound = document.querySelector("#sound"); if (sound) sound.onclick = enableSound;
  document.querySelectorAll("[data-order]").forEach((button) => button.onclick = async () => {
    button.disabled = true;
    try { await api(`/orders/${button.dataset.order}/status`, { method: "POST", body: JSON.stringify({ status: button.dataset.status }) }); await load(); }
    catch (error) { notify(error.message, "warning"); button.disabled = false; }
  });
  const ingredientForm = document.querySelector("#ingredient-form"); if (ingredientForm) ingredientForm.onsubmit = submitIngredient;
  const purchaseForm = document.querySelector("#purchase-form"); if (purchaseForm) purchaseForm.onsubmit = submitPurchase;
  const stockForm = document.querySelector("#stock-form"); if (stockForm) stockForm.onsubmit = submitStockMovement;
}

async function bootstrap() {
  try {
    const me = await api("/me");
    state.user = me.user;
    shell();
    await load();
    setInterval(() => state.user && load(), 10000);
  } catch { login(); }
}

bootstrap();

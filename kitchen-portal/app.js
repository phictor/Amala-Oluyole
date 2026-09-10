const state = {
  user: null,
  tab: "orders",
  orders: [],
  inventory: [],
  purchases: [],
  report: null,
  sound: false,
  seenNew: new Set(),
  ingredientEdit: null,
  purchaseEdit: null,
  ingredientDraft: null,
  purchaseDraft: null,
  formDirty: false,
};

const app = document.querySelector("#app");
const ingredientCategories = ["protein", "vegetable", "spice", "soup", "swallow", "drink", "packaging", "other"];
const units = ["kg", "litre", "pieces", "whole animal", "bag", "crate", "bunch", "tubers", "carton", "pack"];
const proteinPresets = [
  "Cow Meat / Beef",
  "Goat Meat",
  "Chicken",
  "Turkey",
  "Croaker Fish",
  "Tilapia",
  "Titus Fish",
  "Butterfish / Owere",
  "Ponmo",
  "Bokoto",
  "Assorted Meat",
  "Other protein",
];

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
const inputDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};
const elapsed = (date) => {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60000));
  return mins < 1 ? "Just now" : `${mins} min ago`;
};
const options = (items, selected, placeholder = "") => `${placeholder ? `<option value="">${esc(placeholder)}</option>` : ""}${items.map((item) => `<option value="${esc(item)}"${item === selected ? " selected" : ""}>${esc(item)}</option>`).join("")}`;
const ingredientOptions = (selected = "") => state.inventory.map((item) => `<option value="${item.id}"${String(item.id) === String(selected) ? " selected" : ""}>${esc(item.name)} — ${qty(item.currentStock)} ${esc(item.unit)}</option>`).join("");
const draft = (form) => Object.fromEntries(new FormData(form));

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
      state.user = data.user; shell(); await load({ forceRender: true });
    } catch (error) {
      const message = document.createElement("p");
      message.className = "login-error"; message.textContent = error.message;
      document.querySelector("#login-form .login-error")?.remove(); event.currentTarget.append(message);
      button.disabled = false; button.textContent = "Open Kitchen Portal";
    }
  };
}

function shell() {
  app.innerHTML = `<div class="shell"><aside class="sidebar"><div class="brand-lockup"><img src="/kitchen-portal/logo.png" alt="Àmàlà Olúyòlé logo" /><div class="brand">Àmàlà Olúyòlé<small>OLUYOLE KITCHEN</small></div></div><nav class="nav"><button data-tab="orders">Orders</button><button data-tab="ingredients">Ingredients & purchases</button><button data-tab="report">Monthly report</button></nav><button class="signout" id="signout">Sign out</button></aside><section class="content"><header class="top"><div><h1 id="title">Kitchen Orders</h1><p id="subtitle">Live paid orders for Oluyole Town Planning</p></div><div class="user" id="user"></div></header><div id="notice" class="notice hidden" role="status"></div><main id="view"></main></section></div>`;
  document.querySelectorAll("[data-tab]").forEach((button) => button.onclick = () => {
    state.tab = button.dataset.tab;
    state.formDirty = false;
    render();
  });
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
  return `<section class="table" aria-label="Current ingredient stock"><div class="table-head inventory-head"><span>Ingredient</span><span>Available</span><span>Average cost</span><span>Supplier</span><span>Action</span></div>${state.inventory.map((item) => {
    const low = Number(item.currentStock) <= Number(item.minimumStock);
    return `<div class="stock-row inventory-row"><div><b>${esc(item.name)}</b><div class="muted">${esc(item.category)} · minimum ${qty(item.minimumStock)} ${esc(item.unit)}</div></div><div class="${low ? "low" : ""}">${qty(item.currentStock)} ${esc(item.unit)}${low ? "<div class=\"low-note\">Restock needed</div>" : ""}</div><div>${fmt(item.costPerUnit)}<div class="muted">per ${esc(item.unit)}</div></div><div>${esc(item.supplier || "Not recorded")}</div><button class="table-action" data-edit-ingredient="${item.id}">Edit</button></div>`;
  }).join("") || "<div class=\"empty\">Add your first ingredient to begin stock tracking.</div>"}</section>`;
}

function purchasesTable(purchases = state.purchases) {
  return `<section class="table purchases" aria-label="Recent ingredient purchases"><div class="table-head purchases-head"><span>Purchase</span><span>Supplier / source</span><span>Cost</span><span>Date</span><span>Action</span></div>${purchases.map((purchase) => {
    const source = purchase.sourceQuantity ? `${qty(purchase.sourceQuantity)} ${esc(purchase.sourceUnit || "source unit")}` : "Source not recorded";
    const pieces = purchase.pieceCount ? ` · ${qty(purchase.pieceCount)} pieces` : "";
    return `<div class="stock-row purchases-row"><div><b>${esc(purchase.ingredientName)}</b><div class="muted">${qty(purchase.stockQuantity)} ${esc(purchase.stockUnit || "stock unit")} added${pieces}</div></div><div>${esc(purchase.supplier || "Supplier not recorded")}<div class="muted">${source}</div></div><div><b>${fmt(purchase.totalCost)}</b><div class="muted">${fmt(Number(purchase.totalCost) / Number(purchase.stockQuantity || 1))} / ${esc(purchase.stockUnit || "unit")}</div>${purchase.receiptReference ? `<div class="muted">Receipt ${esc(purchase.receiptReference)}</div>` : ""}</div><div class="muted">${dateTime(purchase.purchasedAt)}</div><button class="table-action" data-edit-purchase="${purchase.id}">Edit</button></div>`;
  }).join("") || "<div class=\"empty\">No purchases have been recorded yet.</div>"}</section>`;
}

function ingredientForm() {
  const editing = Boolean(state.ingredientEdit);
  const values = state.ingredientDraft || { name: "", category: "protein", unit: "kg", currentStock: "0", minimumStock: "0", costPerUnit: "0", supplier: "", notes: "" };
  const selectedPreset = proteinPresets.includes(values.name) ? values.name : "Other protein";
  return `<form class="panel form-panel" id="ingredient-form"><div class="form-heading"><div><h2>${editing ? "Edit ingredient" : "Add ingredient"}</h2><p class="muted">${editing ? "All fields are editable. A changed stock figure is recorded as a stock adjustment." : "Choose a prepared protein name or create your own ingredient."}</p></div>${editing ? "<button class=\"movement\" type=\"button\" data-cancel-ingredient>Cancel edit</button>" : ""}</div><label>Ingredient category<select name="category" id="ingredient-category">${options(ingredientCategories, values.category)}</select></label>${values.category === "protein" ? `<div class="form-columns"><label>Protein<select id="protein-preset">${options(proteinPresets, selectedPreset)}</select></label><label>Ingredient name<input required name="name" id="ingredient-name" maxlength="128" value="${esc(values.name)}" placeholder="${selectedPreset === "Other protein" ? "Type a custom protein" : "Choose or edit the protein name"}" /></label></div>` : `<label>Ingredient name<input required name="name" id="ingredient-name" maxlength="128" value="${esc(values.name)}" placeholder="e.g. Palm Oil, Yam Flour, Fresh Pepper" /></label>`}<div class="form-columns"><label>Stock unit<select name="unit">${options(units, values.unit)}</select></label><label>Low-stock level<input required name="minimumStock" type="number" min="0" step="0.01" value="${esc(values.minimumStock)}" /></label></div><div class="form-columns"><label>${editing ? "Current stock (adjustable)" : "Opening stock"}<input required name="currentStock" type="number" min="0" step="0.01" value="${esc(values.currentStock)}" /></label><label>Current cost per unit (₦)<input required name="costPerUnit" type="number" min="0" step="0.01" value="${esc(values.costPerUnit)}" /></label></div><output class="calculation" id="ingredient-calculation">Current stock value: ${fmt(Number(values.currentStock) * Number(values.costPerUnit))}</output><label>Usual supplier<input name="supplier" maxlength="128" value="${esc(values.supplier)}" placeholder="Market or supplier name" /></label><label>Notes<textarea name="notes" maxlength="1000" placeholder="Storage location, cut size, or quality notes">${esc(values.notes)}</textarea></label><button class="primary compact" type="submit">${editing ? "Save ingredient changes" : "Save ingredient"}</button></form>`;
}

function purchaseForm() {
  const editing = Boolean(state.purchaseEdit);
  const values = state.purchaseDraft || { inventoryId: "", stockQuantity: "", sourceQuantity: "", sourceUnit: "", pieceCount: "", totalCost: "", supplier: "", receiptReference: "", notes: "", purchasedAt: "" };
  const selectedIngredient = state.inventory.find((item) => String(item.id) === String(values.inventoryId));
  const action = editing ? "Save purchase changes" : "Record purchase and add stock";
  return `<form class="panel form-panel" id="purchase-form"><div class="form-heading"><div><h2>${editing ? "Edit purchase" : "Record a purchase"}</h2><p class="muted">${editing ? "Corrections update this purchase, its stock difference, and the calculated ingredient cost." : "Every saved purchase adds usable stock and updates the ingredient's weighted cost."}</p></div>${editing ? "<button class=\"movement\" type=\"button\" data-cancel-purchase>Cancel edit</button>" : ""}</div><label>Ingredient<select required name="inventoryId" id="purchase-ingredient"><option value="">Select ingredient</option>${ingredientOptions(values.inventoryId)}</select></label><div class="form-columns"><label>Usable stock added<input required name="stockQuantity" type="number" min="0.01" step="0.01" value="${esc(values.stockQuantity)}" placeholder="e.g. 45" /></label><label>Stock unit<span class="field-note" id="purchase-stock-unit">${esc(selectedIngredient?.unit || "Choose an ingredient first")}</span></label></div><div class="form-columns"><label>Bought quantity<input name="sourceQuantity" type="number" min="0.01" step="0.01" value="${esc(values.sourceQuantity)}" placeholder="e.g. 1" /></label><label>Bought as<select name="sourceUnit"><option value="">Select source unit</option>${options(["whole cow", "whole goat", "whole fish", "bag", "crate", "carton", "pieces", "kg", "litre"], values.sourceUnit)}</select></label></div><div class="form-columns"><label>Number of pieces<input name="pieceCount" type="number" min="1" step="1" value="${esc(values.pieceCount)}" placeholder="e.g. 4 quarters" /></label><label>Total amount paid (₦)<input required name="totalCost" type="number" min="1" step="0.01" value="${esc(values.totalCost)}" placeholder="e.g. 320000" /></label></div><output class="calculation" id="purchase-calculation">Enter usable stock and total cost to calculate the purchase unit cost.</output><div class="form-columns"><label>Supplier<input name="supplier" maxlength="128" value="${esc(values.supplier)}" placeholder="Market or supplier name" /></label><label>Receipt / invoice number<input name="receiptReference" maxlength="64" value="${esc(values.receiptReference)}" placeholder="Optional" /></label></div><label>Purchase date and time<input name="purchasedAt" type="datetime-local" value="${esc(values.purchasedAt)}" /></label><label>Purchase note<textarea name="notes" maxlength="1000" placeholder="Example: One whole cow cut into four quarters; 45 kg usable beef received.">${esc(values.notes)}</textarea></label><button class="primary compact" type="submit">${action}</button></form>`;
}

function ingredientsView() {
  return `<div class="inventory-intro"><div><h2>Ingredients and purchases</h2><p>Choose known proteins such as cow meat, goat meat, chicken, turkey, and fish. Use <b>Other protein</b> to type any custom item. Every saved purchase updates stock and reporting immediately.</p></div><span class="stock-count">${state.inventory.length} active ingredients</span></div><section class="form-grid two">${ingredientForm()}${purchaseForm()}</section><form class="panel movement-panel" id="stock-form"><div><h2>Record kitchen use or wastage</h2><p class="muted">This reduces stock and records who made the entry. Use adjustment only for a verified physical count correction.</p></div><div class="movement-fields"><label>Ingredient<select required name="inventoryId"><option value="">Select ingredient</option>${ingredientOptions()}</select></label><label>Record<select required name="type"><option value="usage">Kitchen use</option><option value="waste">Wastage</option><option value="adjustment">Stock adjustment</option></select></label><label>Quantity<input required name="quantity" type="number" step="0.01" placeholder="e.g. 2.5" /></label><label>Reason / note<input name="note" maxlength="1000" placeholder="e.g. prep for lunch service" /></label><button class="movement submit-movement" type="submit">Save movement</button></div></form><section class="section-heading"><div><h2>Current ingredient stock</h2><p>Available quantity, calculated cost, supplier, and low-stock status. Select <b>Edit</b> to correct any field.</p></div></section>${ingredientTable()}<section class="section-heading"><div><h2>Recent purchases</h2><p>A saved record of money spent and stock received. Select <b>Edit</b> to correct a purchase and keep totals in sync.</p></div></section>${purchasesTable()}`;
}

function reportView() {
  const report = state.report || {};
  const summary = report.summary || {};
  const costs = report.ingredientCosts || {};
  return `<section class="grid"><div class="metric"><b>${esc(summary.totalOrders || 0)}</b><span>Orders this month</span></div><div class="metric"><b>${fmt(summary.totalRevenue)}</b><span>Sales revenue</span></div><div class="metric"><b>${fmt(costs.totalSpent)}</b><span>Ingredient purchases</span></div><div class="metric"><b>${fmt(costs.currentStockValue)}</b><span>Stock value on hand</span></div></section><section class="report-list"><div class="panel"><h2>Most ordered meals</h2>${(report.topMeals || []).map((meal) => `<div class="stock-row"><b>${esc(meal.mealName)}</b><span>${esc(meal.totalQuantity)} portions</span></div>`).join("") || "<div class=\"empty\">No monthly data yet.</div>"}</div><div class="panel"><h2>Low-stock watch</h2>${(report.lowStockItems || []).map((item) => `<div class="stock-row"><b>${esc(item.name)}</b><span class="low">${esc(item.currentStock)} ${esc(item.unit)}</span></div>`).join("") || "<div class=\"empty\">All stock is above its warning level.</div>"}</div></section><section class="section-heading"><div><h2>Recent ingredient spend</h2><p>${esc(costs.purchaseCount || 0)} purchase records for this reporting month.</p></div></section>${purchasesTable(costs.recentPurchases || [])}`;
}

async function load({ forceRender = false } = {}) {
  try {
    const [orders, inventory, report, purchases] = await Promise.all([api("/orders"), api("/inventory"), api("/report"), api("/purchases")]);
    const fresh = orders.filter((order) => order.status === "payment_confirmed" && !state.seenNew.has(order.id));
    if (state.seenNew.size && fresh.length) { notify(`${fresh.length} new order${fresh.length > 1 ? "s" : ""} received.`, "success"); chime(); }
    orders.forEach((order) => state.seenNew.add(order.id));
    state.orders = orders; state.inventory = inventory; state.report = report; state.purchases = purchases;
    if (forceRender || state.tab !== "ingredients" || !state.formDirty) render();
  } catch (error) { notify(error.message, "warning"); }
}

async function submitIngredient(event) {
  event.preventDefault();
  const data = draft(event.currentTarget);
  const payload = { ...data, currentStock: Number(data.currentStock), minimumStock: Number(data.minimumStock), costPerUnit: Number(data.costPerUnit) };
  try {
    if (state.ingredientEdit) await api(`/ingredients/${state.ingredientEdit}`, { method: "PATCH", body: JSON.stringify(payload) });
    else await api("/ingredients", { method: "POST", body: JSON.stringify(payload) });
    notify(state.ingredientEdit ? "Ingredient changes saved and stock records kept in sync." : "Ingredient saved. Record a purchase when new stock arrives.", "success");
    state.ingredientEdit = null; state.ingredientDraft = null; state.formDirty = false;
    await load({ forceRender: true });
  } catch (error) { notify(error.message, "warning"); }
}

async function submitPurchase(event) {
  event.preventDefault();
  const data = draft(event.currentTarget);
  const payload = { inventoryId: Number(data.inventoryId), stockQuantity: Number(data.stockQuantity), totalCost: Number(data.totalCost) };
  if (data.sourceQuantity || state.purchaseEdit) payload.sourceQuantity = data.sourceQuantity ? Number(data.sourceQuantity) : null;
  if (data.sourceUnit || state.purchaseEdit) payload.sourceUnit = data.sourceUnit || null;
  if (data.pieceCount || state.purchaseEdit) payload.pieceCount = data.pieceCount ? Number(data.pieceCount) : null;
  if (data.supplier || state.purchaseEdit) payload.supplier = data.supplier || null;
  if (data.receiptReference || state.purchaseEdit) payload.receiptReference = data.receiptReference || null;
  if (data.notes || state.purchaseEdit) payload.notes = data.notes || null;
  if (data.purchasedAt) payload.purchasedAt = new Date(data.purchasedAt).toISOString();
  try {
    if (state.purchaseEdit) await api(`/purchases/${state.purchaseEdit}`, { method: "PATCH", body: JSON.stringify(payload) });
    else await api("/purchases", { method: "POST", body: JSON.stringify(payload) });
    notify(state.purchaseEdit ? "Purchase correction saved. Stock and costs are updated." : "Purchase recorded and usable stock updated.", "success");
    state.purchaseEdit = null; state.purchaseDraft = null; state.formDirty = false;
    await load({ forceRender: true });
  } catch (error) { notify(error.message, "warning"); }
}

async function submitStockMovement(event) {
  event.preventDefault();
  const data = draft(event.currentTarget);
  const type = data.type;
  let quantity = Number(data.quantity);
  if (!Number.isFinite(quantity) || quantity === 0) return notify("Enter a valid quantity.", "warning");
  if (type === "usage" || type === "waste") quantity = -Math.abs(quantity);
  try {
    await api(`/inventory/${Number(data.inventoryId)}/movement`, { method: "POST", body: JSON.stringify({ type, quantity, note: data.note || undefined }) });
    notify("Stock movement recorded.", "success"); event.currentTarget.reset(); await load({ forceRender: true });
  } catch (error) { notify(error.message, "warning"); }
}

function syncIngredientCalculation(form) {
  const amount = Number(form.elements.currentStock?.value || 0) * Number(form.elements.costPerUnit?.value || 0);
  const output = form.querySelector("#ingredient-calculation");
  if (output) output.textContent = `Current stock value: ${fmt(amount)}`;
}

function syncPurchaseCalculation(form) {
  const stockQuantity = Number(form.elements.stockQuantity?.value || 0);
  const totalCost = Number(form.elements.totalCost?.value || 0);
  const pieceCount = Number(form.elements.pieceCount?.value || 0);
  const selected = state.inventory.find((item) => String(item.id) === String(form.elements.inventoryId?.value || state.purchaseDraft?.inventoryId));
  const unit = selected?.unit || "stock unit";
  const output = form.querySelector("#purchase-calculation");
  const unitNode = form.querySelector("#purchase-stock-unit");
  if (unitNode) unitNode.textContent = unit;
  if (!output) return;
  if (!stockQuantity || !totalCost) {
    output.textContent = "Enter usable stock and total cost to calculate the purchase unit cost.";
    return;
  }
  const unitCost = totalCost / stockQuantity;
  const pieces = pieceCount > 0 ? ` · ${fmt(totalCost / pieceCount)} per piece` : "";
  const currentStock = Number(selected?.currentStock || 0);
  const currentCost = Number(selected?.costPerUnit || 0);
  const projectedCost = state.purchaseEdit ? null : ((currentStock * currentCost) + totalCost) / (currentStock + stockQuantity);
  output.textContent = `This purchase: ${fmt(unitCost)} per ${unit}${pieces}${projectedCost ? ` · estimated new average: ${fmt(projectedCost)} per ${unit}` : ""}`;
}

function retainIngredientDraft(form) {
  state.ingredientDraft = draft(form);
  state.formDirty = true;
  syncIngredientCalculation(form);
}

function retainPurchaseDraft(form) {
  state.purchaseDraft = draft(form);
  state.formDirty = true;
  syncPurchaseCalculation(form);
}

function startIngredientEdit(id) {
  const item = state.inventory.find((ingredient) => ingredient.id === Number(id));
  if (!item) return;
  state.ingredientEdit = item.id;
  state.ingredientDraft = { name: item.name, category: item.category, unit: item.unit, currentStock: item.currentStock, minimumStock: item.minimumStock, costPerUnit: item.costPerUnit, supplier: item.supplier || "", notes: item.notes || "" };
  state.formDirty = false;
  render();
  document.querySelector("#ingredient-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function startPurchaseEdit(id) {
  const item = state.purchases.find((purchase) => purchase.id === Number(id));
  if (!item) return;
  state.purchaseEdit = item.id;
  state.purchaseDraft = { inventoryId: item.inventoryId, stockQuantity: item.stockQuantity, sourceQuantity: item.sourceQuantity || "", sourceUnit: item.sourceUnit || "", pieceCount: item.pieceCount || "", totalCost: item.totalCost, supplier: item.supplier || "", receiptReference: item.receiptReference || "", notes: item.notes || "", purchasedAt: inputDateTime(item.purchasedAt) };
  state.formDirty = false;
  render();
  document.querySelector("#purchase-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function bindIngredientForm(form) {
  if (!form) return;
  form.onsubmit = submitIngredient;
  form.querySelectorAll("input, textarea, select").forEach((field) => {
    field.addEventListener("input", () => retainIngredientDraft(form));
    field.addEventListener("change", () => retainIngredientDraft(form));
  });
  form.querySelector("#ingredient-category")?.addEventListener("change", () => {
    state.ingredientDraft = draft(form);
    state.formDirty = true;
    render();
  });
  form.querySelector("#protein-preset")?.addEventListener("change", (event) => {
    const name = form.querySelector("#ingredient-name");
    if (event.currentTarget.value === "Other protein") {
      name.value = "";
      name.placeholder = "Type a custom protein";
      name.focus();
    } else {
      name.value = event.currentTarget.value;
    }
    retainIngredientDraft(form);
  });
  form.querySelector("[data-cancel-ingredient]")?.addEventListener("click", () => {
    state.ingredientEdit = null; state.ingredientDraft = null; state.formDirty = false; render();
  });
  syncIngredientCalculation(form);
}

function bindPurchaseForm(form) {
  if (!form) return;
  form.onsubmit = submitPurchase;
  form.querySelectorAll("input, textarea, select").forEach((field) => {
    field.addEventListener("input", () => retainPurchaseDraft(form));
    field.addEventListener("change", () => retainPurchaseDraft(form));
  });
  form.querySelector("[data-cancel-purchase]")?.addEventListener("click", () => {
    state.purchaseEdit = null; state.purchaseDraft = null; state.formDirty = false; render();
  });
  syncPurchaseCalculation(form);
}

function render() {
  if (!state.user) return;
  document.querySelector("#user").textContent = `${state.user.name || state.user.email}\n${state.user.role}`;
  document.querySelectorAll("[data-tab]").forEach((button) => button.classList.toggle("active", button.dataset.tab === state.tab));
  const titles = {
    orders: ["Kitchen Orders", "Live paid orders for Oluyole Town Planning"],
    ingredients: ["Ingredients & Purchases", "Choose, edit, save, and track every ingredient, purchase, supplier, and cost"],
    report: ["Monthly Kitchen Report", "Production, sales, ingredient spend, and current stock value"],
  };
  document.querySelector("#title").textContent = titles[state.tab][0];
  document.querySelector("#subtitle").textContent = titles[state.tab][1];
  const view = document.querySelector("#view");
  view.innerHTML = state.tab === "orders" ? ordersView() : state.tab === "ingredients" ? ingredientsView() : reportView();
  const sound = document.querySelector("#sound"); if (sound) sound.onclick = enableSound;
  document.querySelectorAll("[data-order]").forEach((button) => button.onclick = async () => {
    button.disabled = true;
    try { await api(`/orders/${button.dataset.order}/status`, { method: "POST", body: JSON.stringify({ status: button.dataset.status }) }); await load({ forceRender: true }); }
    catch (error) { notify(error.message, "warning"); button.disabled = false; }
  });
  bindIngredientForm(document.querySelector("#ingredient-form"));
  bindPurchaseForm(document.querySelector("#purchase-form"));
  const stockForm = document.querySelector("#stock-form"); if (stockForm) stockForm.onsubmit = submitStockMovement;
  document.querySelectorAll("[data-edit-ingredient]").forEach((button) => button.onclick = () => startIngredientEdit(button.dataset.editIngredient));
  document.querySelectorAll("[data-edit-purchase]").forEach((button) => button.onclick = () => startPurchaseEdit(button.dataset.editPurchase));
}

async function bootstrap() {
  try {
    const me = await api("/me");
    state.user = me.user;
    shell();
    await load({ forceRender: true });
    setInterval(() => state.user && load(), 10000);
  } catch { login(); }
}

bootstrap();

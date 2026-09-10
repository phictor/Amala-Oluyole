import { describe, expect, it } from "vitest";

describe("Standalone Kitchen Portal access code", () => {
  it("accepts the configured code before checking staff account approval", async () => {
    const accessCode = process.env.KITCHEN_PORTAL_ACCESS_CODE;
    expect(accessCode, "KITCHEN_PORTAL_ACCESS_CODE must be configured for the standalone portal").toBeTruthy();

    const response = await fetch("http://127.0.0.1:3000/api/kitchen-portal/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "unapproved-kitchen-check@example.com",
        accessCode,
      }),
    });

    // A configured, valid code reaches the account-role check and receives 403.
    // A bad/missing code is rejected earlier with 401, while excessive retries return 429.
    expect(response.status).toBe(403);
  });

  it("opens a standalone Kitchen Portal session for the approved manager", async () => {
    const accessCode = process.env.KITCHEN_PORTAL_ACCESS_CODE;
    const response = await fetch("http://127.0.0.1:3000/api/kitchen-portal/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "amalaoluyole@gmail.com", accessCode }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.user.email).toBe("amalaoluyole@gmail.com");
    expect(body.user.role).toBe("admin");
    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain("app_session_id=");

    const workspaceResponse = await fetch("http://127.0.0.1:3000/api/kitchen-portal/me", {
      headers: { Cookie: setCookie!.split(";")[0] },
    });
    const workspace = await workspaceResponse.json();
    expect(workspaceResponse.status).toBe(200);
    expect(workspace.user.role).toBe("admin");

    const inventoryResponse = await fetch("http://127.0.0.1:3000/api/kitchen-portal/inventory", {
      headers: { Cookie: setCookie!.split(";")[0] },
    });
    const purchasesResponse = await fetch("http://127.0.0.1:3000/api/kitchen-portal/purchases", {
      headers: { Cookie: setCookie!.split(";")[0] },
    });
    expect(inventoryResponse.status).toBe(200);
    expect(purchasesResponse.status).toBe(200);
    expect(Array.isArray(await inventoryResponse.json())).toBe(true);
    expect(Array.isArray(await purchasesResponse.json())).toBe(true);
  });

  it("keeps editable ingredient and purchase routes staff-only", async () => {
    const ingredientResponse = await fetch("http://127.0.0.1:3000/api/kitchen-portal/ingredients/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Unauthorised change" }),
    });
    const purchaseResponse = await fetch("http://127.0.0.1:3000/api/kitchen-portal/purchases/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inventoryId: 1, stockQuantity: 1, totalCost: 1 }),
    });

    expect(ingredientResponse.status).toBe(401);
    expect(purchaseResponse.status).toBe(401);
  });

  it("keeps live updates and controlled ready-order recall staff-only", async () => {
    const liveResponse = await fetch("http://127.0.0.1:3000/api/kitchen-portal/live");
    const recallResponse = await fetch("http://127.0.0.1:3000/api/kitchen-portal/orders/1/recall", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Unauthorised attempt" }),
    });

    expect(liveResponse.status).toBe(401);
    expect(recallResponse.status).toBe(401);
  });

  it("does not expose an unknown order through the Oluyole Kitchen Portal", async () => {
    const accessCode = process.env.KITCHEN_PORTAL_ACCESS_CODE;
    const login = await fetch("http://127.0.0.1:3000/api/kitchen-portal/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "amalaoluyole@gmail.com", accessCode }),
    });
    const cookie = login.headers.get("set-cookie")!.split(";")[0];
    const response = await fetch("http://127.0.0.1:3000/api/kitchen-portal/orders/999999/status", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ status: "accepted" }),
    });

    expect(response.status).toBe(404);
  });
});

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
  });
});

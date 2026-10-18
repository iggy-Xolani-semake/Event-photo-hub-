import { expect, test } from "@playwright/test";

function encodeBase64Url(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

async function signInAsTestUser(page: import("@playwright/test").Page) {
  const expiry = Math.floor(Date.now() / 1000) + 3600;
  const accessToken = [
    encodeBase64Url({ alg: "HS256", typ: "JWT" }),
    encodeBase64Url({
      sub: "123e4567-e89b-42d3-a456-426614174006",
      aud: "authenticated",
      role: "authenticated",
      email: "e2e@example.test",
      exp: expiry,
    }),
    "e2e-signature",
  ].join(".");
  const session = encodeBase64Url({
    access_token: accessToken,
    refresh_token: "e2e-refresh-token",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: expiry,
    user: {
      id: "123e4567-e89b-42d3-a456-426614174006",
      email: "e2e@example.test",
    },
  });

  await page.context().addCookies([
    {
      name: "sb-127-auth-token",
      value: `base64-${session}`,
      url: "http://127.0.0.1:3100",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

test("host receives signed PayFast sandbox fields and posts them to the sandbox boundary", async ({
  page,
}) => {
  await signInAsTestUser(page);

  const postedFields: URLSearchParams[] = [];
  await page.route("https://sandbox.payfast.co.za/eng/process", async (route) => {
    postedFields.push(new URLSearchParams(route.request().postData() ?? ""));
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<h1>PayFast sandbox boundary</h1>",
    });
  });

  await page.goto("/dashboard/events/SMK4827Q");
  await page.getByRole("button", { name: /Pay/ }).click();

  await expect(page.getByRole("heading", { name: "PayFast sandbox boundary" })).toBeVisible({
    timeout: 30_000,
  });
  expect(postedFields[0]?.get("merchant_id")).toBe("10000100");
  expect(postedFields[0]?.get("m_payment_id")).toBe("123e4567-e89b-42d3-b456-426614174002");
  expect(postedFields[0]?.get("amount")).toBe("50.00");
  expect(postedFields[0]?.get("signature")).toMatch(/^[\da-f]{32}$/i);
  expect(postedFields[0]?.get("notify_url")).toBe(
    "https://shutamzala.example/api/payfast/itn"
  );
});

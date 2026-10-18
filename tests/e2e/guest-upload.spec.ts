import { expect, test } from "@playwright/test";

const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p4sAAAAASUVORK5CYII=",
  "base64"
);

test("guest consents, uploads a photo, and reaches the success screen", async ({ page }) => {
  await page.goto("/e/SMK4827Q");

  await page.getByRole("button", { name: "Add my photos" }).click();
  await expect(page.getByRole("heading", { name: "Before you share" })).toBeVisible();
  await page.getByRole("button", { name: "I understand" }).click();
  await expect(page.getByRole("heading", { name: "Share your moments" })).toBeVisible();

  await page.locator('input[type="file"]').last().setInputFiles({
    name: "moment.png",
    mimeType: "image/png",
    buffer: onePixelPng,
  });
  await expect(page.getByText("1 / 10 photos")).toBeVisible();
  await page.getByRole("button", { name: "Share 1 photo" }).click();

  await expect(page.getByRole("heading", { name: "They're live!" })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText(/now part of E2E Test Event/)).toBeVisible();
});

test("upload APIs reject malformed payloads before doing server work", async ({ request }) => {
  const requestUrlResponse = await request.post("/api/upload/request-url", {
    data: { eventCode: "SMK4827Q", fileName: "moment.png", fileSize: "not-a-number" },
  });
  expect(requestUrlResponse.status()).toBe(400);
  await expect(requestUrlResponse.json()).resolves.toMatchObject({
    error: expect.any(String),
  });

  const confirmResponse = await request.post("/api/upload/confirm", {
    data: { eventCode: "SMK4827Q" },
  });
  expect(confirmResponse.status()).toBe(400);
});

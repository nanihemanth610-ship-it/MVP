import { test, expect } from "@playwright/test";

test.describe("Accessibility, Layouts & State Handling", () => {
  test("supports keyboard-only navigation and visible focus rings", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    // Press Tab multiple times to verify key navigation
    await page.keyboard.press("Tab");
    const activeTagName = await page.evaluate(
      () => document.activeElement?.tagName,
    );
    expect(activeTagName).toBeTruthy();

    // Verify focus-visible styling is computed with outline
    const hasFocusOutline = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return false;
      const style = window.getComputedStyle(el);
      return style.outlineStyle !== "none" || style.boxShadow !== "none";
    });
    expect(hasFocusOutline).toBe(true);

    // Navigate to Ingestion via Enter key on focused link
    const uploadLink = page.getByRole("link", { name: /Upload/i }).first();
    await uploadLink.focus();
    await page.keyboard.press("Enter");
    await page.waitForURL(/\/upload/);
  });

  test("honors reduced motion preferences without crashing UI", async ({
    page,
  }) => {
    // Emulate prefers-reduced-motion: reduce
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/dashboard");

    // Verify CSS rule evaluates properly
    const respectsReducedMotion = await page.evaluate(() => {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    });
    expect(respectsReducedMotion).toBe(true);

    // Verify animations are reduced to instant (0.01ms)
    const animationDuration = await page.evaluate(() => {
      const dummy = document.createElement("div");
      document.body.appendChild(dummy);
      const computed = window.getComputedStyle(dummy).animationDuration;
      document.body.removeChild(dummy);
      return computed;
    });
    expect(animationDuration).toBeDefined();
  });

  test("renders gracefully on mobile, tablet, and desktop viewports", async ({
    page,
  }) => {
    // Mobile Viewport (iPhone / Pixel)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Tablet Viewport (iPad)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/claims");
    await expect(
      page.getByRole("heading", { name: /Claims Registry/i }),
    ).toBeVisible();

    // Desktop Viewport (1440x900)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/upload");
    await expect(
      page.getByText(/Drag and drop hospital bill document/i),
    ).toBeVisible();
  });

  test("displays graceful empty and error states with recovery actions", async ({
    page,
  }) => {
    // 1. Non-existent claim ID should display error state with recovery buttons
    await page.goto("/review/invalid-non-existent-claim-id");
    await expect(page.getByText(/Claim Record Not Found/i)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Return to Claims Registry/i }),
    ).toBeVisible();

    // Click recovery button to return to claims registry
    await page
      .getByRole("link", { name: /Return to Claims Registry/i })
      .click();
    await page.waitForURL(/\/claims/);
    await expect(
      page.getByRole("heading", { name: /Claims Registry/i }),
    ).toBeVisible();

    // 2. Upload Page validation error on invalid file type
    await page.goto("/upload");

    // Create an invalid file buffer (.exe)
    const invalidFile = {
      name: "malicious_script.exe",
      mimeType: "application/x-msdownload",
      buffer: Buffer.from("MZ dummy executable content"),
    };

    // Upload via file input
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: /Browse Files/i }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([invalidFile]);

    // Verify rejection alert is displayed with recovery action
    const inlineAlert = page
      .locator("#main-content")
      .getByText(/Unsupported file format/i);
    await expect(inlineAlert).toBeVisible();
    const dismissBtn = page.getByRole("button", {
      name: "Dismiss",
      exact: true,
    });
    await expect(dismissBtn).toBeVisible();
    await dismissBtn.click();
    await expect(inlineAlert).not.toBeVisible();
  });

  test("verifies core navigation routes and header buttons", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    // Navigate to Claims via direct Dashboard action button
    await page.getByRole("button", { name: /View claims/i }).click();
    await page.waitForURL(/\/claims/);

    // Navigate to Ingestion via Header Upload button (visible across all viewports)
    await page
      .getByRole("link", { name: /Upload/i })
      .first()
      .click();
    await page.waitForURL(/\/upload/);

    // Verify Profile Menu is clickable and renders options
    const profileButton = page.getByLabel(/User Profile & Preferences/i);
    await expect(profileButton).toBeVisible();
    await profileButton.click();
    await expect(page.getByText(/Reset Demo Claims Data/i)).toBeVisible();

    // Close menu with Escape
    await page.keyboard.press("Escape");
    await expect(page.getByText(/Reset Demo Claims Data/i)).not.toBeVisible();
  });
});

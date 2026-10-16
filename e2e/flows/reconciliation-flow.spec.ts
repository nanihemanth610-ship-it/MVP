import { test, expect } from "@playwright/test";

test.describe("Critical User Journey: Upload → Extraction → Edit → Audit Recalculation → Save → Export", () => {
  test("completes full end-to-end reconciliation flow", async ({ page }) => {
    // 1. Visit Upload Page
    await page.goto("/upload");
    await expect(page).toHaveTitle(/BillBridge/i);
    await expect(
      page.getByRole("heading", {
        name: /Document Ingestion & OCR Extraction/i,
      }),
    ).toBeVisible();

    // 2. Trigger Extraction via Synthetic Preset (Apollo Hospitals ER Discrepancy)
    const discrepancyPreset = page.getByRole("button", {
      name: /Load Apollo Hospitals ER encounter with arithmetic discrepancy/i,
    });
    await expect(discrepancyPreset).toBeVisible();
    await discrepancyPreset.click();

    // 3. Monitor Multi-stage AI Extraction Progress Stepper
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: /AI Multimodal Pipeline Active/i }),
    ).toBeVisible();

    // Auto-waits for extraction completion and navigation to Review Page
    await page.waitForURL(/\/review\/.+/, { timeout: 15000 });
    await expect(
      page.getByRole("heading", { name: /Apollo Hospitals/i }),
    ).toBeVisible();

    // 4. Verify Initial Audit Findings
    // The discrepancy encounter has a math mismatch
    await expect(page.getByText(/Stated Bill Header Total/i)).toBeVisible();
    await expect(page.getByText(/Extracted Line Items/i)).toBeVisible();

    // 5. Edit Line Item
    // Find the first line item edit button and click it
    const editButton = page.getByTitle("Edit Line Item").first();
    await expect(editButton).toBeVisible();
    await editButton.click();

    // Quantity / Rate / Total Price inputs should now be visible
    const totalPriceInput = page.getByLabel("Total Price");
    await expect(totalPriceInput).toBeVisible();

    // Modify total price to trigger deterministic audit recalculation
    await totalPriceInput.fill("650.00");

    // Save line item edit
    const saveLineItemButton = page.getByTitle("Save Line Item");
    await saveLineItemButton.click();

    // 6. Verify Deterministic Audit Recalculation
    // Should now indicate unsaved changes badge and recalculate totals
    await expect(page.getByText(/Unsaved Edits/i)).toBeVisible();
    const saveClaimButton = page.getByRole("button", { name: /Save Changes/i });
    await expect(saveClaimButton).toBeVisible();

    // 7. Save Claim Modifications
    await saveClaimButton.click();

    // Verify toast confirms successful persistence
    await expect(page.getByText(/Changes Saved/i)).toBeVisible();
    await expect(page.getByText(/Unsaved Edits/i)).not.toBeVisible();

    // 8. Test Export Dropdown (CSV and JSON)
    const exportDropdown = page.getByRole("button", { name: /Export Claim/i });
    await expect(exportDropdown).toBeVisible();
    await exportDropdown.click();

    // Dropdown options should appear
    const csvExportOption = page.getByRole("menuitem", {
      name: /CSV Spreadsheet/i,
    });
    const jsonExportOption = page.getByRole("menuitem", {
      name: /Structured JSON/i,
    });

    await expect(csvExportOption).toBeVisible();
    await expect(jsonExportOption).toBeVisible();

    // Set up download listeners
    const [csvDownload] = await Promise.all([
      page.waitForEvent("download"),
      csvExportOption.click(),
    ]);

    expect(csvDownload.suggestedFilename()).toMatch(/\.csv$/i);

    // Reopen dropdown and test JSON export
    await exportDropdown.click();
    const [jsonDownload] = await Promise.all([
      page.waitForEvent("download"),
      jsonExportOption.click(),
    ]);

    expect(jsonDownload.suggestedFilename()).toMatch(/\.json$/i);
  });
});

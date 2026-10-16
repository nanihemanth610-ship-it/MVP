import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { RoleProvider } from "@/context/RoleContext";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/ui/toast";
import { PatientClaimSummaryPage } from "./PatientClaimSummaryPage";
import { getDataAccess } from "@/services/data-access";

function renderPatientSummaryPage(claimId: string = "claim-memorial-002") {
  return render(
    <ThemeProvider defaultTheme="light">
      <RoleProvider defaultRole="patient">
        <AuthProvider>
          <ToastProvider>
            <MemoryRouter initialEntries={[`/claims/${claimId}/patient`]}>
              <Routes>
                <Route
                  path="/claims/:id/patient"
                  element={<PatientClaimSummaryPage />}
                />
                <Route
                  path="/claims"
                  element={<div>Claims Registry Mock</div>}
                />
                <Route
                  path="/claims/:id"
                  element={<div>Claim Detail Mock</div>}
                />
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </AuthProvider>
      </RoleProvider>
    </ThemeProvider>,
  );
}

describe("PatientClaimSummaryPage Component", () => {
  beforeEach(async () => {
    localStorage.clear();
    const dataAccess = getDataAccess();
    await dataAccess.resetDemoData();
  });

  it("renders patient claim header, hospital details, and plain language summary in English by default", async () => {
    renderPatientSummaryPage("claim-memorial-002");

    // Header & Claim reference
    expect(await screen.findByText(/BB-DEMO-1001/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /Your Medical Bill & Claim Overview/i,
      }),
    ).toBeInTheDocument();

    // Hospital and Patient Info
    expect(
      screen.getByText(/Apollo Hospitals, Bengaluru/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Aarav Sharma/i)).toBeInTheDocument();
    expect(screen.getAllByText(/PT-34901/i).length).toBeGreaterThan(0);

    // Plain English status explanation
    expect(
      screen.getByText(/Hospital Billing Review in Progress/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Our automated checks noticed that the printed bill total/i,
      ),
    ).toBeInTheDocument();
  });

  it("toggles seamlessly to Telugu (తెలుగు) upon clicking the language switch button", async () => {
    const user = userEvent.setup();
    renderPatientSummaryPage("claim-memorial-002");

    // Verify initial English
    expect(
      await screen.findByRole("heading", {
        name: /Your Medical Bill & Claim Overview/i,
      }),
    ).toBeInTheDocument();

    // Click Telugu toggle button
    const teluguBtn = screen.getByRole("button", { name: /తెలుగు/i });
    expect(teluguBtn).toHaveAttribute("aria-pressed", "false");
    await user.click(teluguBtn);

    // Verify active pressed state and Telugu text rendered
    expect(teluguBtn).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("heading", {
        name: /మీ ఆసుపత్రి బిల్లు & క్లెయిమ్ పురోగతి/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/ఆసుపత్రి బిల్లింగ్ సమీక్షలో ఉంది/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/ఆసుపత్రి బిల్లు మొత్తం/i)).toBeInTheDocument();
    expect(screen.getByText(/విడివిడి సేవల మొత్తం/i)).toBeInTheDocument();

    // Click back to English
    const englishBtn = screen.getByRole("button", { name: /^English$/i });
    await user.click(englishBtn);
    expect(
      screen.getByRole("heading", {
        name: /Your Medical Bill & Claim Overview/i,
      }),
    ).toBeInTheDocument();
  });

  it("explains bill totals in plain language with Indian Rupee formatting", async () => {
    renderPatientSummaryPage("claim-memorial-002");

    // Wait for claim data to load
    expect(await screen.findByText(/BB-DEMO-1001/i)).toBeInTheDocument();

    // Printed Bill Total
    expect(screen.getAllByText(/Printed Bill Total/i).length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText("₹48,500")).toBeInTheDocument();

    // Sum of All Charges
    expect(screen.getByText(/Sum of All Charges/i)).toBeInTheDocument();
    expect(screen.getByText("₹50,000")).toBeInTheDocument();

    // Bill Variance
    expect(screen.getAllByText(/Bill Variance/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/\+₹1,500/i)).toBeInTheDocument();

    // Estimated Patient Share
    expect(screen.getByText(/Est\. Your Share/i)).toBeInTheDocument();
    expect(screen.getAllByText("₹8,500").length).toBeGreaterThan(0);
  });

  it("displays the 4-stage claim progress lifecycle tracker", async () => {
    renderPatientSummaryPage("claim-memorial-002");

    // Wait for claim data to load
    expect(await screen.findByText(/BB-DEMO-1001/i)).toBeInTheDocument();

    expect(screen.getByText(/Claim Tracking Timeline/i)).toBeInTheDocument();
    expect(screen.getByText(/Bill Scanned/i)).toBeInTheDocument();
    expect(screen.getByText(/Math Checked/i)).toBeInTheDocument();
    expect(screen.getByText(/Insurer TPA Review/i)).toBeInTheDocument();
    expect(screen.getByText(/Final Settlement/i)).toBeInTheDocument();
  });

  it("itemizes services and distinguishes verified charges from discrepancies and unreadable codes", async () => {
    renderPatientSummaryPage("claim-memorial-002");

    // Wait for claim data to load
    expect(await screen.findByText(/BB-DEMO-1001/i)).toBeInTheDocument();

    // Table of services
    expect(
      screen.getByText(/Itemized Hospital Services & Charges/i),
    ).toBeInTheDocument();

    // Verified badge
    const verifiedBadges = screen.getAllByText(/Verified/i);
    expect(verifiedBadges.length).toBeGreaterThan(0);

    // Math mismatch on line 7
    const mathMismatchElements = screen.getAllByText(/Math mismatch/i);
    expect(mathMismatchElements.length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Math Mismatch/i).length).toBeGreaterThan(0);
  });

  it("prominently renders the mandatory AI-generated summary notice and healthcare legal disclaimers", async () => {
    renderPatientSummaryPage("claim-memorial-002");

    // Wait for claim data to load
    expect(await screen.findByText(/BB-DEMO-1001/i)).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        name: /AI-Generated Explanatory Notice & Important Disclaimers/i,
      }),
    ).toBeInTheDocument();

    // Disclaimers
    expect(
      screen.getByText(/1\. Informational Aid Only:/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/2\. No Medical Advice:/i)).toBeInTheDocument();
    expect(
      screen.getByText(/BillBridge does not provide medical advice/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/3\. No Coverage Determination or Guarantee:/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /BillBridge does not determine insurance policy coverage, approve claims, or guarantee reimbursement/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Please always confirm official balances directly with your hospital's billing desk/i,
      ),
    ).toBeInTheDocument();
  });

  it("displays patient authorization privacy protection notice with masked policy number", async () => {
    renderPatientSummaryPage("claim-memorial-002");

    // Wait for claim data to load
    expect(await screen.findByText(/BB-DEMO-1001/i)).toBeInTheDocument();

    expect(screen.getByText(/Authorized Patient Record:/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /Scoped strictly to patient PT-34901\. Cross-patient access is prevented/i,
      ),
    ).toBeInTheDocument();

    // Masked policy number (starts with POL-)
    expect(screen.getByText(/POL-.*2026/i)).toBeInTheDocument();
  });

  it("renders not found state when invalid claim ID is requested", async () => {
    renderPatientSummaryPage("claim-does-not-exist");

    expect(
      await screen.findByText(/Patient Record Not Found/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Return to Claims List/i }),
    ).toBeInTheDocument();
  });
});

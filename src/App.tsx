import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { RoleProvider } from "@/context/RoleContext";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/ui/toast";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { LoginPage } from "@/pages/LoginPage";
import { AuthCallbackPage } from "@/pages/auth/AuthCallbackPage";
import { UnauthorizedPage } from "@/pages/auth/UnauthorizedPage";
import { PendingApprovalPage } from "@/pages/auth/PendingApprovalPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { SuperAdminPage } from "@/pages/admin/SuperAdminPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { UploadPage } from "@/pages/UploadPage";
import { BillsPage } from "@/pages/BillsPage";
import { ClaimsListPage } from "@/pages/ClaimsListPage";
import { ClaimDetailPage } from "@/pages/ClaimDetailPage";
import { ReviewPage } from "@/pages/ReviewPage";
import { InsurerQueuePage } from "@/pages/InsurerQueuePage";
import { InsurerReviewDetailPage } from "@/pages/InsurerReviewDetailPage";
import { PatientClaimSummaryPage } from "@/pages/PatientClaimSummaryPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { NotificationsPage } from "@/pages/NotificationsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { DesignSystemShowcase } from "@/pages/DesignSystemShowcase";
import { LandingPage } from "@/pages/LandingPage";
import { HospitalAdminPage } from "@/pages/hospital/HospitalAdminPage";
import { InsuranceAdminPage } from "@/pages/insurance/InsuranceAdminPage";

export function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <RoleProvider defaultRole="hospital_staff">
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <Routes>
                {/* Landing Page (Dedicated Full-Width Experience) */}
                <Route path="/" element={<LandingPage />} />

                {/* Authentication Entry & OAuth Flow Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/auth/callback" element={<AuthCallbackPage />} />
                <Route path="/unauthorized" element={<UnauthorizedPage />} />
                <Route path="/pending-approval" element={<PendingApprovalPage />} />

                {/* Main Shared Layout Shell */}
                <Route element={<AppShell />}>
                  {/* General Dashboard */}
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/profile" element={<ProfilePage />} />

                  {/* Super Admin Portal */}
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute allowedRoles={["super_admin", "platform_admin"]}>
                        <SuperAdminPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Hospital Admin Portal */}
                  <Route
                    path="/hospital"
                    element={
                      <ProtectedRoute
                        allowedRoles={["hospital_admin", "hospital_staff", "super_admin", "platform_admin"]}
                      >
                        <HospitalAdminPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/hospital/admin" element={<Navigate to="/hospital" replace />} />

                  {/* Insurance Admin Portal */}
                  <Route
                    path="/insurance"
                    element={
                      <ProtectedRoute
                        allowedRoles={["insurance_admin", "insurer_reviewer", "super_admin", "platform_admin"]}
                      >
                        <InsuranceAdminPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/insurance/admin" element={<Navigate to="/insurance" replace />} />

                  {/* Document Intake & Processing */}
                  <Route path="/upload" element={<UploadPage />} />
                  <Route path="/bills" element={<BillsPage />} />

                  {/* Claims Management */}
                  <Route path="/claims" element={<ClaimsListPage />} />
                  <Route path="/claims/:id" element={<ClaimDetailPage />} />
                  <Route
                    path="/claims/:id/patient"
                    element={<PatientClaimSummaryPage />}
                  />
                  <Route
                    path="/patient/claims/:id"
                    element={<PatientClaimSummaryPage />}
                  />

                  {/* Insurer Adjudication */}
                  <Route path="/queue" element={<InsurerQueuePage />} />
                  <Route
                    path="/queue/:id"
                    element={<InsurerReviewDetailPage />}
                  />
                  <Route path="/review/:id" element={<ReviewPage />} />

                  {/* Analytics & System */}
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route
                    path="/notifications"
                    element={<NotificationsPage />}
                  />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route
                    path="/design-system"
                    element={<DesignSystemShowcase />}
                  />

                  {/* Fallback */}
                  <Route
                    path="*"
                    element={<Navigate to="/" replace />}
                  />
                </Route>
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </RoleProvider>
    </ThemeProvider>
  );
}

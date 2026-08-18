import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { AppShell } from "@app/components/layout/AppShell.js";
import { AuthProvider } from "@app/features/auth/AuthProvider.js";
import { ForgotPasswordPage } from "@app/features/auth/ForgotPasswordPage.js";
import { LoginPage } from "@app/features/auth/LoginPage.js";
import { RequireAuth } from "@app/features/auth/RequireAuth.js";
import { ResetPasswordPage } from "@app/features/auth/ResetPasswordPage.js";
import { SignupPage } from "@app/features/auth/SignupPage.js";
import { DashboardPage } from "@app/features/dashboard/DashboardPage.js";
import { PropertiesPage } from "@app/features/properties/PropertiesPage.js";
import { PropertyDetailPage } from "@app/features/properties/PropertyDetailPage.js";
import { PropertyFormPage } from "@app/features/properties/PropertyFormPage.js";
import { UnitsPage } from "@app/features/units/UnitsPage.js";
import { UnitFormPage } from "@app/features/units/UnitFormPage.js";
import { TenantsPage } from "@app/features/tenants/TenantsPage.js";
import { TenantDetailPage } from "@app/features/tenants/TenantDetailPage.js";
import { TenantFormPage } from "@app/features/tenants/TenantFormPage.js";
import { LeasesPage } from "@app/features/leases/LeasesPage.js";
import { LeaseDetailPage } from "@app/features/leases/LeaseDetailPage.js";
import { LeaseFormPage } from "@app/features/leases/LeaseFormPage.js";
import { PaymentsPage } from "@app/features/payments/PaymentsPage.js";
import { PaymentFormPage } from "@app/features/payments/PaymentFormPage.js";
import { ExpensesPage } from "@app/features/expenses/ExpensesPage.js";
import { ExpenseFormPage } from "@app/features/expenses/ExpenseFormPage.js";
import { MaintenancePage } from "@app/features/maintenance/MaintenancePage.js";
import { MaintenanceDetailPage } from "@app/features/maintenance/MaintenanceDetailPage.js";
import { MaintenanceFormPage } from "@app/features/maintenance/MaintenanceFormPage.js";

export function App() {
  return (
    <BrowserRouter>
      {/* Inside the router: the provider redirects and reads location on sign-out. */}
      <AuthProvider>
        <Routes>
          {/* Signed-out routes. /reset-password sits here deliberately — the recovery
              link creates a real session, so a guard would wave it through to the
              dashboard instead of letting the user finish setting a password. */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route element={<RequireAuth />}>
            <Route element={<AppShell />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />

              <Route path="/properties" element={<PropertiesPage />} />
              <Route path="/properties/new" element={<PropertyFormPage />} />
              <Route path="/properties/:id" element={<PropertyDetailPage />} />
              <Route path="/properties/:id/edit" element={<PropertyFormPage />} />

              <Route path="/units" element={<UnitsPage />} />
              <Route path="/units/new" element={<UnitFormPage />} />
              <Route path="/units/:id/edit" element={<UnitFormPage />} />

              <Route path="/tenants" element={<TenantsPage />} />
              <Route path="/tenants/new" element={<TenantFormPage />} />
              <Route path="/tenants/:id" element={<TenantDetailPage />} />
              <Route path="/tenants/:id/edit" element={<TenantFormPage />} />

              <Route path="/leases" element={<LeasesPage />} />
              <Route path="/leases/new" element={<LeaseFormPage />} />
              <Route path="/leases/:id" element={<LeaseDetailPage />} />
              <Route path="/leases/:id/edit" element={<LeaseFormPage />} />

              <Route path="/payments" element={<PaymentsPage />} />
              <Route path="/payments/new" element={<PaymentFormPage />} />
              <Route path="/payments/:id/edit" element={<PaymentFormPage />} />

              <Route path="/expenses" element={<ExpensesPage />} />
              <Route path="/expenses/new" element={<ExpenseFormPage />} />
              <Route path="/expenses/:id/edit" element={<ExpenseFormPage />} />

              <Route path="/maintenance" element={<MaintenancePage />} />
              <Route path="/maintenance/new" element={<MaintenanceFormPage />} />
              <Route path="/maintenance/:id" element={<MaintenanceDetailPage />} />
              <Route path="/maintenance/:id/edit" element={<MaintenanceFormPage />} />

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/layout/Layout';
import LoginPage from './pages/auth/LoginPage';
import { Spinner } from './components/ui';

// ── Lazy pages ────────────────────────────────────────────────────────────────
const DashboardPage          = lazy(() => import('./pages/dashboard/DashboardPage'));
const ClientsPage            = lazy(() => import('./pages/clients/ClientsPage'));
const ClientDetailPage       = lazy(() => import('./pages/clients/ClientDetailPage'));
const SuppliersPage          = lazy(() => import('./pages/suppliers/SuppliersPage'));
const SupplierDetailPage     = lazy(() => import('./pages/suppliers/Supplierdetailpage'));
const ProductsPage           = lazy(() => import('./pages/products/ProductsPage'));
const SalesPage              = lazy(() => import('./pages/sales/SalesPage'));
const PurchasesPage          = lazy(() => import('./pages/purchases/PurchasesPage'));
const StockPage              = lazy(() => import('./pages/stock/StockPage'));
const QuotesPage             = lazy(() => import('./pages/quotes/QuotesPage'));
const ChargesPage            = lazy(() => import('./pages/charges/ChargesPage'));
const EmployeesPage          = lazy(() => import('./pages/employees/EmployeesPage'));
const AccountingPage         = lazy(() => import('./pages/accounting/AccountingPage'));
const ReportsPage            = lazy(() => import('./pages/reports/ReportsPage'));
const SettingsPage           = lazy(() => import('./pages/settings/SettingsPage'));
const NotificationsPage      = lazy(() => import('./pages/notifications/NotificationsPage'));
const ChangePasswordPage     = lazy(() => import('./pages/auth/ChangePasswordPage'));
const ForgotPasswordPage     = lazy(() => import('./pages/auth/Forgotpasswordpage'));

// Admin pages
const AdminDashboard         = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminCompaniesPage     = lazy(() => import('./pages/admin/AdminCompaniesPage'));
const AddCompanyPage         = lazy(() => import('./pages/admin/AddCompanyPage'));
const AdminUsersPage         = lazy(() => import('./pages/admin/AdminUsersPage'));
const AdminSubscriptionsPage = lazy(() => import('./pages/admin/AdminSubscriptionsPage'));

// ── QueryClient ───────────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 30,
      refetchOnWindowFocus: false,
    },
  },
});

// ── Fallback spinner ──────────────────────────────────────────────────────────
const PageSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <Spinner size="lg" />
  </div>
);

// ── Full-screen loader (auth init) ────────────────────────────────────────────
const FullLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
    <Spinner size="lg" />
  </div>
);

// ── Route guards ──────────────────────────────────────────────────────────────
const ProtectedRoutes: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <FullLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (
    <Suspense fallback={<PageSpinner />}>
      <Layout />
    </Suspense>
  );
};

const SystemAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (user?.role !== 'system_admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <FullLoader />;
  if (isAuthenticated) {
    return <Navigate to={user?.role === 'system_admin' ? '/admin/dashboard' : '/dashboard'} replace />;
  }
  return <>{children}</>;
};

// ── App ───────────────────────────────────────────────────────────────────────
const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              className: 'dark:!bg-slate-800 dark:!text-white !text-sm !rounded-xl !shadow-card',
              duration: 3500,
              success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
              error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
          <Routes>
            {/* Public */}
            <Route path="/login"           element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/change-password" element={<Suspense fallback={<FullLoader />}><ChangePasswordPage /></Suspense>} />
            <Route path="/forgot-password" element={<Suspense fallback={<FullLoader />}><ForgotPasswordPage /></Suspense>} />

            {/* Protected */}
            <Route path="/" element={<ProtectedRoutes />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard"             element={<DashboardPage />} />
              <Route path="clients"               element={<ClientsPage />} />
              <Route path="clients/:clientId"     element={<ClientDetailPage />} />
              <Route path="suppliers"             element={<SuppliersPage />} />
              <Route path="suppliers/:supplierId" element={<SupplierDetailPage />} />
              <Route path="products"              element={<ProductsPage />} />
              <Route path="sales"                 element={<SalesPage />} />
              <Route path="purchases"             element={<PurchasesPage />} />
              <Route path="stock"                 element={<StockPage />} />
              <Route path="quotes"                element={<QuotesPage />} />
              <Route path="charges"               element={<ChargesPage />} />
              <Route path="employees"             element={<EmployeesPage />} />
              <Route path="accounting"            element={<AccountingPage />} />
              <Route path="reports"               element={<ReportsPage />} />
              <Route path="settings"              element={<SettingsPage />} />
              <Route path="notifications"         element={<NotificationsPage />} />

              {/* System Admin only */}
              <Route path="admin/dashboard"     element={<SystemAdminRoute><AdminDashboard /></SystemAdminRoute>} />
              <Route path="admin/companies"     element={<SystemAdminRoute><AdminCompaniesPage /></SystemAdminRoute>} />
              <Route path="admin/companies/new" element={<SystemAdminRoute><AddCompanyPage /></SystemAdminRoute>} />
              <Route path="admin/users"         element={<SystemAdminRoute><AdminUsersPage /></SystemAdminRoute>} />
              <Route path="admin/subscriptions" element={<SystemAdminRoute><AdminSubscriptionsPage /></SystemAdminRoute>} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;

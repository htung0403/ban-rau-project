import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BreadcrumbProvider } from './context/BreadcrumbContext';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import ModulePage from './pages/ModulePage';
import CopyrightPage from './pages/CopyrightPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/auth/LoginPage';
import ImportOrdersPage from './pages/import-orders/ImportOrdersPage';
import ExportOrdersPage from './pages/export-orders/ExportOrdersPage';
import DeliveryPage from './pages/delivery/DeliveryPage';
import WarehousesPage from './pages/warehouse/WarehousesPage';
import ProductSettingsPage from './pages/warehouse/ProductSettingsPage';
import VegetableProductSettingsPage from './pages/warehouse/VegetableProductSettingsPage';
import VegetableWarehousePage from './pages/warehouse/VegetableWarehousePage';
import VegetableImportsPage from './pages/import-orders/VegetableImportsPage';
import VegetablesPage from './pages/import-orders/VegetablesPage';
import VegetableDeliveryPage from './pages/delivery/VegetableDeliveryPage';
import EmployeesPage from './pages/hr/EmployeesPage';
import LeaveRequestsPage from './pages/hr/LeaveRequestsPage';
import AttendancePage from './pages/hr/AttendancePage';
import PayrollPage from './pages/payroll/PayrollPage';
import ApprovalsPage from './pages/hr/ApprovalsPage';
import SalaryAdvancesPage from './pages/hr/SalaryAdvancesPage';
import VehiclesPage from './pages/vehicles/VehiclesPage';
import DriverCheckinPage from './pages/vehicles/DriverCheckinPage';
import PaymentCollectionsPage from './pages/vehicles/payment-collections/PaymentCollectionsPage';
import GroceryCustomersPage from './pages/customers/GroceryCustomersPage';
import VegetableCustomersPage from './pages/customers/VegetableCustomersPage';
import WholesaleCustomersPage from './pages/customers/WholesaleCustomersPage';
import SalarySettingsPage from './pages/hr/SalarySettingsPage';
import CustomerDetailPage from './pages/customers/CustomerDetailPage';
import CustomerDebtPage from './pages/customers/CustomerDebtPage';
import RevenueReportPage from './pages/customers/RevenueReportPage';
import React from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000, // 30s
    },
  },
});

// Protected Route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground text-[13px] font-medium">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Routes */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/ho-so" element={<ProfilePage />} />
        <Route path="/ho-so/:id" element={<ProfilePage />} />

        {/* Hang hoa module */}
        <Route path="/hang-hoa" element={<ModulePage />} />
        <Route path="/hang-hoa/nhap-hang" element={<ImportOrdersPage />} />
        <Route path="/hang-hoa/nhap-hang-rau" element={<VegetableImportsPage />} />
        <Route path="/hang-hoa/hang-rau" element={<VegetablesPage />} />
        <Route path="/hang-hoa/giao-hang-rau" element={<VegetableDeliveryPage />} />
        <Route path="/hang-hoa/kho-rau" element={<VegetableWarehousePage />} />
        <Route path="/hang-hoa/xuat-hang" element={<ExportOrdersPage />} />
        <Route path="/hang-hoa/giao-hang" element={<DeliveryPage />} />
        <Route path="/hang-hoa/kho" element={<WarehousesPage />} />
        <Route path="/hang-hoa/cai-dat" element={<ProductSettingsPage />} />
        <Route path="/hang-hoa/cai-dat-rau" element={<VegetableProductSettingsPage />} />

        <Route path="/hanh-chinh-nhan-su" element={<ModulePage />} />
        <Route path="/hanh-chinh-nhan-su/nhan-su" element={<EmployeesPage />} />
        <Route path="/hanh-chinh-nhan-su/nhan-su/:id" element={<ProfilePage />} />
        <Route path="/hanh-chinh-nhan-su/nghi-phep" element={<LeaveRequestsPage />} />
        <Route path="/hanh-chinh-nhan-su/cham-cong" element={<AttendancePage />} />
        <Route path="/hanh-chinh-nhan-su/luong" element={<PayrollPage />} />
        <Route path="/hanh-chinh-nhan-su/cai-dat-luong" element={<SalarySettingsPage />} />
        <Route path="/hanh-chinh-nhan-su/ung-luong" element={<SalaryAdvancesPage />} />
        <Route path="/hanh-chinh-nhan-su/duyet-don" element={<ApprovalsPage />} />

        {/* Ke toan module */}
        <Route path="/ke-toan">
          <Route index element={<ModulePage />} />
          <Route path="khach-hang-tap-hoa" element={<GroceryCustomersPage />} />
          <Route path="khach-hang-rau" element={<VegetableCustomersPage />} />
          <Route path="vua-rau" element={<WholesaleCustomersPage />} />
          <Route path="khach-hang/:id" element={<CustomerDetailPage />} />
          <Route path="cong-no" element={<CustomerDebtPage />} />
          <Route path="doanh-thu" element={<RevenueReportPage />} />
        </Route>

        {/* Quan ly xe module */}
        <Route path="/quan-ly-xe">
          <Route index element={<ModulePage />} />
          <Route path="danh-sach" element={<VehiclesPage />} />
          <Route path="check-in" element={<DriverCheckinPage />} />
          <Route path="thu-tien" element={<PaymentCollectionsPage />} />
        </Route>

        {/* Utility */}
        <Route path="/ban-quyen" element={<CopyrightPage />} />
        <Route path="/cai-dat" element={<SettingsPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BreadcrumbProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
          <Toaster
            position="top-right"
            containerStyle={{ zIndex: 100000 }}
            toastOptions={{
              duration: 3000,
              style: {
                background: '#0f172a',
                color: '#f8fafc',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: '600',
                padding: '12px 16px',
                border: '1px solid rgba(255,255,255,0.1)',
              },
              success: {
                iconTheme: { primary: '#22c55e', secondary: '#fff' },
              },
              error: {
                iconTheme: { primary: '#ef4444', secondary: '#fff' },
              },
            }}
          />
        </BreadcrumbProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

import { Suspense, lazy } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { BusinessProvider } from "@/contexts/BusinessContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAutoBackup } from "@/hooks/useAutoBackup";
import { logger } from "@/lib/logger";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import NotFound from "@/pages/NotFound";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Drinks = lazy(() => import("@/pages/products/Drinks"));
const Meals = lazy(() => import("@/pages/products/Meals"));
const Stock = lazy(() => import("@/pages/Stock"));
const StockMovements = lazy(() => import("@/pages/StockMovements"));
const Inventory = lazy(() => import("@/pages/Inventory"));
const Sales = lazy(() => import("@/pages/Sales"));
const SalesHistory = lazy(() => import("@/pages/SalesHistory"));
const Invoices = lazy(() => import("@/pages/Invoices"));
const Tables = lazy(() => import("@/pages/Tables"));
const Reports = lazy(() => import("@/pages/Reports"));
const Customers = lazy(() => import("@/pages/Customers"));
const Credits = lazy(() => import("@/pages/Credits"));
const CreditsVendas = lazy(() => import("@/pages/CreditsVendas"));
const Settings = lazy(() => import("@/pages/Settings"));
const Users = lazy(() => import("@/pages/settings/Users"));
const Financial = lazy(() => import("@/pages/Financial"));
const Employees = lazy(() => import("@/pages/Employees"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppContent() {
  useAutoBackup();
  logger.info('Marrengula IT ERP initialized', { version: '1.0.0' });
  return null;
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <BusinessProvider>
          <TooltipProvider>
            <AppContent />
            <Toaster />
            <Sonner />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                  <Route path="/dashboard" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
                  <Route path="/products/drinks" element={<ErrorBoundary><Drinks /></ErrorBoundary>} />
                  <Route path="/products/meals" element={<ErrorBoundary><Meals /></ErrorBoundary>} />
                  <Route path="/stock" element={<ErrorBoundary><Stock /></ErrorBoundary>} />
                  <Route path="/stock/movements" element={<ErrorBoundary><StockMovements /></ErrorBoundary>} />
                  <Route path="/inventory" element={<ErrorBoundary><Inventory /></ErrorBoundary>} />
                  <Route path="/sales" element={<ErrorBoundary><Sales /></ErrorBoundary>} />
                  <Route path="/sales/history" element={<ErrorBoundary><SalesHistory /></ErrorBoundary>} />
                  <Route path="/tables" element={<ErrorBoundary><Tables /></ErrorBoundary>} />
                  <Route path="/reports" element={<ErrorBoundary><Reports /></ErrorBoundary>} />
                  <Route path="/invoices" element={<ErrorBoundary><Invoices /></ErrorBoundary>} />
                  <Route path="/customers" element={<ErrorBoundary><Customers /></ErrorBoundary>} />
                  <Route path="/credits" element={<ErrorBoundary><Credits /></ErrorBoundary>} />
                  <Route path="/credits-vendas" element={<ErrorBoundary><CreditsVendas /></ErrorBoundary>} />
                  <Route path="/financial" element={<ErrorBoundary><Financial /></ErrorBoundary>} />
                  <Route path="/employees" element={<ErrorBoundary><Employees /></ErrorBoundary>} />
                  <Route path="/settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
                  <Route path="/settings/users" element={<ErrorBoundary><ProtectedRoute requireSuperAdmin><Users /></ProtectedRoute></ErrorBoundary>} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </TooltipProvider>
        </BusinessProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;

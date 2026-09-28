import { Suspense, lazy } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
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
const InventoryIngredients = lazy(() => import("@/pages/InventoryIngredients"));
const InventoryRecipes = lazy(() => import("@/pages/InventoryRecipes"));
const Sales = lazy(() => import("@/pages/Sales"));
const SalesHistory = lazy(() => import("@/pages/SalesHistory"));
const Invoices = lazy(() => import("@/pages/Invoices"));
const InvoiceDetail = lazy(() => import("@/pages/InvoiceDetail"));
const Tables = lazy(() => import("@/pages/Tables"));
const KDS = lazy(() => import("@/pages/KDS"));
const Cashier = lazy(() => import("@/pages/Cashier"));
const Reports = lazy(() => import("@/pages/Reports"));
const Customers = lazy(() => import("@/pages/Customers"));
const CustomerDetail = lazy(() => import("@/pages/customers/CustomerDetail"));
const Collections = lazy(() => import("@/pages/Collections"));
const Credits = lazy(() => import("@/pages/Credits"));
const CreditsVendas = lazy(() => import("@/pages/CreditsVendas"));
const Settings = lazy(() => import("@/pages/Settings"));
const Users = lazy(() => import("@/pages/settings/Users"));
const Financial = lazy(() => import("@/pages/Financial"));
const Employees = lazy(() => import("@/pages/Employees"));
const GoalsPage = lazy(() => import("@/pages/Goals"));
const BackupPage = lazy(() => import("@/pages/Backup"));
const AuditPage = lazy(() => import("@/pages/Audit"));
const ExecutivePage = lazy(() => import("@/pages/Executive"));
const BiPage = lazy(() => import("@/pages/Bi"));
const IvaReportPage = lazy(() => import("@/pages/IvaReport"));
const SystemHealth = lazy(() => import("@/pages/SystemHealth"));
const Suppliers = lazy(() => import("@/pages/Suppliers"));
const SupplierDetail = lazy(() => import("@/pages/suppliers/SupplierDetail"));
const Purchases = lazy(() => import("@/pages/purchases/Purchases"));
const PurchasesNew = lazy(() => import("@/pages/purchases/PurchasesNew"));
const PurchaseDetail = lazy(() => import("@/pages/purchases/PurchaseDetail"));
const Receipts = lazy(() => import("@/pages/receipts/Receipts"));
const Losses = lazy(() => import("@/pages/losses/Losses"));
const CentralAdmin = lazy(() => import("@/pages/CentralAdmin"));

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
    <HashRouter>
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
                  <Route path="/dashboard" element={<ErrorBoundary><ProtectedRoute requiredFeature="dashboard"><Dashboard /></ProtectedRoute></ErrorBoundary>} />
                  <Route path="/products/drinks" element={<ErrorBoundary><ProtectedRoute requiredFeature="produtos_visualizar"><Drinks /></ProtectedRoute></ErrorBoundary>} />
                  <Route path="/products/meals" element={<ErrorBoundary><ProtectedRoute requiredFeature="produtos_visualizar"><Meals /></ProtectedRoute></ErrorBoundary>} />
                  <Route path="/stock" element={<ErrorBoundary><ProtectedRoute requiredFeature="inventario_visualizar"><Stock /></ProtectedRoute></ErrorBoundary>} />
                  <Route path="/stock/movements" element={<ErrorBoundary><ProtectedRoute requiredFeature="inventario_visualizar"><StockMovements /></ProtectedRoute></ErrorBoundary>} />
                  <Route path="/inventory" element={<ErrorBoundary><ProtectedRoute requiredFeature="inventario_visualizar"><Inventory /></ProtectedRoute></ErrorBoundary>} />
                  <Route path="/inventory/ingredients" element={<ErrorBoundary><ProtectedRoute requiredFeature="inventario_visualizar"><InventoryIngredients /></ProtectedRoute></ErrorBoundary>} />
                  <Route path="/inventory/recipes" element={<ErrorBoundary><ProtectedRoute requiredFeature="inventario_visualizar"><InventoryRecipes /></ProtectedRoute></ErrorBoundary>} />
                  <Route path="/sales" element={<ErrorBoundary><ProtectedRoute requiredFeature="pdv"><Sales /></ProtectedRoute></ErrorBoundary>} />
                  <Route path="/sales/history" element={<ErrorBoundary><ProtectedRoute requiredFeature="vendas_historico_geral"><SalesHistory /></ProtectedRoute></ErrorBoundary>} />
                  <Route path="/tables" element={<ErrorBoundary><ProtectedRoute requiredFeature="mesas"><Tables /></ProtectedRoute></ErrorBoundary>} />
                  <Route path="/kds" element={<ErrorBoundary><ProtectedRoute requiredFeature="kds"><KDS /></ProtectedRoute></ErrorBoundary>} />
                  <Route path="/cashier" element={<ErrorBoundary><ProtectedRoute requiredFeature="caixa_proprio"><Cashier /></ProtectedRoute></ErrorBoundary>} />
                  <Route path="/reports" element={<ErrorBoundary><ProtectedRoute requiredFeature="relatorios"><Reports /></ProtectedRoute></ErrorBoundary>} />
                  <Route path="/invoices" element={<ErrorBoundary><ProtectedRoute requiredFeature="facturas"><Invoices /></ProtectedRoute></ErrorBoundary>} />
                  <Route path="/invoices/:id" element={<ErrorBoundary><ProtectedRoute requiredFeature="facturas"><InvoiceDetail /></ProtectedRoute></ErrorBoundary>} />
                  <Route path="/customers" element={<ErrorBoundary><ProtectedRoute requiredFeature="clientes"><Customers /></ProtectedRoute></ErrorBoundary>} />
                  <Route path="/customers/:id" element={<ErrorBoundary><ProtectedRoute requiredFeature="clientes"><CustomerDetail /></ProtectedRoute></ErrorBoundary>} />
                  <Route path="/cobrancas" element={<ErrorBoundary><ProtectedRoute requiredFeature="cobrancas"><Collections /></ProtectedRoute></ErrorBoundary>} />
                  <Route path="/credits" element={<ErrorBoundary><ProtectedRoute requiredFeature="creditos"><Credits /></ProtectedRoute></ErrorBoundary>} />
                  <Route path="/credits-vendas" element={<ErrorBoundary><ProtectedRoute requiredFeature="creditos"><CreditsVendas /></ProtectedRoute></ErrorBoundary>} />
                  <Route path="/financial" element={<ErrorBoundary><ProtectedRoute requiredFeature="financeiro"><Financial /></ProtectedRoute></ErrorBoundary>} />
                  <Route path="/employees" element={<ErrorBoundary><ProtectedRoute requiredFeature="funcionarios"><Employees /></ProtectedRoute></ErrorBoundary>} />
                  <Route path="/goals" element={<ErrorBoundary><ProtectedRoute requiredFeature="metas"><GoalsPage /></ProtectedRoute></ErrorBoundary>} />
                  <Route path="/backup" element={<ErrorBoundary><ProtectedRoute requiredFeature="backup"><BackupPage /></ProtectedRoute></ErrorBoundary>} />
                  <Route path="/audit" element={<ErrorBoundary><ProtectedRoute requiredFeature="auditoria"><AuditPage /></ProtectedRoute></ErrorBoundary>} />
                  <Route path="/executive" element={<ErrorBoundary><ProtectedRoute requiredFeature="relatorios"><ExecutivePage /></ProtectedRoute></ErrorBoundary>} />
                  <Route path="/bi" element={<ErrorBoundary><ProtectedRoute requiredFeature="relatorios"><BiPage /></ProtectedRoute></ErrorBoundary>} />
                  <Route path="/iva-report" element={<ErrorBoundary><ProtectedRoute requiredFeature="relatorios"><IvaReportPage /></ProtectedRoute></ErrorBoundary>} />
                  <Route path="/settings" element={<ErrorBoundary><ProtectedRoute requiredFeature="configuracoes"><Settings /></ProtectedRoute></ErrorBoundary>} />
                  <Route path="/settings/users" element={<ErrorBoundary><ProtectedRoute requiredFeature="gestao_utilizadores"><Users /></ProtectedRoute></ErrorBoundary>} />
                  <Route path="/health" element={<ErrorBoundary><ProtectedRoute requiredFeature="configuracoes"><SystemHealth /></ProtectedRoute></ErrorBoundary>} />
                  <Route path="/administracao" element={<ErrorBoundary><ProtectedRoute requiredFeature="administracao"><CentralAdmin /></ProtectedRoute></ErrorBoundary>}
                  />
                  <Route path="/fornecedores" element={<ErrorBoundary><ProtectedRoute requiredFeature="inventario_visualizar"><Suppliers /></ProtectedRoute></ErrorBoundary>} />
                  <Route path="/fornecedores/:id" element={<ErrorBoundary><ProtectedRoute requiredFeature="inventario_visualizar"><SupplierDetail /></ProtectedRoute></ErrorBoundary>} />
                  <Route path="/compras/nova" element={<ErrorBoundary><ProtectedRoute requiredFeature="inventario_visualizar"><PurchasesNew /></ProtectedRoute></ErrorBoundary>} />
                  <Route path="/compras/:id" element={<ErrorBoundary><ProtectedRoute requiredFeature="inventario_visualizar"><PurchaseDetail /></ProtectedRoute></ErrorBoundary>} />
                  <Route path="/compras" element={<ErrorBoundary><ProtectedRoute requiredFeature="inventario_visualizar"><Purchases /></ProtectedRoute></ErrorBoundary>} />
                  <Route path="/rececoes" element={<ErrorBoundary><ProtectedRoute requiredFeature="inventario_visualizar"><Receipts /></ProtectedRoute></ErrorBoundary>} />
                  <Route path="/perdas" element={<ErrorBoundary><ProtectedRoute requiredFeature="inventario_visualizar"><Losses /></ProtectedRoute></ErrorBoundary>} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </TooltipProvider>
        </BusinessProvider>
      </AuthProvider>
    </HashRouter>
  </QueryClientProvider>
);

export default App;

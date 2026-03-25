import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AssistantProvider } from "@/contexts/AssistantContext";
import { Layout } from "./components/layout/Layout";
import Auth from "./pages/Auth";
import Hub from "./pages/Hub";
import CRM from "./pages/CRM";
import Pedidos from "./pages/Pedidos";
import Configuracoes from "./pages/Configuracoes";
import Financeiro from "./pages/Financeiro";
import Contabilidade from "./pages/Contabilidade";
import NotFound from "./pages/NotFound";
import AssinarComprovante from "./pages/AssinarComprovante";
// Institucional pages
import InstitucionalHome from "./pages/institucional/Home";
import InstitucionalProdutos from "./pages/institucional/Produtos";
import InstitucionalEcommerce from "./pages/institucional/Ecommerce";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AssistantProvider>
              <Routes>
                {/* Public Institutional Pages */}
                <Route path="/" element={<InstitucionalHome />} />
                <Route path="/produtos" element={<InstitucionalProdutos />} />
                <Route path="/ecommerce" element={<InstitucionalEcommerce />} />
                
                <Route path="/auth" element={<Auth />} />
                {/* Public route for client signature */}
                <Route path="/assinar" element={<AssinarComprovante />} />
                
                {/* Hub - main entry after login */}
                <Route path="/hub" element={<ProtectedRoute><Hub /></ProtectedRoute>} />

                {/* All module pages inside the Layout */}
                <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                  <Route path="/crm" element={<CRM />} />
                  <Route path="/pedidos" element={<Pedidos />} />
                  <Route path="/financeiro" element={<Financeiro />} />
                  <Route path="/contabilidade" element={<Contabilidade />} />
                  <Route path="/configuracoes" element={<Configuracoes />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </AssistantProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

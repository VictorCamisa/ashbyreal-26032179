import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Layout } from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import CRM from "./pages/CRM";
import Clientes from "./pages/Clientes";
import ClienteDetalhes from "./pages/ClienteDetalhes";
import Pedidos from "./pages/Pedidos";
import Estoque from "./pages/Estoque";
import WhatsApp from "./pages/WhatsApp";
import Suporte from "./pages/Suporte";
import Configuracoes from "./pages/Configuracoes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SidebarProvider defaultOpen={true}>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/crm" element={<CRM />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/cliente/:id" element={<ClienteDetalhes />} />
              <Route path="/pedidos" element={<Pedidos />} />
              <Route path="/estoque" element={<Estoque />} />
              <Route path="/whatsapp" element={<WhatsApp />} />
              <Route path="/suporte" element={<Suporte />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SidebarProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

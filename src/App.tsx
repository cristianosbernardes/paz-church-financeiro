import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ChurchProvider } from "@/contexts/ChurchContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Relatorio from "./pages/Relatorio";
import Transacoes from "./pages/Transacoes";
import Config from "./pages/Config";
import Membros from "./pages/Membros";
import MembroDetalhe from "./pages/MembroDetalhe";
import Fechamento from "./pages/Fechamento";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ChurchProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <AppLayout><Dashboard /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/relatorio"
                element={
                  <ProtectedRoute>
                    <AppLayout><Relatorio /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/transacoes"
                element={
                  <ProtectedRoute>
                    <AppLayout><Transacoes /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/membros"
                element={
                  <ProtectedRoute>
                    <AppLayout><Membros /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/membros/:id"
                element={
                  <ProtectedRoute>
                    <AppLayout><MembroDetalhe /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/fechamento"
                element={
                  <ProtectedRoute>
                    <AppLayout><Fechamento /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/config"
                element={
                  <ProtectedRoute>
                    <AppLayout><Config /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ChurchProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

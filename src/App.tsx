import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Produk from "./pages/Dashboard";
import StokMasuk from "./pages/StokMasuk";
import StokKeluar from "./pages/StokKeluar";
import Laporan from "./pages/Laporan";
import Cabang from "./pages/Cabang";
import JenisStokKeluar from "./pages/JenisStokKeluar";
import Pengguna from "./pages/Pengguna";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
          <Route path="/produk" element={<Produk />} />
          <Route path="/stok-masuk" element={<StokMasuk />} />
          <Route path="/stok-keluar" element={<StokKeluar />} />
          <Route path="/laporan" element={<Laporan />} />
          <Route path="/cabang" element={<Cabang />} />
          <Route path="/jenis-stok-keluar" element={<JenisStokKeluar />} />
          <Route path="/pengguna" element={<Pengguna />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

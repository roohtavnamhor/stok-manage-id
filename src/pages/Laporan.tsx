import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { FileText, TrendingUp, TrendingDown, Package as PackageIcon, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface StockSummary {
  product_name: string;
  variant: string | null;
  total_in: number;
  total_out: number;
  current_stock: number;
}

const Laporan = () => {
  const [stockSummary, setStockSummary] = useState<StockSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ totalIn: 0, totalOut: 0, totalStock: 0 });

  useEffect(() => {
    fetchStockSummary();
  }, []);

  const exportToPDF = () => {
    const doc = new jsPDF();
    const currentDate = new Date().toLocaleDateString('id-ID');
    
    // Add title
    doc.setFontSize(18);
    doc.text("Laporan Stok Barang", 14, 22);
    doc.setFontSize(11);
    doc.text(`Tanggal: ${currentDate}`, 14, 30);
    
    // Add summary
    doc.setFontSize(14);
    doc.text("Ringkasan", 14, 40);
    doc.setFontSize(10);
    doc.text(`Total Stok Masuk: ${totals.totalIn}`, 14, 48);
    doc.text(`Total Stok Keluar: ${totals.totalOut}`, 14, 54);
    doc.text(`Total Stok Tersedia: ${totals.totalStock}`, 14, 60);
    
    // Add table
    autoTable(doc, {
      startY: 70,
      head: [['Produk', 'Varian', 'Stok Masuk', 'Stok Keluar', 'Stok Tersedia']],
      body: stockSummary.map(item => [
        item.product_name,
        item.variant || '-',
        item.total_in.toString(),
        item.total_out.toString(),
        item.current_stock.toString()
      ]),
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      alternateRowStyles: { fillColor: [240, 240, 240] }
    });
    
    // Save PDF
    doc.save(`Laporan_Stok_${currentDate}.pdf`);
  };

  const fetchStockSummary = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all stock in
      const { data: stockInData } = await supabase
        .from("stock_in")
        .select("product_id, variant, quantity, products(name)");

      // Get all stock out
      const { data: stockOutData } = await supabase
        .from("stock_out")
        .select("product_id, variant, quantity, products(name)");

      // Calculate summary
      const summaryMap = new Map<string, StockSummary>();

      stockInData?.forEach((item: any) => {
        const key = `${item.product_id}-${item.variant || ""}`;
        const existing = summaryMap.get(key);
        if (existing) {
          existing.total_in += item.quantity;
          existing.current_stock += item.quantity;
        } else {
          summaryMap.set(key, {
            product_name: item.products.name,
            variant: item.variant,
            total_in: item.quantity,
            total_out: 0,
            current_stock: item.quantity,
          });
        }
      });

      stockOutData?.forEach((item: any) => {
        const key = `${item.product_id}-${item.variant || ""}`;
        const existing = summaryMap.get(key);
        if (existing) {
          existing.total_out += item.quantity;
          existing.current_stock -= item.quantity;
        } else {
          summaryMap.set(key, {
            product_name: item.products.name,
            variant: item.variant,
            total_in: 0,
            total_out: item.quantity,
            current_stock: -item.quantity,
          });
        }
      });

      const summary = Array.from(summaryMap.values());
      setStockSummary(summary);

      // Calculate totals
      const totalIn = summary.reduce((sum, item) => sum + item.total_in, 0);
      const totalOut = summary.reduce((sum, item) => sum + item.total_out, 0);
      const totalStock = summary.reduce((sum, item) => sum + item.current_stock, 0);
      setTotals({ totalIn, totalOut, totalStock });
    } catch (error) {
      console.error("Error fetching stock summary:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Laporan</h1>
          <p className="text-muted-foreground">Ringkasan stok dan pergerakan barang</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Stok Masuk</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.totalIn}</div>
              <p className="text-xs text-muted-foreground">Unit barang masuk</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Stok Keluar</CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.totalOut}</div>
              <p className="text-xs text-muted-foreground">Unit barang keluar</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stok Tersedia</CardTitle>
              <PackageIcon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.totalStock}</div>
              <p className="text-xs text-muted-foreground">Unit barang tersedia</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Ringkasan Stok Per Produk
              </CardTitle>
              <CardDescription>Detail stok untuk setiap produk dan varian</CardDescription>
            </div>
            <Button variant="outline" className="gap-2" onClick={exportToPDF}>
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Memuat data...</p>
              </div>
            ) : stockSummary.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Belum ada data stok</p>
              </div>
            ) : (
              <div className="space-y-4">
                {stockSummary.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{item.product_name}</h4>
                      {item.variant && (
                        <p className="text-sm text-muted-foreground">Varian: {item.variant}</p>
                      )}
                    </div>
                    <div className="flex gap-6 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Masuk</p>
                        <p className="text-sm font-semibold text-success">+{item.total_in}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Keluar</p>
                        <p className="text-sm font-semibold text-destructive">-{item.total_out}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Tersedia</p>
                        <p className={`text-lg font-bold ${item.current_stock > 0 ? "text-primary" : "text-destructive"}`}>
                          {item.current_stock}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Laporan;

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, Package, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

interface StockSummary {
  product_name: string;
  variant: string | null;
  total_in: number;
  total_out: number;
  current_stock: number;
}

interface StockInReport {
  product_name: string;
  variant: string | null;
  quantity: number;
  source: string;
  date: string;
}

interface StockOutReport {
  product_name: string;
  variant: string | null;
  quantity: number;
  destination: string;
  jenis: string;
  date: string;
}

const Laporan = () => {
  const [stockSummary, setStockSummary] = useState<StockSummary[]>([]);
  const [stockInReport, setStockInReport] = useState<StockInReport[]>([]);
  const [stockOutReport, setStockOutReport] = useState<StockOutReport[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperadmin, setIsSuperadmin] = useState<boolean | null>(null);
  
  const [filters, setFilters] = useState({
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    productId: "",
  });

  useEffect(() => {
    checkUserRole();
  }, []);

  useEffect(() => {
    if (isSuperadmin !== null) {
      fetchProducts();
      fetchStockSummary();
    }
  }, [isSuperadmin]);

  useEffect(() => {
    if (isSuperadmin !== null) {
      fetchStockInReport();
      fetchStockOutReport();
    }
  }, [filters, isSuperadmin]);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      setIsSuperadmin(profile?.role === "superadmin");
    } catch (error) {
      console.error("Error checking user role:", error);
      setIsSuperadmin(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase.from("products").select("id, name").order("name");

      if (!isSuperadmin) {
        query = query.eq("user_id", user.id);
      }

      const { data } = await query;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchStockSummary = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let stockInQuery = supabase.from("stock_in").select("product_id, variant, quantity, products(name)");
      let stockOutQuery = supabase.from("stock_out").select("product_id, variant, quantity, products(name)");

      if (!isSuperadmin) {
        stockInQuery = stockInQuery.eq("user_id", user.id);
        stockOutQuery = stockOutQuery.eq("user_id", user.id);
      }

      const [stockInRes, stockOutRes] = await Promise.all([
        stockInQuery,
        stockOutQuery,
      ]);

      const summaryMap = new Map<string, StockSummary>();

      stockInRes.data?.forEach((item: any) => {
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

      stockOutRes.data?.forEach((item: any) => {
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

      setStockSummary(Array.from(summaryMap.values()));
    } catch (error) {
      console.error("Error fetching stock summary:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStockInReport = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const startDate = new Date(filters.startDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);

      let query = supabase
        .from("stock_in")
        .select("*, products(name), cabang(name)")
        .gte("date", startDate.toISOString())
        .lte("date", endDate.toISOString())
        .order("date", { ascending: false });

      if (!isSuperadmin) {
        query = query.eq("user_id", user.id);
      }

      if (filters.productId) {
        query = query.eq("product_id", filters.productId);
      }

      const { data } = await query;
      setStockInReport(
        data?.map((item: any) => ({
          product_name: item.products.name,
          variant: item.variant,
          quantity: item.quantity,
          source: item.cabang?.name || "SUPPLIER",
          date: item.date,
        })) || []
      );
    } catch (error) {
      console.error("Error fetching stock in report:", error);
    }
  };

  const fetchStockOutReport = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const startDate = new Date(filters.startDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);

      let query = supabase
        .from("stock_out")
        .select("*, products(name), cabang(name), jenis_stok_keluar(name)")
        .gte("date", startDate.toISOString())
        .lte("date", endDate.toISOString())
        .order("date", { ascending: false });

      if (!isSuperadmin) {
        query = query.eq("user_id", user.id);
      }

      if (filters.productId) {
        query = query.eq("product_id", filters.productId);
      }

      const { data } = await query;
      setStockOutReport(
        data?.map((item: any) => ({
          product_name: item.products.name,
          variant: item.variant,
          quantity: item.quantity,
          destination: item.cabang?.name || "-",
          jenis: item.jenis_stok_keluar?.name || "-",
          date: item.date,
        })) || []
      );
    } catch (error) {
      console.error("Error fetching stock out report:", error);
    }
  };

  const exportToPDF = (type: string) => {
    const doc = new jsPDF();
    const currentDate = format(new Date(), "dd MMM yyyy");
    
    doc.setFontSize(18);
    if (type === "summary") {
      doc.text("Laporan Sisa Stok", 14, 22);
      doc.setFontSize(11);
      doc.text(`Tanggal: ${currentDate}`, 14, 30);
      
      autoTable(doc, {
        startY: 40,
        head: [['Produk', 'Varian', 'Stok Masuk', 'Stok Keluar', 'Sisa Stok']],
        body: stockSummary.map(item => [
          item.product_name,
          item.variant || '-',
          item.total_in.toString(),
          item.total_out.toString(),
          item.current_stock.toString()
        ]),
        theme: 'grid',
      });
      doc.save(`Laporan_Sisa_Stok_${currentDate}.pdf`);
    } else if (type === "stockin") {
      doc.text("Laporan Stok Masuk", 14, 22);
      doc.setFontSize(11);
      doc.text(`Periode: ${filters.startDate} s/d ${filters.endDate}`, 14, 30);
      
      autoTable(doc, {
        startY: 40,
        head: [['Tanggal', 'Produk', 'Varian', 'Jumlah', 'Sumber']],
        body: stockInReport.map(item => [
          format(new Date(item.date), "dd/MM/yyyy"),
          item.product_name,
          item.variant || '-',
          item.quantity.toString(),
          item.source
        ]),
        theme: 'grid',
      });
      doc.save(`Laporan_Stok_Masuk_${currentDate}.pdf`);
    } else if (type === "stockout") {
      doc.text("Laporan Stok Keluar", 14, 22);
      doc.setFontSize(11);
      doc.text(`Periode: ${filters.startDate} s/d ${filters.endDate}`, 14, 30);
      
      autoTable(doc, {
        startY: 40,
        head: [['Tanggal', 'Produk', 'Varian', 'Jumlah', 'Tujuan', 'Jenis']],
        body: stockOutReport.map(item => [
          format(new Date(item.date), "dd/MM/yyyy"),
          item.product_name,
          item.variant || '-',
          item.quantity.toString(),
          item.destination,
          item.jenis
        ]),
        theme: 'grid',
      });
      doc.save(`Laporan_Stok_Keluar_${currentDate}.pdf`);
    }
  };

  const uniqueProducts = Array.from(
    new Map(products.map((p) => [p.name, p])).values()
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Laporan</h1>
          <p className="text-muted-foreground">Ringkasan stok dan pergerakan barang</p>
        </div>

        <Tabs defaultValue="summary" className="space-y-4">
          <TabsList>
            <TabsTrigger value="summary" className="gap-2">
              <Package className="h-4 w-4" />
              Sisa Stok
            </TabsTrigger>
            <TabsTrigger value="stockin" className="gap-2">
              <ArrowDownToLine className="h-4 w-4" />
              Stok Masuk
            </TabsTrigger>
            <TabsTrigger value="stockout" className="gap-2">
              <ArrowUpFromLine className="h-4 w-4" />
              Stok Keluar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-start gap-2">
                  <div className="p-2 bg-secondary/10 rounded-lg">
                    <FileText className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <CardTitle>Laporan Sisa Stok</CardTitle>
                    <CardDescription>Sisa stok untuk setiap produk dan varian</CardDescription>
                  </div>
                </div>
                <Button variant="outline" onClick={() => exportToPDF("summary")}>
                  <Download className="h-4 w-4 mr-2" />
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
                    <p className="text-muted-foreground">Belum ada data stok</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produk</TableHead>
                          <TableHead>Varian</TableHead>
                          <TableHead>Stok Masuk</TableHead>
                          <TableHead>Stok Keluar</TableHead>
                          <TableHead>Sisa Stok</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stockSummary.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.product_name}</TableCell>
                            <TableCell>{item.variant || "-"}</TableCell>
                            <TableCell className="text-success">+{item.total_in}</TableCell>
                            <TableCell className="text-destructive">-{item.total_out}</TableCell>
                            <TableCell className={`font-bold ${item.current_stock > 0 ? "text-primary" : "text-destructive"}`}>
                              {item.current_stock}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stockin">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-start gap-2">
                  <div className="p-2 bg-secondary/10 rounded-lg">
                    <FileText className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <CardTitle>Laporan Stok Masuk</CardTitle>
                    <CardDescription>Filter berdasarkan tanggal dan produk</CardDescription>
                  </div>
                </div>
                <Button variant="outline" onClick={() => exportToPDF("stockin")}>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="startDate">Tanggal Mulai</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">Tanggal Akhir</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="product">Produk</Label>
                    <Select value={filters.productId} onValueChange={(value) => setFilters({ ...filters, productId: value === "all" ? "" : value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Semua Produk" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Produk</SelectItem>
                        {uniqueProducts.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {stockInReport.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Tidak ada data untuk periode ini</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tanggal</TableHead>
                          <TableHead>Produk</TableHead>
                          <TableHead>Varian</TableHead>
                          <TableHead>Jumlah</TableHead>
                          <TableHead>Sumber</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stockInReport.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{format(new Date(item.date), "dd MMM yyyy HH:mm")}</TableCell>
                            <TableCell className="font-medium">{item.product_name}</TableCell>
                            <TableCell>{item.variant || "-"}</TableCell>
                            <TableCell className="text-success">+{item.quantity}</TableCell>
                            <TableCell>{item.source}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stockout">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-start gap-2">
                  <div className="p-2 bg-secondary/10 rounded-lg">
                    <FileText className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <CardTitle>Laporan Stok Keluar</CardTitle>
                    <CardDescription>Filter berdasarkan tanggal dan produk</CardDescription>
                  </div>
                </div>
                <Button variant="outline" onClick={() => exportToPDF("stockout")}>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="startDate2">Tanggal Mulai</Label>
                    <Input
                      id="startDate2"
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate2">Tanggal Akhir</Label>
                    <Input
                      id="endDate2"
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="product2">Produk</Label>
                    <Select value={filters.productId} onValueChange={(value) => setFilters({ ...filters, productId: value === "all" ? "" : value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Semua Produk" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Produk</SelectItem>
                        {uniqueProducts.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {stockOutReport.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Tidak ada data untuk periode ini</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tanggal</TableHead>
                          <TableHead>Produk</TableHead>
                          <TableHead>Varian</TableHead>
                          <TableHead>Jumlah</TableHead>
                          <TableHead>Tujuan</TableHead>
                          <TableHead>Jenis</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stockOutReport.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{format(new Date(item.date), "dd MMM yyyy HH:mm")}</TableCell>
                            <TableCell className="font-medium">{item.product_name}</TableCell>
                            <TableCell>{item.variant || "-"}</TableCell>
                            <TableCell className="text-destructive">-{item.quantity}</TableCell>
                            <TableCell>{item.destination}</TableCell>
                            <TableCell>{item.jenis}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Laporan;

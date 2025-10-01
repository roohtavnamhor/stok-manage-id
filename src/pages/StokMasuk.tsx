import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, ArrowDownToLine } from "lucide-react";

interface StockIn {
  id: string;
  quantity: number;
  variant: string | null;
  date: string;
  products: { name: string };
  cabang: { name: string };
}

interface Product {
  id: string;
  name: string;
  variant: string | null;
}

interface Cabang {
  id: string;
  name: string;
}

const StokMasuk = () => {
  const [stockIns, setStockIns] = useState<StockIn[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [cabangs, setCabangs] = useState<Cabang[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    product_id: "",
    variant: "",
    quantity: "",
    source_id: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [stockInsRes, productsRes, cabangsRes] = await Promise.all([
        supabase
          .from("stock_in")
          .select("*, products(name), cabang(name)")
          .order("date", { ascending: false }),
        supabase.from("products").select("*").order("name"),
        supabase.from("cabang").select("*").order("name"),
      ]);

      if (stockInsRes.error) throw stockInsRes.error;
      if (productsRes.error) throw productsRes.error;
      if (cabangsRes.error) throw cabangsRes.error;

      setStockIns(stockInsRes.data || []);
      setProducts(productsRes.data || []);
      setCabangs(cabangsRes.data || []);
    } catch (error: any) {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.product_id || !formData.quantity || !formData.source_id) {
      toast.error("Semua field wajib diisi kecuali varian");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("stock_in").insert({
        product_id: formData.product_id,
        variant: formData.variant || null,
        quantity: parseInt(formData.quantity),
        source_id: formData.source_id,
        user_id: user.id,
      });

      if (error) throw error;

      toast.success("Stok masuk berhasil ditambahkan");
      setDialogOpen(false);
      setFormData({ product_id: "", variant: "", quantity: "", source_id: "" });
      fetchData();
    } catch (error: any) {
      toast.error("Gagal menambahkan stok masuk");
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Stok Masuk</h1>
            <p className="text-muted-foreground">Kelola stok barang masuk</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Tambah Stok Masuk
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Stok Masuk</DialogTitle>
                <DialogDescription>Masukkan detail stok barang masuk</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="product">Produk *</Label>
                  <Select value={formData.product_id} onValueChange={(value) => setFormData({ ...formData, product_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih produk" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="variant">Varian (Opsional)</Label>
                  <Input
                    id="variant"
                    value={formData.variant}
                    onChange={(e) => setFormData({ ...formData, variant: e.target.value })}
                    placeholder="Masukkan varian"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Jumlah *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="Masukkan jumlah"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="source">Sumber (Cabang/Supplier) *</Label>
                  <Select value={formData.source_id} onValueChange={(value) => setFormData({ ...formData, source_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih sumber" />
                    </SelectTrigger>
                    <SelectContent>
                      {cabangs.map((cabang) => (
                        <SelectItem key={cabang.id} value={cabang.id}>
                          {cabang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Batal
                  </Button>
                  <Button type="submit">Simpan</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownToLine className="h-5 w-5 text-success" />
              Riwayat Stok Masuk
            </CardTitle>
            <CardDescription>{stockIns.length} transaksi stok masuk</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Memuat data...</p>
              </div>
            ) : stockIns.length === 0 ? (
              <div className="text-center py-8">
                <ArrowDownToLine className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Belum ada stok masuk</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produk</TableHead>
                      <TableHead>Varian</TableHead>
                      <TableHead>Jumlah</TableHead>
                      <TableHead>Sumber</TableHead>
                      <TableHead>Tanggal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockIns.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.products.name}</TableCell>
                        <TableCell>{item.variant || "-"}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                            +{item.quantity}
                          </span>
                        </TableCell>
                        <TableCell>{item.cabang.name}</TableCell>
                        <TableCell>
                          {new Date(item.date).toLocaleString("id-ID")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default StokMasuk;

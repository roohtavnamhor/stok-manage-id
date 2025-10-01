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
import { Plus, ArrowUpFromLine } from "lucide-react";

interface StockOut {
  id: string;
  quantity: number;
  variant: string | null;
  date: string;
  products: { name: string };
  cabang: { name: string };
  jenis_stok_keluar: { name: string };
}

interface Product {
  id: string;
  name: string;
}

interface Cabang {
  id: string;
  name: string;
}

interface JenisStokKeluar {
  id: string;
  name: string;
}

const StokKeluar = () => {
  const [stockOuts, setStockOuts] = useState<StockOut[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [cabangs, setCabangs] = useState<Cabang[]>([]);
  const [jenisStokKeluar, setJenisStokKeluar] = useState<JenisStokKeluar[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    product_id: "",
    variant: "",
    quantity: "",
    destination_id: "",
    jenis_id: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [stockOutsRes, productsRes, cabangsRes, jenisRes] = await Promise.all([
        supabase
          .from("stock_out")
          .select("*, products(name), cabang(name), jenis_stok_keluar(name)")
          .order("date", { ascending: false }),
        supabase.from("products").select("*").order("name"),
        supabase.from("cabang").select("*").order("name"),
        supabase.from("jenis_stok_keluar").select("*").order("name"),
      ]);

      if (stockOutsRes.error) throw stockOutsRes.error;
      if (productsRes.error) throw productsRes.error;
      if (cabangsRes.error) throw cabangsRes.error;
      if (jenisRes.error) throw jenisRes.error;

      setStockOuts(stockOutsRes.data || []);
      setProducts(productsRes.data || []);
      setCabangs(cabangsRes.data || []);
      setJenisStokKeluar(jenisRes.data || []);
    } catch (error: any) {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.product_id || !formData.quantity || !formData.destination_id || !formData.jenis_id) {
      toast.error("Semua field wajib diisi kecuali varian");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("stock_out").insert({
        product_id: formData.product_id,
        variant: formData.variant || null,
        quantity: parseInt(formData.quantity),
        destination_id: formData.destination_id,
        jenis_id: formData.jenis_id,
        user_id: user.id,
      });

      if (error) throw error;

      toast.success("Stok keluar berhasil ditambahkan");
      setDialogOpen(false);
      setFormData({ product_id: "", variant: "", quantity: "", destination_id: "", jenis_id: "" });
      fetchData();
    } catch (error: any) {
      toast.error("Gagal menambahkan stok keluar");
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Stok Keluar</h1>
            <p className="text-muted-foreground">Kelola stok barang keluar</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Tambah Stok Keluar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Stok Keluar</DialogTitle>
                <DialogDescription>Masukkan detail stok barang keluar</DialogDescription>
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
                  <Label htmlFor="destination">Tujuan (Cabang) *</Label>
                  <Select value={formData.destination_id} onValueChange={(value) => setFormData({ ...formData, destination_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih tujuan" />
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
                <div className="space-y-2">
                  <Label htmlFor="jenis">Jenis Stok Keluar *</Label>
                  <Select value={formData.jenis_id} onValueChange={(value) => setFormData({ ...formData, jenis_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jenis" />
                    </SelectTrigger>
                    <SelectContent>
                      {jenisStokKeluar.map((jenis) => (
                        <SelectItem key={jenis.id} value={jenis.id}>
                          {jenis.name}
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
              <ArrowUpFromLine className="h-5 w-5 text-destructive" />
              Riwayat Stok Keluar
            </CardTitle>
            <CardDescription>{stockOuts.length} transaksi stok keluar</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Memuat data...</p>
              </div>
            ) : stockOuts.length === 0 ? (
              <div className="text-center py-8">
                <ArrowUpFromLine className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Belum ada stok keluar</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produk</TableHead>
                      <TableHead>Varian</TableHead>
                      <TableHead>Jumlah</TableHead>
                      <TableHead>Tujuan</TableHead>
                      <TableHead>Jenis</TableHead>
                      <TableHead>Tanggal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockOuts.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.products.name}</TableCell>
                        <TableCell>{item.variant || "-"}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                            -{item.quantity}
                          </span>
                        </TableCell>
                        <TableCell>{item.cabang.name}</TableCell>
                        <TableCell>{item.jenis_stok_keluar.name}</TableCell>
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

export default StokKeluar;

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { SearchBar } from "@/components/SearchBar";
import { PaginationControls } from "@/components/PaginationControls";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, ArrowDownToLine } from "lucide-react";

interface StockIn {
  id: string;
  quantity: number;
  variant: string | null;
  date: string;
  user_id: string;
  products: { name: string };
  cabang: { name: string };
  profiles?: { email: string };
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

const ITEMS_PER_PAGE = 10;

const StokMasuk = () => {
  const [stockIns, setStockIns] = useState<StockIn[]>([]);
  const [filteredStockIns, setFilteredStockIns] = useState<StockIn[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [cabangs, setCabangs] = useState<Cabang[]>([]);
  const [productVariants, setProductVariants] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [formData, setFormData] = useState({
    product_id: "",
    variant: "",
    quantity: "",
    source_id: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const filtered = stockIns.filter(
      (item) =>
        item.products.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.variant && item.variant.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.cabang.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredStockIns(filtered);
    setCurrentPage(1);
  }, [searchQuery, stockIns]);

  useEffect(() => {
    if (formData.product_id) {
      const selectedProduct = products.find((p) => p.id === formData.product_id);
      if (selectedProduct) {
        const variants = products.filter((p) => p.name === selectedProduct.name && p.variant);
        setProductVariants(variants.map((v) => v.variant!).filter(Boolean));
        
        if (variants.length === 0) {
          setFormData((prev) => ({ ...prev, variant: "" }));
        }
      }
    } else {
      setProductVariants([]);
    }
  }, [formData.product_id, products]);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const isAdmin = profile?.role === "superadmin";
      setIsSuperadmin(isAdmin);

      let stockInsQuery = supabase
        .from("stock_in")
        .select("*, products(name), cabang(name)")
        .order("date", { ascending: false });

      let productsQuery = supabase.from("products").select("*").order("name");
      
      if (!isAdmin) {
        stockInsQuery = stockInsQuery.eq("user_id", user.id);
        productsQuery = productsQuery.eq("user_id", user.id);
      }

      const [stockInsRes, cabangsRes, productsRes] = await Promise.all([
        stockInsQuery,
        supabase.from("cabang").select("*").order("name"),
        productsQuery,
      ]);

      if (stockInsRes.error) throw stockInsRes.error;
      if (productsRes.error) throw productsRes.error;
      if (cabangsRes.error) throw cabangsRes.error;

      // Fetch user emails for stock ins if superadmin
      let stockInsWithProfiles = stockInsRes.data || [];
      if (isAdmin && stockInsRes.data) {
        const userIds = Array.from(new Set(stockInsRes.data.map((s: any) => s.user_id)));
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", userIds);

        stockInsWithProfiles = stockInsRes.data.map((stockIn: any) => ({
          ...stockIn,
          profiles: profiles?.find((p: any) => p.id === stockIn.user_id),
        }));
      }

      setStockIns(stockInsWithProfiles);
      setFilteredStockIns(stockInsWithProfiles);
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

  const supplierCabangs = cabangs.filter((c) => c.name.toUpperCase() === "SUPPLIER");
  const otherCabangs = cabangs.filter((c) => c.name.toUpperCase() !== "SUPPLIER");

  const totalPages = Math.ceil(filteredStockIns.length / ITEMS_PER_PAGE);
  const paginatedStockIns = filteredStockIns.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const uniqueProducts = Array.from(
    new Map(products.map((p) => [p.name, p])).values()
  );

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
                  <Select
                    value={formData.product_id}
                    onValueChange={(value) => setFormData({ ...formData, product_id: value, variant: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih produk" />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {productVariants.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="variant">Varian *</Label>
                    <Select
                      value={formData.variant}
                      onValueChange={(value) => setFormData({ ...formData, variant: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih varian" />
                      </SelectTrigger>
                      <SelectContent>
                        {productVariants.map((variant) => (
                          <SelectItem key={variant} value={variant}>
                            {variant}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
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
                  <Label htmlFor="source">Sumber *</Label>
                  <Select
                    value={formData.source_id}
                    onValueChange={(value) => setFormData({ ...formData, source_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih sumber" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>SUPPLIER</SelectLabel>
                        {supplierCabangs.map((cabang) => (
                          <SelectItem key={cabang.id} value={cabang.id}>
                            {cabang.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>CABANG</SelectLabel>
                        {otherCabangs.map((cabang) => (
                          <SelectItem key={cabang.id} value={cabang.id}>
                            {cabang.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
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
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ArrowDownToLine className="h-5 w-5 text-success" />
                  Riwayat Stok Masuk
                </CardTitle>
                <CardDescription>{filteredStockIns.length} transaksi stok masuk</CardDescription>
              </div>
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Cari produk, varian, atau cabang..."
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Memuat data...</p>
              </div>
            ) : paginatedStockIns.length === 0 ? (
              <div className="text-center py-8">
                <ArrowDownToLine className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? "Tidak ada data yang cocok" : "Belum ada stok masuk"}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produk</TableHead>
                        <TableHead>Varian</TableHead>
                        <TableHead>Jumlah</TableHead>
                        <TableHead>Sumber</TableHead>
                        {isSuperadmin && <TableHead>Pemilik</TableHead>}
                        <TableHead>Tanggal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedStockIns.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.products.name}</TableCell>
                          <TableCell>{item.variant || "-"}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                              +{item.quantity}
                            </span>
                          </TableCell>
                          <TableCell>{item.cabang.name}</TableCell>
                          {isSuperadmin && (
                            <TableCell>
                              <Badge variant="outline">{item.profiles?.email || "Unknown"}</Badge>
                            </TableCell>
                          )}
                          <TableCell>{new Date(item.date).toLocaleString("id-ID")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4">
                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default StokMasuk;

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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Plus, ArrowUpFromLine } from "lucide-react";

interface StockOut {
  id: string;
  quantity: number;
  variant: string | null;
  date: string;
  user_id: string;
  products: { name: string };
  cabang: { name: string; id: string };
  jenis_stok_keluar: { name: string };
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

interface JenisStokKeluar {
  id: string;
  name: string;
}

const ITEMS_PER_PAGE = 10;

const StokKeluar = () => {
  const [stockOuts, setStockOuts] = useState<StockOut[]>([]);
  const [filteredStockOuts, setFilteredStockOuts] = useState<StockOut[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [cabangs, setCabangs] = useState<Cabang[]>([]);
  const [jenisStokKeluar, setJenisStokKeluar] = useState<JenisStokKeluar[]>([]);
  const [productVariants, setProductVariants] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [dateFilter, setDateFilter] = useState<string>("");
  const [productFilter, setProductFilter] = useState<string>("");
  const [variantFilter, setVariantFilter] = useState<string>("");
  const [destinationFilter, setDestinationFilter] = useState<string>("");
  const [formData, setFormData] = useState({
    product_id: "",
    variant: "",
    quantity: "",
    destination_type: "", // Format: "cabang_<id>" or "jenis_<id>"
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let filtered = stockOuts.filter(
      (item) =>
        item.products.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.variant && item.variant.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.cabang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.jenis_stok_keluar.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Apply date filter
    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      filterDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(filterDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      filtered = filtered.filter((item) => {
        const itemDate = new Date(item.date);
        return itemDate >= filterDate && itemDate < nextDay;
      });
    }

    // Apply product filter
    if (productFilter) {
      const selectedProductName = products.find(p => p.id === productFilter)?.name;
      if (selectedProductName) {
        filtered = filtered.filter((item) => item.products.name === selectedProductName);
      }
    }

    // Apply variant filter
    if (variantFilter) {
      filtered = filtered.filter((item) => item.variant === variantFilter);
    }

    // Apply destination filter
    if (destinationFilter) {
      filtered = filtered.filter((item) => item.cabang.id === destinationFilter);
    }

    setFilteredStockOuts(filtered);
    setCurrentPage(1);
  }, [searchQuery, stockOuts, dateFilter, productFilter, variantFilter, destinationFilter, products]);

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

  // Get variants for filter based on selected product
  const getFilterVariants = () => {
    if (!productFilter) return [];
    const selectedProduct = products.find(p => p.id === productFilter);
    if (!selectedProduct) return [];
    const variants = products.filter(p => p.name === selectedProduct.name && p.variant);
    return variants.map(v => v.variant!).filter(Boolean);
  };

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

      let stockOutsQuery = supabase
        .from("stock_out")
        .select("*, products(name), cabang(name, id), jenis_stok_keluar(name)")
        .order("date", { ascending: false });

      let productsQuery = supabase.from("products").select("*").order("name");
      
      if (!isAdmin) {
        stockOutsQuery = stockOutsQuery.eq("user_id", user.id);
        productsQuery = productsQuery.eq("user_id", user.id);
      }

      const [stockOutsRes, productsRes, cabangsRes, jenisRes] = await Promise.all([
        stockOutsQuery,
        productsQuery,
        supabase.from("cabang").select("*").order("name"),
        supabase.from("jenis_stok_keluar").select("*").order("name"),
      ]);

      if (stockOutsRes.error) throw stockOutsRes.error;
      if (productsRes.error) throw productsRes.error;
      if (cabangsRes.error) throw cabangsRes.error;
      if (jenisRes.error) throw jenisRes.error;

      // Fetch user emails for stock outs if superadmin
      let stockOutsWithProfiles = stockOutsRes.data || [];
      if (isAdmin && stockOutsRes.data) {
        const userIds = Array.from(new Set(stockOutsRes.data.map((s: any) => s.user_id)));
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", userIds);

        stockOutsWithProfiles = stockOutsRes.data.map((stockOut: any) => ({
          ...stockOut,
          profiles: profiles?.find((p: any) => p.id === stockOut.user_id),
        }));
      }

      setStockOuts(stockOutsWithProfiles);
      setFilteredStockOuts(stockOutsWithProfiles);
      setProducts(productsRes.data || []);
      setCabangs(cabangsRes.data || []);
      setJenisStokKeluar(jenisRes.data || []);
    } catch (error: any) {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.product_id || !formData.quantity || !formData.destination_type) {
      toast.error("Semua field wajib diisi kecuali varian");
      return;
    }
    
    // Show confirmation dialog instead of immediately submitting
    setConfirmDialogOpen(true);
  };
  
  const handleConfirmSubmit = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [type, id] = formData.destination_type.split("_");
      let destination_id = "";
      let jenis_id = "";

      if (type === "cabang") {
        destination_id = id;
        // Default jenis for cabang transfer
        const defaultJenis = jenisStokKeluar.find((j) => j.name.toLowerCase() === "pemakaian");
        jenis_id = defaultJenis ? defaultJenis.id : jenisStokKeluar[0]?.id || "";
      } else {
        jenis_id = id;
        // For SAJ types, we still need a destination (can be a default cabang)
        destination_id = cabangs[0]?.id || "";
      }

      const { error } = await supabase.from("stock_out").insert({
        product_id: formData.product_id,
        variant: formData.variant || null,
        quantity: parseInt(formData.quantity),
        destination_id,
        jenis_id,
        user_id: user.id,
      });

      if (error) throw error;

      toast.success("Stok keluar berhasil ditambahkan");
      setDialogOpen(false);
      setConfirmDialogOpen(false);
      setFormData({ product_id: "", variant: "", quantity: "", destination_type: "" });
      fetchData();
    } catch (error: any) {
      toast.error("Gagal menambahkan stok keluar");
    }
  };

  const totalPages = Math.ceil(filteredStockOuts.length / ITEMS_PER_PAGE);
  const paginatedStockOuts = filteredStockOuts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const uniqueProducts = Array.from(
    new Map(products.map((p) => [p.name, p])).values()
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Stok Keluar</h1>
          <p className="text-muted-foreground">Kelola stok barang keluar</p>
        </div>

        {!isSuperadmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 hidden">
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
                  <Label htmlFor="destination">Tujuan *</Label>
                  <Select
                    value={formData.destination_type}
                    onValueChange={(value) => setFormData({ ...formData, destination_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih tujuan" />
                    </SelectTrigger>
                    <SelectContent>
                      {jenisStokKeluar.length > 0 && (
                        <SelectGroup>
                          <SelectLabel>SAJ</SelectLabel>
                          {jenisStokKeluar.map((jenis) => (
                            <SelectItem key={jenis.id} value={`jenis_${jenis.id}`}>
                              {jenis.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                      {cabangs.length > 0 && (
                        <SelectGroup>
                          <SelectLabel>CABANG</SelectLabel>
                          {cabangs.map((cabang) => (
                            <SelectItem key={cabang.id} value={`cabang_${cabang.id}`}>
                              {cabang.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
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
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpFromLine className="h-5 w-5 text-destructive" />
              Riwayat Stok Keluar
            </CardTitle>
            <CardDescription>{filteredStockOuts.length} transaksi stok keluar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end mb-4">
              <div className="flex-1 min-w-[200px]">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Cari produk, varian, tujuan, atau jenis..."
                />
              </div>
              <div className="w-auto min-w-[150px]">
                <Input
                  id="dateFilter"
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  placeholder="Tanggal"
                />
              </div>
              <div className="w-auto min-w-[180px]">
                <Select value={productFilter} onValueChange={(v) => {
                  setProductFilter(v === "all" ? "" : v);
                  setVariantFilter("");
                }}>
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
              {productFilter && getFilterVariants().length > 0 && (
                <div className="w-auto min-w-[150px]">
                  <Select value={variantFilter} onValueChange={(v) => setVariantFilter(v === "all" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Semua Varian" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Varian</SelectItem>
                      {getFilterVariants().map((variant) => (
                        <SelectItem key={variant} value={variant}>
                          {variant}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="w-auto min-w-[150px]">
                <Select value={destinationFilter} onValueChange={(v) => setDestinationFilter(v === "all" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua Tujuan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Tujuan</SelectItem>
                    {cabangs.map((cabang) => (
                      <SelectItem key={cabang.id} value={cabang.id}>
                        {cabang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!isSuperadmin && (
                <Button onClick={() => setDialogOpen(true)} className="whitespace-nowrap">
                  Tambah
                </Button>
              )}
            </div>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Memuat data...</p>
              </div>
            ) : paginatedStockOuts.length === 0 ? (
              <div className="text-center py-8">
                <ArrowUpFromLine className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? "Tidak ada data yang cocok" : "Belum ada stok keluar"}
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
                        <TableHead>Tujuan</TableHead>
                        <TableHead>Jenis</TableHead>
                        {isSuperadmin && <TableHead>Pemilik</TableHead>}
                        <TableHead>Tanggal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedStockOuts.map((item) => (
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
      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Stok Keluar</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>Perhatian!</strong> Setelah stok keluar diposting, data tidak dapat dibatalkan atau dihapus. 
              Pastikan data yang Anda masukkan sudah benar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSubmit}>Konfirmasi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default StokKeluar;

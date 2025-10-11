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
import { Plus, ArrowDownToLine } from "lucide-react";

interface StockIn {
  id: string;
  quantity: number;
  variant: string | null;
  date: string;
  user_id: string;
  plat_nomor: string | null;
  supir: string | null;
  no_surat_jalan: string | null;
  products: { name: string };
  cabang: { name: string };
  jenis_stok_masuk: { name: string } | null;
  retur_cabang: { name: string } | null;
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

interface JenisStokMasuk {
  id: string;
  name: string;
}

const ITEMS_PER_PAGE = 10;

const StokMasuk = () => {
  const [stockIns, setStockIns] = useState<StockIn[]>([]);
  const [filteredStockIns, setFilteredStockIns] = useState<StockIn[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [cabangs, setCabangs] = useState<Cabang[]>([]);
  const [jenisStokMasuk, setJenisStokMasuk] = useState<JenisStokMasuk[]>([]);
  const [productVariants, setProductVariants] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [dateFilter, setDateFilter] = useState<string>("");
  const [productFilter, setProductFilter] = useState<string>("");
  const [variantFilter, setVariantFilter] = useState<string>("");
  const [formData, setFormData] = useState({
    product_id: "",
    variant: "",
    quantity: "",
    source_id: "",
    jenis_stok_masuk_id: "",
    plat_nomor: "",
    supir: "",
    no_surat_jalan: "",
    retur_cabang_id: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let filtered = stockIns.filter(
      (item) =>
        item.products.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.variant && item.variant.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.cabang.name.toLowerCase().includes(searchQuery.toLowerCase())
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

    setFilteredStockIns(filtered);
    setCurrentPage(1);
  }, [searchQuery, stockIns, dateFilter, productFilter, variantFilter, products]);

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

      let stockInsQuery = supabase
        .from("stock_in")
        .select("*, products(name), cabang(name), jenis_stok_masuk(name), retur_cabang:retur_cabang_id(name)")
        .order("date", { ascending: false });

      let productsQuery = supabase.from("products").select("*").order("name");
      
      if (!isAdmin) {
        stockInsQuery = stockInsQuery.eq("user_id", user.id);
        productsQuery = productsQuery.eq("user_id", user.id);
      }

      const [stockInsRes, cabangsRes, productsRes, jenisRes] = await Promise.all([
        stockInsQuery,
        supabase.from("cabang").select("*").order("name"),
        productsQuery,
        supabase.from("jenis_stok_masuk").select("*").order("name"),
      ]);

      if (stockInsRes.error) throw stockInsRes.error;
      if (productsRes.error) throw productsRes.error;
      if (cabangsRes.error) throw cabangsRes.error;
      if (jenisRes.error) throw jenisRes.error;

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
      setJenisStokMasuk(jenisRes.data || []);
    } catch (error: any) {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.product_id || !formData.quantity || !formData.source_id || !formData.jenis_stok_masuk_id) {
      toast.error("Semua field wajib diisi kecuali varian");
      return;
    }

    const selectedJenis = jenisStokMasuk.find(j => j.id === formData.jenis_stok_masuk_id);
    const jenisName = selectedJenis?.name.toUpperCase();

    if (jenisName === "SUPPLIER" && (!formData.plat_nomor || !formData.supir || !formData.no_surat_jalan)) {
      toast.error("Plat Nomor, Supir, dan No. Surat Jalan wajib diisi untuk SUPPLIER");
      return;
    }

    if (jenisName === "RETUR KONSUMEN" && (!formData.plat_nomor || !formData.supir)) {
      toast.error("Plat Nomor dan Supir wajib diisi untuk RETUR KONSUMEN");
      return;
    }

    if (jenisName === "RETUR CABANG" && (!formData.retur_cabang_id || !formData.plat_nomor || !formData.supir)) {
      toast.error("Cabang, Plat Nomor, dan Supir wajib diisi untuk RETUR CABANG");
      return;
    }

    setConfirmDialogOpen(true);
  };
  
  const handleConfirmSubmit = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("stock_in").insert({
        product_id: formData.product_id,
        variant: formData.variant || null,
        quantity: parseInt(formData.quantity),
        source_id: formData.source_id,
        jenis_stok_masuk_id: formData.jenis_stok_masuk_id,
        plat_nomor: formData.plat_nomor || null,
        supir: formData.supir || null,
        no_surat_jalan: formData.no_surat_jalan || null,
        retur_cabang_id: formData.retur_cabang_id || null,
        user_id: user.id,
      });

      if (error) throw error;

      toast.success("Stok masuk berhasil ditambahkan");
      setDialogOpen(false);
      setConfirmDialogOpen(false);
      setFormData({ product_id: "", variant: "", quantity: "", source_id: "", jenis_stok_masuk_id: "", plat_nomor: "", supir: "", no_surat_jalan: "", retur_cabang_id: "" });
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
        <div>
          <h1 className="text-3xl font-bold text-foreground">Stok Masuk</h1>
          <p className="text-muted-foreground">Kelola stok barang masuk</p>
        </div>

        {!isSuperadmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 hidden">
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
                      {supplierCabangs.length > 0 && (
                        <SelectGroup>
                          <SelectLabel>SUPPLIER</SelectLabel>
                          {supplierCabangs.map((cabang) => (
                            <SelectItem key={cabang.id} value={cabang.id}>
                              {cabang.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                      {otherCabangs.length > 0 && (
                        <SelectGroup>
                          <SelectLabel>CABANG</SelectLabel>
                          {otherCabangs.map((cabang) => (
                            <SelectItem key={cabang.id} value={cabang.id}>
                              {cabang.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jenis">Jenis Stok Masuk *</Label>
                  <Select
                    value={formData.jenis_stok_masuk_id}
                    onValueChange={(value) => setFormData({ ...formData, jenis_stok_masuk_id: value, plat_nomor: "", supir: "", no_surat_jalan: "", retur_cabang_id: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jenis" />
                    </SelectTrigger>
                    <SelectContent>
                      {jenisStokMasuk.map((jenis) => (
                        <SelectItem key={jenis.id} value={jenis.id}>
                          {jenis.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {formData.jenis_stok_masuk_id && (() => {
                  const selectedJenis = jenisStokMasuk.find(j => j.id === formData.jenis_stok_masuk_id);
                  const jenisName = selectedJenis?.name.toUpperCase();

                  return (
                    <>
                      {jenisName === "RETUR CABANG" && (
                        <div className="space-y-2">
                          <Label htmlFor="retur_cabang">Nama Cabang *</Label>
                          <Select
                            value={formData.retur_cabang_id}
                            onValueChange={(value) => setFormData({ ...formData, retur_cabang_id: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih cabang" />
                            </SelectTrigger>
                            <SelectContent>
                              {otherCabangs.map((cabang) => (
                                <SelectItem key={cabang.id} value={cabang.id}>
                                  {cabang.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="plat_nomor">Plat Nomor Mobil *</Label>
                        <Input
                          id="plat_nomor"
                          value={formData.plat_nomor}
                          onChange={(e) => setFormData({ ...formData, plat_nomor: e.target.value })}
                          placeholder="Masukkan plat nomor"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="supir">Supir *</Label>
                        <Input
                          id="supir"
                          value={formData.supir}
                          onChange={(e) => setFormData({ ...formData, supir: e.target.value })}
                          placeholder="Masukkan nama supir"
                          required
                        />
                      </div>
                      {jenisName === "SUPPLIER" && (
                        <div className="space-y-2">
                          <Label htmlFor="no_surat_jalan">No. Surat Jalan *</Label>
                          <Input
                            id="no_surat_jalan"
                            value={formData.no_surat_jalan}
                            onChange={(e) => setFormData({ ...formData, no_surat_jalan: e.target.value })}
                            placeholder="Masukkan no. surat jalan"
                            required
                          />
                        </div>
                      )}
                    </>
                  );
                })()}
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
            <div className="flex items-start gap-2">
              <div className="p-2 bg-success/10 rounded-lg">
                <ArrowDownToLine className="h-5 w-5 text-success" />
              </div>
              <div>
                <CardTitle>Riwayat Stok Masuk</CardTitle>
                <CardDescription>{filteredStockIns.length} transaksi stok masuk</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end mb-4">
              <div className="flex-1 min-w-[200px]">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Cari produk, varian, atau cabang..."
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
              {!isSuperadmin && (
                <Button onClick={() => setDialogOpen(true)} className="gap-2 whitespace-nowrap">
                  <Plus className="h-4 w-4" />
                  Tambah
                </Button>
              )}
            </div>
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
                        <TableHead>Jenis</TableHead>
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
                          <TableCell>{item.jenis_stok_masuk?.name || "-"}</TableCell>
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
            <AlertDialogTitle>Konfirmasi Stok Masuk</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>Perhatian!</strong> Setelah stok masuk diposting, data tidak dapat dibatalkan atau dihapus. 
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

export default StokMasuk;

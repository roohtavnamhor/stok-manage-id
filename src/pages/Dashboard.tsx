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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Package, History, X } from "lucide-react";

interface Product {
  id: string;
  name: string;
  variant: string | null;
  created_at: string;
  user_id: string;
  profiles?: { email: string };
}

interface HistoryItem {
  id: string;
  quantity: number;
  variant: string | null;
  date: string;
  type: "in" | "out";
  source_destination: string;
  jenis?: string;
}

const ITEMS_PER_PAGE = 10;

const Dashboard = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [historyData, setHistoryData] = useState<HistoryItem[]>([]);
  const [historyVariantFilter, setHistoryVariantFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [formData, setFormData] = useState({ name: "", variants: [""] });

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const filtered = products.filter(
      (product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.variant && product.variant.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    setFilteredProducts(filtered);
    setCurrentPage(1);
  }, [searchQuery, products]);

  const fetchProducts = async () => {
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

      let query = supabase.from("products").select("*").order("created_at", { ascending: false });

      if (!isAdmin) {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Fetch user emails for products if superadmin
      let productsWithProfiles = data || [];
      if (isAdmin && data) {
        const userIds = Array.from(new Set(data.map((p: any) => p.user_id)));
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", userIds);

        productsWithProfiles = data.map((product: any) => ({
          ...product,
          profiles: profiles?.find((p: any) => p.id === product.user_id),
        }));
      }

      setProducts(productsWithProfiles);
      setFilteredProducts(productsWithProfiles);
    } catch (error: any) {
      toast.error("Gagal memuat produk");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Nama produk harus diisi");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const validVariants = formData.variants.filter((v) => v.trim() !== "");

      if (validVariants.length === 0) {
        // Single product without variant
        if (editingProduct) {
          const { error } = await supabase
            .from("products")
            .update({ name: formData.name, variant: null })
            .eq("id", editingProduct.id);
          if (error) throw error;
          toast.success("Produk berhasil diperbarui");
        } else {
          const { error } = await supabase.from("products").insert({
            name: formData.name,
            variant: null,
            user_id: user.id,
          });
          if (error) throw error;
          toast.success("Produk berhasil ditambahkan");
        }
      } else {
        // Multiple variants
        if (editingProduct) {
          const { error } = await supabase
            .from("products")
            .update({ name: formData.name, variant: validVariants[0] })
            .eq("id", editingProduct.id);
          if (error) throw error;
          toast.success("Produk berhasil diperbarui");
        } else {
          const productsToInsert = validVariants.map((variant) => ({
            name: formData.name,
            variant: variant,
            user_id: user.id,
          }));
          const { error } = await supabase.from("products").insert(productsToInsert);
          if (error) throw error;
          toast.success("Produk berhasil ditambahkan");
        }
      }

      setDialogOpen(false);
      setFormData({ name: "", variants: [""] });
      setEditingProduct(null);
      fetchProducts();
    } catch (error: any) {
      toast.error("Gagal menyimpan produk");
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({ name: product.name, variants: [product.variant || ""] });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteProductId) return;

    try {
      const { error } = await supabase.from("products").delete().eq("id", deleteProductId);
      if (error) throw error;
      toast.success("Produk berhasil dihapus");
      setDeleteDialogOpen(false);
      setDeleteProductId(null);
      fetchProducts();
    } catch (error: any) {
      toast.error("Gagal menghapus produk");
    }
  };

  const openDeleteDialog = (id: string) => {
    setDeleteProductId(id);
    setDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ name: "", variants: [""] });
    setEditingProduct(null);
  };

  const addVariantField = () => {
    setFormData({ ...formData, variants: [...formData.variants, ""] });
  };

  const removeVariantField = (index: number) => {
    const newVariants = formData.variants.filter((_, i) => i !== index);
    setFormData({ ...formData, variants: newVariants.length === 0 ? [""] : newVariants });
  };

  const updateVariantField = (index: number, value: string) => {
    const newVariants = [...formData.variants];
    newVariants[index] = value;
    setFormData({ ...formData, variants: newVariants });
  };

  const openHistoryDialog = async (product: Product) => {
    setSelectedProduct(product);
    setHistoryVariantFilter("");
    setHistoryDialogOpen(true);

    try {
      const [stockInRes, stockOutRes] = await Promise.all([
        supabase
          .from("stock_in")
          .select("*, cabang(name)")
          .eq("product_id", product.id)
          .order("date", { ascending: false }),
        supabase
          .from("stock_out")
          .select("*, cabang(name), jenis_stok_keluar(name)")
          .eq("product_id", product.id)
          .order("date", { ascending: false }),
      ]);

      const stockInData: HistoryItem[] =
        stockInRes.data?.map((item: any) => ({
          id: item.id,
          quantity: item.quantity,
          variant: item.variant,
          date: item.date,
          type: "in" as const,
          source_destination: item.cabang.name,
        })) || [];

      const stockOutData: HistoryItem[] =
        stockOutRes.data?.map((item: any) => ({
          id: item.id,
          quantity: item.quantity,
          variant: item.variant,
          date: item.date,
          type: "out" as const,
          source_destination: item.cabang.name,
          jenis: item.jenis_stok_keluar.name,
        })) || [];

      const combined = [...stockInData, ...stockOutData].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setHistoryData(combined);
    } catch (error) {
      toast.error("Gagal memuat riwayat");
    }
  };

  const filteredHistory = historyVariantFilter
    ? historyData.filter((item) => item.variant === historyVariantFilter)
    : historyData;

  const uniqueVariants = Array.from(new Set(historyData.map((item) => item.variant).filter(Boolean)));

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Produk</h1>
            <p className="text-muted-foreground">Kelola daftar produk Anda</p>
          </div>
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Tambah Produk
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProduct ? "Edit Produk" : "Tambah Produk Baru"}</DialogTitle>
                <DialogDescription>
                  {editingProduct ? "Perbarui informasi produk" : "Masukkan informasi produk baru"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Produk *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Masukkan nama produk"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Varian (Opsional)</Label>
                  {formData.variants.map((variant, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={variant}
                        onChange={(e) => updateVariantField(index, e.target.value)}
                        placeholder={`Varian ${index + 1}`}
                      />
                      {formData.variants.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeVariantField(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addVariantField} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Varian
                  </Button>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Batal
                  </Button>
                  <Button type="submit">{editingProduct ? "Perbarui" : "Simpan"}</Button>
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
                  <Package className="h-5 w-5" />
                  Daftar Produk
                </CardTitle>
                <CardDescription>{filteredProducts.length} produk terdaftar</CardDescription>
              </div>
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Cari produk atau varian..."
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Memuat data...</p>
              </div>
            ) : paginatedProducts.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? "Tidak ada produk yang cocok" : "Belum ada produk"}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama Produk</TableHead>
                        <TableHead>Varian</TableHead>
                        {isSuperadmin && <TableHead>Pemilik</TableHead>}
                        <TableHead>Tanggal Dibuat</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>{product.variant || "-"}</TableCell>
                          {isSuperadmin && (
                            <TableCell>
                              <Badge variant="outline">{product.profiles?.email || "Unknown"}</Badge>
                            </TableCell>
                          )}
                          <TableCell>{new Date(product.created_at).toLocaleDateString("id-ID")}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => openHistoryDialog(product)}>
                                <History className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(product)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDeleteDialog(product.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
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

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Produk</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus produk ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Riwayat Sirkulasi Produk</DialogTitle>
            <DialogDescription>
              {selectedProduct?.name} - Riwayat stok masuk dan keluar
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {uniqueVariants.length > 0 && (
              <div className="space-y-2">
                <Label>Filter Varian</Label>
                <Select value={historyVariantFilter} onValueChange={setHistoryVariantFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua varian" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Semua varian</SelectItem>
                    {uniqueVariants.map((variant) => (
                      <SelectItem key={variant} value={variant as string}>
                        {variant}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="overflow-x-auto">
              {filteredHistory.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Belum ada riwayat</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead>Varian</TableHead>
                      <TableHead>Jumlah</TableHead>
                      <TableHead>Tujuan/Sumber</TableHead>
                      <TableHead>Jenis</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{new Date(item.date).toLocaleString("id-ID")}</TableCell>
                        <TableCell>
                          <Badge variant={item.type === "in" ? "default" : "destructive"}>
                            {item.type === "in" ? "Masuk" : "Keluar"}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.variant || "-"}</TableCell>
                        <TableCell>
                          <span
                            className={
                              item.type === "in" ? "text-success font-semibold" : "text-destructive font-semibold"
                            }
                          >
                            {item.type === "in" ? "+" : "-"}
                            {item.quantity}
                          </span>
                        </TableCell>
                        <TableCell>{item.source_destination}</TableCell>
                        <TableCell>{item.jenis || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Dashboard;

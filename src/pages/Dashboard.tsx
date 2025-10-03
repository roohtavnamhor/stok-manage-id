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
import { format } from "date-fns";

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
  const [groupedProducts, setGroupedProducts] = useState<{[key: string]: Product[]}>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [editingProductGroup, setEditingProductGroup] = useState<Product[]>([]);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedProductName, setSelectedProductName] = useState<string>("");
  const [historyData, setHistoryData] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyVariantFilter, setHistoryVariantFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [formData, setFormData] = useState({ name: "", variants: [""] });
  const [historyDateFilter, setHistoryDateFilter] = useState<{startDate: string, endDate: string}>({
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd")
  });

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

      let query = supabase.from("products").select("*").order("name", { ascending: true });

      if (!isAdmin) {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      
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

      const grouped: {[key: string]: Product[]} = {};
      productsWithProfiles.forEach((product: Product) => {
        if (!grouped[product.name]) {
          grouped[product.name] = [];
        }
        grouped[product.name].push(product);
      });
      
      setGroupedProducts(grouped);
      setProducts(productsWithProfiles);
      
      const uniqueProducts = Object.values(grouped).map(group => ({
        ...group[0],
        variants: group.map(p => p.variant).filter(Boolean)
      }));
      
      setFilteredProducts(uniqueProducts);
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
      if (editingProductGroup && editingProductGroup.length > 0) {
        const userId = editingProductGroup[0].user_id;
        
        const { error: deleteError } = await supabase
          .from("products")
          .delete()
          .eq("name", formData.name);
          
        if (deleteError) throw deleteError;
        
        const validVariants = formData.variants.filter((v) => v.trim() !== "");
        const products = validVariants.length > 0 
          ? validVariants.map((variant) => ({
              name: formData.name,
              variant: variant,
              user_id: userId,
            }))
          : [{
              name: formData.name,
              variant: null,
              user_id: userId,
            }];

        const { error: insertError } = await supabase.from("products").insert(products);
        if (insertError) throw insertError;
        
        toast.success("Produk berhasil diperbarui");
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const validVariants = formData.variants.filter((v) => v.trim() !== "");
        
        if (validVariants.length === 0) {
          const { error } = await supabase.from("products").insert({
            name: formData.name,
            variant: null,
            user_id: user.id,
          });
          if (error) throw error;
        } else {
          const productsToInsert = validVariants.map((variant) => ({
            name: formData.name,
            variant: variant,
            user_id: user.id,
          }));
          const { error } = await supabase.from("products").insert(productsToInsert);
          if (error) throw error;
        }
        toast.success("Produk berhasil ditambahkan");
      }

      setDialogOpen(false);
      setFormData({ name: "", variants: [""] });
      setEditingProductGroup([]);
      fetchProducts();
    } catch (error: any) {
      toast.error("Gagal menyimpan produk");
    }
  };

  const handleDelete = async () => {
    if (!deleteProductId || !selectedProductName) return;

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("name", selectedProductName);

      if (error) throw error;

      toast.success(`Produk "${selectedProductName}" dan semua variannya berhasil dihapus`);
      fetchProducts();
    } catch (error: any) {
      toast.error("Gagal menghapus produk");
    } finally {
      setDeleteDialogOpen(false);
      setDeleteProductId(null);
      setSelectedProductName("");
    }
  };

  const resetForm = () => {
    setFormData({ name: "", variants: [""] });
    setEditingProductGroup([]);
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

  const openHistoryDialog = async (productName: string) => {
    const productsInGroup = groupedProducts[productName];
    if (!productsInGroup || productsInGroup.length === 0) return;

    setSelectedProductName(productName);
    setHistoryVariantFilter("");
    setHistoryDialogOpen(true);
    fetchHistoryDataForProductGroup(productName);
  };

  const fetchHistoryDataForProductGroup = async (productName: string) => {
    setHistoryLoading(true);
    try {
      const productsInGroup = groupedProducts[productName];
      if (!productsInGroup || productsInGroup.length === 0) {
        setHistoryLoading(false);
        return;
      }

      const productIds = productsInGroup.map(p => p.id);

      const startDate = new Date(historyDateFilter.startDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(historyDateFilter.endDate);
      endDate.setHours(23, 59, 59, 999);

      const [stockInRes, stockOutRes] = await Promise.all([
        supabase
          .from("stock_in")
          .select("*, cabang(name)")
          .in("product_id", productIds)
          .gte("date", startDate.toISOString())
          .lte("date", endDate.toISOString())
          .order("date", { ascending: false }),
        supabase
          .from("stock_out")
          .select("*, cabang(name), jenis_stok_keluar(name)")
          .in("product_id", productIds)
          .gte("date", startDate.toISOString())
          .lte("date", endDate.toISOString())
          .order("date", { ascending: false }),
      ]);

      if (stockInRes.error) {
        console.error("Stock in query error:", stockInRes.error);
        throw stockInRes.error;
      }
      if (stockOutRes.error) {
        console.error("Stock out query error:", stockOutRes.error);
        throw stockOutRes.error;
      }

      const stockInData: HistoryItem[] =
        stockInRes.data?.map((item: any) => ({
          id: item.id,
          quantity: item.quantity,
          variant: item.variant,
          date: item.date,
          type: "in" as const,
          source_destination: item.cabang?.name || "SUPPLIER",
        })) || [];

      const stockOutData: HistoryItem[] =
        stockOutRes.data?.map((item: any) => ({
          id: item.id,
          quantity: item.quantity,
          variant: item.variant,
          date: item.date,
          type: "out" as const,
          source_destination: item.cabang?.name || "-",
          jenis: item.jenis_stok_keluar?.name || "-",
        })) || [];

      const combined = [...stockInData, ...stockOutData].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setHistoryData(combined);
    } catch (error) {
      console.error("Error loading product history:", error);
      toast.error("Gagal memuat riwayat");
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const filteredHistory = historyVariantFilter
    ? historyData.filter((item) => item.variant === historyVariantFilter)
    : historyData;

  const uniqueVariants = Array.from(new Set(historyData.map((item) => item.variant).filter(Boolean)));

  const totalPages = Math.ceil(Object.keys(groupedProducts).filter(name => 
    name.toLowerCase().includes(searchQuery.toLowerCase())
  ).length / ITEMS_PER_PAGE);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Produk</h1>
          <p className="text-muted-foreground">Kelola daftar produk Anda</p>
        </div>

        {!isSuperadmin && (
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProductGroup.length > 0 ? "Edit Produk" : "Tambah Produk Baru"}</DialogTitle>
                <DialogDescription>
                  {editingProductGroup.length > 0 ? "Perbarui informasi produk" : "Masukkan informasi produk baru"}
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
                  <Button type="submit">{editingProductGroup.length > 0 ? "Perbarui" : "Simpan"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}

        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Daftar Produk
              </CardTitle>
              <CardDescription>{Object.keys(groupedProducts).length} produk terdaftar</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-4">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Cari produk atau varian..."
              />
              {!isSuperadmin && (
                <Button onClick={() => {
                  setEditingProductGroup([]);
                  setFormData({ name: "", variants: [""] });
                  setDialogOpen(true);
                }} className="whitespace-nowrap">
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Produk
                </Button>
              )}
            </div>

            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Memuat data...</p>
              </div>
            ) : Object.keys(groupedProducts).length === 0 ? (
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
                      {Object.entries(groupedProducts)
                        .filter(([name]) => name.toLowerCase().includes(searchQuery.toLowerCase()))
                        .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                        .map(([name, products]) => (
                          <TableRow key={name}>
                            <TableCell className="font-medium">{name}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {products.map((product) => (
                                  <Badge key={product.id} variant="outline">
                                    {product.variant || "Default"}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            {isSuperadmin && (
                              <TableCell>
                                <Badge variant="outline">{products[0].profiles?.email || "Unknown"}</Badge>
                              </TableCell>
                            )}
                            <TableCell>{new Date(products[0].created_at).toLocaleDateString("id-ID")}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openHistoryDialog(name)}
                                >
                                  <History className="h-4 w-4" />
                                </Button>
                                {!isSuperadmin && (
                                  <>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      onClick={() => {
                                        setEditingProductGroup(products);
                                        setFormData({
                                          name: name,
                                          variants: products.map(p => p.variant || "")
                                        });
                                        setDialogOpen(true);
                                      }}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        const ids = products.map(p => p.id);
                                        setDeleteProductId(ids[0]);
                                        setSelectedProductName(name);
                                        setDeleteDialogOpen(true);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </>
                                )}
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Produk</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus produk "{selectedProductName}" dan semua variannya? Tindakan ini tidak dapat dibatalkan.
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

      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Riwayat Sirkulasi Produk</DialogTitle>
            <DialogDescription>
              {selectedProductName} - Filter berdasarkan tanggal dan varian
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Filter</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="startDate">Tanggal Mulai</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={historyDateFilter.startDate}
                  onChange={(e) => {
                    setHistoryDateFilter({ ...historyDateFilter, startDate: e.target.value });
                    if (selectedProductName) fetchHistoryDataForProductGroup(selectedProductName);
                  }}
                />
              </div>
              <div>
                <Label htmlFor="endDate">Tanggal Akhir</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={historyDateFilter.endDate}
                  onChange={(e) => {
                    setHistoryDateFilter({ ...historyDateFilter, endDate: e.target.value });
                    if (selectedProductName) fetchHistoryDataForProductGroup(selectedProductName);
                  }}
                />
              </div>
                  <div>
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
                </div>
              </CardContent>
            </Card>
            <div className="overflow-x-auto">
              {historyLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Memuat riwayat...</p>
                </div>
              ) : filteredHistory.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Belum ada riwayat untuk periode ini</p>
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
                        <TableCell>{format(new Date(item.date), "dd MMM yyyy HH:mm")}</TableCell>
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

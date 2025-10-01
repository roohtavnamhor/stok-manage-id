import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, MapPin } from "lucide-react";

interface Cabang {
  id: string;
  name: string;
  created_at: string;
}

const Cabang = () => {
  const [cabangs, setCabangs] = useState<Cabang[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCabang, setEditingCabang] = useState<Cabang | null>(null);
  const [deleteCabangId, setDeleteCabangId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "" });

  useEffect(() => {
    fetchCabangs();
  }, []);

  const fetchCabangs = async () => {
    try {
      const { data, error } = await supabase
        .from("cabang")
        .select("*")
        .order("name");

      if (error) throw error;
      setCabangs(data || []);
    } catch (error: any) {
      toast.error("Gagal memuat cabang");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Nama cabang harus diisi");
      return;
    }

    try {
      if (editingCabang) {
        const { error } = await supabase
          .from("cabang")
          .update({ name: formData.name })
          .eq("id", editingCabang.id);

        if (error) throw error;
        toast.success("Cabang berhasil diperbarui");
      } else {
        const { error } = await supabase
          .from("cabang")
          .insert({ name: formData.name });

        if (error) throw error;
        toast.success("Cabang berhasil ditambahkan");
      }

      setDialogOpen(false);
      setFormData({ name: "" });
      setEditingCabang(null);
      fetchCabangs();
    } catch (error: any) {
      toast.error("Gagal menyimpan cabang");
    }
  };

  const handleEdit = (cabang: Cabang) => {
    setEditingCabang(cabang);
    setFormData({ name: cabang.name });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteCabangId) return;

    try {
      const { error } = await supabase
        .from("cabang")
        .delete()
        .eq("id", deleteCabangId);

      if (error) throw error;
      toast.success("Cabang berhasil dihapus");
      setDeleteDialogOpen(false);
      setDeleteCabangId(null);
      fetchCabangs();
    } catch (error: any) {
      toast.error("Gagal menghapus cabang");
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Cabang</h1>
            <p className="text-muted-foreground">Kelola daftar cabang dan supplier</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setFormData({ name: "" });
              setEditingCabang(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Tambah Cabang
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCabang ? "Edit Cabang" : "Tambah Cabang Baru"}</DialogTitle>
                <DialogDescription>Masukkan nama cabang atau supplier</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Cabang *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ name: e.target.value })}
                    placeholder="Masukkan nama cabang"
                    required
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Batal
                  </Button>
                  <Button type="submit">{editingCabang ? "Perbarui" : "Simpan"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Daftar Cabang
            </CardTitle>
            <CardDescription>{cabangs.length} cabang terdaftar</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Memuat data...</p>
              </div>
            ) : cabangs.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Belum ada cabang</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Cabang</TableHead>
                    <TableHead>Tanggal Dibuat</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cabangs.map((cabang) => (
                    <TableRow key={cabang.id}>
                      <TableCell className="font-medium">{cabang.name}</TableCell>
                      <TableCell>{new Date(cabang.created_at).toLocaleDateString("id-ID")}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(cabang)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDeleteCabangId(cabang.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Cabang</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus cabang ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default Cabang;

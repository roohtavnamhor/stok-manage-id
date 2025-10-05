import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";

interface JenisStokKeluar {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

const JenisStokKeluar = () => {
  const [jenisStokKeluar, setJenisStokKeluar] = useState<JenisStokKeluar[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingJenis, setEditingJenis] = useState<JenisStokKeluar | null>(null);
  const [deleteJenisId, setDeleteJenisId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });

  useEffect(() => {
    fetchJenisStokKeluar();
  }, []);

  const fetchJenisStokKeluar = async () => {
    try {
      const { data, error } = await supabase
        .from("jenis_stok_keluar")
        .select("*")
        .order("name");

      if (error) throw error;
      setJenisStokKeluar(data || []);
    } catch (error: any) {
      toast.error("Gagal memuat jenis stok keluar");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Nama jenis harus diisi");
      return;
    }

    try {
      if (editingJenis) {
        const { error } = await supabase
          .from("jenis_stok_keluar")
          .update({ name: formData.name, description: formData.description || null })
          .eq("id", editingJenis.id);

        if (error) throw error;
        toast.success("Jenis stok keluar berhasil diperbarui");
      } else {
        const { error } = await supabase
          .from("jenis_stok_keluar")
          .insert({ name: formData.name, description: formData.description || null });

        if (error) throw error;
        toast.success("Jenis stok keluar berhasil ditambahkan");
      }

      setDialogOpen(false);
      setFormData({ name: "", description: "" });
      setEditingJenis(null);
      fetchJenisStokKeluar();
    } catch (error: any) {
      toast.error("Gagal menyimpan jenis stok keluar");
    }
  };

  const handleEdit = (jenis: JenisStokKeluar) => {
    setEditingJenis(jenis);
    setFormData({ name: jenis.name, description: jenis.description || "" });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteJenisId) return;

    try {
      const { error } = await supabase
        .from("jenis_stok_keluar")
        .delete()
        .eq("id", deleteJenisId);

      if (error) throw error;
      toast.success("Jenis stok keluar berhasil dihapus");
      setDeleteDialogOpen(false);
      setDeleteJenisId(null);
      fetchJenisStokKeluar();
    } catch (error: any) {
      toast.error("Gagal menghapus jenis stok keluar");
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Jenis Stok Keluar</h1>
            <p className="text-muted-foreground">Kelola kategori stok keluar</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setFormData({ name: "", description: "" });
              setEditingJenis(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Tambah Jenis
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingJenis ? "Edit Jenis Stok Keluar" : "Tambah Jenis Stok Keluar"}</DialogTitle>
                <DialogDescription>Masukkan informasi jenis stok keluar</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Jenis *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Masukkan nama jenis"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Deskripsi</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Masukkan deskripsi"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Batal
                  </Button>
                  <Button type="submit">{editingJenis ? "Perbarui" : "Simpan"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-2">
              <div className="p-2 bg-warning/10 rounded-lg">
                <Tag className="h-5 w-5 text-warning" />
              </div>
              <div>
                <CardTitle>Daftar Jenis Stok Keluar</CardTitle>
                <CardDescription>{jenisStokKeluar.length} jenis terdaftar</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Memuat data...</p>
              </div>
            ) : jenisStokKeluar.length === 0 ? (
              <div className="text-center py-8">
                <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Belum ada jenis stok keluar</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Jenis</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead>Tanggal Dibuat</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jenisStokKeluar.map((jenis) => (
                    <TableRow key={jenis.id}>
                      <TableCell className="font-medium">{jenis.name}</TableCell>
                      <TableCell>{jenis.description || "-"}</TableCell>
                      <TableCell>{new Date(jenis.created_at).toLocaleDateString("id-ID")}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(jenis)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDeleteJenisId(jenis.id);
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
            <AlertDialogTitle>Hapus Jenis Stok Keluar</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus jenis stok keluar ini? Tindakan ini tidak dapat dibatalkan.
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

export default JenisStokKeluar;

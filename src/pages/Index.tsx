import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ArrowDownToLine, ArrowUpFromLine, TrendingUp } from "lucide-react";

interface DashboardStats {
  totalProducts: number;
  totalStockIn: number;
  totalStockOut: number;
  recentStockIns: any[];
  recentStockOuts: any[];
}

const Index = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalStockIn: 0,
    totalStockOut: 0,
    recentStockIns: [],
    recentStockOuts: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user is superadmin
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const isSuperadmin = profile?.role === "superadmin";

      // Fetch stats
      const productsQuery = supabase.from("products").select("id", { count: "exact", head: true });
      const stockInQuery = supabase.from("stock_in").select("quantity");
      const stockOutQuery = supabase.from("stock_out").select("quantity");
      const recentStockInsQuery = supabase
        .from("stock_in")
        .select("*, products(name), cabang(name)")
        .order("date", { ascending: false })
        .limit(5);
      const recentStockOutsQuery = supabase
        .from("stock_out")
        .select("*, products(name), cabang(name)")
        .order("date", { ascending: false })
        .limit(5);

      if (!isSuperadmin) {
        productsQuery.eq("user_id", user.id);
        stockInQuery.eq("user_id", user.id);
        stockOutQuery.eq("user_id", user.id);
        recentStockInsQuery.eq("user_id", user.id);
        recentStockOutsQuery.eq("user_id", user.id);
      }

      const [productsRes, stockInRes, stockOutRes, recentInsRes, recentOutsRes] = await Promise.all([
        productsQuery,
        stockInQuery,
        stockOutQuery,
        recentStockInsQuery,
        recentStockOutsQuery,
      ]);

      const totalStockIn = stockInRes.data?.reduce((sum, item) => sum + item.quantity, 0) || 0;
      const totalStockOut = stockOutRes.data?.reduce((sum, item) => sum + item.quantity, 0) || 0;

      setStats({
        totalProducts: productsRes.count || 0,
        totalStockIn,
        totalStockOut,
        recentStockIns: recentInsRes.data || [],
        recentStockOuts: recentOutsRes.data || [],
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Ringkasan informasi stok gudang</p>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Memuat data...</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Produk</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalProducts}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Stok Masuk</CardTitle>
                  <ArrowDownToLine className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">{stats.totalStockIn}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Stok Keluar</CardTitle>
                  <ArrowUpFromLine className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{stats.totalStockOut}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Stok Tersedia</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalStockIn - stats.totalStockOut}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Stok Masuk Terbaru</CardTitle>
                  <CardDescription>5 transaksi terakhir</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.recentStockIns.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada data</p>
                  ) : (
                    <div className="space-y-3">
                      {stats.recentStockIns.map((item) => (
                        <div key={item.id} className="flex justify-between items-center border-b pb-2">
                          <div>
                            <p className="font-medium text-sm">{item.products.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.cabang.name} • {new Date(item.date).toLocaleDateString("id-ID")}
                            </p>
                          </div>
                          <span className="text-success font-semibold">+{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Stok Keluar Terbaru</CardTitle>
                  <CardDescription>5 transaksi terakhir</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.recentStockOuts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada data</p>
                  ) : (
                    <div className="space-y-3">
                      {stats.recentStockOuts.map((item) => (
                        <div key={item.id} className="flex justify-between items-center border-b pb-2">
                          <div>
                            <p className="font-medium text-sm">{item.products.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.cabang.name} • {new Date(item.date).toLocaleDateString("id-ID")}
                            </p>
                          </div>
                          <span className="text-destructive font-semibold">-{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default Index;

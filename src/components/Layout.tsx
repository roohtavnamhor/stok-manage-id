import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import {
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  FileText,
  MapPin,
  Tag,
  Users,
  LogOut,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
}

interface NavItem {
  name: string;
  icon: ReactNode;
  path: string;
  superadminOnly?: boolean;
}

const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (!session) {
          navigate("/auth");
        } else {
          setTimeout(() => {
            fetchUserRole(session.user.id);
          }, 0);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session) {
        fetchUserRole(session.user.id);
      } else {
        navigate("/auth");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setUserRole(data?.role || "user");
    } catch (error) {
      console.error("Error fetching user role:", error);
      setUserRole("user");
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Berhasil logout");
      navigate("/auth");
    } catch (error: any) {
      toast.error("Gagal logout");
    }
  };

  const navItems: NavItem[] = [
    { name: "Produk", icon: <Package className="h-5 w-5" />, path: "/dashboard" },
    { name: "Stok Masuk", icon: <ArrowDownToLine className="h-5 w-5" />, path: "/stok-masuk" },
    { name: "Stok Keluar", icon: <ArrowUpFromLine className="h-5 w-5" />, path: "/stok-keluar" },
    { name: "Laporan", icon: <FileText className="h-5 w-5" />, path: "/laporan" },
    { name: "Cabang", icon: <MapPin className="h-5 w-5" />, path: "/cabang", superadminOnly: true },
    { name: "Jenis Stok Keluar", icon: <Tag className="h-5 w-5" />, path: "/jenis-stok-keluar", superadminOnly: true },
    { name: "Pengguna", icon: <Users className="h-5 w-5" />, path: "/pengguna", superadminOnly: true },
  ];

  const filteredNavItems = navItems.filter(
    (item) => !item.superadminOnly || userRole === "superadmin"
  );

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-sidebar-border px-6 py-4">
        <div className="p-2 bg-primary rounded-lg">
          <Package className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-sidebar-foreground">Stok Gudang</h2>
          <p className="text-xs text-sidebar-foreground/60">{user?.email}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {filteredNavItems.map((item) => (
          <Button
            key={item.path}
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              location.pathname === item.path && "bg-sidebar-accent text-sidebar-accent-foreground"
            )}
            onClick={() => {
              navigate(item.path);
              setSidebarOpen(false);
            }}
          >
            {item.icon}
            {item.name}
          </Button>
        ))}
      </nav>
      <div className="border-t border-sidebar-border p-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          Keluar
        </Button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 animate-pulse text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar border-r border-sidebar-border">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0 bg-sidebar">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center gap-4 border-b border-border px-4 py-3 bg-card">
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <h1 className="text-lg font-semibold text-foreground">Stok Gudang</h1>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;

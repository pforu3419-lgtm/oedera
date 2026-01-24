import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { trpc } from "@/lib/trpc";
import { LayoutDashboard, LogOut, PanelLeft, Users, BarChart3, Tag, Heart, Users as UsersIcon, Printer, Building2, FileText, Receipt, ShoppingCart, Settings as SettingsIcon, Plus, Store, Shield, KeyRound } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";

const menuItems = [
  { icon: LayoutDashboard, label: "หน้าหลัก", path: "/", roles: ["admin", "manager", "cashier", "user"], requiresStore: false },
  { icon: KeyRound, label: "เข้าร้านด้วยรหัสแอดมิน", path: "/enter-admin-code", roles: ["user"], requiresStore: false, showOnlyWhenNoStore: true },
  { icon: ShoppingCart, label: "ขายหน้าร้าน", path: "/sales", roles: ["admin", "manager", "cashier"], requiresStore: true },
  { icon: LayoutDashboard, label: "สินค้าและสต๊อก", path: "/products", roles: ["admin", "manager"], requiresStore: true },
  { icon: Plus, label: "ท็อปปิ้ง", path: "/toppings", roles: ["admin", "manager"], requiresStore: true },
  { icon: Users, label: "ลูกค้าและสมาชิก", path: "/customers", roles: ["admin", "manager"], requiresStore: true },
  { icon: Tag, label: "ส่วนลด", path: "/discounts", roles: ["admin", "manager"], requiresStore: true },
  { icon: BarChart3, label: "รายงาน", path: "/reports", roles: ["admin", "manager"], requiresStore: true },
  { icon: SettingsIcon, label: "ตั้งค่าระบบ", path: "/settings", roles: ["admin"], requiresStore: false },
  { icon: Building2, label: "ระบบภาษี", path: "/tax", roles: ["admin", "manager"], requiresStore: true },
  { icon: Store, label: "เข้าร้าน", path: "/join-store", roles: ["cashier"], requiresStore: false, showOnlyWhenNoStore: true },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [location, setLocation] = useLocation();
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  useEffect(() => {
    // ผู้ใช้ทั่วไป (user) ที่ยังไม่มีร้าน: อนุญาตเฉพาะ /, /enter-admin-code, /login, /register
    if (user?.role === "user" && !user?.storeId) {
      const allowed = ["/", "/enter-admin-code", "/login", "/register"];
      if (!allowed.includes(location)) setLocation("/");
      return;
    }
    // Cashier ที่ยังไม่เข้าร้าน ต้องไปที่หน้า join-store
    if (user?.role === "cashier" && !user?.storeId && location !== "/join-store" && location !== "/login") {
      setLocation("/join-store");
    }
    // Cashier ที่เข้าร้านแล้ว ต้องอยู่ที่หน้า /sales เท่านั้น
    else if (user?.role === "cashier" && user?.storeId && location !== "/sales" && location !== "/join-store") {
      setLocation("/sales");
    }
  }, [location, setLocation, user?.role, user?.storeId]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Sign in to continue
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Access to this dashboard requires authentication. Continue to launch the login flow.
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full">
          <Button
              onClick={() => setLocation("/login")}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
              Sign in with password
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const loginUrl = getLoginUrl();
                if (!loginUrl) {
                  alert(
                    "OAuth is not configured. Set VITE_OAUTH_PORTAL_URL and VITE_APP_ID."
                  );
                  return;
                }
                window.location.href = loginUrl;
              }}
              size="lg"
              className="w-full"
            >
              Sign in with OAuth
          </Button>
          </div>
        </div>
      </div>
    );
  }

  if (user.role === "cashier" && location !== "/sales") {
    return null;
  }

  return (
    <SidebarProvider
      defaultOpen={false}
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="offcanvas"
          className="border-r-0 bg-white"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center bg-sidebar">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-12 min-h-[var(--touch-target)] w-12 min-w-[var(--touch-target)] flex items-center justify-center hover:bg-sidebar-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0 text-sidebar-foreground touch-manipulation"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-5 w-5 text-sidebar-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src="/ordera-logo-white.svg"
                    alt="Ordera"
                    className="h-10 w-10 drop-shadow-lg"
                  />
                  <span className="font-bold text-xl tracking-tight truncate text-sidebar-foreground drop-shadow-md">
                    Ordera
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 bg-white">
            <SidebarMenu className="px-2 py-1">
              {menuItems
                .filter(item => {
                  // ตรวจสอบ role
                  if (item.roles && (!user?.role || !item.roles.includes(user.role))) {
                    return false;
                  }
                  
                  // ถ้า showOnlyWhenNoStore = true แสดงเฉพาะเมื่อยังไม่มี storeId
                  if (item.showOnlyWhenNoStore) {
                    return !user?.storeId;
                  }
                  
                  // ถ้า requiresStore = true แสดงเฉพาะเมื่อมี storeId (หรือเป็น admin/manager ที่เป็น owner)
                  if (item.requiresStore) {
                    // admin/manager ที่เป็น owner (organizationId = null) ไม่ต้องมี storeId
                    if ((user?.role === "admin" || user?.role === "manager") && !user?.organizationId) {
                      return true;
                    }
                    // cashier หรือ staff ต้องมี storeId
                    return !!user?.storeId;
                  }
                  
                  return true;
                })
                .map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-12 min-h-[var(--touch-target)] transition-all font-normal ${
                        isActive 
                          ? "bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground" 
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-white" : "text-gray-700"}`}
                      />
                      <span className={isActive ? "text-white" : "text-gray-700"}>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3 bg-white">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg p-3 min-h-[var(--touch-target)] hover:bg-gray-100 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring touch-manipulation">
                  <Avatar className="h-10 w-10 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none text-gray-700">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => setShowLogoutConfirm(true)}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>ออกจากระบบ</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-2 min-w-[8px] h-full cursor-col-resize hover:bg-primary/20 active:bg-primary/30 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {/* Header bar with hamburger menu for all devices */}
        <div className="flex border-b h-16 min-h-[56px] items-center justify-between bg-sidebar text-sidebar-foreground px-4 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="h-12 min-h-[var(--touch-target)] min-w-[var(--touch-target)] w-12 rounded-lg bg-sidebar-accent hover:bg-sidebar-accent/90 text-sidebar-foreground" />
            <div className="flex items-center gap-3">
              <img
                src="/ordera-logo-white.svg"
                alt="Ordera"
                className="h-8 w-8 drop-shadow-lg"
              />
              <span className="font-bold text-lg tracking-tight text-sidebar-foreground drop-shadow-md">
                {activeMenuItem?.label ?? "Ordera"}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="default"
            className="min-h-[var(--touch-target)] text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={() => setShowLogoutConfirm(true)}
            title="ออกจากระบบ"
          >
            <LogOut className="h-5 w-5 mr-2" />
            <span className="hidden sm:inline">ออกจากระบบ</span>
          </Button>
        </div>

        <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
          <AlertDialogContent className="p-0 overflow-hidden border-red-200 bg-white max-w-sm">
            <div className="bg-sidebar py-5 flex justify-center">
              <img
                src="/ordera-logo-white.svg"
                alt="Ordera"
                className="h-14 w-14 drop-shadow-lg"
              />
            </div>
            <AlertDialogHeader className="p-6 pt-5 text-center">
              <AlertDialogTitle className="text-gray-800">ยืนยันการออกจากระบบ</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-600">
                คุณแน่ใจหรือว่าต้องการออกจากระบบ?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="p-6 pt-0 flex flex-row gap-3 justify-center sm:justify-center">
              <AlertDialogCancel className="border-border text-foreground hover:bg-muted">
                ยกเลิก
              </AlertDialogCancel>
              <Button
                className="bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent focus:ring-ring"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  logout();
                }}
              >
                ตกลง
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <main className="flex-1 p-4 bg-white min-h-screen">{children}</main>
      </SidebarInset>
    </>
  );
}

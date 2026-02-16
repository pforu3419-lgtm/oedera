import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  Settings as SettingsIcon,
  Store,
} from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Home() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { data: summary, isLoading } = trpc.dashboard.summary.useQuery(undefined, {
    enabled: !!user?.storeId,
  });

  // ผู้ใช้ที่ยังไม่มีร้าน: แสดง CTA สมัครร้าน
  if (user && !user.storeId) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-amber-100 flex items-center justify-center">
              <Store className="h-10 w-10 text-amber-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">ยังไม่ได้เชื่อมต่อร้านค้า</h2>
              <p className="mt-2 text-gray-600">
                สมัครร้านเพื่อเริ่มใช้งานระบบ (สถานะจะเป็น pending และรอผู้ดูแลอนุมัติ)
              </p>
            </div>
            <Button
              size="lg"
              className="w-full max-w-xs mx-auto"
              onClick={() => setLocation("/signup-store")}
            >
              สมัครร้าน
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const formatCurrency = (value: number) => {
    return `฿${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-4xl mx-auto">
        {/* โซน A : โซนขาย (Primary) — ปุ่มใหญ่ด้านบนสุด */}
        <section className="space-y-2">
          <Button
            size="lg"
            className="w-full h-16 sm:h-20 text-xl sm:text-2xl font-bold rounded-xl bg-product hover:bg-product/90 text-white shadow-lg hover:shadow-xl transition-all min-h-[var(--touch-target)]"
            onClick={() => setLocation("/sales")}
          >
            <ShoppingCart className="h-8 w-8 sm:h-10 sm:w-10 mr-3 shrink-0" />
            เริ่มขายหน้าร้าน (POS)
          </Button>
          <p className="text-center text-muted-foreground text-sm sm:text-base">
            พร้อมขายทันที
          </p>
        </section>

        {/* โซน B : การ์ดสรุปหน้าร้าน — ไม่เกิน 3–4 ใบ, ตัวเลขใหญ่, ไม่มี % ขึ้นลง */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">ข้อมูลหน้าร้าน</h2>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-product" />
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              <Card className="border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    ยอดขายวันนี้
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl sm:text-3xl font-bold">
                    {summary ? formatCurrency(summary.todaySalesTotal) : "฿0.00"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">บาท</p>
                </CardContent>
              </Card>
              <Card className="border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    จำนวนบิลวันนี้
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl sm:text-3xl font-bold">
                    {summary?.todayTransactions ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">บิล</p>
                </CardContent>
              </Card>
              <Card className="border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    สินค้าใกล้หมด
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl sm:text-3xl font-bold">
                    {summary?.lowStockCount ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">รายการ</p>
                </CardContent>
              </Card>
            </div>
          )}
        </section>

        {/* โซน C : จัดการร้าน — ปุ่มเล็ก ไอคอนเรียบ */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">จัดการร้าน</h2>
          <Card className="border shadow-sm">
            <CardContent className="p-4">
              <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
                <button
                  type="button"
                  onClick={() => setLocation("/products")}
                  className="flex items-center gap-3 rounded-lg border bg-card p-4 text-left hover:bg-muted/50 transition-colors"
                >
                  <Package className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium">สินค้า</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLocation("/customers")}
                  className="flex items-center gap-3 rounded-lg border bg-card p-4 text-left hover:bg-muted/50 transition-colors"
                >
                  <Users className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium">ลูกค้า</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLocation("/reports")}
                  className="flex items-center gap-3 rounded-lg border bg-card p-4 text-left hover:bg-muted/50 transition-colors"
                >
                  <BarChart3 className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium">รายงานยอดขาย</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLocation("/settings")}
                  className="flex items-center gap-3 rounded-lg border bg-card p-4 text-left hover:bg-muted/50 transition-colors"
                >
                  <SettingsIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium">ตั้งค่า</span>
                </button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </DashboardLayout>
  );
}

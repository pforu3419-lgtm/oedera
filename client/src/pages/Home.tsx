import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Package, Users, TrendingUp, ArrowUpRight, ArrowDownRight, KeyRound } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Home() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { data: summary, isLoading } = trpc.dashboard.summary.useQuery(undefined, { enabled: !!user?.storeId });

  // ผู้ใช้ที่ยังไม่มีร้าน: แสดง CTA กรอกรหัสแอดมิน
  if (user && !user.storeId) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-amber-100 flex items-center justify-center">
              <KeyRound className="h-10 w-10 text-amber-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">ยังไม่ได้เชื่อมต่อร้านค้า</h2>
              <p className="mt-2 text-gray-600">
                กรอกรหัสแอดมินที่ได้รับจาก Ordera เพื่อสร้างร้านและเริ่มใช้งานระบบ
              </p>
            </div>
            <Button
              size="lg"
              className="w-full max-w-xs mx-auto"
              onClick={() => setLocation("/enter-admin-code")}
            >
              เข้าร้านด้วยรหัสแอดมิน
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const formatCurrency = (value: number) => {
    return `฿${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  };

  const formatTrend = (trend: number) => {
    const sign = trend >= 0 ? "+" : "";
    return `${sign}${trend.toFixed(1)}%`;
  };

  const stats = [
    {
      title: "ยอดขายวันนี้",
      value: summary ? formatCurrency(summary.todaySalesTotal) : "฿0.00",
      icon: ShoppingCart,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      trend: summary ? formatTrend(summary.todaySalesTrend) : "+0%",
      trendPositive: summary ? summary.todaySalesTrend >= 0 : true,
    },
    {
      title: "สินค้าทั้งหมด",
      value: summary ? summary.totalProducts.toString() : "0",
      icon: Package,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      trend: "+0%",
      trendPositive: true,
    },
    {
      title: "ลูกค้า",
      value: summary ? summary.totalCustomers.toString() : "0",
      icon: Users,
      color: "text-violet-500",
      bgColor: "bg-violet-500/10",
      trend: "+0%",
      trendPositive: true,
    },
    {
      title: "การขายเดือนนี้",
      value: summary ? formatCurrency(summary.monthSalesTotal) : "฿0.00",
      icon: TrendingUp,
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
      trend: "+0%",
      trendPositive: true,
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="flex items-center gap-4 mb-6">
          <img
            src="/ordera-logo.svg"
            alt="Ordera"
            className="h-16 w-16 drop-shadow-lg"
          />
        <div>
            <h1 className="text-4xl font-bold tracking-tight text-primary">ยินดีต้อนรับ</h1>
            <p className="mt-2 text-lg text-muted-foreground">
              Ordera ระบบจัดการร้านค้าของคุณ
          </p>
          </div>
        </div>

        {/* Stats Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-red-600" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              const TrendIcon = stat.trendPositive ? ArrowUpRight : ArrowDownRight;
              return (
                <Card key={index} className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                    <div className={`${stat.bgColor} rounded-lg p-2.5`}>
                      <Icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-2xl font-bold">{stat.value}</div>
                        <p className={`text-xs mt-1 flex items-center gap-1 ${stat.trendPositive ? "text-emerald-600" : "text-red-600"}`}>
                          <TrendIcon className="h-3 w-3" />
                          {stat.trend}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-0 shadow-sm hover:shadow-md transition-all hover:scale-105 cursor-pointer" onClick={() => setLocation("/sales")}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>การขายหน้าร้าน</CardTitle>
                  <CardDescription className="mt-2">
                    เริ่มต้นการขายสินค้าให้ลูกค้า
                  </CardDescription>
                </div>
                <ShoppingCart className="h-8 w-8 text-amber-500 opacity-20" />
              </div>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={(e) => {
                e.stopPropagation();
                setLocation("/sales");
              }}>
                เข้าสู่ระบบขาย
              </Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-all hover:scale-105 cursor-pointer" onClick={() => setLocation("/products")}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>สินค้าและสต๊อก</CardTitle>
                  <CardDescription className="mt-2">
                    จัดการเมนูสินค้าและสต๊อกสินค้า
                  </CardDescription>
                </div>
                <Package className="h-8 w-8 text-emerald-500 opacity-20" />
              </div>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={(e) => {
                e.stopPropagation();
                setLocation("/products");
              }}>
                จัดการสินค้าและสต๊อก
              </Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-all hover:scale-105 cursor-pointer" onClick={() => setLocation("/customers")}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>ลูกค้าและสมาชิก</CardTitle>
                  <CardDescription className="mt-2">
                    จัดการข้อมูลลูกค้าและระบบสะสมคะแนน
              </CardDescription>
                </div>
                <Users className="h-8 w-8 text-violet-500 opacity-20" />
              </div>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={(e) => {
                e.stopPropagation();
                setLocation("/customers");
              }}>
                จัดการลูกค้าและสมาชิก
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>รายงาน</CardTitle>
              <CardDescription>
                ดูรายงานยอดขายและวิเคราะห์
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => setLocation("/reports")}>
                ดูรายงาน
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>กิจกรรมล่าสุด</CardTitle>
            <CardDescription>
              {summary?.recentActivities && summary.recentActivities.length > 0
                ? `${summary.recentActivities.length} กิจกรรม`
                : "ไม่มีกิจกรรมล่าสุด"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {summary?.recentActivities && summary.recentActivities.length > 0 ? (
              <div className="space-y-2">
                {summary.recentActivities.slice(0, 5).map((activity: any, index: number) => (
                  <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.action || "กิจกรรม"}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.createdAt
                          ? new Date(activity.createdAt).toLocaleString("th-TH", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                เมื่อคุณเริ่มใช้ระบบ กิจกรรมจะแสดงที่นี่
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Calendar, Download, TrendingUp, FileText, Sheet, ArrowLeft, UserCheck, Search, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { exportToExcel, exportToPDF } from "@/lib/exportReport";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";

export default function Reports() {
  const [, setLocation] = useLocation();
  const [dateRange, setDateRange] = useState<"day" | "month" | "year">("month");
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30))
  );
  const [endDate, setEndDate] = useState(new Date());
  const [auditCashierId, setAuditCashierId] = useState<string>("all");
  const [auditProductId, setAuditProductId] = useState<string>("all");
  const [auditPaymentMethod, setAuditPaymentMethod] = useState<string>("all");
  const [auditSearchTransactionNo, setAuditSearchTransactionNo] = useState("");
  const [auditViewMode, setAuditViewMode] = useState<"bills" | "items">("bills");
  const [detailTxId, setDetailTxId] = useState<number | null>(null);

  // Fetch sales data
  const { data: salesData, isLoading: salesLoading } =
    trpc.reports.salesByDateRange.useQuery(
      {
        startDate,
        endDate,
        paymentMethod: auditPaymentMethod !== "all" ? auditPaymentMethod : undefined,
        transactionNumberSearch: auditSearchTransactionNo.trim() || undefined,
      },
      { enabled: !!startDate && !!endDate }
    );

  // Fetch top products
  const { data: topProducts, isLoading: topProductsLoading } =
    trpc.reports.topProducts.useQuery(
      { startDate, endDate, limit: 10 },
      { enabled: !!startDate && !!endDate }
    );

  // Fetch payment method data
  const { data: paymentData, isLoading: paymentLoading } =
    trpc.reports.salesByPaymentMethod.useQuery(
      { startDate, endDate },
      { enabled: !!startDate && !!endDate }
    );

  // Fetch daily sales
  const { data: dailySalesData, isLoading: dailySalesLoading } =
    trpc.reports.dailySales.useQuery(
      { startDate, endDate },
      { enabled: !!startDate && !!endDate }
    );

  // ประวัติการขายแยกตามพนักงาน
  const { data: salesAuditData, isLoading: salesAuditLoading } =
    trpc.reports.salesAudit.useQuery(
      {
        startDate,
        endDate,
        cashierId: auditCashierId && auditCashierId !== "all" ? parseInt(auditCashierId, 10) : undefined,
        productId: auditProductId && auditProductId !== "all" ? parseInt(auditProductId, 10) : undefined,
        paymentMethod: auditPaymentMethod !== "all" ? auditPaymentMethod : undefined,
        transactionNumberSearch: auditSearchTransactionNo.trim() || undefined,
        viewMode: auditViewMode, // ส่ง viewMode ไป API
      },
      { enabled: !!startDate && !!endDate }
    );
  const { data: staffPerformance } = trpc.reports.staffPerformance.useQuery(
    { startDate, endDate },
    { enabled: !!startDate && !!endDate }
  );
  const { data: txDetail, isLoading: txDetailLoading } = trpc.reports.getTransactionDetail.useQuery(
    { id: detailTxId! },
    { enabled: detailTxId != null }
  );
  const { data: usersList } = trpc.users.list.useQuery(undefined, { enabled: true });
  const { data: productsList } = trpc.products.list.useQuery({}, { enabled: true });

  const paymentMethodLabel: Record<string, string> = {
    cash: "เงินสด",
    transfer: "โอนเงิน",
    card: "บัตร",
    ewallet: "อีวอลเล็ต",
    mixed: "ผสม",
  };
  const paymentStatusLabel: Record<string, string> = {
    completed: "ชำระแล้ว",
    cancelled: "ยกเลิก",
    refunded: "คืนเงิน",
  };

  // Transform data for charts
  const dailySalesChartData = dailySalesData
    ? Object.entries(dailySalesData).map(([date, data]) => ({
        date,
        sales: data.total,
        transactions: data.count,
      }))
    : [];

  const paymentChartData = paymentData
    ? Object.entries(paymentData).map(([method, data]) => ({
        name: method,
        value: data.total,
        count: data.count,
      }))
    : [];

  const topProductsChartData = topProducts
    ? topProducts.map((p) => ({
        productId: p.productId,
        quantity: p.quantity,
        revenue: p.revenue,
      }))
    : [];

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  const handleDateRangeChange = (range: "day" | "month" | "year") => {
    setDateRange(range);
    const now = new Date();
    let start = new Date();

    if (range === "day") {
      start = new Date(now.setDate(now.getDate() - 1));
    } else if (range === "month") {
      start = new Date(now.setMonth(now.getMonth() - 1));
    } else if (range === "year") {
      start = new Date(now.setFullYear(now.getFullYear() - 1));
    }

    setStartDate(start);
    setEndDate(new Date());
  };

  const handleExportPDF = () => {
    if (!salesData) return;
    const reportData = {
      startDate,
      endDate,
      totalTransactions: salesData.totalTransactions,
      totalSales: salesData.totalSales,
      totalTax: salesData.totalTax,
      totalDiscount: salesData.totalDiscount,
      transactions: salesData.transactions.map((t) => ({
        id: t.id.toString(),
        total: t.total || "0",
        tax: t.tax || "0",
        discount: t.discount || "0",
        paymentMethod: t.paymentMethod || "",
        createdAt: t.createdAt,
      })),
    };
    exportToPDF(reportData);
  };

  const handleExportExcel = () => {
    if (!salesData) return;
    const reportData = {
      startDate,
      endDate,
      totalTransactions: salesData.totalTransactions,
      totalSales: salesData.totalSales,
      totalTax: salesData.totalTax,
      totalDiscount: salesData.totalDiscount,
      transactions: salesData.transactions.map((t) => ({
        id: t.id.toString(),
        total: t.total || "0",
        tax: t.tax || "0",
        discount: t.discount || "0",
        paymentMethod: t.paymentMethod || "",
        createdAt: t.createdAt,
      })),
    };
    exportToExcel(reportData);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/")}
              className="shrink-0 gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              ย้อนกลับ
            </Button>
            <div>
            <h1 className="text-3xl font-bold tracking-tight">รายงานและวิเคราะห์</h1>
            <p className="text-muted-foreground mt-2">
              ดูข้อมูลยอดขาย สินค้าขายดี และการวิเคราะห์ธุรกิจ
            </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="lg" onClick={handleExportPDF}>
              <FileText className="mr-2 h-4 w-4" />
              ส่งออก PDF
            </Button>
            <Button variant="outline" size="lg" onClick={handleExportExcel}>
              <Sheet className="mr-2 h-4 w-4" />
              ส่งออก Excel
            </Button>
          </div>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            เลือกช่วงเวลา
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={dateRange === "day" ? "default" : "outline"}
              onClick={() => handleDateRangeChange("day")}
            >
              วันนี้
            </Button>
            <Button
              variant={dateRange === "month" ? "default" : "outline"}
              onClick={() => handleDateRangeChange("month")}
            >
              เดือนนี้
            </Button>
            <Button
              variant={dateRange === "year" ? "default" : "outline"}
              onClick={() => handleDateRangeChange("year")}
            >
              ปีนี้
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">วันที่เริ่มต้น</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate.toISOString().split("T")[0]}
                onChange={(e) => setStartDate(new Date(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">วันที่สิ้นสุด</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate.toISOString().split("T")[0]}
                onChange={(e) => setEndDate(new Date(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards — นับจากบิล (orders) เท่านั้น ห้ามนับจาก items */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              จำนวนบิล
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {salesData?.totalTransactions ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              นับจากบิลจริงเท่านั้น
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ยอดขายรวม
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ฿{salesData?.totalSales?.toFixed(2) || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              รวมจากยอดบิล (orders.total)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ภาษีมูลค่าเพิ่ม
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ฿{salesData?.totalTax.toFixed(2) || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {((salesData?.totalTax || 0) / (salesData?.totalSales || 1) * 100).toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ส่วนลดรวม
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ฿{salesData?.totalDiscount.toFixed(2) || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {((salesData?.totalDiscount || 0) / (salesData?.totalSales || 1) * 100).toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ค่าเฉลี่ยต่อบิล
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ฿{((salesData?.totalSales || 0) / (salesData?.totalTransactions || 1)).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ยอดขายรวม ÷ จำนวนบิล
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ค่าเฉลี่ยต่อบิล
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ฿{((salesData?.totalSales || 0) / (salesData?.totalTransactions || 1)).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ต่อบิล
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              บิลสูงสุด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ฿{(salesData?.transactions?.length
                ? Math.max(...salesData.transactions.map((t) => parseFloat(t.total || "0")))
                : 0
              ).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ยอดสูงสุดต่อบิล
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              พนักงานที่ขายสูงสุด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate" title={staffPerformance?.[0]?.cashierName}>
              {staffPerformance?.[0]?.cashierName ?? "-"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {staffPerformance?.[0] ? `฿${staffPerformance[0].totalSales.toFixed(2)} (${staffPerformance[0].billCount} บิล)` : "ไม่มีข้อมูล"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="daily" className="w-full">
        <TabsList>
          <TabsTrigger value="daily">ยอดขายรายวัน</TabsTrigger>
          <TabsTrigger value="products">สินค้าขายดี</TabsTrigger>
          <TabsTrigger value="payment">วิธีชำระเงิน</TabsTrigger>
          <TabsTrigger value="audit">ตรวจประวัติการขาย (พนักงาน)</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ยอดขายรายวัน</CardTitle>
              <CardDescription>
                แสดงแนวโน้มยอดขายตามวันที่
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dailySalesLoading ? (
                <div className="h-80 flex items-center justify-center">
                  <p className="text-muted-foreground">กำลังโหลด...</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailySalesChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="sales"
                      stroke="#3b82f6"
                      name="ยอดขาย (฿)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                สินค้าขายดี 10 อันดับ
              </CardTitle>
              <CardDescription>
                จัดเรียงตามรายได้ทั้งหมด
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topProductsLoading ? (
                <div className="h-80 flex items-center justify-center">
                  <p className="text-muted-foreground">กำลังโหลด...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {topProductsChartData.map((product, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: COLORS[index % COLORS.length],
                            }}
                          />
                          <span className="font-medium">สินค้า {product.productId}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          ขายได้ {product.quantity} ชิ้น
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">฿{product.revenue.toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ยอดขายตามวิธีชำระเงิน</CardTitle>
              <CardDescription>
                การกระจายตัวของวิธีชำระเงิน
              </CardDescription>
            </CardHeader>
            <CardContent>
              {paymentLoading ? (
                <div className="h-80 flex items-center justify-center">
                  <p className="text-muted-foreground">กำลังโหลด...</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={paymentChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) =>
                        `${name}: ฿${value.toFixed(2)}`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {paymentChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Payment Method Details */}
          <Card>
            <CardHeader>
              <CardTitle>รายละเอียดวิธีชำระเงิน</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {paymentChartData.map((method, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      />
                      <div>
                        <div className="font-medium capitalize">{method.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {method.count} รายการ
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">฿{method.value.toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">
                        {((method.value / (salesData?.totalSales || 1)) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                ตรวจประวัติการขาย – ว่าสินค้า/อาหารชิ้นนี้ พนักงานคนไหนเป็นคนขาย
              </CardTitle>
              <CardDescription>
                「จำนวนบิล」นับจากบิลจริงเท่านั้น — เลือก「รวมบิล」= หนึ่งแถวต่อหนึ่งบิล คอลัมน์「จำนวนรายการ」= จำนวนรายการในบิล (items.length) — ยอดรวมจาก orders เท่านั้น
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="space-y-2">
                  <Label>แสดงแบบ</Label>
                  <Select value={auditViewMode} onValueChange={(v) => setAuditViewMode(v as "bills" | "items")}>
                    <SelectTrigger className="w-[220px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bills">รวมบิล (หนึ่งแถวต่อหนึ่งบิล)</SelectItem>
                      <SelectItem value="items">รายการ (ทุก line ในบิล)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>พนักงาน</Label>
                  <Select value={auditCashierId} onValueChange={setAuditCashierId}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="ทั้งหมด" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทั้งหมด</SelectItem>
                      {(usersList ?? []).map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.name || `#${u.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>สินค้า</Label>
                  <Select value={auditProductId} onValueChange={setAuditProductId}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="ทั้งหมด" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทั้งหมด</SelectItem>
                      {(productsList ?? []).map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>วิธีชำระเงิน</Label>
                  <Select value={auditPaymentMethod} onValueChange={setAuditPaymentMethod}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="ทั้งหมด" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทั้งหมด</SelectItem>
                      <SelectItem value="cash">เงินสด</SelectItem>
                      <SelectItem value="transfer">โอนเงิน</SelectItem>
                      <SelectItem value="card">บัตร</SelectItem>
                      <SelectItem value="ewallet">อีวอลเล็ต</SelectItem>
                      <SelectItem value="mixed">ผสม</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ค้นหาเลขที่บิล</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="เลขที่บิล..."
                      value={auditSearchTransactionNo}
                      onChange={(e) => setAuditSearchTransactionNo(e.target.value)}
                      className="pl-9 w-[200px]"
                    />
                  </div>
                </div>
              </div>

              {auditCashierId !== "all" && salesData && salesAuditData?.rows?.length !== undefined && (() => {
                const billCount = new Set(salesAuditData!.rows.map((r) => r.transactionId)).size;
                const totalBills = salesData.totalTransactions ?? 0;
                if (totalBills > 0 && billCount < totalBills) {
                  return (
                    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                      ขณะนี้แสดง {billCount} บิล (กรองตามพนักงาน) — เพื่อดูทั้ง {totalBills} บิลที่ขายในช่วงนี้ ให้เลือกพนักงาน「ทั้งหมด」
                    </p>
                  );
                }
                return null;
              })()}

              {salesAuditLoading ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground">
                  กำลังโหลด...
                </div>
              ) : !salesAuditData?.rows?.length ? (
                <p className="text-muted-foreground py-8 text-center">
                  ไม่พบรายการในช่วงนี้
                </p>
              ) : auditViewMode === "bills" ? (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>วันที่/เวลา</TableHead>
                        <TableHead>เลขที่บิล</TableHead>
                        <TableHead className="text-right">จำนวนรายการ</TableHead>
                        <TableHead className="text-right">ยอดรวม</TableHead>
                        <TableHead>พนักงานขาย</TableHead>
                        <TableHead>วิธีชำระเงิน</TableHead>
                        <TableHead className="w-[100px]">ดูรายละเอียด</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesAuditData!.rows.map((row: any) => {
                        // ตารางบิล: 1 บิล = 1 แถว ข้อมูลจาก orders เท่านั้น lineCount = items.length
                        return (
                          <TableRow key={row.transactionId}>
                            <TableCell>{new Date(row.createdAt).toLocaleString("th-TH")}</TableCell>
                            <TableCell>{row.transactionNumber}</TableCell>
                            <TableCell className="text-right">{row.lineCount ?? 0}</TableCell>
                            <TableCell className="text-right">฿{parseFloat(row.total || "0").toFixed(2)}</TableCell>
                            <TableCell>{row.cashierName}</TableCell>
                            <TableCell>{paymentMethodLabel[row.paymentMethod] || row.paymentMethod || "-"}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetailTxId(row.transactionId)} title="ดูรายละเอียด">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>วันที่/เวลา</TableHead>
                        <TableHead>เลขที่บิล</TableHead>
                        <TableHead>สินค้า</TableHead>
                        <TableHead className="text-right">จำนวน</TableHead>
                        <TableHead className="text-right">ราคา/หน่วย</TableHead>
                        <TableHead className="text-right">รวม</TableHead>
                        <TableHead>พนักงานขาย</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        // รวมแถวที่ซ้ำ: สินค้าเดียวกัน ราคา/หน่วยเดียวกัน ในบิลเดียวกัน → รวมจำนวนและยอด
                        const key = (r: (typeof salesAuditData.rows)[0]) =>
                          `${r.transactionId}|${r.productId}|${r.unitPrice}`;
                        const merged = new Map<string, { row: (typeof salesAuditData.rows)[0]; qty: number; sum: number }>();
                        for (const r of salesAuditData!.rows) {
                          const k = key(r);
                          const cur = merged.get(k);
                          const q = r.quantity;
                          const s = parseFloat(r.subtotal);
                          if (cur) {
                            cur.qty += q;
                            cur.sum += s;
                          } else {
                            merged.set(k, { row: r, qty: q, sum: s });
                          }
                        }
                        return Array.from(merged.values())
                          .sort((a, b) => new Date(b.row.createdAt).getTime() - new Date(a.row.createdAt).getTime())
                          .map((m, idx) => (
                            <TableRow key={`${key(m.row)}-${idx}`}>
                              <TableCell>{new Date(m.row.createdAt).toLocaleString("th-TH")}</TableCell>
                              <TableCell>{m.row.transactionNumber}</TableCell>
                              <TableCell>{m.row.productName || `#${m.row.productId}`}</TableCell>
                              <TableCell className="text-right">{m.qty}</TableCell>
                              <TableCell className="text-right">฿{parseFloat(m.row.unitPrice || "0").toFixed(2)}</TableCell>
                              <TableCell className="text-right">฿{m.sum.toFixed(2)}</TableCell>
                              <TableCell>{m.row.cashierName}</TableCell>
                            </TableRow>
                          ));
                      })()}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog รายละเอียดบิล */}
      <Dialog open={detailTxId != null} onOpenChange={(open) => !open && setDetailTxId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>รายละเอียดบิล</DialogTitle>
          </DialogHeader>
          {txDetailLoading ? (
            <div className="py-8 text-center text-muted-foreground">กำลังโหลด...</div>
          ) : !txDetail ? (
            <div className="py-8 text-center text-muted-foreground">ไม่พบบิลหรือไม่มีสิทธิ์ดูบิลนี้</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">เลขที่บิล:</span> {txDetail.transaction.transactionNumber}</div>
                <div><span className="text-muted-foreground">วันที่/เวลา:</span> {new Date(txDetail.transaction.createdAt).toLocaleString("th-TH")}</div>
                <div><span className="text-muted-foreground">พนักงานขาย:</span> {txDetail.cashierName}</div>
                <div><span className="text-muted-foreground">วิธีชำระเงิน:</span> {paymentMethodLabel[txDetail.transaction.paymentMethod] || txDetail.transaction.paymentMethod || "-"}</div>
                <div><span className="text-muted-foreground">สถานะ:</span> {paymentStatusLabel[txDetail.transaction.paymentStatus] || txDetail.transaction.paymentStatus || "-"}</div>
              </div>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ชื่อสินค้า</TableHead>
                      <TableHead className="text-right">จำนวน</TableHead>
                      <TableHead className="text-right">ราคา/หน่วย</TableHead>
                      <TableHead className="text-right">รวม</TableHead>
                      <TableHead>ท็อปปิ้ง</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* รายละเอียดบิล = order.items เท่านั้น ลูปเดียว ห้ามวนซ้อน ราคาจาก item.unitPrice/item.subtotal (บิล) */}
                    {txDetail.items.map((item, i) => (
                      <TableRow key={`${item.productId}-${i}`}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">฿{parseFloat(item.unitPrice || "0").toFixed(2)}</TableCell>
                        <TableCell className="text-right">฿{parseFloat(item.subtotal || "0").toFixed(2)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {Array.isArray(item.toppings) && item.toppings.length > 0
                            ? item.toppings.map((t: { name?: string; price?: number }) => `${t.name || ""}${t.price != null ? ` +฿${t.price}` : ""}`).filter(Boolean).join(", ") || "-"
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex flex-col gap-1 text-sm border-t pt-4">
                {txDetail.transaction.subtotal != null && <div className="flex justify-between"><span className="text-muted-foreground">ยอดรวมย่อย</span><span>฿{parseFloat(txDetail.transaction.subtotal).toFixed(2)}</span></div>}
                {txDetail.transaction.tax != null && parseFloat(txDetail.transaction.tax) !== 0 && <div className="flex justify-between"><span className="text-muted-foreground">ภาษี</span><span>฿{parseFloat(txDetail.transaction.tax).toFixed(2)}</span></div>}
                {txDetail.transaction.discount != null && parseFloat(txDetail.transaction.discount) !== 0 && <div className="flex justify-between"><span className="text-muted-foreground">ส่วนลด</span><span>- ฿{parseFloat(txDetail.transaction.discount).toFixed(2)}</span></div>}
                <div className="flex justify-between font-bold text-base"><span>ยอดรวม</span><span>฿{parseFloat(txDetail.transaction.total || "0").toFixed(2)}</span></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

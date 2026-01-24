import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Download, FileText, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import * as XLSX from "xlsx";
import { format } from "date-fns";

export default function VatReports() {
  const [, setLocation] = useLocation();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<string>(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`
  );

  const { data: reports, isLoading, refetch } = trpc.tax.getVatReportsByYear.useQuery(
    { year: selectedYear },
    { enabled: !!selectedYear }
  );

  const { data: currentReport } = trpc.tax.getVatReport.useQuery(
    { month: selectedMonth },
    { enabled: !!selectedMonth }
  );

  const generateMutation = trpc.tax.generateVatReport.useMutation({
    onSuccess: () => {
      toast.success("สร้างรายงาน VAT สำเร็จ");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "เกิดข้อผิดพลาด");
    },
  });

  const submitMutation = trpc.tax.submitVatReport.useMutation({
    onSuccess: () => {
      toast.success("ยื่นรายงาน VAT สำเร็จ");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "เกิดข้อผิดพลาด");
    },
  });

  const handleGenerate = () => {
    generateMutation.mutate({ month: selectedMonth });
  };

  const handleSubmit = () => {
    if (!confirm("ยืนยันการยื่นรายงาน VAT สำหรับเดือนนี้?")) return;
    submitMutation.mutate({ month: selectedMonth });
  };

  const handleExportExcel = () => {
    if (!reports || reports.length === 0) {
      toast.error("ไม่มีข้อมูลที่จะส่งออก");
      return;
    }

    const workbook = XLSX.utils.book_new();

    // รายงานรายเดือน
    const reportData = [
      ["เดือน", "ยอดขายรวม", "VAT ขาย", "VAT ซื้อ", "VAT ที่ต้องจ่าย", "สถานะ"],
      ...reports.map((r: any) => [
        r.month,
        r.totalSales.toFixed(2),
        r.vatSales.toFixed(2),
        r.vatBuy.toFixed(2),
        r.vatPay.toFixed(2),
        r.status === "submitted" ? "ยื่นแล้ว" : "ร่าง",
      ]),
    ];

    const reportSheet = XLSX.utils.aoa_to_sheet(reportData);
    XLSX.utils.book_append_sheet(workbook, reportSheet, "รายงาน VAT");

    // สรุปทั้งปี
    const totalSales = reports.reduce((sum: number, r: any) => sum + r.totalSales, 0);
    const totalVatSales = reports.reduce((sum: number, r: any) => sum + r.vatSales, 0);
    const totalVatBuy = reports.reduce((sum: number, r: any) => sum + r.vatBuy, 0);
    const totalVatPay = reports.reduce((sum: number, r: any) => sum + r.vatPay, 0);

    const summaryData = [
      ["สรุปรายงาน VAT ประจำปี"],
      ["ปี", selectedYear],
      [""],
      ["ยอดขายรวมทั้งปี", totalSales.toFixed(2)],
      ["VAT ขายรวม", totalVatSales.toFixed(2)],
      ["VAT ซื้อรวม", totalVatBuy.toFixed(2)],
      ["VAT ที่ต้องจ่ายรวม", totalVatPay.toFixed(2)],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "สรุปทั้งปี");

    reportSheet["!cols"] = [
      { wch: 12 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 15 },
      { wch: 12 },
    ];

    const fileName = `vat-report-${selectedYear}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast.success("ส่งออก Excel สำเร็จ");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">รายงานภาษีมูลค่าเพิ่ม (VAT)</h1>
              <p className="text-muted-foreground">รายงานภาษีขายและภาษีซื้อ</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExportExcel} variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              ส่งออก Excel
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>สร้างรายงาน VAT</CardTitle>
            <CardDescription>เลือกเดือนที่ต้องการสร้างรายงาน</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="space-y-2 flex-1">
                <Label>เลือกเดือน</Label>
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              </div>
              <Button onClick={handleGenerate} disabled={generateMutation.isPending}>
                <RefreshCw className="h-4 w-4 mr-2" />
                สร้างรายงาน
              </Button>
            </div>
          </CardContent>
        </Card>

        {currentReport && (
          <Card>
            <CardHeader>
              <CardTitle>รายงาน VAT เดือน {currentReport.month}</CardTitle>
              <CardDescription>
                สถานะ:{" "}
                <span className={currentReport.status === "submitted" ? "text-green-600" : "text-yellow-600"}>
                  {currentReport.status === "submitted" ? "ยื่นแล้ว" : "ร่าง"}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm text-muted-foreground">ยอดขายรวม</div>
                  <div className="text-2xl font-bold">฿{currentReport.totalSales.toFixed(2)}</div>
                </div>
                <div className="p-4 bg-amber-50 rounded-lg">
                  <div className="text-sm text-muted-foreground">VAT ขาย (7%)</div>
                  <div className="text-2xl font-bold">฿{currentReport.vatSales.toFixed(2)}</div>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <div className="text-sm text-muted-foreground">VAT ซื้อ</div>
                  <div className="text-2xl font-bold">฿{currentReport.vatBuy.toFixed(2)}</div>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="text-sm text-muted-foreground">VAT ที่ต้องจ่าย</div>
                  <div className="text-2xl font-bold">฿{currentReport.vatPay.toFixed(2)}</div>
                </div>
              </div>

              {currentReport.status === "draft" && (
                <div className="flex justify-end">
                  <Button onClick={handleSubmit} disabled={submitMutation.isPending}>
                    ยื่นรายงาน VAT
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>รายงาน VAT ประจำปี {selectedYear}</CardTitle>
            <CardDescription>สรุปรายงาน VAT ทั้งปี</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Label>เลือกปี</Label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-muted-foreground">กำลังโหลด...</div>
              </div>
            ) : !reports || reports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">ไม่พบรายงาน VAT สำหรับปีนี้</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>เดือน</TableHead>
                      <TableHead className="text-right">ยอดขายรวม</TableHead>
                      <TableHead className="text-right">VAT ขาย</TableHead>
                      <TableHead className="text-right">VAT ซื้อ</TableHead>
                      <TableHead className="text-right">VAT ที่ต้องจ่าย</TableHead>
                      <TableHead>สถานะ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report: any) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">{report.month}</TableCell>
                        <TableCell className="text-right">฿{report.totalSales.toFixed(2)}</TableCell>
                        <TableCell className="text-right">฿{report.vatSales.toFixed(2)}</TableCell>
                        <TableCell className="text-right">฿{report.vatBuy.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-bold">฿{report.vatPay.toFixed(2)}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              report.status === "submitted"
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {report.status === "submitted" ? "ยื่นแล้ว" : "ร่าง"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Save, Building2, Receipt, FileText, ShoppingCart, Download, RefreshCw, Plus, Edit2, Trash2, Printer, Users, Settings as SettingsIcon } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { exportTaxInvoiceToPDF, exportTaxInvoicesToExcel, TaxInvoiceData } from "@/lib/exportTax";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import * as XLSX from "xlsx";

export default function TaxSystem() {
  const [activeTab, setActiveTab] = useState("company");

  // Company Profile state
  const { data: profile, isLoading: profileLoading } = trpc.tax.getCompanyProfile.useQuery();
  const updateProfileMutation = trpc.tax.updateCompanyProfile.useMutation({
    onSuccess: () => {
      toast.success("บันทึกข้อมูลกิจการสำเร็จ");
    },
    onError: (error) => {
      toast.error(error.message || "เกิดข้อผิดพลาด");
    },
  });
  const [profileData, setProfileData] = useState({
    name: "",
    taxId: "",
    address: "",
    district: "",
    province: "",
    postalCode: "",
    phone: "",
    email: "",
    businessType: "",
    vatRegistered: false,
    vatNumber: "",
  });

  // Tax Invoices state
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date;
  });
  const [endDate, setEndDate] = useState(new Date());
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const { data: invoices, isLoading: invoicesLoading } = trpc.tax.getTaxInvoicesByDateRange.useQuery(
    { startDate, endDate },
    { enabled: !!startDate && !!endDate }
  );

  // VAT Reports state
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<string>(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`
  );
  const { data: reports, isLoading: reportsLoading, refetch: refetchReports } = trpc.tax.getVatReportsByYear.useQuery(
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
      refetchReports();
    },
  });
  const submitMutation = trpc.tax.submitVatReport.useMutation({
    onSuccess: () => {
      toast.success("ยื่นรายงาน VAT สำเร็จ");
      refetchReports();
    },
  });

  // Purchase Invoices state
  const [purchaseStartDate, setPurchaseStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date;
  });
  const [purchaseEndDate, setPurchaseEndDate] = useState(new Date());
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
  const [purchaseFormData, setPurchaseFormData] = useState({
    invoiceNo: "",
    supplierName: "",
    supplierTaxId: "",
    supplierAddress: "",
    date: new Date(),
    items: [{ description: "", quantity: 1, unitPrice: 0, amount: 0 }],
  });
  const { data: purchaseInvoices, isLoading: purchaseLoading, refetch: refetchPurchase } = trpc.purchaseInvoices.getByDateRange.useQuery(
    { startDate: purchaseStartDate, endDate: purchaseEndDate },
    { enabled: !!purchaseStartDate && !!purchaseEndDate }
  );
  const createPurchaseMutation = trpc.purchaseInvoices.create.useMutation({
    onSuccess: () => {
      toast.success("สร้างใบรับซื้อสำเร็จ");
      setIsPurchaseOpen(false);
      setPurchaseFormData({
        invoiceNo: "",
        supplierName: "",
        supplierTaxId: "",
        supplierAddress: "",
        date: new Date(),
        items: [{ description: "", quantity: 1, unitPrice: 0, amount: 0 }],
      });
      refetchPurchase();
    },
  });

  // Load profile data
  useEffect(() => {
    if (profile) {
      setProfileData({
        name: profile.name || "",
        taxId: profile.taxId || "",
        address: profile.address || "",
        district: profile.district || "",
        province: profile.province || "",
        postalCode: profile.postalCode || "",
        phone: profile.phone || "",
        email: profile.email || "",
        businessType: profile.businessType || "",
        vatRegistered: profile.vatRegistered || false,
        vatNumber: profile.vatNumber || "",
      });
    }
  }, [profile]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileData.name || !profileData.taxId || !profileData.address) {
      toast.error("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน");
      return;
    }
    if (profileData.taxId.length !== 13) {
      toast.error("เลขผู้เสียภาษีต้องมี 13 หลัก");
      return;
    }
    updateProfileMutation.mutate(profileData);
  };

  const handleExportPDF = (invoice: any) => {
    const invoiceData: TaxInvoiceData = {
      invoiceNo: invoice.invoiceNo,
      invoiceType: invoice.invoiceType,
      date: new Date(invoice.date),
      customerName: invoice.customerName,
      customerTaxId: invoice.customerTaxId,
      customerAddress: invoice.customerAddress,
      subtotal: invoice.subtotal,
      vat: invoice.vat,
      total: invoice.total,
      companyName: profile?.name,
      companyTaxId: profile?.taxId,
      companyAddress: profile?.address,
    };
    exportTaxInvoiceToPDF(invoiceData);
  };

  const handleExportAllExcel = () => {
    if (!invoices || invoices.length === 0) {
      toast.error("ไม่มีข้อมูลที่จะส่งออก");
      return;
    }
    const invoiceData: TaxInvoiceData[] = invoices.map((inv: any) => ({
      invoiceNo: inv.invoiceNo,
      invoiceType: inv.invoiceType,
      date: new Date(inv.date),
      customerName: inv.customerName,
      customerTaxId: inv.customerTaxId,
      customerAddress: inv.customerAddress,
      subtotal: inv.subtotal,
      vat: inv.vat,
      total: inv.total,
      companyName: profile?.name,
      companyTaxId: profile?.taxId,
      companyAddress: profile?.address,
    }));
    exportTaxInvoicesToExcel(invoiceData);
    toast.success("ส่งออก Excel สำเร็จ");
  };

  const calculatePurchaseTotals = () => {
    const subtotal = purchaseFormData.items.reduce((sum, item) => sum + item.amount, 0);
    const vat = subtotal * 0.07;
    const total = subtotal + vat;
    return { subtotal, vat, total };
  };

  const updatePurchaseItem = (index: number, field: string, value: any) => {
    const newItems = [...purchaseFormData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === "quantity" || field === "unitPrice") {
      newItems[index].amount = newItems[index].quantity * newItems[index].unitPrice;
    }
    setPurchaseFormData({ ...purchaseFormData, items: newItems });
  };

  const addPurchaseItem = () => {
    setPurchaseFormData({
      ...purchaseFormData,
      items: [...purchaseFormData.items, { description: "", quantity: 1, unitPrice: 0, amount: 0 }],
    });
  };

  const removePurchaseItem = (index: number) => {
    setPurchaseFormData({
      ...purchaseFormData,
      items: purchaseFormData.items.filter((_, i) => i !== index),
    });
  };

  const handleSavePurchase = () => {
    if (!purchaseFormData.invoiceNo || !purchaseFormData.supplierName) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    const { subtotal, vat, total } = calculatePurchaseTotals();
    createPurchaseMutation.mutate({
      ...purchaseFormData,
      subtotal,
      vat,
      total,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold">ระบบภาษี</h1>
          <p className="text-muted-foreground">จัดการข้อมูลกิจการ ใบกำกับภาษี และรายงาน VAT</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="company" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              ข้อมูลกิจการ
            </TabsTrigger>
            <TabsTrigger value="invoices" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              ใบกำกับภาษี
            </TabsTrigger>
            <TabsTrigger value="vat" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              รายงาน VAT
            </TabsTrigger>
            <TabsTrigger value="purchase" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              ใบรับซื้อ
            </TabsTrigger>
          </TabsList>

          {/* Company Profile Tab */}
          <TabsContent value="company" className="space-y-6 mt-6">
            {profileLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-muted-foreground">กำลังโหลด...</div>
              </div>
            ) : (
              <form onSubmit={handleSaveProfile}>
                <Card>
                  <CardHeader>
                    <CardTitle>ข้อมูลพื้นฐาน</CardTitle>
                    <CardDescription>กรอกข้อมูลร้าน/บริษัทของคุณ</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name">ชื่อร้าน/บริษัท *</Label>
                        <Input
                          id="name"
                          value={profileData.name}
                          onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="taxId">เลขผู้เสียภาษี (13 หลัก) *</Label>
                        <Input
                          id="taxId"
                          value={profileData.taxId}
                          onChange={(e) => setProfileData({ ...profileData, taxId: e.target.value.replace(/\D/g, "").slice(0, 13) })}
                          maxLength={13}
                          required
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="address">ที่อยู่ *</Label>
                        <Textarea
                          id="address"
                          value={profileData.address}
                          onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                          rows={2}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="district">ตำบล/แขวง</Label>
                        <Input
                          id="district"
                          value={profileData.district}
                          onChange={(e) => setProfileData({ ...profileData, district: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="province">จังหวัด</Label>
                        <Input
                          id="province"
                          value={profileData.province}
                          onChange={(e) => setProfileData({ ...profileData, province: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="postalCode">รหัสไปรษณีย์</Label>
                        <Input
                          id="postalCode"
                          value={profileData.postalCode}
                          onChange={(e) => setProfileData({ ...profileData, postalCode: e.target.value.replace(/\D/g, "").slice(0, 5) })}
                          maxLength={5}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
                        <Input
                          id="phone"
                          value={profileData.phone}
                          onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">อีเมล</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profileData.email}
                          onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="businessType">ประเภทกิจการ</Label>
                        <Input
                          id="businessType"
                          value={profileData.businessType}
                          onChange={(e) => setProfileData({ ...profileData, businessType: e.target.value })}
                          placeholder="เช่น ร้านอาหาร, ร้านค้าปลีก"
                        />
                      </div>
                    </div>
                    <div className="border-t pt-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="vatRegistered">จดทะเบียนภาษีมูลค่าเพิ่ม (VAT)</Label>
                          <p className="text-sm text-muted-foreground">
                            เปิดใช้งานเพื่อสร้างใบกำกับภาษีอัตโนมัติ
                          </p>
                        </div>
                        <Switch
                          id="vatRegistered"
                          checked={profileData.vatRegistered}
                          onCheckedChange={(checked) => setProfileData({ ...profileData, vatRegistered: checked })}
                        />
                      </div>
                      {profileData.vatRegistered && (
                        <div className="space-y-2">
                          <Label htmlFor="vatNumber">เลข VAT</Label>
                          <Input
                            id="vatNumber"
                            value={profileData.vatNumber}
                            onChange={(e) => setProfileData({ ...profileData, vatNumber: e.target.value })}
                            placeholder="เลข VAT (ถ้ามี)"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                      <Button type="submit" disabled={updateProfileMutation.isPending}>
                        <Save className="h-4 w-4 mr-2" />
                        บันทึก
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </form>
            )}
          </TabsContent>

          {/* Tax Invoices Tab - ใช้โค้ดจาก TaxInvoices.tsx */}
          <TabsContent value="invoices" className="space-y-6 mt-6">
            <div className="flex justify-end gap-2">
              <Button onClick={handleExportAllExcel} variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                ส่งออก Excel
              </Button>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>ค้นหาและกรอง</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>วันที่เริ่มต้น</Label>
                    <Input
                      type="date"
                      value={format(startDate, "yyyy-MM-dd")}
                      onChange={(e) => setStartDate(new Date(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>วันที่สิ้นสุด</Label>
                    <Input
                      type="date"
                      value={format(endDate, "yyyy-MM-dd")}
                      onChange={(e) => setEndDate(new Date(e.target.value))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>รายการใบกำกับภาษี</CardTitle>
                <CardDescription>ทั้งหมด {invoices?.length || 0} ใบ</CardDescription>
              </CardHeader>
              <CardContent>
                {invoicesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-muted-foreground">กำลังโหลด...</div>
                  </div>
                ) : !invoices || invoices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">ไม่พบใบกำกับภาษีในช่วงเวลาที่เลือก</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>เลขที่ใบกำกับภาษี</TableHead>
                          <TableHead>วันที่</TableHead>
                          <TableHead>ชื่อลูกค้า</TableHead>
                          <TableHead>เลขผู้เสียภาษี</TableHead>
                          <TableHead className="text-right">ยอดก่อน VAT</TableHead>
                          <TableHead className="text-right">VAT (7%)</TableHead>
                          <TableHead className="text-right">ยอดรวม</TableHead>
                          <TableHead>ประเภท</TableHead>
                          <TableHead className="text-right">จัดการ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.map((invoice: any) => (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-medium">{invoice.invoiceNo}</TableCell>
                            <TableCell>
                              {format(new Date(invoice.date), "dd/MM/yyyy", { locale: th })}
                            </TableCell>
                            <TableCell>{invoice.customerName}</TableCell>
                            <TableCell>{invoice.customerTaxId || "-"}</TableCell>
                            <TableCell className="text-right">฿{invoice.subtotal.toFixed(2)}</TableCell>
                            <TableCell className="text-right">฿{invoice.vat.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-bold">฿{invoice.total.toFixed(2)}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded text-xs ${
                                invoice.invoiceType === "full" 
                                  ? "bg-blue-100 text-blue-800" 
                                  : "bg-gray-100 text-gray-800"
                              }`}>
                                {invoice.invoiceType === "full" ? "เต็มรูป" : "อย่างย่อ"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleExportPDF(invoice)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* VAT Reports Tab - ใช้โค้ดจาก VatReports.tsx */}
          <TabsContent value="vat" className="space-y-6 mt-6">
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
                  <Button onClick={() => generateMutation.mutate({ month: selectedMonth })} disabled={generateMutation.isPending}>
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
                      <Button onClick={() => submitMutation.mutate({ month: selectedMonth })} disabled={submitMutation.isPending}>
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
                {reportsLoading ? (
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
                              <span className={`px-2 py-1 rounded text-xs ${
                                report.status === "submitted"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}>
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
          </TabsContent>

          {/* Purchase Invoices Tab - ใช้โค้ดจาก PurchaseInvoices.tsx */}
          <TabsContent value="purchase" className="space-y-6 mt-6">
            <div className="flex justify-end">
              <Dialog open={isPurchaseOpen} onOpenChange={setIsPurchaseOpen}>
                <DialogTrigger asChild>
                  <Button variant="add">
                    <Plus className="h-4 w-4 mr-2" />
                    เพิ่มใบรับซื้อ
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>เพิ่มใบรับซื้อ</DialogTitle>
                    <DialogDescription>กรอกข้อมูลใบรับซื้อ</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>เลขที่ใบรับซื้อ *</Label>
                        <Input
                          value={purchaseFormData.invoiceNo}
                          onChange={(e) => setPurchaseFormData({ ...purchaseFormData, invoiceNo: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>วันที่ *</Label>
                        <Input
                          type="date"
                          value={format(purchaseFormData.date, "yyyy-MM-dd")}
                          onChange={(e) => setPurchaseFormData({ ...purchaseFormData, date: new Date(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>ชื่อผู้ขาย *</Label>
                      <Input
                        value={purchaseFormData.supplierName}
                        onChange={(e) => setPurchaseFormData({ ...purchaseFormData, supplierName: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>เลขผู้เสียภาษีผู้ขาย</Label>
                        <Input
                          value={purchaseFormData.supplierTaxId}
                          onChange={(e) => setPurchaseFormData({ ...purchaseFormData, supplierTaxId: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>ที่อยู่ผู้ขาย</Label>
                        <Textarea
                          value={purchaseFormData.supplierAddress}
                          onChange={(e) => setPurchaseFormData({ ...purchaseFormData, supplierAddress: e.target.value })}
                          rows={2}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label>รายการสินค้า/บริการ</Label>
                        <Button type="button" variant="add" size="sm" onClick={addPurchaseItem}>
                          <Plus className="h-4 w-4 mr-2" />
                          เพิ่มรายการ
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {purchaseFormData.items.map((item, index) => (
                          <div key={index} className="grid grid-cols-12 gap-2 items-end">
                            <div className="col-span-5">
                              <Input
                                placeholder="รายละเอียด"
                                value={item.description}
                                onChange={(e) => updatePurchaseItem(index, "description", e.target.value)}
                              />
                            </div>
                            <div className="col-span-2">
                              <Input
                                type="number"
                                placeholder="จำนวน"
                                value={item.quantity}
                                onChange={(e) => updatePurchaseItem(index, "quantity", parseFloat(e.target.value) || 0)}
                              />
                            </div>
                            <div className="col-span-2">
                              <Input
                                type="number"
                                placeholder="ราคาต่อหน่วย"
                                value={item.unitPrice}
                                onChange={(e) => updatePurchaseItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                              />
                            </div>
                            <div className="col-span-2">
                              <Input
                                type="number"
                                placeholder="รวม"
                                value={item.amount.toFixed(2)}
                                readOnly
                              />
                            </div>
                            <div className="col-span-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removePurchaseItem(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between">
                        <span>ยอดก่อน VAT:</span>
                        <span>฿{calculatePurchaseTotals().subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>VAT (7%):</span>
                        <span>฿{calculatePurchaseTotals().vat.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>ยอดรวม:</span>
                        <span>฿{calculatePurchaseTotals().total.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsPurchaseOpen(false)}>
                        ยกเลิก
                      </Button>
                      <Button onClick={handleSavePurchase} disabled={createPurchaseMutation.isPending}>
                        บันทึก
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>ค้นหาและกรอง</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>วันที่เริ่มต้น</Label>
                    <Input
                      type="date"
                      value={format(purchaseStartDate, "yyyy-MM-dd")}
                      onChange={(e) => setPurchaseStartDate(new Date(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>วันที่สิ้นสุด</Label>
                    <Input
                      type="date"
                      value={format(purchaseEndDate, "yyyy-MM-dd")}
                      onChange={(e) => setPurchaseEndDate(new Date(e.target.value))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>รายการใบรับซื้อ</CardTitle>
                <CardDescription>ทั้งหมด {purchaseInvoices?.length || 0} ใบ</CardDescription>
              </CardHeader>
              <CardContent>
                {purchaseLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-muted-foreground">กำลังโหลด...</div>
                  </div>
                ) : !purchaseInvoices || purchaseInvoices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">ไม่พบใบรับซื้อในช่วงเวลาที่เลือก</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>เลขที่ใบรับซื้อ</TableHead>
                          <TableHead>วันที่</TableHead>
                          <TableHead>ชื่อผู้ขาย</TableHead>
                          <TableHead>เลขผู้เสียภาษี</TableHead>
                          <TableHead className="text-right">ยอดก่อน VAT</TableHead>
                          <TableHead className="text-right">VAT (7%)</TableHead>
                          <TableHead className="text-right">ยอดรวม</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {purchaseInvoices.map((invoice: any) => (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-medium">{invoice.invoiceNo}</TableCell>
                            <TableCell>
                              {format(new Date(invoice.date), "dd/MM/yyyy", { locale: th })}
                            </TableCell>
                            <TableCell>{invoice.supplierName}</TableCell>
                            <TableCell>{invoice.supplierTaxId || "-"}</TableCell>
                            <TableCell className="text-right">฿{invoice.subtotal.toFixed(2)}</TableCell>
                            <TableCell className="text-right">฿{invoice.vat.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-bold">฿{invoice.total.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

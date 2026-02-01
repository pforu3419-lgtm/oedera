import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Download, FileText, Search, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { exportTaxInvoiceToPDF, exportTaxInvoicesToExcel, TaxInvoiceData } from "@/lib/exportTax";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export default function TaxInvoices() {
  const [, setLocation] = useLocation();
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date;
  });
  const [endDate, setEndDate] = useState(new Date());
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { data: invoices, isLoading, refetch } = trpc.tax.getTaxInvoicesByDateRange.useQuery(
    { startDate, endDate },
    { enabled: !!startDate && !!endDate }
  );

  const { data: companyProfile } = trpc.tax.getCompanyProfile.useQuery();

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
      companyName: companyProfile?.name,
      companyTaxId: companyProfile?.taxId,
      companyAddress: companyProfile?.address,
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
      companyName: companyProfile?.name,
      companyTaxId: companyProfile?.taxId,
      companyAddress: companyProfile?.address,
    }));
    exportTaxInvoicesToExcel(invoiceData);
    toast.success("ส่งออก Excel สำเร็จ");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => setLocation("/")} className="shrink-0 gap-2">
              <ArrowLeft className="h-4 w-4" />
              ย้อนกลับ
            </Button>
            <div>
              <h1 className="text-3xl font-bold">ใบกำกับภาษี</h1>
              <p className="text-muted-foreground">รายการใบกำกับภาษีทั้งหมด</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExportAllExcel} variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              ส่งออก Excel
            </Button>
          </div>
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
            <CardDescription>
              ทั้งหมด {invoices?.length || 0} ใบ
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
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
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setIsDetailOpen(true);
                              }}
                            >
                              ดูรายละเอียด
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleExportPDF(invoice)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>รายละเอียดใบกำกับภาษี</DialogTitle>
              <DialogDescription>
                เลขที่ {selectedInvoice?.invoiceNo}
              </DialogDescription>
            </DialogHeader>
            {selectedInvoice && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">วันที่</Label>
                    <p>{format(new Date(selectedInvoice.date), "dd/MM/yyyy", { locale: th })}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">ประเภท</Label>
                    <p>{selectedInvoice.invoiceType === "full" ? "เต็มรูป" : "อย่างย่อ"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">ชื่อลูกค้า</Label>
                    <p>{selectedInvoice.customerName}</p>
                  </div>
                  {selectedInvoice.customerTaxId && (
                    <div>
                      <Label className="text-muted-foreground">เลขผู้เสียภาษี</Label>
                      <p>{selectedInvoice.customerTaxId}</p>
                    </div>
                  )}
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between py-2">
                    <span>ยอดก่อน VAT:</span>
                    <span>฿{selectedInvoice.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span>VAT (7%):</span>
                    <span>฿{selectedInvoice.vat.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 font-bold text-lg border-t pt-2">
                    <span>ยอดรวม:</span>
                    <span>฿{selectedInvoice.total.toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button onClick={() => handleExportPDF(selectedInvoice)}>
                    <Download className="h-4 w-4 mr-2" />
                    ดาวน์โหลด PDF
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

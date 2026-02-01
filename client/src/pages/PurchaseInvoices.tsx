import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Plus, Download, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export default function PurchaseInvoices() {
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date;
  });
  const [endDate, setEndDate] = useState(new Date());
  const [formData, setFormData] = useState({
    invoiceNo: "",
    supplierName: "",
    supplierTaxId: "",
    supplierAddress: "",
    date: new Date(),
    items: [{ description: "", quantity: 1, unitPrice: 0, amount: 0 }],
  });

  const { data: invoices, isLoading, refetch } = trpc.purchaseInvoices.getByDateRange.useQuery(
    { startDate, endDate },
    { enabled: !!startDate && !!endDate }
  );

  const createMutation = trpc.purchaseInvoices.create.useMutation({
    onSuccess: () => {
      toast.success("สร้างใบรับซื้อสำเร็จ");
      setIsOpen(false);
      setFormData({
        invoiceNo: "",
        supplierName: "",
        supplierTaxId: "",
        supplierAddress: "",
        date: new Date(),
        items: [{ description: "", quantity: 1, unitPrice: 0, amount: 0 }],
      });
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "เกิดข้อผิดพลาด");
    },
  });

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.amount, 0);
    const vat = subtotal * 0.07;
    const total = subtotal + vat;
    return { subtotal, vat, total };
  };

  const handleSubmit = () => {
    if (!formData.invoiceNo || !formData.supplierName) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    const { subtotal, vat, total } = calculateTotals();
    createMutation.mutate({
      ...formData,
      subtotal,
      vat,
      total,
    });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === "quantity" || field === "unitPrice") {
      newItems[index].amount = newItems[index].quantity * newItems[index].unitPrice;
    }
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: "", quantity: 1, unitPrice: 0, amount: 0 }],
    });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const { subtotal, vat, total } = calculateTotals();

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
              <h1 className="text-3xl font-bold">ใบรับซื้อ</h1>
              <p className="text-muted-foreground">จัดการใบรับซื้อสำหรับคำนวณ VAT ซื้อ</p>
            </div>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
                      value={formData.invoiceNo}
                      onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>วันที่ *</Label>
                    <Input
                      type="date"
                      value={format(formData.date, "yyyy-MM-dd")}
                      onChange={(e) => setFormData({ ...formData, date: new Date(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>ชื่อผู้ขาย *</Label>
                  <Input
                    value={formData.supplierName}
                    onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>เลขผู้เสียภาษีผู้ขาย</Label>
                    <Input
                      value={formData.supplierTaxId}
                      onChange={(e) => setFormData({ ...formData, supplierTaxId: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ที่อยู่ผู้ขาย</Label>
                    <Textarea
                      value={formData.supplierAddress}
                      onChange={(e) => setFormData({ ...formData, supplierAddress: e.target.value })}
                      rows={2}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>รายการสินค้า/บริการ</Label>
                    <Button type="button" variant="add" size="sm" onClick={addItem}>
                      <Plus className="h-4 w-4 mr-2" />
                      เพิ่มรายการ
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {formData.items.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-5">
                          <Input
                            placeholder="รายละเอียด"
                            value={item.description}
                            onChange={(e) => updateItem(index, "description", e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            placeholder="จำนวน"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            placeholder="ราคาต่อหน่วย"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
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
                            onClick={() => removeItem(index)}
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
                    <span>฿{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>VAT (7%):</span>
                    <span>฿{vat.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>ยอดรวม:</span>
                    <span>฿{total.toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsOpen(false)}>
                    ยกเลิก
                  </Button>
                  <Button onClick={handleSubmit} disabled={createMutation.isPending}>
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
            <CardTitle>รายการใบรับซื้อ</CardTitle>
            <CardDescription>ทั้งหมด {invoices?.length || 0} ใบ</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-muted-foreground">กำลังโหลด...</div>
              </div>
            ) : !invoices || invoices.length === 0 ? (
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
                    {invoices.map((invoice: any) => (
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
      </div>
    </DashboardLayout>
  );
}

import { useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Plus, Edit2, Trash2, AlertCircle, ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";

export default function Discounts() {
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "percentage" as const,
    value: "",
    productId: "",
    minBillAmount: "",
    maxDiscountAmount: "",
    startDate: "",
    endDate: "",
    code: "",
    maxUsageCount: "100",
    autoApply: false,
  });

  const { data: discounts, refetch } = trpc.discounts.list.useQuery();
  const createMutation = trpc.discounts.create.useMutation();
  const updateMutation = trpc.discounts.update.useMutation();
  const deleteMutation = trpc.discounts.delete.useMutation();
  const createCodeMutation = trpc.discountCodes.create.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.autoApply && !formData.code.trim()) {
      toast.error("กรุณากรอกโค้ดส่วนลด หรือเลือกใช้อัตโนมัติ");
      return;
    }

    try {
      if (editingId) {
        const payload = {
          id: editingId,
          name: formData.name,
          description: formData.description,
          type: formData.type,
          value: formData.value,
          productId: formData.productId || undefined,
          minBillAmount: formData.minBillAmount || undefined,
          maxDiscountAmount: formData.maxDiscountAmount || undefined,
          startDate: formData.startDate ? new Date(formData.startDate) : undefined,
          endDate: formData.endDate ? new Date(formData.endDate) : undefined,
          autoApply: formData.autoApply,
        };
        await updateMutation.mutateAsync(payload);
        if (!formData.autoApply && formData.code.trim()) {
          await createCodeMutation.mutateAsync({
            code: formData.code.trim(),
            discountId: editingId,
            maxUsageCount: Math.max(1, parseInt(formData.maxUsageCount || "1", 10)),
        });
        }
        toast.success("อัปเดตส่วนลดสำเร็จ");
      } else {
        const payload = {
          name: formData.name,
          description: formData.description,
          type: formData.type,
          value: formData.value,
          productId: formData.productId || undefined,
          minBillAmount: formData.minBillAmount || undefined,
          maxDiscountAmount: formData.maxDiscountAmount || undefined,
          startDate: formData.startDate ? new Date(formData.startDate) : undefined,
          endDate: formData.endDate ? new Date(formData.endDate) : undefined,
          autoApply: formData.autoApply,
        };
        const created = await createMutation.mutateAsync(payload);
        if (!formData.autoApply && formData.code.trim() && created?.id) {
          await createCodeMutation.mutateAsync({
            code: formData.code.trim(),
            discountId: created.id,
            maxUsageCount: Math.max(1, parseInt(formData.maxUsageCount || "1", 10)),
        });
        }
        toast.success("สร้างส่วนลดสำเร็จ");
      }

      setFormData({
        name: "",
        description: "",
        type: "percentage",
        value: "",
        productId: "",
        minBillAmount: "",
        maxDiscountAmount: "",
        startDate: "",
        endDate: "",
        code: "",
        maxUsageCount: "100",
        autoApply: false,
      });
      setShowAdvanced(false);
      setEditingId(null);
      setIsOpen(false);
      refetch();
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด");
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("คุณแน่ใจหรือว่าต้องการลบส่วนลดนี้?")) {
      try {
        await deleteMutation.mutateAsync({ id });
        toast.success("ลบส่วนลดสำเร็จ");
        refetch();
      } catch (error) {
        toast.error("เกิดข้อผิดพลาด");
      }
    }
  };

  const handleEdit = (discount: any) => {
    setEditingId(discount.id);
    const hasAdvanced = !!(discount.description || discount.minBillAmount || discount.maxDiscountAmount || discount.startDate || discount.endDate);
    setFormData({
      name: discount.name,
      description: discount.description || "",
      type: discount.type,
      value: discount.value,
      productId: discount.productId || "",
      minBillAmount: discount.minBillAmount || "",
      maxDiscountAmount: discount.maxDiscountAmount || "",
      startDate: discount.startDate ? new Date(discount.startDate).toISOString().split("T")[0] : "",
      endDate: discount.endDate ? new Date(discount.endDate).toISOString().split("T")[0] : "",
      code: "",
      maxUsageCount: "100",
      autoApply: Boolean(discount.autoApply),
    });
    setShowAdvanced(hasAdvanced);
    setIsOpen(true);
  };

  const getDiscountTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      percentage: "เปอร์เซ็นต์",
      fixed_amount: "จำนวนเงินคงที่",
      product_specific: "ส่วนลดสินค้า",
      bill_total: "ส่วนลดท้ายบิล",
    };
    return labels[type] || type;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
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
              <h1 className="text-3xl font-bold tracking-tight">ส่วนลดและโปรโมชัน</h1>
              <p className="text-muted-foreground mt-2">
                จัดการส่วนลดและโปรโมชันสำหรับสินค้าและบิล
              </p>
            </div>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button
                variant="add"
                size="lg"
                onClick={() => {
                  setEditingId(null);
                  setFormData({
                    name: "",
                    description: "",
                    type: "percentage",
                    value: "",
                    productId: "",
                    minBillAmount: "",
                    maxDiscountAmount: "",
                    startDate: "",
                    endDate: "",
                    code: "",
                    maxUsageCount: "100",
                    autoApply: false,
                  });
                  setShowAdvanced(false);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                เพิ่มส่วนลด
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? "แก้ไขส่วนลด" : "สร้างส่วนลดใหม่"}</DialogTitle>
              <DialogDescription>
                กรอกข้อมูลหลัก — ตัวเลือกเพิ่มเติมสามารถเปิดดูได้ด้านล่าง
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* ข้อมูลหลัก - เห็นทันที */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">ชื่อส่วนลด</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="เช่น ส่วนลด 20%"
                    required
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">ประเภท</Label>
                    <Select value={formData.type} onValueChange={(v: any) => setFormData({ ...formData, type: v })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">เปอร์เซ็นต์ (%)</SelectItem>
                        <SelectItem value="fixed_amount">จำนวนเงิน (฿)</SelectItem>
                        <SelectItem value="product_specific">ส่วนลดสินค้า</SelectItem>
                        <SelectItem value="bill_total">ส่วนลดท้ายบิล</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="value">
                      ค่าส่วนลด {formData.type === "percentage" ? "(%)" : "(฿)"}
                    </Label>
                    <Input
                      id="value"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      placeholder={formData.type === "percentage" ? "20" : "100"}
                      required
                      className="mt-1"
                    />
                  </div>
                </div>
                {formData.type === "product_specific" && (
                  <div>
                    <Label htmlFor="productId">ID สินค้า</Label>
                    <Input
                      id="productId"
                      value={formData.productId}
                      onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                      placeholder="เช่น 554"
                      className="mt-1"
                    />
                  </div>
                )}
              </div>

              {/* การใช้งาน - ใช้โค้ด หรือ อัตโนมัติ */}
              <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
                <Label>วิธีใช้งาน</Label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="applyMode"
                      checked={!formData.autoApply}
                      onChange={() => setFormData({ ...formData, autoApply: false })}
                    />
                    <span>ใช้โค้ด</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="applyMode"
                      checked={formData.autoApply}
                      onChange={() => setFormData({ ...formData, autoApply: true, code: "" })}
                    />
                    <span>ใช้อัตโนมัติ</span>
                  </label>
                </div>
                {!formData.autoApply && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <Label htmlFor="code" className="text-xs">โค้ดส่วนลด</Label>
                      <Input
                        id="code"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        placeholder="เช่น SAVE20"
                        className="mt-1 h-9"
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxUsageCount" className="text-xs">ใช้ได้ (ครั้ง)</Label>
                      <Input
                        id="maxUsageCount"
                        type="number"
                        min="1"
                        value={formData.maxUsageCount}
                        onChange={(e) => setFormData({ ...formData, maxUsageCount: e.target.value })}
                        placeholder="100"
                        className="mt-1 h-9"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ตัวเลือกเพิ่มเติม - ซ่อนไว้ */}
              <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                <CollapsibleTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
                    ตัวเลือกเพิ่มเติม
                    {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-3 pt-3 border-t mt-2">
                    <div>
                      <Label htmlFor="description" className="text-xs">คำอธิบาย</Label>
                      <Input
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="คำอธิบายเพิ่มเติม"
                        className="mt-1 h-9"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="minBillAmount" className="text-xs">ยอดขั้นต่ำ (฿)</Label>
                        <Input
                          id="minBillAmount"
                          type="number"
                          step="0.01"
                          value={formData.minBillAmount}
                          onChange={(e) => setFormData({ ...formData, minBillAmount: e.target.value })}
                          placeholder="เช่น 500"
                          className="mt-1 h-9"
                        />
                      </div>
                      <div>
                        <Label htmlFor="maxDiscountAmount" className="text-xs">ส่วนลดสูงสุด (฿)</Label>
                        <Input
                          id="maxDiscountAmount"
                          type="number"
                          step="0.01"
                          value={formData.maxDiscountAmount}
                          onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                          placeholder="เช่น 1000"
                          className="mt-1 h-9"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="startDate" className="text-xs">วันที่เริ่ม</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={formData.startDate}
                          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                          className="mt-1 h-9"
                        />
                      </div>
                      <div>
                        <Label htmlFor="endDate" className="text-xs">วันที่สิ้นสุด</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={formData.endDate}
                          onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                          className="mt-1 h-9"
                        />
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  ยกเลิก
                </Button>
                <Button type="submit">
                  {editingId ? "บันทึก" : "สร้างส่วนลด"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Discounts Table */}
      <Card>
        <CardHeader>
          <CardTitle>รายการส่วนลด</CardTitle>
          <CardDescription>
            ทั้งหมด {discounts?.length || 0} รายการ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ชื่อส่วนลด</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead>ค่าส่วนลด</TableHead>
                  <TableHead>วันที่เริ่ม</TableHead>
                  <TableHead>วันที่สิ้นสุด</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>การจัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discounts && discounts.length > 0 ? (
                  discounts.map((discount: any) => (
                    <TableRow key={discount.id}>
                      <TableCell className="font-medium">{discount.name}</TableCell>
                      <TableCell>{getDiscountTypeLabel(discount.type)}</TableCell>
                      <TableCell>
                        {discount.type === "percentage" ? `${discount.value}%` : `฿${parseFloat(discount.value).toFixed(2)}`}
                      </TableCell>
                      <TableCell>
                        {discount.startDate ? new Date(discount.startDate).toLocaleDateString("th-TH") : "-"}
                      </TableCell>
                      <TableCell>
                        {discount.endDate ? new Date(discount.endDate).toLocaleDateString("th-TH") : "-"}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          discount.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {discount.isActive ? "ใช้งาน" : "ปิดใช้งาน"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(discount)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(discount.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">ไม่มีส่วนลด</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
    </DashboardLayout>
  );
}

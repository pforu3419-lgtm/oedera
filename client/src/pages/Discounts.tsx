import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Plus, Edit2, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function Discounts() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
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
    maxUsageCount: "",
    autoApply: false,
  });

  const { data: discounts, refetch } = trpc.discounts.list.useQuery();
  const createMutation = trpc.discounts.create.useMutation();
  const updateMutation = trpc.discounts.update.useMutation();
  const deleteMutation = trpc.discounts.delete.useMutation();
  const createCodeMutation = trpc.discountCodes.create.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
        maxUsageCount: "",
        autoApply: false,
      });
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
      maxUsageCount: "",
      autoApply: Boolean(discount.autoApply),
    });
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">ส่วนลดและโปรโมชัน</h1>
            <p className="text-muted-foreground mt-2">
              จัดการส่วนลดและโปรโมชันสำหรับสินค้าและบิล
            </p>
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
                    maxUsageCount: "",
                    autoApply: false,
                  });
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                เพิ่มส่วนลด
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? "แก้ไขส่วนลด" : "สร้างส่วนลดใหม่"}</DialogTitle>
              <DialogDescription>
                {editingId ? "แก้ไขข้อมูลส่วนลด" : "กรอกข้อมูลส่วนลดใหม่"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">ชื่อส่วนลด</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="เช่น ส่วนลด 20%"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="type">ประเภท</Label>
                  <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">เปอร์เซ็นต์</SelectItem>
                      <SelectItem value="fixed_amount">จำนวนเงินคงที่</SelectItem>
                      <SelectItem value="product_specific">ส่วนลดสินค้า</SelectItem>
                      <SelectItem value="bill_total">ส่วนลดท้ายบิล</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">คำอธิบาย</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="คำอธิบายเพิ่มเติม"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="value">ค่าส่วนลด</Label>
                  <Input
                    id="value"
                    type="number"
                    step="0.01"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder="เช่น 20 หรือ 100"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="productId">ID สินค้า (ถ้าเป็นส่วนลดสินค้า)</Label>
                  <Input
                    id="productId"
                    value={formData.productId}
                    onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                    placeholder="ID สินค้า"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="autoApply"
                  type="checkbox"
                  checked={formData.autoApply}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      autoApply: e.target.checked,
                      code: e.target.checked ? "" : formData.code,
                      maxUsageCount: e.target.checked ? "" : formData.maxUsageCount,
                    })
                  }
                />
                <Label htmlFor="autoApply">ใช้แบบอัตโนมัติ (ไม่ต้องใช้โค้ด)</Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code">โค้ดส่วนลด</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="เช่น SAVE20"
                    disabled={formData.autoApply}
                  />
                </div>
                <div>
                  <Label htmlFor="maxUsageCount">จำนวนครั้งที่ใช้ได้</Label>
                  <Input
                    id="maxUsageCount"
                    type="number"
                    min="1"
                    value={formData.maxUsageCount}
                    onChange={(e) => setFormData({ ...formData, maxUsageCount: e.target.value })}
                    placeholder="เช่น 100"
                    disabled={formData.autoApply}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minBillAmount">ยอดบิลขั้นต่ำ</Label>
                  <Input
                    id="minBillAmount"
                    type="number"
                    step="0.01"
                    value={formData.minBillAmount}
                    onChange={(e) => setFormData({ ...formData, minBillAmount: e.target.value })}
                    placeholder="เช่น 500"
                  />
                </div>
                <div>
                  <Label htmlFor="maxDiscountAmount">ส่วนลดสูงสุด</Label>
                  <Input
                    id="maxDiscountAmount"
                    type="number"
                    step="0.01"
                    value={formData.maxDiscountAmount}
                    onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                    placeholder="เช่น 1000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">วันที่เริ่ม</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">วันที่สิ้นสุด</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  ยกเลิก
                </Button>
                <Button type="submit">
                  {editingId ? "บันทึกการเปลี่ยนแปลง" : "สร้างส่วนลด"}
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

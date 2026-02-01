import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Loader2, Plus, Edit2, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

interface ToppingForm {
  id?: number;
  name: string;
  price: number;
}

export default function Toppings() {
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTopping, setEditingTopping] = useState<ToppingForm | null>(null);
  const [formData, setFormData] = useState<ToppingForm>({
    name: "",
    price: 0,
  });

  const toppingsQuery = trpc.toppings.list.useQuery();
  const createToppingMutation = trpc.toppings.create.useMutation();
  const updateToppingMutation = trpc.toppings.update.useMutation();
  const deleteToppingMutation = trpc.toppings.delete.useMutation();

  const toppings = toppingsQuery.data || [];

  const handleOpenDialog = (topping?: ToppingForm) => {
    if (topping) {
      setEditingTopping(topping);
      setFormData({
        name: topping.name,
        price: topping.price,
      });
    } else {
      setEditingTopping(null);
      setFormData({
        name: "",
        price: 0,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTopping(null);
    setFormData({
      name: "",
      price: 0,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("กรุณากรอกชื่อท็อปปิ้ง");
      return;
    }
    if (formData.price < 0) {
      toast.error("ราคาต้องมากกว่าหรือเท่ากับ 0");
      return;
    }

    try {
      if (editingTopping) {
        await updateToppingMutation.mutateAsync({
          id: editingTopping.id!,
          name: formData.name,
          price: formData.price,
        });
        toast.success("แก้ไขท็อปปิ้งสำเร็จ");
      } else {
        await createToppingMutation.mutateAsync({
          name: formData.name,
          price: formData.price,
        });
        toast.success("เพิ่มท็อปปิ้งสำเร็จ");
      }
      handleCloseDialog();
      toppingsQuery.refetch();
    } catch (error: any) {
      toast.error(error.message || "เกิดข้อผิดพลาด");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("คุณต้องการลบท็อปปิ้งนี้หรือไม่?")) {
      return;
    }

    try {
      await deleteToppingMutation.mutateAsync({ id });
      toast.success("ลบท็อปปิ้งสำเร็จ");
      toppingsQuery.refetch();
    } catch (error: any) {
      toast.error(error.message || "เกิดข้อผิดพลาด");
    }
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
              <h1 className="text-3xl font-bold">จัดการท็อปปิ้ง</h1>
              <p className="text-muted-foreground mt-1">
                เพิ่ม แก้ไข หรือลบท็อปปิ้งสำหรับสินค้า
              </p>
            </div>
          </div>
          <Button variant="add" onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            เพิ่มท็อปปิ้ง
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>รายการท็อปปิ้ง</CardTitle>
          </CardHeader>
          <CardContent>
            {toppingsQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : toppings.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <p className="text-muted-foreground text-lg">ยังไม่มีท็อปปิ้ง</p>
                <p className="text-sm text-muted-foreground">กดปุ่ม &quot;เพิ่มท็อปปิ้ง&quot; ด้านบนเพื่อเพิ่มรายการ เช่น ไข่มุก ชีส เพิ่มราคา</p>
                <Button variant="add" size="lg" className="mt-2" onClick={() => handleOpenDialog()}>
                  <Plus className="mr-2 h-5 w-5" />
                  เพิ่มท็อปปิ้ง
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชื่อท็อปปิ้ง</TableHead>
                    <TableHead className="text-right">ราคา (บาท)</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {toppings.map((topping) => (
                    <TableRow key={topping.id}>
                      <TableCell className="font-medium">
                        {topping.name}
                      </TableCell>
                      <TableCell className="text-right">
                        ฿{topping.price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDialog(topping)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(topping.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTopping ? "แก้ไขท็อปปิ้ง" : "เพิ่มท็อปปิ้ง"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">ชื่อท็อปปิ้ง</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="เช่น ไข่มุก, ชีส"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">ราคา (บาท)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                >
                  ยกเลิก
                </Button>
                <Button
                  variant="add"
                  type="submit"
                  disabled={
                    createToppingMutation.isPending ||
                    updateToppingMutation.isPending
                  }
                >
                  {createToppingMutation.isPending ||
                  updateToppingMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : editingTopping ? (
                    "บันทึก"
                  ) : (
                    "เพิ่ม"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

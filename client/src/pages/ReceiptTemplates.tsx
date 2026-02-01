import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Trash2, Edit, Plus, ArrowLeft, Printer } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

export default function ReceiptTemplates() {
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    headerText: "",
    footerText: "",
    showCompanyName: true,
    showDate: true,
    showTime: true,
    showCashier: true,
    showTransactionId: true,
    isDefault: false,
  });

  const { data: templates, isLoading, refetch } = trpc.receiptTemplates.list.useQuery();
  const createMutation = trpc.receiptTemplates.create.useMutation();
  const updateMutation = trpc.receiptTemplates.update.useMutation();
  const deleteMutation = trpc.receiptTemplates.delete.useMutation();

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("กรุณากรอกชื่อเทมเพลต");
      return;
    }

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          ...formData,
        });
        toast.success("อัปเดตเทมเพลตสำเร็จ");
      } else {
        await createMutation.mutateAsync(formData);
        toast.success("สร้างเทมเพลตสำเร็จ");
      }
      setIsOpen(false);
      setEditingId(null);
      setFormData({
        name: "",
        headerText: "",
        footerText: "",
        showCompanyName: true,
        showDate: true,
        showTime: true,
        showCashier: true,
        showTransactionId: true,
        isDefault: false,
      });
      refetch();
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด");
    }
  };

  const handleEdit = (template: any) => {
    setFormData({
      name: template.name,
      headerText: template.headerText || "",
      footerText: template.footerText || "",
      showCompanyName: template.showCompanyName,
      showDate: template.showDate,
      showTime: template.showTime,
      showCashier: template.showCashier,
      showTransactionId: template.showTransactionId,
      isDefault: template.isDefault,
    });
    setEditingId(template.id);
    setIsOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("คุณต้องการลบเทมเพลตนี้หรือไม่?")) {
      try {
        await deleteMutation.mutateAsync({ id });
        toast.success("ลบเทมเพลตสำเร็จ");
        refetch();
      } catch (error) {
        toast.error("เกิดข้อผิดพลาด");
      }
    }
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
              <h1 className="text-3xl font-bold text-slate-900">เทมเพลตใบเสร็จ</h1>
              <p className="text-slate-600">จัดการเทมเพลตการพิมใบเสร็จ</p>
            </div>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingId(null);
                  setFormData({
                    name: "",
                    headerText: "",
                    footerText: "",
                    showCompanyName: true,
                    showDate: true,
                    showTime: true,
                    showCashier: true,
                    showTransactionId: true,
                    isDefault: false,
                  });
                }}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                สร้างเทมเพลตใหม่
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "แก้ไขเทมเพลต" : "สร้างเทมเพลตใหม่"}
                </DialogTitle>
                <DialogDescription>
                  กำหนดเทมเพลตการพิมใบเสร็จของคุณ
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">ชื่อเทมเพลต *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="เช่น เทมเพลตมาตรฐาน"
                  />
                </div>

                <div>
                  <Label htmlFor="headerText">ข้อความส่วนหัว</Label>
                  <Textarea
                    id="headerText"
                    value={formData.headerText}
                    onChange={(e) =>
                      setFormData({ ...formData, headerText: e.target.value })
                    }
                    placeholder="ข้อความที่จะแสดงที่ด้านบนของใบเสร็จ"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="footerText">ข้อความส่วนท้าย</Label>
                  <Textarea
                    id="footerText"
                    value={formData.footerText}
                    onChange={(e) =>
                      setFormData({ ...formData, footerText: e.target.value })
                    }
                    placeholder="ข้อความที่จะแสดงที่ด้านล่างของใบเสร็จ"
                    rows={3}
                  />
                </div>

                <div className="space-y-3 rounded-lg bg-slate-50 p-4">
                  <Label className="text-sm font-semibold">แสดงข้อมูล</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="showCompanyName"
                        checked={formData.showCompanyName}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            showCompanyName: checked as boolean,
                          })
                        }
                      />
                      <Label htmlFor="showCompanyName" className="font-normal">
                        ชื่อบริษัท
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="showDate"
                        checked={formData.showDate}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            showDate: checked as boolean,
                          })
                        }
                      />
                      <Label htmlFor="showDate" className="font-normal">
                        วันที่
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="showTime"
                        checked={formData.showTime}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            showTime: checked as boolean,
                          })
                        }
                      />
                      <Label htmlFor="showTime" className="font-normal">
                        เวลา
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="showCashier"
                        checked={formData.showCashier}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            showCashier: checked as boolean,
                          })
                        }
                      />
                      <Label htmlFor="showCashier" className="font-normal">
                        ชื่อพนักงาน
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="showTransactionId"
                        checked={formData.showTransactionId}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            showTransactionId: checked as boolean,
                          })
                        }
                      />
                      <Label htmlFor="showTransactionId" className="font-normal">
                        เลขที่ใบเสร็จ
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isDefault"
                    checked={formData.isDefault}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        isDefault: checked as boolean,
                      })
                    }
                  />
                  <Label htmlFor="isDefault" className="font-normal">
                    ตั้งเป็นเทมเพลตเริ่มต้น
                  </Label>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsOpen(false)}>
                    ยกเลิก
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
                  >
                    {editingId ? "บันทึกการเปลี่ยนแปลง" : "สร้างเทมเพลต"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center py-8">กำลังโหลด...</div>
        ) : templates && templates.length > 0 ? (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>เทมเพลตที่มีอยู่</CardTitle>
              <CardDescription>
                มีทั้งหมด {templates.length} เทมเพลต
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 hover:bg-slate-50">
                    <TableHead>ชื่อเทมเพลต</TableHead>
                    <TableHead>ส่วนหัว</TableHead>
                    <TableHead>ส่วนท้าย</TableHead>
                    <TableHead>เริ่มต้น</TableHead>
                    <TableHead className="text-right">การดำเนินการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template: any) => (
                    <TableRow
                      key={template.id}
                      className="border-slate-200 hover:bg-amber-50"
                    >
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {template.headerText
                          ? template.headerText.substring(0, 30) + "..."
                          : "-"}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {template.footerText
                          ? template.footerText.substring(0, 30) + "..."
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {template.isDefault ? (
                          <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                            เริ่มต้น
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(template)}
                            className="hover:bg-amber-100"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(template.id)}
                            className="hover:bg-red-100 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Printer className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                <p className="text-slate-600 mb-4">ยังไม่มีเทมเพลตใบเสร็จ</p>
                <Button
                  onClick={() => setIsOpen(true)}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  สร้างเทมเพลตแรก
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

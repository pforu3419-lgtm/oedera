import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Plus, Edit, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Users() {
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "cashier" as "admin" | "manager" | "cashier",
    password: "",
  });

  const { data: users, isLoading, refetch } = trpc.users.list.useQuery();
  const createMutation = trpc.users.create.useMutation({
    onSuccess: () => {
      toast.success("สร้างผู้ใช้งานสำเร็จ");
      setFormData({ name: "", email: "", phone: "", role: "cashier", password: "" });
      setIsOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "เกิดข้อผิดพลาด");
    },
  });

  const updateMutation = trpc.users.update.useMutation({
    onSuccess: () => {
      toast.success("อัปเดตผู้ใช้งานสำเร็จ");
      setFormData({ name: "", email: "", phone: "", role: "cashier", password: "" });
      setEditingId(null);
      setIsOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "เกิดข้อผิดพลาด");
    },
  });

  const deleteMutation = trpc.users.delete.useMutation({
    onSuccess: () => {
      toast.success("ลบผู้ใช้งานสำเร็จ");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "เกิดข้อผิดพลาด");
    },
  });

  const handleSubmit = () => {
    if (!formData.name || !formData.email || !formData.role) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
      });
    } else {
      if (!formData.password) {
        toast.error("กรุณากรอกรหัสผ่าน");
        return;
      }
      createMutation.mutate({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        password: formData.password,
      });
    }
  };

  const handleEdit = (user: any) => {
    setEditingId(user.id);
    setFormData({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      role: user.role || "cashier",
      password: "",
    });
    setIsOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("คุณแน่ใจหรือว่าต้องการลบผู้ใช้งานนี้?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setFormData({ name: "", email: "", phone: "", role: "cashier", password: "" });
    setIsOpen(true);
  };

  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      admin: "ผู้ดูแลระบบ",
      manager: "ผู้จัดการ",
      cashier: "แคชเชียร์",
    };
    return roles[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: "bg-red-100 text-red-800",
      manager: "bg-blue-100 text-blue-800",
      cashier: "bg-green-100 text-green-800",
    };
    return colors[role] || "bg-gray-100 text-gray-800";
  };

  return (
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
            <h1 className="text-3xl font-bold tracking-tight">จัดการผู้ใช้งาน</h1>
            <p className="text-muted-foreground mt-2">
              จัดการบทบาท สิทธิ์การเข้าถึง และข้อมูลผู้ใช้งาน
            </p>
          </div>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="add" size="lg" onClick={handleOpenNew}>
              <Plus className="mr-2 h-4 w-4" />
              เพิ่มผู้ใช้งาน
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "แก้ไขผู้ใช้งาน" : "เพิ่มผู้ใช้งานใหม่"}
              </DialogTitle>
              <DialogDescription>
                {editingId
                  ? "แก้ไขข้อมูลผู้ใช้งาน"
                  : "กรอกข้อมูลผู้ใช้งานใหม่"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">ชื่อผู้ใช้งาน</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="กรอกชื่อผู้ใช้งาน"
                />
              </div>
              <div>
                <Label htmlFor="email">อีเมล</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="กรอกอีเมล"
                />
              </div>
              <div>
                <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="กรอกเบอร์โทรศัพท์"
                />
              </div>
              <div>
                <Label htmlFor="role">บทบาท</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      role: value as "admin" | "manager" | "cashier",
                    })
                  }
                >
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">ผู้ดูแลระบบ</SelectItem>
                    <SelectItem value="manager">ผู้จัดการ</SelectItem>
                    <SelectItem value="cashier">แคชเชียร์</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!editingId && (
                <div>
                  <Label htmlFor="password">รหัสผ่าน</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="กรอกรหัสผ่าน"
                  />
                </div>
              )}
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="w-full"
              >
                {editingId ? "อัปเดต" : "สร้าง"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>รายการผู้ใช้งาน</CardTitle>
          <CardDescription>
            ทั้งหมด {users?.length || 0} คน
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">กำลังโหลด...</p>
            </div>
          ) : users && users.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ชื่อ</TableHead>
                  <TableHead>อีเมล</TableHead>
                  <TableHead>เบอร์โทร</TableHead>
                  <TableHead>บทบาท</TableHead>
                  <TableHead className="text-right">การจัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone || "-"}</TableCell>
                    <TableCell>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(user.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">ไม่มีผู้ใช้งาน</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ตารางสิทธิ์การเข้าถึง</CardTitle>
          <CardDescription>
            สิทธิ์ของแต่ละบทบาท
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4 font-semibold">ฟีเจอร์</th>
                  <th className="text-center py-2 px-4 font-semibold">ผู้ดูแลระบบ</th>
                  <th className="text-center py-2 px-4 font-semibold">ผู้จัดการ</th>
                  <th className="text-center py-2 px-4 font-semibold">แคชเชียร์</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "ขายหน้าร้าน", admin: true, manager: true, cashier: true },
                  { feature: "จัดการสินค้า", admin: true, manager: true, cashier: false },
                  { feature: "จัดการสต๊อก", admin: true, manager: true, cashier: false },
                  { feature: "จัดการลูกค้า", admin: true, manager: true, cashier: false },
                  { feature: "จัดการส่วนลด", admin: true, manager: true, cashier: false },
                  { feature: "จัดการคะแนน", admin: true, manager: true, cashier: false },
                  { feature: "ดูรายงาน", admin: true, manager: true, cashier: false },
                  { feature: "จัดการผู้ใช้งาน", admin: true, manager: false, cashier: false },
                ].map((row) => (
                  <tr key={row.feature} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-4">{row.feature}</td>
                    <td className="text-center py-2 px-4">
                      {row.admin ? "✓" : "✗"}
                    </td>
                    <td className="text-center py-2 px-4">
                      {row.manager ? "✓" : "✗"}
                    </td>
                    <td className="text-center py-2 px-4">
                      {row.cashier ? "✓" : "✗"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

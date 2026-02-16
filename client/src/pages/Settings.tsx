import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Plus, Edit, Trash2, AlertCircle, Users, Printer, Settings as SettingsIcon, Store, Key, Shield, Building2, ArrowLeft, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";

export default function SystemSettings() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("users");

  // Users state
  const [isUserOpen, setIsUserOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [userFormData, setUserFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "cashier" as "admin" | "manager" | "cashier",
    password: "",
  });

  // Receipt Templates state
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [templateFormData, setTemplateFormData] = useState({
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

  // Stores state
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [storeFormData, setStoreFormData] = useState({
    storeCode: "",
    name: "",
  });

  // Store Invites state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [inviteFormData, setInviteFormData] = useState({
    code: "",
    storeId: 0,
  });

  // รหัสหลักสำหรับหน้าสร้างรหัสแอดมิน
  const [masterCodeInput, setMasterCodeInput] = useState("");

  // Queries
  const { data: users, isLoading: usersLoading, refetch: refetchUsers } = trpc.users.list.useQuery();
  const { data: templates, isLoading: templatesLoading, refetch: refetchTemplates } = trpc.receiptTemplates.list.useQuery();
  const { data: stores, isLoading: storesLoading, refetch: refetchStores } = trpc.stores.list.useQuery();
  
  // Get invites for selected store
  const { data: invites, refetch: refetchInvites } = trpc.stores.getInvites.useQuery(
    { storeId: selectedStoreId! },
    { enabled: !!selectedStoreId }
  );

  const { data: masterCodeConfig, refetch: refetchMasterCodeConfig } = trpc.system.getMasterCodeForAdminCodesConfig.useQuery();

  // Mutations
  const createUserMutation = trpc.users.create.useMutation({
    onSuccess: () => {
      toast.success("สร้างผู้ใช้งานสำเร็จ");
      setUserFormData({ name: "", email: "", phone: "", role: "cashier", password: "" });
      setIsUserOpen(false);
      refetchUsers();
    },
  });
  const updateUserMutation = trpc.users.update.useMutation({
    onSuccess: () => {
      toast.success("อัปเดตผู้ใช้งานสำเร็จ");
      setUserFormData({ name: "", email: "", phone: "", role: "cashier", password: "" });
      setEditingUserId(null);
      setIsUserOpen(false);
      refetchUsers();
    },
  });
  const deleteUserMutation = trpc.users.delete.useMutation({
    onSuccess: () => {
      toast.success("ลบผู้ใช้งานสำเร็จ");
      refetchUsers();
    },
  });

  const createTemplateMutation = trpc.receiptTemplates.create.useMutation({
    onSuccess: () => {
      toast.success("สร้างเทมเพลตสำเร็จ");
      setIsTemplateOpen(false);
      setEditingTemplateId(null);
      setTemplateFormData({
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
      refetchTemplates();
    },
  });
  const updateTemplateMutation = trpc.receiptTemplates.update.useMutation({
    onSuccess: () => {
      toast.success("อัปเดตเทมเพลตสำเร็จ");
      setIsTemplateOpen(false);
      setEditingTemplateId(null);
      setTemplateFormData({
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
      refetchTemplates();
    },
  });
  const deleteTemplateMutation = trpc.receiptTemplates.delete.useMutation({
    onSuccess: () => {
      toast.success("ลบเทมเพลตสำเร็จ");
      refetchTemplates();
    },
  });

  // Store mutations
  const createStoreMutation = trpc.stores.create.useMutation({
    onSuccess: () => {
      toast.success("สร้างร้านสำเร็จ");
      setStoreFormData({ storeCode: "", name: "" });
      setIsStoreOpen(false);
      refetchStores();
    },
    onError: (error) => {
      toast.error(error.message || "เกิดข้อผิดพลาด");
    },
  });

  const createInviteMutation = trpc.stores.createInvite.useMutation({
    onSuccess: () => {
      toast.success("สร้างรหัสเข้าร้านสำเร็จ");
      setInviteFormData({ code: "", storeId: 0 });
      setIsInviteOpen(false);
      refetchInvites();
    },
    onError: (error) => {
      toast.error(error.message || "เกิดข้อผิดพลาด");
    },
  });

  const updateInviteMutation = trpc.stores.updateInvite.useMutation({
    onSuccess: () => {
      toast.success("อัปเดตสถานะรหัสสำเร็จ");
      refetchInvites();
    },
  });

  const setMasterCodeMutation = trpc.system.setMasterCodeForAdminCodes.useMutation({
    onSuccess: () => {
      toast.success("บันทึกรหัสหลักสำเร็จ");
      setMasterCodeInput("");
      refetchMasterCodeConfig();
    },
    onError: (e) => {
      toast.error(e.message || "เกิดข้อผิดพลาด");
    },
  });

  const handleUserSubmit = () => {
    if (!userFormData.name || !userFormData.email || !userFormData.role) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    if (editingUserId) {
      updateUserMutation.mutate({
        id: editingUserId,
        name: userFormData.name,
        email: userFormData.email,
        phone: userFormData.phone,
        role: userFormData.role,
      });
    } else {
      if (!userFormData.password) {
        toast.error("กรุณากรอกรหัสผ่าน");
        return;
      }
      createUserMutation.mutate(userFormData);
    }
  };

  const handleTemplateSubmit = async () => {
    if (!templateFormData.name.trim()) {
      toast.error("กรุณากรอกชื่อเทมเพลต");
      return;
    }
    try {
      if (editingTemplateId) {
        await updateTemplateMutation.mutateAsync({
          id: editingTemplateId,
          ...templateFormData,
        });
      } else {
        await createTemplateMutation.mutateAsync(templateFormData);
      }
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด");
    }
  };

  const handleEditUser = (user: any) => {
    setEditingUserId(user.id);
    setUserFormData({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      role: user.role || "cashier",
      password: "",
    });
    setIsUserOpen(true);
  };

  const handleEditTemplate = (template: any) => {
    setTemplateFormData({
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
    setEditingTemplateId(template.id);
    setIsTemplateOpen(true);
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
    <DashboardLayout>
      <div className="space-y-6 p-6">
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
            <h1 className="text-3xl font-bold">ตั้งค่าระบบ</h1>
            <p className="text-muted-foreground">จัดการผู้ใช้งานและเทมเพลตใบเสร็จ</p>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            if (value === "tax") {
              setLocation("/tax");
              return;
            }
            setActiveTab(value);
          }}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              ผู้ใช้งาน
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              เทมเพลตใบเสร็จ
            </TabsTrigger>
            <TabsTrigger value="stores" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              จัดการร้าน
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              ระบบ
            </TabsTrigger>
            <TabsTrigger value="tax" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              ระบบภาษี
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6 mt-6">
            <div className="flex justify-end">
              <Dialog open={isUserOpen} onOpenChange={setIsUserOpen}>
                <DialogTrigger asChild>
                  <Button variant="add" onClick={() => {
                    setEditingUserId(null);
                    setUserFormData({ name: "", email: "", phone: "", role: "cashier", password: "" });
                  }}>
                    <Plus className="mr-2 h-4 w-4" />
                    เพิ่มผู้ใช้งาน
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingUserId ? "แก้ไขผู้ใช้งาน" : "เพิ่มผู้ใช้งานใหม่"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingUserId ? "แก้ไขข้อมูลผู้ใช้งาน" : "กรอกข้อมูลผู้ใช้งานใหม่"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">ชื่อผู้ใช้งาน</Label>
                      <Input
                        id="name"
                        value={userFormData.name}
                        onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                        placeholder="กรอกชื่อผู้ใช้งาน"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">อีเมล</Label>
                      <Input
                        id="email"
                        type="email"
                        value={userFormData.email}
                        onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                        placeholder="กรอกอีเมล"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
                      <Input
                        id="phone"
                        value={userFormData.phone}
                        onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                        placeholder="กรอกเบอร์โทรศัพท์"
                      />
                    </div>
                    <div>
                      <Label htmlFor="role">บทบาท</Label>
                      <Select
                        value={userFormData.role}
                        onValueChange={(value) =>
                          setUserFormData({
                            ...userFormData,
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
                    {!editingUserId && (
                      <div>
                        <Label htmlFor="password">รหัสผ่าน</Label>
                        <Input
                          id="password"
                          type="password"
                          value={userFormData.password}
                          onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                          placeholder="กรอกรหัสผ่าน"
                        />
                      </div>
                    )}
                    <Button
                      onClick={handleUserSubmit}
                      disabled={createUserMutation.isPending || updateUserMutation.isPending}
                      className="w-full"
                    >
                      {editingUserId ? "อัปเดต" : "สร้าง"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>รายการผู้ใช้งาน</CardTitle>
                <CardDescription>ทั้งหมด {users?.length || 0} คน</CardDescription>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
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
                                onClick={() => handleEditUser(user)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm("คุณแน่ใจหรือว่าต้องการลบผู้ใช้งานนี้?")) {
                                    deleteUserMutation.mutate({ id: user.id });
                                  }
                                }}
                                disabled={deleteUserMutation.isPending}
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
          </TabsContent>

          {/* Receipt Templates Tab */}
          <TabsContent value="templates" className="space-y-6 mt-6">
            <div className="flex justify-end">
              <Dialog open={isTemplateOpen} onOpenChange={setIsTemplateOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingTemplateId(null);
                    setTemplateFormData({
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
                  }}>
                    <Plus className="mr-2 h-4 w-4" />
                    สร้างเทมเพลตใหม่
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingTemplateId ? "แก้ไขเทมเพลต" : "สร้างเทมเพลตใหม่"}
                    </DialogTitle>
                    <DialogDescription>
                      กำหนดเทมเพลตการพิมใบเสร็จของคุณ
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="templateName">ชื่อเทมเพลต *</Label>
                      <Input
                        id="templateName"
                        value={templateFormData.name}
                        onChange={(e) => setTemplateFormData({ ...templateFormData, name: e.target.value })}
                        placeholder="เช่น เทมเพลตมาตรฐาน"
                      />
                    </div>
                    <div>
                      <Label htmlFor="headerText">ข้อความส่วนหัว</Label>
                      <Textarea
                        id="headerText"
                        value={templateFormData.headerText}
                        onChange={(e) => setTemplateFormData({ ...templateFormData, headerText: e.target.value })}
                        placeholder="ข้อความที่จะแสดงที่ด้านบนของใบเสร็จ"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="footerText">ข้อความส่วนท้าย</Label>
                      <Textarea
                        id="footerText"
                        value={templateFormData.footerText}
                        onChange={(e) => setTemplateFormData({ ...templateFormData, footerText: e.target.value })}
                        placeholder="ข้อความที่จะแสดงที่ด้านล่างของใบเสร็จ"
                        rows={3}
                      />
                    </div>
                    <div className="space-y-3 rounded-lg bg-muted p-4">
                      <Label className="text-sm font-semibold">แสดงข้อมูล</Label>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="showCompanyName"
                            checked={templateFormData.showCompanyName}
                            onCheckedChange={(checked) =>
                              setTemplateFormData({
                                ...templateFormData,
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
                            checked={templateFormData.showDate}
                            onCheckedChange={(checked) =>
                              setTemplateFormData({
                                ...templateFormData,
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
                            checked={templateFormData.showTime}
                            onCheckedChange={(checked) =>
                              setTemplateFormData({
                                ...templateFormData,
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
                            checked={templateFormData.showCashier}
                            onCheckedChange={(checked) =>
                              setTemplateFormData({
                                ...templateFormData,
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
                            checked={templateFormData.showTransactionId}
                            onCheckedChange={(checked) =>
                              setTemplateFormData({
                                ...templateFormData,
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
                        checked={templateFormData.isDefault}
                        onCheckedChange={(checked) =>
                          setTemplateFormData({
                            ...templateFormData,
                            isDefault: checked as boolean,
                          })
                        }
                      />
                      <Label htmlFor="isDefault" className="font-normal">
                        ตั้งเป็นเทมเพลตเริ่มต้น
                      </Label>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setIsTemplateOpen(false)}>
                        ยกเลิก
                      </Button>
                      <Button onClick={handleTemplateSubmit}>
                        {editingTemplateId ? "บันทึกการเปลี่ยนแปลง" : "สร้างเทมเพลต"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {templatesLoading ? (
              <div className="text-center py-8">กำลังโหลด...</div>
            ) : templates && templates.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>เทมเพลตที่มีอยู่</CardTitle>
                  <CardDescription>มีทั้งหมด {templates.length} เทมเพลต</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ชื่อเทมเพลต</TableHead>
                        <TableHead>ส่วนหัว</TableHead>
                        <TableHead>ส่วนท้าย</TableHead>
                        <TableHead>เริ่มต้น</TableHead>
                        <TableHead className="text-right">การดำเนินการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templates.map((template: any) => (
                        <TableRow key={template.id}>
                          <TableCell className="font-medium">{template.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {template.headerText ? template.headerText.substring(0, 30) + "..." : "-"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {template.footerText ? template.footerText.substring(0, 30) + "..." : "-"}
                          </TableCell>
                          <TableCell>
                            {template.isDefault ? (
                              <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                                เริ่มต้น
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditTemplate(template)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm("คุณต้องการลบเทมเพลตนี้หรือไม่?")) {
                                    deleteTemplateMutation.mutate({ id: template.id });
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
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
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <Printer className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">ยังไม่มีเทมเพลตใบเสร็จ</p>
                    <Button onClick={() => setIsTemplateOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      สร้างเทมเพลตแรก
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Stores Tab */}
          <TabsContent value="stores" className="space-y-6 mt-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">จัดการร้านและรหัสเข้าร้าน</h2>
                <p className="text-muted-foreground mt-1">
                  สร้างร้านและรหัสสำหรับให้พนักงานเข้าร้าน
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setLocation("/store-settings")}
                  className="gap-2"
                  title="ไปหน้าตั้งค่าร้าน (โมดูลใหม่)"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  ตั้งค่าร้าน
                </Button>
                <Dialog open={isStoreOpen} onOpenChange={setIsStoreOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setStoreFormData({ storeCode: "", name: "" });
                    }}>
                      <Plus className="mr-2 h-4 w-4" />
                      สร้างร้านใหม่
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>สร้างร้านใหม่</DialogTitle>
                      <DialogDescription>
                        กรอกข้อมูลร้านเพื่อสร้างห้องร้านใหม่
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="storeCode">รหัสร้าน *</Label>
                        <Input
                          id="storeCode"
                          placeholder="เช่น POS-UDON-2026"
                          value={storeFormData.storeCode}
                          onChange={(e) => setStoreFormData({ ...storeFormData, storeCode: e.target.value.toUpperCase() })}
                          className="font-mono"
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          รหัสนี้จะใช้สำหรับให้พนักงานเข้าร้าน
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="storeName">ชื่อร้าน *</Label>
                        <Input
                          id="storeName"
                          placeholder="เช่น ร้านมนัสเบอร์เกอร์"
                          value={storeFormData.name}
                          onChange={(e) => setStoreFormData({ ...storeFormData, name: e.target.value })}
                        />
                      </div>
                      <Button
                        onClick={() => {
                          if (!storeFormData.storeCode.trim() || !storeFormData.name.trim()) {
                            toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
                            return;
                          }
                          createStoreMutation.mutate(storeFormData);
                        }}
                        disabled={createStoreMutation.isPending}
                        className="w-full"
                      >
                        {createStoreMutation.isPending ? "กำลังสร้าง..." : "สร้างร้าน"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {storesLoading ? (
              <div className="text-center py-8">กำลังโหลด...</div>
            ) : stores && stores.length > 0 ? (
              <div className="space-y-4">
                {stores.map((store: any) => (
                  <Card key={store.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Store className="h-5 w-5" />
                            {store.name}
                          </CardTitle>
                          <CardDescription className="mt-1 font-mono">
                            รหัส: {store.storeCode}
                          </CardDescription>
                        </div>
                        <Dialog open={isInviteOpen && selectedStoreId === store.id} onOpenChange={(open) => {
                          setIsInviteOpen(open);
                          if (!open) setSelectedStoreId(null);
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedStoreId(store.id);
                                setInviteFormData({ code: "", storeId: store.id });
                                setIsInviteOpen(true);
                              }}
                            >
                              <Key className="mr-2 h-4 w-4" />
                              สร้างรหัสเข้าร้าน
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>สร้างรหัสเข้าร้าน</DialogTitle>
                              <DialogDescription>
                                รหัสนี้จะใช้สำหรับให้พนักงานเข้าร้าน "{store.name}"
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="inviteCode">รหัสเข้าร้าน *</Label>
                                <Input
                                  id="inviteCode"
                                  placeholder="เช่น POS-UDON-2026"
                                  value={inviteFormData.code}
                                  onChange={(e) => setInviteFormData({ ...inviteFormData, code: e.target.value.toUpperCase() })}
                                  className="font-mono"
                                />
                                <p className="text-sm text-muted-foreground mt-1">
                                  รหัสนี้จะแสดงให้พนักงานกรอกเพื่อเข้าร้าน
                                </p>
                              </div>
                              <Button
                                onClick={() => {
                                  if (!inviteFormData.code.trim()) {
                                    toast.error("กรุณากรอกรหัส");
                                    return;
                                  }
                                  createInviteMutation.mutate({
                                    storeId: store.id,
                                    code: inviteFormData.code,
                                  });
                                }}
                                disabled={createInviteMutation.isPending}
                                className="w-full"
                              >
                                {createInviteMutation.isPending ? "กำลังสร้าง..." : "สร้างรหัส"}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-semibold mb-2 block">รหัสเข้าร้านที่มีอยู่</Label>
                          {selectedStoreId === store.id && invites && invites.length > 0 ? (
                            <div className="space-y-2">
                              {invites.map((invite: any) => (
                                <div
                                  key={invite.id}
                                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                                >
                                  <div className="flex items-center gap-3">
                                    <code className="font-mono text-sm font-semibold">{invite.code}</code>
                                    <span className={`text-xs px-2 py-1 rounded ${
                                      invite.active
                                        ? "bg-green-100 text-green-800"
                                        : "bg-gray-100 text-gray-800"
                                    }`}>
                                      {invite.active ? "ใช้งานได้" : "ปิดใช้งาน"}
                                    </span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      updateInviteMutation.mutate({
                                        id: invite.id,
                                        active: !invite.active,
                                      });
                                    }}
                                  >
                                    {invite.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : selectedStoreId === store.id ? (
                            <p className="text-sm text-muted-foreground py-2">
                              ยังไม่มีรหัสเข้าร้าน
                            </p>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedStoreId(store.id);
                                refetchInvites();
                              }}
                            >
                              ดูรหัสเข้าร้าน
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <Store className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">ยังไม่มีร้าน</p>
                    <Button onClick={() => setIsStoreOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      สร้างร้านแรก
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* แท็บ ระบบ - รหัสหลักสำหรับหน้าสร้างรหัสแอดมิน */}
          <TabsContent value="system" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  รหัสสำหรับเข้าหน้าสร้างรหัสแอดมิน
                </CardTitle>
                <CardDescription>
                  เก็บรหัสหลักในระบบ ใช้เมื่อกด &quot;เข้าสู่ระบบสร้างรหัสแอดมิน&quot; ที่หน้า /create-admin-codes
                  ครั้งแรกยังไม่มีใน DB จะใช้ ORDERA_MASTER_CODE จาก env
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {masterCodeConfig?.isConfigured && (
                  <p className="text-sm text-muted-foreground">สถานะ: ตั้งค่าแล้ว (••••••••)</p>
                )}
                <div className="flex gap-2 flex-wrap items-end">
                  <div className="flex-1 min-w-[200px] space-y-2">
                    <Label htmlFor="masterCode">รหัสใหม่ (อย่างน้อย 8 ตัว)</Label>
                    <Input
                      id="masterCode"
                      type="password"
                      value={masterCodeInput}
                      onChange={(e) => setMasterCodeInput(e.target.value)}
                      placeholder="กรอกรหัสแล้วกดบันทึก"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      if (masterCodeInput.trim().length < 8) {
                        toast.error("รหัสต้องมีอย่างน้อย 8 ตัวอักษร");
                        return;
                      }
                      setMasterCodeMutation.mutate({ code: masterCodeInput });
                    }}
                    disabled={setMasterCodeMutation.isPending || masterCodeInput.trim().length < 8}
                  >
                    {setMasterCodeMutation.isPending ? "กำลังบันทึก..." : "บันทึก"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

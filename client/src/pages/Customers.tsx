import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Loader2, Plus, Edit2, Trash2, Eye, ArrowLeft, Users, Gift, Settings, Search, Minus } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

interface CustomerForm {
  id?: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export default function Customers() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("customers");
  
  // Customers state
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<CustomerForm | null>(null);
  const [formData, setFormData] = useState<CustomerForm>({
    id: undefined,
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });

  // Loyalty state
  const [loyaltySearchTerm, setLoyaltySearchTerm] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isAddPointsOpen, setIsAddPointsOpen] = useState(false);
  const [isRedeemPointsOpen, setIsRedeemPointsOpen] = useState(false);
  const [pointsAmount, setPointsAmount] = useState("");
  const [settingsData, setSettingsData] = useState({
    pointsPerBaht: "1",
    pointValue: "1",
    pointExpirationDays: "",
    minPointsToRedeem: "100",
    isActive: true,
  });

  // Queries
  const customersQuery = trpc.customers.list.useQuery({ search: searchTerm });
  const customerHistoryQuery = trpc.customers.getPurchaseHistory.useQuery(
    { customerId: selectedCustomerId! },
    { enabled: !!selectedCustomerId }
  );
  const { data: settings, refetch: refetchSettings } = trpc.loyalty.getSettings.useQuery();
  const loyaltyCustomersQuery = trpc.customers.list.useQuery({ search: "" });
  const getHistoryQuery = trpc.loyalty.getHistory.useQuery(
    { customerId: selectedCustomer?.id ?? 0 },
    { enabled: !!selectedCustomer?.id }
  );
  const loyaltyHistory = getHistoryQuery.data || [];

  // Mutations
  const createCustomerMutation = trpc.customers.create.useMutation({
    onSuccess: () => {
      customersQuery.refetch();
    },
    onError: (error) => {
      console.error("[createCustomerMutation] Error:", error);
    },
  });
  const updateCustomerMutation = trpc.customers.update.useMutation({
    onSuccess: () => {
      customersQuery.refetch();
    },
  });
  const deleteCustomerMutation = trpc.customers.delete.useMutation();
  const updateSettingsMutation = trpc.loyalty.updateSettings.useMutation();
  const addPointsMutation = trpc.loyalty.addPoints.useMutation();
  const redeemPointsMutation = trpc.loyalty.redeemPoints.useMutation();

  const customers = customersQuery.data || [];
  const loyaltyCustomers = loyaltyCustomersQuery.data || [];
  const filteredCustomers = useMemo(() => {
    if (!loyaltyCustomers || loyaltyCustomers.length === 0) return [];
    return loyaltyCustomers.filter(
      (c: any) =>
        c.name.toLowerCase().includes(loyaltySearchTerm.toLowerCase()) ||
        c.phone?.includes(loyaltySearchTerm) ||
        c.email?.toLowerCase().includes(loyaltySearchTerm.toLowerCase())
    );
  }, [loyaltyCustomers, loyaltySearchTerm]);

  // Customers handlers
  const handleOpenDialog = (customer?: any) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        notes: customer.notes,
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        id: undefined,
        name: "",
        email: "",
        phone: "",
        address: "",
        notes: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCustomer(null);
  };

  const handleSaveCustomer = async () => {
    if (!formData.name.trim()) {
      toast.error("กรุณากรอกชื่อลูกค้า");
      return;
    }

    try {
      
      // Prepare data for API
      const customerData: any = {
        name: formData.name.trim(),
      };
      
      // Only include optional fields if they have values
      if (formData.id !== undefined && formData.id !== null && formData.id !== "" && formData.id !== 0) {
        const idValue = typeof formData.id === "string" ? parseInt(formData.id, 10) : formData.id;
        if (!isNaN(idValue) && idValue > 0) {
          customerData.id = idValue;
        }
      }
      
      if (formData.phone && formData.phone.trim()) {
        customerData.phone = formData.phone.trim();
      }
      
      if (formData.email && formData.email.trim()) {
        const emailValue = formData.email.trim();
        // Basic email validation - if invalid, send empty string (backend will convert to undefined)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailRegex.test(emailValue)) {
          customerData.email = emailValue;
        } else {
          // If email is invalid, send empty string (backend will convert to undefined)
          customerData.email = "";
        }
      }
      
      if (formData.address && formData.address.trim()) {
        customerData.address = formData.address.trim();
      }
      
      if (formData.notes && formData.notes.trim()) {
        customerData.notes = formData.notes.trim();
      }
      
      
      if (editingCustomer) {
        await updateCustomerMutation.mutateAsync({
          id: editingCustomer.id!,
          ...customerData,
        });
        toast.success("อัปเดตข้อมูลลูกค้าสำเร็จ");
      } else {
        await createCustomerMutation.mutateAsync(customerData);
        toast.success("เพิ่มลูกค้าใหม่สำเร็จ");
      }
      handleCloseDialog();
      await customersQuery.refetch();
    } catch (error: any) {
      console.error("[handleSaveCustomer] Error details:", error);
      const errorMessage = error?.message || error?.data?.message || "เกิดข้อผิดพลาดในการบันทึก";
      toast.error(errorMessage);
    }
  };

  const handleDeleteCustomer = async (id: number) => {
    if (!confirm("คุณแน่ใจหรือว่าต้องการลบลูกค้านี้?")) return;

    try {
      await deleteCustomerMutation.mutateAsync({ id });
      toast.success("ลบลูกค้าสำเร็จ");
      await customersQuery.refetch();
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการลบ");
      console.error(error);
    }
  };

  const handleViewHistory = (customerId: number) => {
    setSelectedCustomerId(customerId);
    setIsHistoryDialogOpen(true);
  };

  // Loyalty handlers
  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettingsMutation.mutateAsync({
        pointsPerBaht: settingsData.pointsPerBaht,
        pointValue: settingsData.pointValue,
        pointExpirationDays: settingsData.pointExpirationDays
          ? parseInt(settingsData.pointExpirationDays)
          : undefined,
        minPointsToRedeem: parseInt(settingsData.minPointsToRedeem),
        isActive: settingsData.isActive,
      });
      toast.success("อัปเดตการตั้งค่าสำเร็จ");
      setIsSettingsOpen(false);
      refetchSettings();
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด");
    }
  };

  const handleAddPoints = async () => {
    if (!selectedCustomer || !pointsAmount) {
      toast.error("กรุณาเลือกลูกค้าและใส่จำนวนคะแนน");
      return;
    }
    try {
      await addPointsMutation.mutateAsync({
        customerId: selectedCustomer.id,
        points: parseInt(pointsAmount),
        description: "เพิ่มคะแนนด้วยตนเอง",
      });
      toast.success("เพิ่มคะแนนสำเร็จ");
      setPointsAmount("");
      setIsAddPointsOpen(false);
      setSelectedCustomer(null);
      setLoyaltySearchTerm("");
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด");
    }
  };

  const handleRedeemPoints = async () => {
    if (!selectedCustomer || !pointsAmount) {
      toast.error("กรุณาเลือกลูกค้าและใส่จำนวนคะแนน");
      return;
    }
    try {
      await redeemPointsMutation.mutateAsync({
        customerId: selectedCustomer.id,
        points: parseInt(pointsAmount),
        description: "แลกคะแนนด้วยตนเอง",
      });
      toast.success("แลกคะแนนสำเร็จ");
      setPointsAmount("");
      setIsRedeemPointsOpen(false);
      setSelectedCustomer(null);
      setLoyaltySearchTerm("");
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด");
    }
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
            <h1 className="text-3xl font-bold">ลูกค้าและสมาชิก</h1>
            <p className="text-muted-foreground">จัดการข้อมูลลูกค้าและระบบสะสมคะแนน</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="customers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              ข้อมูลลูกค้า
            </TabsTrigger>
            <TabsTrigger value="loyalty" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              สะสมคะแนน
            </TabsTrigger>
          </TabsList>

          {/* Customers Tab */}
          <TabsContent value="customers" className="space-y-6 mt-6">
            <div className="flex justify-end">
              <Button variant="add" onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                เพิ่มลูกค้าใหม่
              </Button>
            </div>

            <Input
              placeholder="ค้นหาลูกค้า (ชื่อ, เบอร์โทร, อีเมล)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

        <Card>
          <CardHeader>
            <CardTitle>รายการลูกค้า ({customers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {customersQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : customers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                ไม่มีข้อมูลลูกค้า
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">ชื่อ</th>
                      <th className="text-left py-3 px-4">เบอร์โทร</th>
                      <th className="text-left py-3 px-4">อีเมล</th>
                      <th className="text-left py-3 px-4">ที่อยู่</th>
                          <th className="text-left py-3 px-4">ID</th>
                      <th className="text-left py-3 px-4">การกระทำ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer: any) => (
                      <tr key={customer.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium">{customer.name}</td>
                        <td className="py-3 px-4 text-sm">{customer.phone || "-"}</td>
                        <td className="py-3 px-4 text-sm">{customer.email || "-"}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {customer.address ? customer.address.substring(0, 30) + "..." : "-"}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleViewHistory(customer.id)}
                              title="ดูประวัติการซื้อ"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenDialog(customer)}
                              title="แก้ไข"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteCustomer(customer.id)}
                              title="ลบ"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          {/* Loyalty Tab */}
          <TabsContent value="loyalty" className="space-y-6 mt-6">
            <div className="flex justify-end">
              <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    if (settings) {
                      setSettingsData({
                        pointsPerBaht: settings.pointsPerBaht?.toString() || "1",
                        pointValue: settings.pointValue?.toString() || "1",
                        pointExpirationDays: settings.pointExpirationDays?.toString() || "",
                        minPointsToRedeem: settings.minPointsToRedeem?.toString() || "100",
                        isActive: settings.isActive || true,
                      });
                    }
                  }}>
                    <Settings className="mr-2 h-4 w-4" />
                    การตั้งค่า
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>การตั้งค่าโปรแกรมสะสมคะแนน</DialogTitle>
                    <DialogDescription>
                      ปรับปรุงการตั้งค่าสำหรับระบบสะสมคะแนน
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleUpdateSettings} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="pointsPerBaht">บาทต่อคะแนน</Label>
                        <Input
                          id="pointsPerBaht"
                          type="number"
                          step="1"
                          min="1"
                          value={settingsData.pointsPerBaht}
                          onChange={(e) =>
                            setSettingsData({
                              ...settingsData,
                              pointsPerBaht: e.target.value,
                            })
                          }
                          placeholder="เช่น 100"
                          required
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          ลูกค้าต้องใช้เงินกี่บาทถึงจะได้ 1 คะแนน (เช่น 100 = 100 บาทต่อ 1 คะแนน)
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="pointValue">มูลค่าคะแนน (บาท)</Label>
                        <Input
                          id="pointValue"
                          type="number"
                          step="0.01"
                          value={settingsData.pointValue}
                          onChange={(e) =>
                            setSettingsData({
                              ...settingsData,
                              pointValue: e.target.value,
                            })
                          }
                          placeholder="เช่น 1"
                          required
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          1 คะแนนมีค่าเท่ากับกี่บาท
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="pointExpirationDays">
                          วันหมดอายุคะแนน (วัน)
                        </Label>
                        <Input
                          id="pointExpirationDays"
                          type="number"
                          value={settingsData.pointExpirationDays}
                          onChange={(e) =>
                            setSettingsData({
                              ...settingsData,
                              pointExpirationDays: e.target.value,
                            })
                          }
                          placeholder="เช่น 365"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          ปล่อยว่างไว้ถ้าไม่มีการหมดอายุ
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="minPointsToRedeem">
                          คะแนนขั้นต่ำในการแลก
                        </Label>
                        <Input
                          id="minPointsToRedeem"
                          type="number"
                          value={settingsData.minPointsToRedeem}
                          onChange={(e) =>
                            setSettingsData({
                              ...settingsData,
                              minPointsToRedeem: e.target.value,
                            })
                          }
                          placeholder="เช่น 100"
                          required
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          ลูกค้าต้องมีคะแนนอย่างน้อยเท่าไรจึงจะแลกได้
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={settingsData.isActive}
                        onChange={(e) =>
                          setSettingsData({
                            ...settingsData,
                            isActive: e.target.checked,
                          })
                        }
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="isActive" className="cursor-pointer">
                        เปิดใช้งานโปรแกรมสะสมคะแนน
                      </Label>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsSettingsOpen(false)}
                      >
                        ยกเลิก
                      </Button>
                      <Button type="submit">บันทึกการตั้งค่า</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>การตั้งค่าปัจจุบัน</CardTitle>
                <CardDescription>
                  ข้อมูลการตั้งค่าโปรแกรมสะสมคะแนน
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">คะแนนต่อบาท</p>
                  <p className="text-2xl font-bold">{settings?.pointsPerBaht || "1.00"}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">มูลค่าคะแนน</p>
                  <p className="text-2xl font-bold">฿{settings?.pointValue || "1.00"}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">คะแนนขั้นต่ำ</p>
                  <p className="text-2xl font-bold">{settings?.minPointsToRedeem || "100"}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">สถานะ</p>
                  <p className="text-2xl font-bold">
                    {settings?.isActive ? (
                      <span className="text-green-600">เปิด</span>
                    ) : (
                      <span className="text-red-600">ปิด</span>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ค้นหาลูกค้า</CardTitle>
                <CardDescription>
                  เลือกลูกค้าเพื่อจัดการคะแนน
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="ค้นหาตามชื่อ เบอร์โทร หรืออีเมล..."
                    value={loyaltySearchTerm}
                    onChange={(e) => setLoyaltySearchTerm(e.target.value)}
                  />
                  <Button variant="outline" size="icon">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>

                {selectedCustomer ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-accent/10 rounded-lg">
                      <h3 className="font-semibold text-lg">{selectedCustomer.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        ID: {selectedCustomer.id} • {selectedCustomer.phone}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">คะแนนปัจจุบัน</p>
                          <p className="text-2xl font-bold text-accent">{selectedCustomer.loyaltyPoints || 0}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">มูลค่า (บาท)</p>
                          <p className="text-2xl font-bold">
                            ฿{((selectedCustomer.loyaltyPoints || 0) * (parseFloat(settings?.pointValue || "1") || 1)).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Dialog open={isAddPointsOpen} onOpenChange={setIsAddPointsOpen}>
                        <DialogTrigger asChild>
                          <Button variant="add" className="flex-1">
                            <Plus className="mr-2 h-4 w-4" />
                            เพิ่มคะแนน
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>เพิ่มคะแนน</DialogTitle>
                            <DialogDescription>
                              เพิ่มคะแนนสำหรับ {selectedCustomer.name}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="addPoints">จำนวนคะแนน</Label>
                              <Input
                                id="addPoints"
                                type="number"
                                value={pointsAmount}
                                onChange={(e) => setPointsAmount(e.target.value)}
                                placeholder="0"
                                min="0"
                              />
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setIsAddPointsOpen(false);
                                  setPointsAmount("");
                                }}
                              >
                                ยกเลิก
                              </Button>
                              <Button onClick={handleAddPoints}>
                                ยืนยัน
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Dialog open={isRedeemPointsOpen} onOpenChange={setIsRedeemPointsOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="flex-1">
                            <Minus className="mr-2 h-4 w-4" />
                            แลกคะแนน
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>แลกคะแนน</DialogTitle>
                            <DialogDescription>
                              แลกคะแนนสำหรับ {selectedCustomer.name}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="redeemPoints">จำนวนคะแนน</Label>
                              <Input
                                id="redeemPoints"
                                type="number"
                                value={pointsAmount}
                                onChange={(e) => setPointsAmount(e.target.value)}
                                placeholder="0"
                                min="0"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                คะแนนคงเหลือ: {selectedCustomer.loyaltyPoints || 0}
                              </p>
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setIsRedeemPointsOpen(false);
                                  setPointsAmount("");
                                }}
                              >
                                ยกเลิก
                              </Button>
                              <Button onClick={handleRedeemPoints}>
                                ยืนยัน
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    <Button
                      variant="ghost"
                      onClick={() => {
                        setSelectedCustomer(null);
                        setLoyaltySearchTerm("");
                      }}
                      className="w-full"
                    >
                      ล้างการเลือก
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredCustomers.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">
                        ไม่พบลูกค้า
                      </p>
                    ) : (
                      filteredCustomers.map((customer) => (
                        <Button
                          key={customer.id}
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => setSelectedCustomer(customer)}
                        >
                          <div className="text-left">
                            <p className="font-medium">{customer.name}</p>
                            <p className="text-xs text-muted-foreground">
                              ID: {customer.id} • {customer.phone} • คะแนน: {customer.loyaltyPoints || 0}
                            </p>
                          </div>
                        </Button>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedCustomer && loyaltyHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>ประวัติการสะสมคะแนน</CardTitle>
                  <CardDescription>
                    ประวัติการเปลี่ยนแปลงคะแนนของ {selectedCustomer.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>วันที่</TableHead>
                        <TableHead>ประเภท</TableHead>
                        <TableHead className="text-right">คะแนน</TableHead>
                        <TableHead>หมายเหตุ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loyaltyHistory.map((transaction: any) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            {new Date(transaction.createdAt).toLocaleDateString("th-TH")}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                transaction.type === "add"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {transaction.type === "add" ? "เพิ่ม" : "แลก"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {transaction.type === "add" ? "+" : "-"}
                            {transaction.points}
                          </TableCell>
                          <TableCell>{transaction.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Customer Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? "แก้ไขข้อมูลลูกค้า" : "เพิ่มลูกค้าใหม่"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editingCustomer && (
              <div>
                <Label>ID ลูกค้า (ถ้าไม่ระบุจะสร้างอัตโนมัติ)</Label>
                <Input
                  type="number"
                  value={formData.id || ""}
                  onChange={(e) => {
                    const idValue = e.target.value === "" ? undefined : parseInt(e.target.value);
                    setFormData({ ...formData, id: idValue });
                  }}
                  placeholder="เช่น 1001 (ไม่ระบุได้)"
                  className="mt-1"
                  min="1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  ถ้าไม่ระบุ ID ระบบจะสร้างให้อัตโนมัติ
                </p>
              </div>
            )}
            {editingCustomer && (
              <div>
                <Label>ID ลูกค้า</Label>
                <Input
                  type="number"
                  value={formData.id || ""}
                  disabled
                  className="mt-1 bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  ไม่สามารถแก้ไข ID ได้
                </p>
              </div>
            )}
            <div>
              <Label>ชื่อลูกค้า *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="ชื่อลูกค้า"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>เบอร์โทร</Label>
                <Input
                  value={formData.phone || ""}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="เช่น 081-234-5678"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>อีเมล</Label>
                <Input
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="example@email.com"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>ที่อยู่</Label>
              <textarea
                value={formData.address || ""}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="ที่อยู่ลูกค้า"
                className="w-full px-3 py-2 border rounded text-sm min-h-20 mt-1"
              />
            </div>
            <div>
              <Label>หมายเหตุ</Label>
              <textarea
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="หมายเหตุเพิ่มเติม"
                className="w-full px-3 py-2 border rounded text-sm min-h-20 mt-1"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleCloseDialog}>
                ยกเลิก
              </Button>
              <Button
                onClick={handleSaveCustomer}
                disabled={createCustomerMutation.isPending || updateCustomerMutation.isPending}
              >
                {createCustomerMutation.isPending || updateCustomerMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  "บันทึก"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Purchase History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>ประวัติการซื้อ</DialogTitle>
          </DialogHeader>
          <div>
            {customerHistoryQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : !customerHistoryQuery.data || customerHistoryQuery.data.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                ไม่มีประวัติการซื้อ
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {customerHistoryQuery.data.map((transaction: any, index: number) => (
                  <div key={index} className="p-4 border rounded bg-muted/30">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">ใบเสร็จ #{transaction.id}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(transaction.createdAt).toLocaleString("th-TH")}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          วิธีชำระเงิน: {transaction.paymentMethod}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-accent">
                          ฿{parseFloat(transaction.totalAmount).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {transaction.itemCount || 0} รายการ
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Settings, Gift, ArrowLeft, Search, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useState, useMemo } from "react";

export default function Loyalty() {
  const [, setLocation] = useLocation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
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
  const { data: settings, refetch: refetchSettings } = trpc.loyalty.getSettings.useQuery();
  const { data: customers = [] } = trpc.customers.list.useQuery({ search: "" });
  const getHistoryQuery = trpc.loyalty.getHistory.useQuery(
    selectedCustomer?.id ? { customerId: selectedCustomer.id } : null as any
  );
  const loyaltyHistory = getHistoryQuery.data || [];

  // Mutations
  const updateSettingsMutation = trpc.loyalty.updateSettings.useMutation();
  const addPointsMutation = trpc.loyalty.addPoints.useMutation();
  const redeemPointsMutation = trpc.loyalty.redeemPoints.useMutation();

  // Filter customers based on search
  const filteredCustomers = useMemo(() => {
    if (!customers || customers.length === 0) return [];
    return customers.filter(
      (c: any) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [customers, searchTerm]);

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
      setSearchTerm("");
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
      setSearchTerm("");
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด");
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
              <h1 className="text-3xl font-bold tracking-tight">โปรแกรมสะสมคะแนน</h1>
              <p className="text-muted-foreground mt-2">
                จัดการระบบสะสมคะแนนสำหรับสมาชิก
              </p>
            </div>
          </div>
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button size="lg" onClick={() => {
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

        {/* Current Settings */}
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

        {/* Customer Selection */}
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
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Button variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {selectedCustomer ? (
              <div className="space-y-4">
                <div className="p-4 bg-accent/10 rounded-lg">
                  <h3 className="font-semibold text-lg">{selectedCustomer.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.phone}</p>
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
                    setSearchTerm("");
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
                          {customer.phone} • คะแนน: {customer.loyaltyPoints || 0}
                        </p>
                      </div>
                    </Button>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Loyalty History */}
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
                        {new Date(transaction.createdAt).toLocaleDateString(
                          "th-TH"
                        )}
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

        {/* Information */}
        <Card>
          <CardHeader>
            <CardTitle>วิธีการทำงาน</CardTitle>
            <CardDescription>
              คำอธิบายเกี่ยวกับระบบสะสมคะแนน
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Gift className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold">สะสมคะแนน</h3>
                <p className="text-sm text-muted-foreground">
                  ลูกค้าจะได้รับคะแนนตามจำนวนเงินที่ใช้จ่าย ตามอัตราที่กำหนดไว้ (คะแนนต่อบาท)
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Gift className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold">แลกคะแนน</h3>
                <p className="text-sm text-muted-foreground">
                  ลูกค้าสามารถแลกคะแนนเป็นส่วนลดได้ โดยต้องมีคะแนนอย่างน้อยตามจำนวนขั้นต่ำที่กำหนด
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Gift className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold">ประวัติการเปลี่ยนแปลง</h3>
                <p className="text-sm text-muted-foreground">
                  ทุกการเพิ่มหรือลดคะแนนจะถูกบันทึกไว้ในประวัติสำหรับการตรวจสอบ
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

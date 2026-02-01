import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";

export default function CompanyProfile() {
  const [, setLocation] = useLocation();
  const { data: profile, isLoading } = trpc.tax.getCompanyProfile.useQuery();
  const updateMutation = trpc.tax.updateCompanyProfile.useMutation({
    onSuccess: () => {
      toast.success("บันทึกข้อมูลกิจการสำเร็จ");
    },
    onError: (error) => {
      toast.error(error.message || "เกิดข้อผิดพลาด");
    },
  });

  const [formData, setFormData] = useState({
    name: "",
    taxId: "",
    address: "",
    district: "",
    province: "",
    postalCode: "",
    phone: "",
    email: "",
    businessType: "",
    vatRegistered: false,
    vatNumber: "",
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        taxId: profile.taxId || "",
        address: profile.address || "",
        district: profile.district || "",
        province: profile.province || "",
        postalCode: profile.postalCode || "",
        phone: profile.phone || "",
        email: profile.email || "",
        businessType: profile.businessType || "",
        vatRegistered: profile.vatRegistered || false,
        vatNumber: profile.vatNumber || "",
      });
    }
  }, [profile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.taxId || !formData.address) {
      toast.error("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน");
      return;
    }
    if (formData.taxId.length !== 13) {
      toast.error("เลขผู้เสียภาษีต้องมี 13 หลัก");
      return;
    }
    updateMutation.mutate(formData);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => setLocation("/")} className="shrink-0 gap-2">
            <ArrowLeft className="h-4 w-4" />
            ย้อนกลับ
          </Button>
          <div>
            <h1 className="text-3xl font-bold">ข้อมูลกิจการ</h1>
            <p className="text-muted-foreground">ตั้งค่าข้อมูลร้าน/บริษัทสำหรับระบบภาษี</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">กำลังโหลด...</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>ข้อมูลพื้นฐาน</CardTitle>
                <CardDescription>กรอกข้อมูลร้าน/บริษัทของคุณ</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">ชื่อร้าน/บริษัท *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taxId">เลขผู้เสียภาษี (13 หลัก) *</Label>
                    <Input
                      id="taxId"
                      value={formData.taxId}
                      onChange={(e) => setFormData({ ...formData, taxId: e.target.value.replace(/\D/g, "").slice(0, 13) })}
                      maxLength={13}
                      required
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">ที่อยู่ *</Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      rows={2}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="district">ตำบล/แขวง</Label>
                    <Input
                      id="district"
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="province">จังหวัด</Label>
                    <Input
                      id="province"
                      value={formData.province}
                      onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="postalCode">รหัสไปรษณีย์</Label>
                    <Input
                      id="postalCode"
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value.replace(/\D/g, "").slice(0, 5) })}
                      maxLength={5}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">อีเมล</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessType">ประเภทกิจการ</Label>
                    <Input
                      id="businessType"
                      value={formData.businessType}
                      onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                      placeholder="เช่น ร้านอาหาร, ร้านค้าปลีก"
                    />
                  </div>
                </div>

                <div className="border-t pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="vatRegistered">จดทะเบียนภาษีมูลค่าเพิ่ม (VAT)</Label>
                      <p className="text-sm text-muted-foreground">
                        เปิดใช้งานเพื่อสร้างใบกำกับภาษีอัตโนมัติ
                      </p>
                    </div>
                    <Switch
                      id="vatRegistered"
                      checked={formData.vatRegistered}
                      onCheckedChange={(checked) => setFormData({ ...formData, vatRegistered: checked })}
                    />
                  </div>

                  {formData.vatRegistered && (
                    <div className="space-y-2">
                      <Label htmlFor="vatNumber">เลข VAT</Label>
                      <Input
                        id="vatNumber"
                        value={formData.vatNumber}
                        onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
                        placeholder="เลข VAT (ถ้ามี)"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <Button type="button" variant="outline" onClick={() => setLocation("/")}>
                    ยกเลิก
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    บันทึก
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Store, LogOut, ArrowRight } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";

export default function JoinStore() {
  const [, setLocation] = useLocation();
  const [storeCode, setStoreCode] = useState("");
  const { data: user } = trpc.auth.me.useQuery();
  const utils = trpc.useUtils();
  const { logout } = useAuth();
  
  const joinMutation = trpc.stores.join.useMutation({
    onSuccess: async (data) => {
      toast.success(data.message);
      // Refresh user data เพื่อให้ได้ storeId ใหม่
      await utils.auth.me.invalidate();
      // Redirect ไปหน้า POS
      setTimeout(() => {
        setLocation("/sales");
      }, 500);
    },
    onError: (error) => {
      toast.error(error.message || "เกิดข้อผิดพลาด");
    },
  });

  const leaveMutation = trpc.stores.leave.useMutation({
    onSuccess: async (data) => {
      toast.success(data.message);
      await utils.auth.me.invalidate();
      setLocation("/join-store");
    },
    onError: (error) => {
      toast.error(error.message || "เกิดข้อผิดพลาด");
    },
  });

  // ดึงข้อมูลร้านถ้ามี storeId
  const { data: store } = trpc.stores.get.useQuery(
    { id: user?.storeId! },
    { enabled: !!user?.storeId }
  );

  const handleJoin = () => {
    if (!storeCode.trim()) {
      toast.error("กรุณากรอกรหัสร้าน");
      return;
    }
    joinMutation.mutate({ code: storeCode.trim() });
  };

  const handleLeave = () => {
    if (!confirm("คุณแน่ใจหรือว่าต้องการออกจากร้านนี้?")) return;
    leaveMutation.mutate();
  };

  // ถ้าพนักงานเข้าร้านแล้ว แสดงข้อมูลร้าน
  if (user?.storeId && store) {
    return (
      <DashboardLayout>
        <div className="space-y-6 p-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                คุณอยู่ในร้านแล้ว
              </CardTitle>
              <CardDescription>
                คุณสามารถใช้งานระบบ POS ได้แล้ว
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>ชื่อร้าน</Label>
                <p className="text-lg font-semibold mt-1">{store.name}</p>
              </div>
              <div>
                <Label>รหัสร้าน</Label>
                <p className="text-lg font-mono mt-1">{store.storeCode}</p>
              </div>
              <Button
                variant="outline"
                onClick={handleLeave}
                disabled={leaveMutation.isPending}
                className="w-full"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {leaveMutation.isPending ? "กำลังออกจากร้าน..." : "ออกจากร้าน"}
              </Button>
              <Button
                onClick={() => setLocation("/sales")}
                className="w-full"
              >
                ไปที่หน้า POS
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // ถ้ายังไม่เข้าร้าน แสดงฟอร์มเข้าร้าน
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-red-50 p-4">
      <div className="absolute top-4 right-4">
        <Button
          variant="outline"
          onClick={() => {
            if (confirm("คุณแน่ใจหรือว่าต้องการออกจากระบบ?")) {
              logout();
            }
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          ออกจากระบบ
        </Button>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
            <Store className="h-8 w-8 text-amber-600" />
          </div>
          <CardTitle className="text-2xl">ยินดีต้อนรับ {user?.name || "พนักงาน"}</CardTitle>
          <CardDescription className="mt-2">
            คุณยังไม่ได้เข้าร้านใด
            <br />
            กรุณากรอกรหัสร้านเพื่อเข้าสู่ระบบ
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="storeCode">รหัสร้าน</Label>
            <Input
              id="storeCode"
              placeholder="เช่น POS-UDON-2026"
              value={storeCode}
              onChange={(e) => setStoreCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleJoin();
                }
              }}
              disabled={joinMutation.isPending}
              className="text-lg font-mono"
            />
            <p className="text-sm text-muted-foreground">
              รหัสร้านจะได้รับจากหัวหน้าร้าน
            </p>
          </div>
          <Button
            onClick={handleJoin}
            disabled={joinMutation.isPending || !storeCode.trim()}
            className="w-full"
            size="lg"
          >
            {joinMutation.isPending ? "กำลังเข้าร้าน..." : "เข้าร้าน"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

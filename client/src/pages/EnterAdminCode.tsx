import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { KeyRound, LogOut, ArrowRight } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function EnterAdminCode() {
  const [, setLocation] = useLocation();
  const [code, setCode] = useState("");
  const { data: user } = trpc.auth.me.useQuery();
  const utils = trpc.useUtils();
  const { user: authUser, loading, logout } = useAuth();

  const redeemMutation = trpc.auth.redeemAdminCode.useMutation({
    onSuccess: async () => {
      toast.success("เชื่อมต่อร้านสำเร็จ คุณเป็น Admin ประจำร้านแล้ว");
      await utils.auth.me.invalidate();
      setLocation("/");
    },
    onError: (err) => {
      toast.error(err.message || "รหัสแอดมินไม่ถูกต้องหรือถูกใช้งานแล้ว");
    },
  });

  useEffect(() => {
    if (!loading && !authUser) setLocation("/login");
  }, [loading, authUser, setLocation]);
  useEffect(() => {
    if (user?.storeId) setLocation("/");
  }, [user?.storeId, setLocation]);

  const handleSubmit = () => {
    const t = code.trim();
    if (!t) {
      toast.error("กรุณากรอกรหัสแอดมิน");
      return;
    }
    redeemMutation.mutate({ code: t });
  };

  if (!loading && !authUser) return null;
  if (user?.storeId) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="absolute top-4 right-4">
        <Button variant="outline" onClick={() => logout()}>
          <LogOut className="mr-2 h-4 w-4" />
          ออกจากระบบ
        </Button>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
            <KeyRound className="h-8 w-8 text-amber-600" />
          </div>
          <CardTitle className="text-2xl">เข้าร้านด้วยรหัสแอดมิน</CardTitle>
          <CardDescription className="mt-2">
            ยังไม่ได้เชื่อมต่อร้านค้า
            <br />
            กรอกรหัสแอดมินที่ได้รับจาก Ordera เพื่อสร้างร้านและเริ่มใช้งาน
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="adminCode">รหัสแอดมิน</Label>
            <Input
              id="adminCode"
              placeholder="เช่น ORDERA-XXXXXXXXXX"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              disabled={redeemMutation.isPending}
              className="text-lg font-mono"
            />
            <p className="text-sm text-muted-foreground">
              รหัสแอดมินจะได้รับเมื่อซื้อระบบจาก Ordera (1 รหัส = 1 ร้าน)
            </p>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={redeemMutation.isPending || !code.trim()}
            className="w-full"
            size="lg"
          >
            {redeemMutation.isPending ? "กำลังเชื่อมต่อ..." : "เชื่อมต่อร้าน"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

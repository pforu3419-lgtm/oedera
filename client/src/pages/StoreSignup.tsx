import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function StoreSignup() {
  const [, setLocation] = useLocation();
  const { refresh } = useAuth();

  const [ownerName, setOwnerName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const signupMutation = trpc.auth.registerStore.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerName.trim()) return toast.error("กรุณากรอกชื่อผู้ใช้");
    if (!storeName.trim()) return toast.error("กรุณากรอกชื่อร้าน");
    if (!email.trim() || !email.includes("@")) return toast.error("รูปแบบอีเมลไม่ถูกต้อง");
    if (password.length < 6) return toast.error("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
    if (password !== confirmPassword) return toast.error("รหัสผ่านไม่ตรงกัน");

    try {
      const res = await signupMutation.mutateAsync({
        ownerName: ownerName.trim(),
        storeName: storeName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
      });
      toast.success(res.message || "สมัครร้านสำเร็จ");
      await refresh();
      setLocation("/");
      window.location.href = "/";
    } catch (error: any) {
      const msg = error?.data?.message || error?.message || "สมัครร้านไม่สำเร็จ";
      toast.error(String(msg));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-xl shadow-lg">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-4 justify-center">
            <img src="/ordera-logo.svg" alt="Ordera" className="h-12 w-12 drop-shadow-lg" />
            <div className="text-center">
              <CardTitle className="text-2xl font-bold text-primary">สมัครร้าน (Store Signup)</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                สมัครแล้วสถานะจะเป็น <span className="font-medium">pending</span> และยังเข้า POS ไม่ได้จนกว่าจะอนุมัติ
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ownerName">ชื่อผู้ใช้ (Owner)</Label>
                <Input id="ownerName" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="storeName">ชื่อร้าน</Label>
                <Input id="storeName" value={storeName} onChange={(e) => setStoreName(e.target.value)} required />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">อีเมล</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">เบอร์โทร (optional)</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0xx-xxx-xxxx" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">ที่อยู่ (optional)</Label>
              <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="ที่อยู่ร้าน" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">รหัสผ่าน</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">ยืนยันรหัสผ่าน</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={signupMutation.isPending}>
              {signupMutation.isPending ? "กำลังส่งคำขอ..." : "สมัครร้าน"}
            </Button>

            <Button type="button" variant="outline" className="w-full" onClick={() => setLocation("/login")}>
              กลับไปหน้าเข้าสู่ระบบ
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


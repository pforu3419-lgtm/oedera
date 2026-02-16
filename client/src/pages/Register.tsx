import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Register() {
  const [, setLocation] = useLocation();
  const { refresh } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const registerMutation = trpc.auth.register.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!name.trim()) {
      toast.error("กรุณากรอกชื่อผู้ใช้");
      return;
    }
    if (!email.trim()) {
      toast.error("กรุณากรอกอีเมล");
      return;
    }
    if (!email.includes("@")) {
      toast.error("รูปแบบอีเมลไม่ถูกต้อง");
      return;
    }
    if (password.length < 6) {
      toast.error("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("รหัสผ่านไม่ตรงกัน");
      return;
    }
    
    try {
      console.log("[Register] Submitting registration...");
      const result = await registerMutation.mutateAsync({ 
        name: name.trim(), 
        email: email.trim().toLowerCase(), 
        password,
      });
      console.log("[Register] Registration successful:", result);
      toast.success("สมัครสมาชิกสำเร็จ! กำลังเข้าสู่ระบบ...");
      
      // รอสักครู่เพื่อให้ toast แสดง
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // รีเฟรช user data เพื่อให้ login อัตโนมัติ
      await refresh();
      
      // ไปที่หน้า home
      setLocation("/");
    } catch (error: any) {
      console.error("[Register] Registration error:", error);
      
      // แสดง error message ที่ชัดเจน
      let errorMessage = "สมัครสมาชิกไม่สำเร็จ";
      
      if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      // แปลง error message เป็นภาษาไทย
      if (errorMessage.includes("Email already registered") || 
          errorMessage.includes("CONFLICT") || 
          errorMessage.includes("ถูกใช้งานแล้ว")) {
        errorMessage = "อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น";
      } else if (errorMessage.includes("JWT_SECRET")) {
        errorMessage = "เกิดข้อผิดพลาดในระบบ กรุณาติดต่อผู้ดูแลระบบ";
      } else if (errorMessage.includes("รูปแบบอีเมล")) {
        errorMessage = "รูปแบบอีเมลไม่ถูกต้อง";
      }
      
      toast.error(errorMessage);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-4 justify-center mb-4">
            <img src="/ordera-logo.svg" alt="Ordera" className="h-16 w-16 drop-shadow-lg" />
            <div className="text-center">
              <CardTitle className="text-3xl font-bold text-primary">Ordera</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                เริ่มใช้งานได้ทันที
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">ชื่อผู้ใช้</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ชื่อของคุณ"
                required
              />
            </div>
            <div>
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
            <div>
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
            <div>
              <Label htmlFor="confirmPassword">ยืนยันรหัสผ่าน</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="พิมพ์รหัสผ่านอีกครั้ง"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? "กำลังสมัครสมาชิก..." : "สมัครสมาชิก"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setLocation("/login")}
            >
              กลับไปหน้าเข้าสู่ระบบ
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => setLocation("/signup-store")}
            >
              สมัครร้าน (owner)
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

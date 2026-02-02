import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();
  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async () => {
      // Clear all cache before login to ensure fresh data
      queryClient.clear();
      await utils.invalidate();
      // Refetch user data
      await utils.auth.me.invalidate();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginMutation.mutateAsync({ email, password });
      toast.success("เข้าสู่ระบบสำเร็จ");
      // Wait a bit for cache to clear, then redirect
      setTimeout(() => {
        setLocation("/");
        // Force reload to ensure all queries refetch
        window.location.href = "/";
      }, 100);
    } catch (error: any) {
      const msg = error?.message || "";
      if (msg.includes("JWT_SECRET") || msg.includes("500")) {
        toast.error("เกิดข้อผิดพลาดในระบบ กรุณาติดต่อผู้ดูแล (JWT_SECRET ไม่ได้ตั้งค่า)");
      } else {
        toast.error("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      }
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
                ระบบจัดการร้านค้าของคุณ
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setLocation("/register")}
            >
              สมัครสมาชิก
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

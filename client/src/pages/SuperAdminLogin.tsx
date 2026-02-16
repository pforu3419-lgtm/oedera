import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Shield } from "lucide-react";

export default function SuperAdminLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async () => {
      queryClient.clear();
      await utils.invalidate();
      await utils.auth.me.invalidate();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await loginMutation.mutateAsync({ email: email.trim().toLowerCase(), password });
      if ((res as any)?.role !== "superadmin") {
        toast.error("บัญชีนี้ไม่ใช่ Super Admin");
        return;
      }
      toast.success("เข้าสู่ระบบผู้ดูแลสำเร็จ");
      setTimeout(() => {
        setLocation("/super-admin");
        window.location.href = "/super-admin";
      }, 100);
    } catch (error: any) {
      toast.error(error?.message || "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-4 justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
              <Shield className="h-9 w-9 text-amber-600" />
            </div>
            <div className="text-center">
              <CardTitle className="text-2xl font-bold text-primary">Super Admin Login</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                หน้านี้แยกจากการเข้าสู่ระบบปกติ
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
                placeholder="superadmin@example.com"
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
            <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบผู้ดูแล"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setLocation("/login")}
            >
              ไปหน้าเข้าสู่ระบบปกติ
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


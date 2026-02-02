import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { KeyRound, Plus, LogOut, Copy, Check } from "lucide-react";

export default function CreateAdminCodes() {
  const [gateCode, setGateCode] = useState("");
  const [createdCodes, setCreatedCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const { data: access, isLoading: accessLoading, isError: accessError, refetch: refetchAccess } = trpc.adminCodes.checkAccess.useQuery(undefined, {
    staleTime: 60_000, // refetch บ่อย ลดเคสแคช allowed: true แต่ session หมดอายุ
  });
  const utils = trpc.useUtils();

  const verifyMutation = trpc.adminCodes.verifyAccess.useMutation({
    onSuccess: () => {
      utils.adminCodes.checkAccess.invalidate();
      setGateCode("");
      toast.success("เข้าสู่ระบบสร้างรหัสแอดมินแล้ว");
    },
    onError: (e) => toast.error(e.message),
  });

  const createMutation = trpc.adminCodes.createCode.useMutation({
    onSuccess: (data) => {
      setCreatedCodes((prev) => [data.code, ...prev]);
      toast.success("สร้างรหัสแอดมินสำเร็จ");
    },
    onError: (e) => {
      toast.error(e.message);
      // session หมดอายุหรือยังไม่ผ่านรหัส → ให้โชว์ฟอร์มกรอกรหัสใหม่
      if (e.message === "กรุณากรอกรหัสเพื่อเข้าสู่ระบบก่อน") {
        utils.adminCodes.checkAccess.invalidate();
      }
    },
  });

  const clearMutation = trpc.adminCodes.clearAccess.useMutation({
    onSuccess: () => {
      utils.adminCodes.checkAccess.invalidate();
      setCreatedCodes([]);
      toast.success("ออกจากระบบแล้ว");
    },
  });

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      toast.success("คัดลอกรหัสแล้ว");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("คัดลอกไม่ได้");
    }
  };

  const allowed = access?.allowed === true;

  // โหลดไม่สำเร็จ (เครือข่าย/เซิร์ฟเวอร์)
  if (accessError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle>โหลดไม่สำเร็จ</CardTitle>
            <CardDescription>
              ไม่สามารถเชื่อมต่อกับระบบได้ — ตรวจสอบว่าสร้างเซิร์ฟเวอร์และลองใหม่
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => refetchAccess()}>
              ลองใหม่
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ฟอร์มกรอกรหัสหลัก (ก่อนเข้าสู่ระบบสร้างรหัส)
  if (!accessLoading && !allowed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center">
              <KeyRound className="h-7 w-7 text-amber-600" />
            </div>
            <CardTitle>กรอกรหัสเพื่อเข้าสู่ระบบ</CardTitle>
            <CardDescription className="space-y-2">
              <span className="block">ระบบสร้างรหัสแอดมิน — กรอกรหัสที่ได้รับจากผู้ดูแลเพื่อเข้าสู่หน้านี้</span>
              <span className="block text-xs text-amber-600 mt-2">
                รหัส = ORDERA_MASTER_CODE ที่ตั้งใน Render Environment (หรือรหัสที่ตั้งใน Settings)
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="gateCode">รหัส</Label>
              <Input
                id="gateCode"
                type="password"
                placeholder="กรอกรหัส"
                value={gateCode}
                onChange={(e) => setGateCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && verifyMutation.mutate({ code: gateCode })}
                disabled={verifyMutation.isPending}
                className="mt-2"
              />
            </div>
            <Button
              className="w-full"
              onClick={() => verifyMutation.mutate({ code: gateCode })}
              disabled={verifyMutation.isPending || !gateCode.trim()}
            >
              {verifyMutation.isPending ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบสร้างรหัสแอดมิน"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-slate-500">กำลังโหลด...</p>
      </div>
    );
  }

  // หน้าระบบสร้างรหัสแอดมิน (หลังกรอกรหัสผ่าน) — หน้าที่เดียว ไม่มีเมนู ไม่มีลิงก์อื่น
  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b shadow-sm">
        <div className="flex items-center gap-2">
          <KeyRound className="h-6 w-6 text-amber-600" />
          <span className="font-semibold text-slate-800">ระบบสร้างรหัสแอดมิน</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => clearMutation.mutate()}
          disabled={clearMutation.isPending}
        >
          <LogOut className="h-4 w-4 mr-1" />
          ออกจากระบบ
        </Button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>สร้างรหัสแอดมิน</CardTitle>
            <CardDescription>
              หนึ่งรหัสใช้สร้างหนึ่งร้าน — มอบรหัสที่ได้ให้ลูกค้าไปกรอกในหน้า "เข้าร้านด้วยรหัสแอดมิน"
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              className="w-full"
              size="lg"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
            >
              <Plus className="h-5 w-5 mr-2" />
              {createMutation.isPending ? "กำลังสร้าง..." : "สร้างรหัสแอดมิน"}
            </Button>

            {createdCodes.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-sm font-medium text-slate-600">รหัสที่สร้างในรอบนี้</p>
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {createdCodes.map((code) => (
                    <li
                      key={code}
                      className="flex items-center justify-between gap-2 p-3 bg-slate-50 rounded-lg font-mono text-sm"
                    >
                      <span className="truncate">{code}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(code)}
                        className="shrink-0"
                      >
                        {copied === code ? (
                          <Check className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="mt-6 text-sm text-slate-500 text-center max-w-sm">
          หน้านี้ใช้เฉพาะสร้างรหัสแอดมินเท่านั้น — ไม่มีเมนูอื่น ไม่สามารถดูหรือใช้ข้อมูลส่วนอื่นของระบบได้
        </p>
      </main>
    </div>
  );
}

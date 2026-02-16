import { useMemo, useState } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function MemberSignupPage() {
  const [match, params] = useRoute("/m/:storeId");
  const storeId = useMemo(() => {
    if (!match) return null;
    const n = Number(params?.storeId);
    return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
  }, [match, params?.storeId]);
  const orgId = useMemo(() => {
    try {
      const raw = new URLSearchParams(window.location.search).get("org");
      if (!raw) return null;
      const n = Number(raw);
      return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
    } catch {
      return null;
    }
  }, []);

  const storeInfoQuery = trpc.memberSignup.storeInfo.useQuery(
    { storeId: storeId ?? 0, orgId: orgId ?? undefined },
    { enabled: storeId != null },
  );
  const registerMutation = trpc.memberSignup.register.useMutation();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [done, setDone] = useState(false);

  if (!match || storeId == null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>ไม่พบลิงก์สมัครสมาชิก</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            กรุณาสแกน QR Code ใหม่อีกครั้ง
          </CardContent>
        </Card>
      </div>
    );
  }

  const info = storeInfoQuery.data;
  const storeName = info?.storeName ?? "ร้านค้า";

  const submit = async () => {
    try {
      await registerMutation.mutateAsync({
        storeId,
        orgId: orgId ?? undefined,
        name: name.trim(),
        phone: phone.trim(),
      });
      setDone(true);
      toast.success("สมัครสมาชิกสำเร็จ");
    } catch (e: any) {
      toast.error(e?.message || "สมัครไม่สำเร็จ");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-3 justify-center">
            {info?.logoUrl ? (
              <img
                src={info.logoUrl}
                alt={storeName}
                className="h-12 w-12 rounded-xl object-cover border"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : null}
            <div className="text-center">
              <CardTitle className="text-2xl font-bold">{storeName}</CardTitle>
              <div className="text-sm text-muted-foreground">สมัครสมาชิกผ่าน QR Code</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {storeInfoQuery.isLoading ? (
            <div className="text-muted-foreground">กำลังโหลดข้อมูลร้าน...</div>
          ) : storeInfoQuery.isError ? (
            <div className="text-destructive">
              {(storeInfoQuery.error as any)?.message ?? "โหลดข้อมูลร้านไม่สำเร็จ"}
            </div>
          ) : done ? (
            <div className="space-y-3 text-center">
              <div className="text-lg font-semibold">สมัครสมาชิกสำเร็จ</div>
              <div className="text-sm text-muted-foreground">ขอบคุณที่สมัครสมาชิกกับร้านของเรา</div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">ชื่อ</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ชื่อของคุณ"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">เบอร์โทร</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0xx-xxx-xxxx"
                  inputMode="tel"
                />
              </div>
              <Button
                className="w-full"
                onClick={submit}
                disabled={registerMutation.isPending || name.trim() === "" || phone.trim().length < 6}
              >
                {registerMutation.isPending ? "กำลังสมัคร..." : "สมัครสมาชิก"}
              </Button>
              <div className="text-xs text-muted-foreground text-center">
                ข้อมูลของคุณจะถูกบันทึกไว้กับร้านนี้เท่านั้น (storeId: {storeId})
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


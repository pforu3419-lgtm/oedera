import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Package, ArrowLeft } from "lucide-react";

export default function PackagePage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">สมัครแพ็กเกจ / ต่ออายุ</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                เลือกแพ็กเกจที่เหมาะกับร้านค้าของคุณ
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            บัญชีของคุณถูกปิดใช้งานหรือหมดอายุ หากต้องการใช้งานระบบต่อ กรุณาติดต่อผู้ดูแลระบบเพื่อสมัครแพ็กเกจหรือต่ออายุ
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="outline" onClick={() => setLocation("/")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              กลับหน้าแรก
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BarcodeDisplay } from "./BarcodeDisplay";
import { Printer } from "lucide-react";

/** ขนาดสติ๊กเกอร์: 50x30 mm (ร้านจริง) / A4 หลายดวงต่อแผ่น */
const LABEL_WIDTH_MM = 50;
const LABEL_HEIGHT_MM = 30;
const LABELS_PER_SHEET = 8;

interface ProductForLabel {
  id: number;
  name: string;
  price: string;
  barcode: string | null;
}

interface BarcodePrintSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductForLabel;
  copies?: number;
}

export function BarcodePrintSheet({
  open,
  onOpenChange,
  product,
  copies = LABELS_PER_SHEET,
}: BarcodePrintSheetProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!printRef.current) return;
    const printArea = printRef.current;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.print();
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>พิมพ์บาร์โค้ด - ${product.name}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: sans-serif; padding: 8px; }
            .sheet { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4mm; max-width: 210mm; margin: 0 auto; }
            .label { width: ${LABEL_WIDTH_MM}mm; height: ${LABEL_HEIGHT_MM}mm; padding: 3mm; border: 1px dashed #ccc; display: flex; flex-direction: column; align-items: center; justify-content: center; break-inside: avoid; }
            .label canvas { max-width: 100%; height: auto; max-height: 18mm; }
            .label-name { font-size: 9px; font-weight: bold; text-align: center; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
            .label-price { font-size: 11px; font-weight: bold; margin-top: 1px; }
            .label-code { font-size: 8px; margin-top: 1px; letter-spacing: 0.5px; }
            @media print {
              body { padding: 0; }
              .label { border: none; }
            }
          </style>
        </head>
        <body>
          <div class="sheet">${Array(copies)
            .fill(0)
            .map(
              () => `
            <div class="label">
              <canvas id="bc-${Math.random().toString(36).slice(2)}"></canvas>
              <div class="label-name">${escapeHtml(product.name)}</div>
              <div class="label-price">฿${parseFloat(product.price || "0").toFixed(2)}</div>
              <div class="label-code">${escapeHtml(product.barcode || "")}</div>
            </div>`
            )
            .join("")}</div>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
          <script>
            window.addEventListener('load', function() {
              var code = "${escapeJs(product.barcode || "")}";
              document.querySelectorAll('.label canvas').forEach(function(c) {
                try { if (typeof JsBarcode !== 'undefined') JsBarcode(c, code, { format: "EAN13", width: 1.5, height: 28, displayValue: false }); } catch(e) {}
              });
            });
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    };
  };

  if (!product.barcode?.trim()) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg print:max-w-none" ref={printRef}>
        <DialogHeader>
          <DialogTitle>พิมพ์บาร์โค้ด</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-col items-center p-4 border rounded-lg bg-muted/30">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              {product.name}
            </p>
            <p className="text-xs text-muted-foreground mb-2">
              ฿{parseFloat(product.price || "0").toFixed(2)}
            </p>
            <BarcodeDisplay
              value={product.barcode}
              format="EAN13"
              width={2}
              height={50}
              displayValue={true}
            />
            <p className="text-xs font-mono mt-2">{product.barcode}</p>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            พิมพ์ {copies} ดวงต่อแผ่น A4 (สติ๊กเกอร์ 50×30 mm)
          </p>
          <Button
            className="w-full"
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4 mr-2" />
            พิมพ์บาร์โค้ด
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeJs(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

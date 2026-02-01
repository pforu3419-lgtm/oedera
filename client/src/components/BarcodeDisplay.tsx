import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface BarcodeDisplayProps {
  value: string;
  format?: "EAN13" | "CODE128" | "auto";
  width?: number;
  height?: number;
  displayValue?: boolean;
  className?: string;
}

export function BarcodeDisplay({
  value,
  format = "EAN13",
  width = 2,
  height = 40,
  displayValue = true,
  className = "",
}: BarcodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!value?.trim() || !canvasRef.current) return;
    try {
      JsBarcode(canvasRef.current, value.trim(), {
        format: format === "auto" ? "auto" : format,
        width,
        height,
        displayValue,
        margin: 4,
        fontOptions: "",
        font: "monospace",
      });
    } catch (e) {
      console.warn("[BarcodeDisplay] JsBarcode error:", e);
    }
  }, [value, format, width, height, displayValue]);

  if (!value?.trim()) return null;
  return (
    <div className={className}>
      <canvas ref={canvasRef} className="max-w-full h-auto" />
    </div>
  );
}

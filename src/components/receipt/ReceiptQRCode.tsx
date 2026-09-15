"use client";

import React from "react";
import { Card } from "@/components/ui/Card";

interface ReceiptQRCodeProps {
  receiptId: string;
  verificationUrl: string;
}

export const ReceiptQRCode: React.FC<ReceiptQRCodeProps> = ({
  receiptId,
  verificationUrl,
}) => {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const absoluteUrl = `${origin}${verificationUrl}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(absoluteUrl)}`;

  return (
    <Card className="p-5 border-border">
      <div className="text-center">
        <h3 className="text-sm font-semibold text-text-primary mb-2">
          Receipt Verification QR
        </h3>
        <p className="text-xs text-text-secondary mb-4">
          Scan this code to open the receipt verification page.
        </p>

        <div className="w-40 h-40 mx-auto bg-white border-2 border-border rounded-xl flex items-center justify-center mb-4 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrSrc}
            alt={`QR code for receipt ${receiptId}`}
            width={150}
            height={150}
          />
        </div>

        <p className="text-[10px] text-text-secondary font-mono break-all">
          {absoluteUrl}
        </p>
      </div>
    </Card>
  );
};

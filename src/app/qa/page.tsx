import type { Metadata } from "next";
import { Suspense } from "react";
import { QaChat } from "@/components/QaChat";

export const metadata: Metadata = {
  title: "پرسش و پاسخ هوشمند",
};

export default function QaPage() {
  return (
    <Suspense fallback={<div className="card p-10 text-center text-sm text-muted">در حال آماده‌سازی…</div>}>
      <QaChat />
    </Suspense>
  );
}

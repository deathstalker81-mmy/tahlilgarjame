import type { Metadata } from "next";
import { Suspense } from "react";
import { CompareView } from "@/components/CompareView";

export const metadata: Metadata = {
  title: "مقایسه سهم‌ها",
};

export default function ComparePage() {
  return (
    <div className="space-y-6 pt-2">
      <div className="text-center">
        <h1 className="text-xl font-bold sm:text-2xl">⚖️ مقایسه سهم‌ها</h1>
        <p className="mx-auto mt-2 max-w-lg text-xs leading-6 text-muted sm:text-sm">
          دو تا سه نماد را کنار هم بگذار: ارزش‌گذاری، مومنتوم، پول و عملکرد — با جمع‌بندی هوش مصنوعی
        </p>
      </div>
      <Suspense fallback={<div className="card p-10 text-center text-sm text-muted">در حال آماده‌سازی…</div>}>
        <CompareView />
      </Suspense>
    </div>
  );
}

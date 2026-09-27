import type { Metadata } from "next";
import { NewsList } from "@/components/NewsList";

export const metadata: Metadata = {
  title: "اخبار مهم بازار",
};

export default function NewsPage() {
  return (
    <div className="space-y-6 pt-2">
      <div className="text-center">
        <h1 className="text-xl font-bold sm:text-2xl">📰 اخبار مهم بازار</h1>
        <p className="mx-auto mt-2 max-w-lg text-xs leading-6 text-muted sm:text-sm">
          آخرین اخبار اقتصادی از منابع معتبر + غربال هوشمند هوش مصنوعی برای فعالان بورس
        </p>
      </div>
      <NewsList />
    </div>
  );
}

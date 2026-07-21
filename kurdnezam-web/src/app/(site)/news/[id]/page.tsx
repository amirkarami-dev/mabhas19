"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  CalendarDays,
  Check,
  Copy,
  Send,
  Share2,
  UserRound,
} from "lucide-react";
import { useContent } from "@/lib/store";
import { imageUrl } from "@/lib/api";
import { Breadcrumb, NewsCard } from "@/components/ui";

export default function NewsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { content } = useContent();
  const [copied, setCopied] = useState(false);

  const item = content.news.find((n) => String(n.id) === id);
  const related = content.news
    .filter((n) => n.categoryId === item?.categoryId && String(n.id) !== id)
    .slice(0, 3);

  if (!item) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-4xl">خبر یافت نشد</h1>
        <p className="mt-3 text-steel">
          این خبر حذف شده یا نشانی آن تغییر کرده است.
        </p>
        <Link
          href="/news"
          className="mt-6 inline-block rounded-xl bg-copper px-6 py-3 font-semibold text-white"
        >
          بازگشت به اخبار
        </Link>
      </div>
    );
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Breadcrumb
        items={[{ title: "اخبار", href: "/news" }, { title: item.title }]}
      />

      <span className="rounded-full bg-copper-soft px-4 py-1.5 text-sm font-medium text-copper-dark">
        {item.categoryTitle || "اخبار سازمان"}
      </span>
      <h1 className="mt-4 font-display text-4xl leading-snug sm:text-5xl">
        {item.title}
      </h1>

      <div className="mt-4 flex flex-wrap items-center gap-5 text-sm text-steel">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="size-4 text-copper" aria-hidden />
          {item.date}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <UserRound className="size-4 text-copper" aria-hidden />
          {item.author}
        </span>
      </div>

      <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-3xl border border-line shadow-card">
        <Image
          src={imageUrl(item.image)}
          alt=""
          fill
          priority
          sizes="(max-width: 896px) 100vw, 896px"
          className="object-cover"
        />
      </div>

      <div className="article-body mt-8 rounded-3xl border border-line bg-white p-6 text-base leading-8 sm:p-10">
        {item.body.split("\n\n").map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      {/* share */}
      <div className="mt-8 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-5">
        <span className="inline-flex items-center gap-2 font-medium">
          <Share2 className="size-5 text-copper" aria-hidden />
          اشتراک‌گذاری این مطلب
        </span>
        <div className="ms-auto flex gap-2">
          <a
            href={`https://t.me/share/url?url=https://kurdnezam.ir/news/${item.id}&text=${encodeURIComponent(item.title)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-paper px-4 py-2 text-sm transition-colors hover:bg-copper hover:text-white"
          >
            <Send className="size-4" aria-hidden />
            تلگرام
          </a>
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center gap-2 rounded-xl bg-paper px-4 py-2 text-sm transition-colors hover:bg-copper hover:text-white"
          >
            {copied ? (
              <Check className="size-4" aria-hidden />
            ) : (
              <Copy className="size-4" aria-hidden />
            )}
            {copied ? "کپی شد" : "کپی لینک"}
          </button>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-3xl">مطالب مرتبط</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((n, i) => (
              <NewsCard key={n.id} item={n} index={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

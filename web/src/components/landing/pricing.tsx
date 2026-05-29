"use client"

import { useLocale } from "next-intl"
import { Link } from "@/i18n/navigation"
import { Button, Card, CardBody, Badge, cn } from "@/components/ui"

export function Pricing() {
  const locale = useLocale()
  const fa = locale === "fa"

  const tiers = [
    {
      name: fa ? "رایگان" : "Free",
      price: fa ? "۰" : "0",
      unit: fa ? "تومان" : "free",
      highlight: fa ? "۵ پروژه به‌صورت پیش‌فرض" : "5 projects by default",
      popular: false,
      features: [
        fa ? "۵ پروژه" : "5 projects",
        fa ? "تمام چک‌لیست‌ها" : "All checklists",
        fa ? "خروجی PDF فارسی" : "Persian PDF export",
      ],
    },
    {
      name: "Pro",
      price: fa ? "۲۹۹٬۰۰۰" : "299K",
      unit: fa ? "تومان / ماه" : "/ month",
      highlight: fa ? "پروژه‌های بیشتر" : "More projects",
      popular: true,
      features: [
        fa ? "تا ۵۰ پروژه" : "Up to 50 projects",
        fa ? "پشتیبانی اولویت‌دار" : "Priority support",
        fa ? "تاریخچه نسخه‌ها" : "Version history",
        fa ? "خروجی PDF فارسی" : "Persian PDF export",
      ],
    },
    {
      name: fa ? "سازمانی" : "Enterprise",
      price: fa ? "تماس بگیرید" : "Contact",
      unit: fa ? "نامحدود" : "unlimited",
      highlight: fa ? "پروژه‌های نامحدود" : "Unlimited projects",
      popular: false,
      features: [
        fa ? "پروژه نامحدود" : "Unlimited projects",
        fa ? "مدیریت تیم" : "Team management",
        fa ? "SLA اختصاصی" : "Dedicated SLA",
        fa ? "نصب اختصاصی" : "On-premise option",
      ],
    },
  ]

  return (
    <section id="pricing" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {fa ? "تعرفه‌های ساده و شفاف" : "Simple, transparent pricing"}
          </h2>
          <p className="mt-4 text-muted-foreground">
            {fa ? "رایگان شروع کنید و در صورت نیاز ارتقا دهید." : "Start free and upgrade whenever you need."}
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {tiers.map((t) => (
            <Card
              key={t.name}
              className={cn(
                "relative rounded-2xl transition-shadow hover:shadow-md",
                t.popular && "border-primary ring-1 ring-primary"
              )}
            >
              <CardBody className="flex h-full flex-col text-start">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">{t.name}</h3>
                  {t.popular ? <Badge tone="brand">{fa ? "محبوب" : "Popular"}</Badge> : null}
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-foreground">{t.price}</span>
                  <span className="text-sm text-muted-foreground">{t.unit}</span>
                </div>
                <p className="mt-2 text-sm font-medium text-primary">{t.highlight}</p>

                <ul className="mt-6 space-y-3">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="size-4 text-primary">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="mt-8 pt-2">
                  <Link href="/register" className="block">
                    <Button variant={t.popular ? "primary" : "outline"} className="w-full">
                      {fa ? "شروع کنید" : "Get started"}
                    </Button>
                  </Link>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

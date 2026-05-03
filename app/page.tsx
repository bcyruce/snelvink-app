"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  Thermometer,
  Sparkles,
  ClipboardCheck,
  FileCheck,
  ChevronDown,
  Check,
  Globe,
} from "lucide-react";

// -------------------------------------------------
// Types & Constants
// -------------------------------------------------
type LandingLanguage = "nl" | "en" | "zh" | "tr" | "ar";

const LANDING_LANGUAGES: { code: LandingLanguage; label: string; flag: string }[] = [
  { code: "nl", label: "Nederlands", flag: "🇳🇱" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
];

const landingTranslations: Record<LandingLanguage, Record<string, string>> = {
  nl: {
    login: "Inloggen",
    heroTitle: "Digitaliseer je HACCP & Voedselveiligheid",
    heroSubtitle:
      "Bespaar tijd op temperatuurregistraties, schoonmaakschema's en leveringscontroles. Altijd audit-klaar.",
    ctaStart: "Gratis starten",
    ctaDemo: "Bekijk hoe het werkt",
    featuresTitle: "Alles wat je nodig hebt",
    feature1Title: "Temperatuur Registratie",
    feature1Desc: "Koeling- en kerntemperaturen eenvoudig vastleggen met bewijs.",
    feature2Title: "Schoonmaakschema's",
    feature2Desc: "Geautomatiseerde taken en logs voor je hele team.",
    feature3Title: "Leveringscontroles",
    feature3Desc: "Ontvangstregistratie met foto's en opmerkingen.",
    feature4Title: "Aangepaste Checks",
    feature4Desc: "Registreer alles wat je wilt met flexibele modules.",
    feature5Title: "Altijd Audit-Klaar",
    feature5Desc: "Exporteerbare historie en rapporten voor de NVWA.",
    trustBanner: "Vertrouwd door moderne restaurants en horecabedrijven",
    pricingTitle: "Flexibele abonnementen",
    pricingSubtitle:
      "Start gratis en upgrade wanneer je groeit. Geen verrassingen, gewoon eerlijke prijzen.",
    pricingCta: "Bekijk prijzen",
    footerCopyright: "© 2026 Snelvink. Alle rechten voorbehouden.",
    footerPrivacy: "Privacy",
    footerTerms: "Voorwaarden",
    footerContact: "Contact",
  },
  en: {
    login: "Login",
    heroTitle: "Digitize Your HACCP & Food Safety",
    heroSubtitle:
      "Save time on temperature checks, cleaning schedules, and deliveries. Always audit-ready.",
    ctaStart: "Start for Free",
    ctaDemo: "See How It Works",
    featuresTitle: "Everything You Need",
    feature1Title: "Temperature Registration",
    feature1Desc: "Easily record cooling and core temperatures with proof.",
    feature2Title: "Cleaning Schedules",
    feature2Desc: "Automated tasks and logs for your entire team.",
    feature3Title: "Delivery Checks",
    feature3Desc: "Receiving registration with photos and notes.",
    feature4Title: "Custom Checks",
    feature4Desc: "Register anything you want with flexible modules.",
    feature5Title: "Always Audit-Ready",
    feature5Desc: "Exportable history and reports for compliance.",
    trustBanner: "Trusted by modern restaurants and hospitality businesses",
    pricingTitle: "Flexible Plans",
    pricingSubtitle:
      "Start free and upgrade as you grow. No surprises, just honest pricing.",
    pricingCta: "View Pricing",
    footerCopyright: "© 2026 Snelvink. All rights reserved.",
    footerPrivacy: "Privacy",
    footerTerms: "Terms",
    footerContact: "Contact",
  },
  zh: {
    login: "登录",
    heroTitle: "数字化您的HACCP与食品安全",
    heroSubtitle: "节省温度检查、清洁计划和收货检查的时间。随时准备审计。",
    ctaStart: "免费开始",
    ctaDemo: "了解工作原理",
    featuresTitle: "您需要的一切",
    feature1Title: "温度登记",
    feature1Desc: "轻松记录冷却和核心温度并保留证据。",
    feature2Title: "清洁计划",
    feature2Desc: "为您的整个团队自动化任务和日志。",
    feature3Title: "收货检查",
    feature3Desc: "带有照片和备注的收货登记。",
    feature4Title: "自定义检查",
    feature4Desc: "使用灵活的模块登记任何您想要的内容。",
    feature5Title: "随时审计就绪",
    feature5Desc: "可导出的历史记录和合规报告。",
    trustBanner: "深受现代餐厅和酒店业务的信赖",
    pricingTitle: "灵活的订阅计划",
    pricingSubtitle: "免费开始，随着业务增长升级。没有惊喜，只有诚实的定价。",
    pricingCta: "查看价格",
    footerCopyright: "© 2026 Snelvink. 保留所有权利。",
    footerPrivacy: "隐私政策",
    footerTerms: "条款",
    footerContact: "联系我们",
  },
  tr: {
    login: "Giriş Yap",
    heroTitle: "HACCP ve Gıda Güvenliğinizi Dijitalleştirin",
    heroSubtitle:
      "Sıcaklık kontrolleri, temizlik programları ve teslimat kontrollerinde zaman kazanın. Her zaman denetime hazır.",
    ctaStart: "Ücretsiz Başla",
    ctaDemo: "Nasıl Çalıştığını Gör",
    featuresTitle: "İhtiyacınız Olan Her Şey",
    feature1Title: "Sıcaklık Kaydı",
    feature1Desc: "Soğutma ve çekirdek sıcaklıklarını kanıtlarla kolayca kaydedin.",
    feature2Title: "Temizlik Programları",
    feature2Desc: "Tüm ekibiniz için otomatik görevler ve kayıtlar.",
    feature3Title: "Teslimat Kontrolleri",
    feature3Desc: "Fotoğraflar ve notlarla teslim alma kaydı.",
    feature4Title: "Özel Kontroller",
    feature4Desc: "Esnek modüllerle istediğiniz her şeyi kaydedin.",
    feature5Title: "Her Zaman Denetime Hazır",
    feature5Desc: "Uyumluluk için dışa aktarılabilir geçmiş ve raporlar.",
    trustBanner: "Modern restoranlar ve konaklama işletmeleri tarafından güveniliyor",
    pricingTitle: "Esnek Planlar",
    pricingSubtitle:
      "Ücretsiz başlayın ve büyüdükçe yükseltin. Sürpriz yok, sadece dürüst fiyatlandırma.",
    pricingCta: "Fiyatları Görüntüle",
    footerCopyright: "© 2026 Snelvink. Tüm hakları saklıdır.",
    footerPrivacy: "Gizlilik",
    footerTerms: "Şartlar",
    footerContact: "İletişim",
  },
  ar: {
    login: "تسجيل الدخول",
    heroTitle: "رقمنة نظام HACCP وسلامة الغذاء",
    heroSubtitle:
      "وفر الوقت في فحوصات درجة الحرارة وجداول التنظيف وفحوصات الاستلام. جاهز للتدقيق دائماً.",
    ctaStart: "ابدأ مجاناً",
    ctaDemo: "شاهد كيف يعمل",
    featuresTitle: "كل ما تحتاجه",
    feature1Title: "تسجيل درجة الحرارة",
    feature1Desc: "سجل درجات حرارة التبريد والأساسية بسهولة مع الإثباتات.",
    feature2Title: "جداول التنظيف",
    feature2Desc: "مهام وسجلات آلية لفريقك بالكامل.",
    feature3Title: "فحوصات الاستلام",
    feature3Desc: "تسجيل الاستلام مع الصور والملاحظات.",
    feature4Title: "فحوصات مخصصة",
    feature4Desc: "سجل أي شيء تريده باستخدام وحدات مرنة.",
    feature5Title: "جاهز للتدقيق دائماً",
    feature5Desc: "سجل قابل للتصدير وتقارير للامتثال.",
    trustBanner: "موثوق به من قبل المطاعم الحديثة وشركات الضيافة",
    pricingTitle: "خطط مرنة",
    pricingSubtitle: "ابدأ مجاناً وقم بالترقية مع نموك. بدون مفاجآت، أسعار عادلة فقط.",
    pricingCta: "عرض الأسعار",
    footerCopyright: "© 2026 Snelvink. جميع الحقوق محفوظة.",
    footerPrivacy: "الخصوصية",
    footerTerms: "الشروط",
    footerContact: "اتصل بنا",
  },
};

// -------------------------------------------------
// Animation variants
// -------------------------------------------------
const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1 } },
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
};

// -------------------------------------------------
// Component: LanguageSwitcher
// -------------------------------------------------
function LanguageSwitcher({
  lang,
  setLang,
}: {
  lang: LandingLanguage;
  setLang: (l: LandingLanguage) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = LANDING_LANGUAGES.find((l) => l.code === lang);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 shadow-sm transition-all hover:border-neutral-300 hover:shadow"
      >
        <Globe className="h-4 w-4" />
        <span>{current?.flag}</span>
        <ChevronDown
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-2 w-40 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg"
          >
            {LANDING_LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => {
                  setLang(l.code);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neutral-50 ${
                  l.code === lang
                    ? "bg-neutral-50 font-semibold text-neutral-900"
                    : "text-neutral-600"
                }`}
              >
                <span className="text-base">{l.flag}</span>
                <span>{l.label}</span>
                {l.code === lang && <Check className="ml-auto h-4 w-4 text-emerald-600" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// -------------------------------------------------
// Component: Header
// -------------------------------------------------
function Header({
  lang,
  setLang,
  t,
}: {
  lang: LandingLanguage;
  setLang: (l: LandingLanguage) => void;
  t: Record<string, string>;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-neutral-100 bg-white/90 py-3 shadow-sm backdrop-blur-md"
          : "bg-transparent py-5"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo-snelvink.png"
            alt="Snelvink"
            width={44}
            height={44}
            className="h-11 w-11"
          />
          <span
            className="text-xl font-extrabold tracking-wide text-neutral-900"
            style={{ fontFamily: "'Trebuchet MS', sans-serif" }}
          >
            SNEL<span className="text-neutral-400">VINK</span>
          </span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <LanguageSwitcher lang={lang} setLang={setLang} />
          <Link
            href="/app/login"
            className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-neutral-800 hover:shadow"
          >
            {t.login}
          </Link>
        </div>
      </div>
    </motion.header>
  );
}

// -------------------------------------------------
// Component: Hero
// -------------------------------------------------
function Hero({ t }: { t: Record<string, string> }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-neutral-50 to-white pb-20 pt-32 sm:pb-28 sm:pt-40">
      {/* Subtle grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <motion.div variants={staggerContainer} initial="initial" animate="animate">
          <motion.h1
            variants={fadeInUp}
            transition={{ duration: 0.5 }}
            className="text-balance text-4xl font-extrabold leading-tight tracking-tight text-neutral-900 sm:text-5xl md:text-6xl"
          >
            {t.heroTitle}
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-neutral-600 sm:text-xl"
          >
            {t.heroSubtitle}
          </motion.p>

          <motion.div
            variants={fadeInUp}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link
              href="/app/login?register=1"
              className="group flex items-center gap-2 rounded-full bg-emerald-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700 hover:shadow-emerald-300"
            >
              {t.ctaStart}
              <motion.span
                className="inline-block"
                whileHover={{ x: 4 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                →
              </motion.span>
            </Link>
            <Link
              href="#features"
              className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-7 py-3.5 text-base font-semibold text-neutral-700 shadow-sm transition-all hover:border-neutral-300 hover:shadow"
            >
              {t.ctaDemo}
            </Link>
          </motion.div>
        </motion.div>

        {/* App preview mockup */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4, ease: "easeOut" }}
          className="mx-auto mt-16 max-w-sm"
        >
          <div className="rounded-[2rem] border border-neutral-200 bg-white p-3 shadow-2xl shadow-neutral-200">
            <div className="aspect-[9/16] overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-emerald-50 to-teal-50">
              <div className="flex h-full flex-col">
                {/* Mock header */}
                <div className="flex items-center justify-between bg-emerald-700 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-white/20" />
                    <span className="text-sm font-bold text-white">SNELVINK</span>
                  </div>
                  <div className="h-6 w-6 rounded-full bg-white/20" />
                </div>
                {/* Mock cards */}
                <div className="flex-1 space-y-3 p-4">
                  {[
                    { icon: "❄️", label: "Koeling", color: "bg-blue-100" },
                    { icon: "🔥", label: "Kerntemp", color: "bg-orange-100" },
                    { icon: "🧹", label: "Schoonmaak", color: "bg-green-100" },
                    { icon: "📦", label: "Ontvangst", color: "bg-purple-100" },
                  ].map((item, i) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + i * 0.1 }}
                      className={`flex items-center gap-3 rounded-xl ${item.color} p-3`}
                    >
                      <span className="text-xl">{item.icon}</span>
                      <span className="text-sm font-semibold text-neutral-700">
                        {item.label}
                      </span>
                      <span className="ml-auto text-xs font-medium text-emerald-600">
                        ✓
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// -------------------------------------------------
// Component: Features
// -------------------------------------------------
function Features({ t }: { t: Record<string, string> }) {
  const features = [
    {
      icon: Thermometer,
      title: t.feature1Title,
      desc: t.feature1Desc,
      color: "bg-blue-50 text-blue-600",
    },
    {
      icon: Sparkles,
      title: t.feature2Title,
      desc: t.feature2Desc,
      color: "bg-green-50 text-green-600",
    },
    {
      icon: ClipboardCheck,
      title: t.feature3Title,
      desc: t.feature3Desc,
      color: "bg-purple-50 text-purple-600",
    },
    {
      icon: FileCheck,
      title: t.feature4Title,
      desc: t.feature4Desc,
      color: "bg-amber-50 text-amber-600",
    },
    {
      icon: FileCheck,
      title: t.feature5Title,
      desc: t.feature5Desc,
      color: "bg-rose-50 text-rose-600",
    },
  ];

  return (
    <section id="features" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          variants={fadeInUp}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h2 className="text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl">
            {t.featuresTitle}
          </h2>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-100px" }}
          className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              variants={scaleIn}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="group rounded-2xl border border-neutral-100 bg-neutral-50/50 p-6 transition-all hover:border-neutral-200 hover:bg-white hover:shadow-lg"
            >
              <div
                className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${feature.color}`}
              >
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-neutral-900">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// -------------------------------------------------
// Component: TrustBanner
// -------------------------------------------------
function TrustBanner({ t }: { t: Record<string, string> }) {
  return (
    <section className="border-y border-neutral-100 bg-neutral-50 py-10">
      <motion.div
        variants={fadeInUp}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-4xl px-6 text-center"
      >
        <p className="text-sm font-semibold uppercase tracking-widest text-neutral-500">
          {t.trustBanner}
        </p>
        {/* Placeholder logos */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-8 opacity-40">
          {["Restaurant A", "Cafe B", "Hotel C", "Bistro D"].map((name) => (
            <div
              key={name}
              className="h-8 w-24 rounded bg-neutral-300"
              title={name}
            />
          ))}
        </div>
      </motion.div>
    </section>
  );
}

// -------------------------------------------------
// Component: Pricing Teaser
// -------------------------------------------------
function PricingTeaser({ t }: { t: Record<string, string> }) {
  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <motion.div
          variants={fadeInUp}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl">
            {t.pricingTitle}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-neutral-600">
            {t.pricingSubtitle}
          </p>
          <Link
            href="/app/login?register=1"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-neutral-900 px-7 py-3.5 text-base font-semibold text-white shadow-sm transition-all hover:bg-neutral-800"
          >
            {t.pricingCta}
            <span>→</span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

// -------------------------------------------------
// Component: Footer
// -------------------------------------------------
function Footer({ t }: { t: Record<string, string> }) {
  return (
    <footer className="border-t border-neutral-100 bg-neutral-50 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 sm:flex-row">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <Image
            src="/logo-snelvink.png"
            alt="Snelvink"
            width={32}
            height={32}
            className="h-8 w-8"
          />
          <span className="text-sm font-bold text-neutral-700">Snelvink</span>
        </div>

        {/* Links */}
        <nav className="flex items-center gap-6 text-sm font-medium text-neutral-500">
          <Link href="#" className="transition-colors hover:text-neutral-900">
            {t.footerPrivacy}
          </Link>
          <Link href="#" className="transition-colors hover:text-neutral-900">
            {t.footerTerms}
          </Link>
          <Link href="#" className="transition-colors hover:text-neutral-900">
            {t.footerContact}
          </Link>
        </nav>

        {/* Copyright */}
        <p className="text-sm text-neutral-400">{t.footerCopyright}</p>
      </div>
    </footer>
  );
}

// -------------------------------------------------
// Main Page
// -------------------------------------------------
export default function LandingPage() {
  const [lang, setLang] = useState<LandingLanguage>("nl");
  const t = landingTranslations[lang];

  // Set dir for RTL languages
  useEffect(() => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  return (
    <div className="min-h-screen bg-white">
      <Header lang={lang} setLang={setLang} t={t} />
      <main>
        <Hero t={t} />
        <Features t={t} />
        <TrustBanner t={t} />
        <PricingTeaser t={t} />
      </main>
      <Footer t={t} />
    </div>
  );
}

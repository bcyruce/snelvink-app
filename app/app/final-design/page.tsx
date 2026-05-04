'use client';

import { Pencil, Thermometer, Droplet, Package, Clock } from 'lucide-react';

const pine = {
  primary: '#2D5C3C',
  bgGrad: 'linear-gradient(135deg, #E8F1E8 0%, #F0F5F0 100%)',
  cardBorder: 'rgba(45, 92, 60, 0.15)',
  muted: 'rgba(45, 92, 60, 0.4)',
};

const modules = [
  { name: '核心温度', icon: Thermometer },
  { name: '冷藏温度', icon: Droplet },
  { name: '清洁检查', icon: Package },
  { name: '收货检查', icon: Clock },
];

export default function FinalDesign() {
  return (
    <div className="min-h-screen bg-white p-6 flex items-center justify-center">
      <div className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl" style={{ background: pine.bgGrad, minHeight: 750 }}>
        {/* Header */}
        <div className="px-5 pt-8 pb-6" style={{ background: pine.primary }}>
          <div className="min-w-0">
            <div>
              <div style={{
                fontSize: 32,
                fontWeight: 800,
                color: "#fff",
                letterSpacing: "0.06em",
                lineHeight: 1,
                fontFamily: "'Trebuchet MS', sans-serif",
                textTransform: "uppercase",
              }}>
                SNEL<span style={{ opacity: 0.55, marginLeft: "0.12em" }}>VINK</span>
              </div>
              <div style={{
                fontSize: 10,
                fontWeight: 600,
                color: "rgba(255,255,255,0.45)",
                letterSpacing: "0.15em",
                marginTop: 5,
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}>
                SnelVink
              </div>
            </div>
          </div>
        </div>

        {/* Taken + Wijzigen */}
        <div className="px-4 pt-5 pb-0 flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: pine.muted }}>
            Taken
          </span>
          <button
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-black"
            style={{
              background: "transparent",
              border: `1.5px solid ${pine.cardBorder}`,
              color: pine.primary,
              letterSpacing: "0.04em",
            }}
          >
            <Pencil className="h-3 w-3" strokeWidth={2.5} />
            Wijzigen
          </button>
        </div>

        {/* Module Grid */}
        <div className="px-4 pt-5 pb-6 grid grid-cols-2 gap-3">
          {modules.map((mod, i) => {
            const Icon = mod.icon;
            return (
              <div
                key={i}
                className="aspect-square rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all hover:shadow-md"
                style={{
                  background: "rgba(255, 255, 255, 0.7)",
                  backdropFilter: "blur(12px)",
                  border: `1.5px solid ${pine.cardBorder}`,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                <Icon className="h-7 w-7 mb-2" style={{ color: pine.primary, strokeWidth: 1.8 }} />
                <span className="text-xs font-bold text-center" style={{ color: pine.primary }}>
                  {mod.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* Bottom Nav */}
        <div className="px-4 pb-4 flex justify-around" style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(8px)" }}>
          {[
            { label: '记录', icon: Clock },
            { label: '历史', icon: Clock },
            { label: '设置', icon: Clock },
          ].map((nav, i) => (
            <button
              key={i}
              className="flex flex-col items-center gap-1 py-3 px-4 text-[10px] font-bold"
              style={{ color: pine.muted }}
            >
              <nav.icon className="h-5 w-5" strokeWidth={1.5} />
              {nav.label}
            </button>
          ))}
        </div>
      </div>

      {/* Design Info */}
      <div className="ml-8 max-w-xs">
        <h2 className="text-2xl font-bold mb-4" style={{ color: pine.primary }}>SnelVink</h2>
        <div className="space-y-3 text-sm" style={{ color: pine.muted }}>
          <div>
            <h3 className="font-bold mb-1" style={{ color: pine.primary }}>设计元素</h3>
            <ul className="space-y-1 text-xs">
              <li>• 字体: 几何现代 (SNEL VINK 分层)</li>
              <li>• 主色: 松针绿 (#2D5C3C)</li>
              <li>• 样式: 玻璃拟态毛玻璃卡片</li>
              <li>• 标语: SnelVink</li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold mb-1" style={{ color: pine.primary }}>UI 特性</h3>
            <ul className="space-y-1 text-xs">
              <li>• 深绿 Header 横幅</li>
              <li>• "Taken" 标签 + Wijzigen 按钮</li>
              <li>• 2×2 模块卡片网格</li>
              <li>• 浅色玻璃底部导航</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

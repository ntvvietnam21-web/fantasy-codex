import os

css_content = """
/* ============================================================
   PREMIUM DARK FANTASY OVERHAUL (v3.0)
   - Deep Obsidian Theme
   - Advanced Glassmorphism
   - Hardware Accelerated Animations
   - Responsive Grid Blueprints
   ============================================================ */

/* ── ROOT VARIABLES ── */
:root {
  --obsidian-bg: #08090c;
  --dark-night: #0b0f19;
  --twilight-purple: #120e1f;
  --neon-gold: #d4af37;
  --glass-border: rgba(255, 255, 255, 0.05);
  --glass-bg: rgba(255, 255, 255, 0.03);
}

/* ── THEME & BACKGROUND ── */
body {
  background: radial-gradient(circle at 50% 0%, var(--twilight-purple), var(--obsidian-bg) 60%, var(--dark-night));
  background-attachment: fixed;
  color: #e2e8f0;
}

/* Glassmorphism cho các khung/bảng */
.char-card, .sidebar, .modal-content, .command-palette-box, .bracket-round, .battle-log-container {
  background: var(--glass-bg) !important;
  border: 1px solid var(--glass-border) !important;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
}

/* Nâng cấp .particle-bg */
.particle-bg {
  z-index: 0;
  pointer-events: none;
}
.particle {
  background: radial-gradient(circle, rgba(212, 175, 55, 0.8), transparent);
  animation: pulseFloat linear infinite;
  will-change: transform, opacity;
}
@keyframes pulseFloat {
  0% { transform: translate3d(0, 100vh, 0) scale(0); opacity: 0; }
  25% { opacity: 1; transform: translate3d(10px, 75vh, 0) scale(1.2); }
  50% { opacity: 0.5; transform: translate3d(-15px, 50vh, 0) scale(0.8); }
  75% { opacity: 1; transform: translate3d(20px, 25vh, 0) scale(1.5); }
  100% { transform: translate3d(-10px, -20px, 0) scale(0); opacity: 0; }
}

/* ── TYPOGRAPHY & METALLIC SHINE ── */
h1, h2, h3, .shine-text, .champion-name {
  background: linear-gradient(105deg, #f1f5f9 20%, #d4af37 50%, #f1f5f9 80%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: metallicShine 4s linear infinite;
  font-family: 'Cinzel', serif;
  font-weight: 700;
  will-change: background-position;
}
@keyframes metallicShine {
  0% { background-position: 200% center; }
  100% { background-position: -200% center; }
}

/* Hyperlink Cổ Thuật */
.char-link-wiki {
  color: #94a3b8;
  border-bottom: 1px dashed rgba(212,175,55,0.4);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  text-decoration: none;
}
.char-link-wiki:hover {
  color: #d4af37;
  border-bottom-color: #d4af37;
  text-shadow: 0 0 8px rgba(212,175,55,0.6);
  transform: scale(1.05);
  display: inline-block;
}

/* ── THẺ BÀI NGHỆ THUẬT 3D ── */
/* Chỉ kích hoạt 3D hover trên PC */
@media (hover: hover) and (pointer: fine) {
  .card-3d-tilt {
    transform-style: preserve-3d;
    perspective: 1000px;
  }
  .card-3d-tilt:hover {
    transform: translate3d(0, -10px, 0) scale(1.02);
    box-shadow: 0 25px 50px rgba(0,0,0,0.8), 0 0 25px rgba(212,175,55,0.2);
  }
  .card-3d-tilt:hover img {
    transform: translateZ(40px) scale(1.05);
    transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  /* Vệt sáng thẻ bài */
  .card-3d-tilt::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%);
    transform: translate3d(-100%, -100%, 0);
    transition: transform 0.6s ease;
    pointer-events: none;
    z-index: 2;
  }
  .card-3d-tilt:hover::before {
    transform: translate3d(100%, 100%, 0);
  }
}

/* Viền Glow Đa Tầng */
.tier-legendary, .rank-glow-sss {
  position: relative;
  border: 1px solid transparent !important;
  background-clip: padding-box;
}
.tier-legendary::after, .rank-glow-sss::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: inherit;
  background: linear-gradient(90deg, #d4af37, #fef08a, #d4af37, #b45309, #d4af37);
  background-size: 200% 200%;
  animation: animatedGradient 3s linear infinite;
  z-index: -1;
}
@keyframes animatedGradient {
  0% { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}

.tier-epic, .rank-glow-ss {
  box-shadow: 0 0 10px rgba(6,182,212,0.5), 0 0 20px rgba(6,182,212,0.3), inset 0 0 10px rgba(6,182,212,0.2) !important;
}
.tier-rare, .rank-glow-s {
  box-shadow: 0 0 8px rgba(168,85,247,0.5), 0 0 15px rgba(168,85,247,0.3), inset 0 0 8px rgba(168,85,247,0.2) !important;
}

/* ── RESPONSIVE BLUEPRINT ── */
/* PC & UltraWide */
@media (min-width: 1200px) {
  .grid-container-v2, .tournament-player-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }
  .sidebar { width: 280px; }
  .main-content { margin-left: 280px; }
}

/* Tablet & iPad */
@media (min-width: 768px) and (max-width: 1199px) {
  .grid-container-v2, .tournament-player-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
  }
  .sidebar { width: 80px; overflow: hidden; }
  .sidebar .nav-item span { display: none; }
  .sidebar .sidebar-header span { display: none; }
  .main-content { margin-left: 80px; }
}

/* Mobile */
@media (max-width: 767px) {
  .grid-container-v2, .tournament-player-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .sidebar {
    transform: translate3d(-100%, 0, 0);
    width: 260px;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .sidebar.open { transform: translate3d(0, 0, 0); }
  .main-content { margin-left: 0; padding: 10px; }
  
  /* Vô hiệu hóa 3D trên Mobile */
  .card-3d-tilt {
    transform: none !important;
    perspective: none !important;
    transform-style: flat !important;
    box-shadow: 0 12px 24px rgba(0,0,0,0.5) !important;
  }
  .card-3d-tilt:active {
    transform: scale(1.02) !important;
  }
  
  /* Bảng dữ liệu có thanh cuộn ngang */
  .table-responsive, .battle-log-container, .bracket-round {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  /* Touch Targets 44px */
  button, .btn-primary, .btn-secondary, .nav-item {
    min-height: 44px;
    min-width: 44px;
  }
}

/* Thanh cuộn mờ (Custom Scrollbar) cho container */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.4); border-radius: 10px; }
::-webkit-scrollbar-thumb:hover { background: rgba(212,175,55,0.8); }

/* ── COMMAND PALETTE & TOURNAMENT UX ── */
#commandPaletteOverlay {
  background: rgba(8, 9, 12, 0.85); /* Deep Obsidian mờ */
}
.command-palette-box {
  background: linear-gradient(180deg, rgba(30,41,59,0.9), rgba(15,23,42,0.95)) !important;
  border-top: 2px solid rgba(212,175,55,0.5) !important;
}
#cpInput:focus {
  box-shadow: inset 0 0 20px rgba(212,175,55,0.1);
  animation: breathingGlow 2s infinite alternate;
}
@keyframes breathingGlow {
  0% { box-shadow: inset 0 0 10px rgba(212,175,55,0.05); }
  100% { box-shadow: inset 0 0 20px rgba(212,175,55,0.2); }
}

/* Sơ đồ Tournament - Nối kết quả */
.bracket-connector {
  background: rgba(212,175,55,0.2);
  box-shadow: 0 0 5px rgba(212,175,55,0.1);
  transition: all 0.3s ease;
}
.bracket-connector.winner-path {
  background: #d4af37;
  box-shadow: 0 0 15px #d4af37;
}
.tournament-player-card.winner {
  box-shadow: 0 0 20px rgba(212,175,55,0.6) !important;
  border-color: #d4af37 !important;
}
"""

style_path = r"c:\Users\Nguyentruongvy\Downloads\CODEX\DataDreammm(Copy 2)\DataDreammm(Copy 2)\style.css"

with open(style_path, "a", encoding="utf-8") as f:
    f.write("\n" + css_content + "\n")

print("Đã chèn CSS thành công vào style.css")

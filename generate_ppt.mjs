#!/usr/bin/env node
/**
 * agent-sync Presentation Generator
 *
 * Generates a professional PPTX deck introducing agent-sync
 */
import pptxgen from "pptxgenjs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Design System (Cyber Blue theme - Tech & Modern) ────────────────────────
const C = {
  bg: "0A192F",        // 60% — primary background (deep navy)
  bgLight: "112240",   // 30% — content areas
  accent: "64FFDA",    // 10% — CTA, key metrics (teal)
  accentDim: "233554", // muted accent background
  white: "FFFFFF",
  gray: "8892B0",      // body text
  grayLight: "CCD6F6", // headers
  textDim: "495670",   // captions
};

// ─── Fonts ───────────────────────────────────────────────────────────────────
const FONT = {
  title: "Trebuchet MS",
  body: "Calibri",
  mono: "Consolas",
};

// ─── Presentation ────────────────────────────────────────────────────────────
const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33" x 7.5"
pres.author = "agent-sync";
pres.title = "agent-sync — Sync AI Agents in One Command";

// ─── Helper: Title ───────────────────────────────────────────────────────────
function addTitle(slide, title, subtitle = null) {
  slide.addText(title, {
    x: 0.6, y: 0.4, w: 12, h: 0.8,
    fontSize: 32, bold: true, color: C.grayLight, fontFace: FONT.title,
    margin: 0,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.6, y: 1.1, w: 12, h: 0.5,
      fontSize: 16, color: C.gray, fontFace: FONT.body,
    });
  }
}

// ─── Helper: Top Accent Bar ──────────────────────────────────────────────────
function addTopAccent(slide) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: "100%", h: 0.1, fill: { color: C.accent },
  });
}

// ─── Helper: Side Accent ─────────────────────────────────────────────────────
function addSideAccent(slide) {
  addTopAccent(slide);
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.08, h: "100%", fill: { color: C.accent },
  });
}

// ─── Helper: Card ────────────────────────────────────────────────────────────
function addCard(slide, { x, y, w, h, title, body, accentColor = C.accent }) {
  // Card background
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h,
    fill: { color: C.bgLight },
    shadow: { type: "outer", blur: 8, offset: 3, angle: 135, color: "000000", opacity: 0.3 },
  });
  // Accent bar
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w: 0.06, h, fill: { color: accentColor },
  });
  // Title
  slide.addText(title, {
    x: x + 0.2, y: y + 0.15, w: w - 0.4, h: 0.5,
    fontSize: 18, bold: true, color: C.grayLight, fontFace: FONT.title, margin: 0,
  });
  // Body
  slide.addText(body, {
    x: x + 0.2, y: y + 0.6, w: w - 0.4, h: h - 0.8,
    fontSize: 13, color: C.gray, fontFace: FONT.body, valign: "top",
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Slide 1: Title Slide
// ═══════════════════════════════════════════════════════════════════════════════
{
  const slide = pres.addSlide();
  slide.background = { color: C.bg };

  // Accent bar
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: "100%", h: 0.15, fill: { color: C.accent },
  });

  // Title
  slide.addText("agent-sync", {
    x: 0.6, y: 2.5, w: 12, h: 1.2,
    fontSize: 72, bold: true, color: C.grayLight, fontFace: FONT.title,
  });

  // Tagline
  slide.addText("Sync MCP, skills, and AGENTS.md across all AI coding agents — one command.", {
    x: 0.6, y: 3.7, w: 10, h: 0.8,
    fontSize: 22, color: C.gray, fontFace: FONT.body,
  });

  // Supported agents badge row
  const agents = ["Claude Code", "Codex CLI", "Copilot", "Gemini CLI", "Antigravity", "OpenCode"];
  const badgeW = 1.5;
  const startX = 0.6;
  const badgeY = 5.2;

  agents.forEach((name, i) => {
    const bx = startX + i * (badgeW + 0.3);
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: bx, y: badgeY, w: badgeW, h: 0.45,
      fill: { color: C.accentDim }, rectRadius: 0.06,
    });
    slide.addText(name, {
      x: bx, y: badgeY, w: badgeW, h: 0.45,
      fontSize: 11, color: C.accent, fontFace: FONT.body,
      align: "center", valign: "middle",
    });
  });

  // Version
  slide.addText("v0.1.9", {
    x: 11.5, y: 6.8, w: 1.5, h: 0.4,
    fontSize: 12, color: C.gray, fontFace: FONT.mono, align: "right",
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Slide 2: The Problem
// ═══════════════════════════════════════════════════════════════════════════════
{
  const slide = pres.addSlide();
  slide.background = { color: C.bg };
  addSideAccent(slide);
  addTitle(slide, "The Problem", "AI agent fragmentation");

  // Problem points
  const problems = [
    { icon: "6+", text: "Different AI coding CLIs, each with unique config formats" },
    { icon: "5", text: "Separate config files for MCP servers alone" },
    { icon: "3", text: "Skill directories with inconsistent naming" },
    { icon: "4", text: "AGENTS.md variants: CLAUDE.md, COPILOT.md, CODEX.md..." },
  ];

  const startY = 2.0;
  const rowH = 1.1;

  problems.forEach((p, i) => {
    const y = startY + i * rowH;

    // Circle with number
    const d = 0.7;
    slide.addShape(pres.shapes.OVAL, {
      x: 1.0, y: y + 0.1, w: d, h: d, fill: { color: "E74C3C" },
    });
    slide.addText(p.icon, {
      x: 1.0, y: y + 0.1, w: d, h: d,
      fontSize: 20, bold: true, color: C.white, align: "center", valign: "middle",
    });

    // Text
    slide.addText(p.text, {
      x: 2.0, y: y + 0.15, w: 10, h: 0.6,
      fontSize: 18, color: C.gray, fontFace: FONT.body, valign: "middle",
    });
  });

  // Bottom line
  slide.addText("Manual sync is tedious and error-prone.", {
    x: 1.0, y: 6.2, w: 10, h: 0.5,
    fontSize: 16, italic: true, color: C.accent, fontFace: FONT.body,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Slide 3: The Solution
// ═══════════════════════════════════════════════════════════════════════════════
{
  const slide = pres.addSlide();
  slide.background = { color: C.bg };
  addSideAccent(slide);
  addTitle(slide, "The Solution", "One config, one command, all agents");

  // Command highlight
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.6, y: 2.2, w: 4.5, h: 0.8,
    fill: { color: C.bgLight },
  });
  slide.addText("$ agent-sync", {
    x: 0.8, y: 2.3, w: 4, h: 0.6,
    fontSize: 28, bold: true, color: C.accent, fontFace: FONT.mono,
  });

  // Arrow
  slide.addText("→", {
    x: 5.3, y: 2.2, w: 0.8, h: 0.8,
    fontSize: 36, color: C.gray, align: "center", valign: "middle",
  });

  // Result
  slide.addText("6 CLIs synced simultaneously", {
    x: 6.2, y: 2.3, w: 6, h: 0.6,
    fontSize: 24, bold: true, color: C.grayLight, fontFace: FONT.title,
  });

  // Three pillars
  const pillars = [
    { title: "MCP Config", desc: "Single source of truth\n→ 6 different formats", color: "0D9488" },
    { title: "Skills", desc: "Symlinked folders\nacross all agents", color: "6366F1" },
    { title: "AGENTS.md", desc: "Unified instructions\nfor every CLI", color: "F59E0B" },
  ];

  const cardW = 3.8;
  const cardStartX = 0.6;
  const cardY = 3.8;

  pillars.forEach((p, i) => {
    const x = cardStartX + i * (cardW + 0.3);
    addCard(slide, { x, y: cardY, w: cardW, h: 2.2, title: p.title, body: p.desc, accentColor: p.color });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Slide 4: MCP Sync
// ═══════════════════════════════════════════════════════════════════════════════
{
  const slide = pres.addSlide();
  slide.background = { color: C.bg };
  addSideAccent(slide);
  addTitle(slide, "MCP Config Sync", "One source → six targets");

  // Source
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.6, y: 2.2, w: 3.5, h: 1.2,
    fill: { color: C.bgLight },
    shadow: { type: "outer", blur: 6, offset: 2, angle: 135, color: "000000", opacity: 0.25 },
  });
  slide.addText("~/.agent-sync/mcp.json", {
    x: 0.8, y: 2.4, w: 3.2, h: 0.5,
    fontSize: 14, bold: true, color: C.accent, fontFace: FONT.mono,
  });
  slide.addText("Source of Truth", {
    x: 0.8, y: 2.9, w: 3.2, h: 0.4,
    fontSize: 12, color: C.gray, fontFace: FONT.body,
  });

  // Arrow
  slide.addText("→", {
    x: 4.2, y: 2.4, w: 1, h: 1,
    fontSize: 48, color: C.accent, align: "center", valign: "middle",
  });

  // Targets table
  const targets = [
    { agent: "Claude Code", path: "~/.mcp.json", format: "JSON" },
    { agent: "Codex", path: "~/.codex/config.toml", format: "TOML" },
    { agent: "Gemini CLI", path: "~/.gemini/settings.json", format: "JSON" },
    { agent: "OpenCode", path: "~/.config/opencode/opencode.json", format: "JSON" },
    { agent: "Copilot", path: "~/.copilot/mcp-config.json", format: "JSON" },
    { agent: "Antigravity", path: "~/.gemini/antigravity/...", format: "JSON" },
  ];

  // Table header
  const tableX = 5.3;
  const tableY = 2.0;
  const colW = [2.0, 4.5, 1.2];
  const rowH = 0.55;

  slide.addShape(pres.shapes.RECTANGLE, {
    x: tableX, y: tableY, w: colW[0] + colW[1] + colW[2], h: rowH,
    fill: { color: C.accentDim },
  });
  slide.addText("Agent", { x: tableX, y: tableY, w: colW[0], h: rowH, fontSize: 12, bold: true, color: C.accent, align: "center", valign: "middle" });
  slide.addText("Path", { x: tableX + colW[0], y: tableY, w: colW[1], h: rowH, fontSize: 12, bold: true, color: C.accent, align: "center", valign: "middle" });
  slide.addText("Format", { x: tableX + colW[0] + colW[1], y: tableY, w: colW[2], h: rowH, fontSize: 12, bold: true, color: C.accent, align: "center", valign: "middle" });

  // Table rows
  targets.forEach((t, i) => {
    const y = tableY + rowH + i * rowH;
    const bgColor = i % 2 === 0 ? C.bgLight : C.bg;

    slide.addShape(pres.shapes.RECTANGLE, {
      x: tableX, y, w: colW[0] + colW[1] + colW[2], h: rowH,
      fill: { color: bgColor },
    });
    slide.addText(t.agent, { x: tableX, y, w: colW[0], h: rowH, fontSize: 11, color: C.grayLight, fontFace: FONT.body, align: "center", valign: "middle" });
    slide.addText(t.path, { x: tableX + colW[0], y, w: colW[1], h: rowH, fontSize: 10, color: C.gray, fontFace: FONT.mono, align: "center", valign: "middle" });
    slide.addText(t.format, { x: tableX + colW[0] + colW[1], y, w: colW[2], h: rowH, fontSize: 10, color: C.gray, fontFace: FONT.body, align: "center", valign: "middle" });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Slide 5: Skills Sync
// ═══════════════════════════════════════════════════════════════════════════════
{
  const slide = pres.addSlide();
  slide.background = { color: C.bg };
  addSideAccent(slide);
  addTitle(slide, "Skills Sync", "Shared skill folders via symlinks");

  // Diagram
  const diagramY = 2.4;

  // Source folder
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 1.0, y: diagramY, w: 3.0, h: 1.8,
    fill: { color: C.bgLight },
    shadow: { type: "outer", blur: 6, offset: 2, angle: 135, color: "000000", opacity: 0.25 },
  });
  slide.addText(".agent/skills/", {
    x: 1.1, y: diagramY + 0.15, w: 2.8, h: 0.4,
    fontSize: 14, bold: true, color: C.accent, fontFace: FONT.mono,
  });
  slide.addText("(source)", {
    x: 1.1, y: diagramY + 0.5, w: 2.8, h: 0.3,
    fontSize: 11, color: C.gray, fontFace: FONT.body,
  });
  slide.addText("├── commit/\n├── review-pr/\n└── search/", {
    x: 1.2, y: diagramY + 0.9, w: 2.6, h: 0.8,
    fontSize: 11, color: C.gray, fontFace: FONT.mono,
  });

  // Arrows
  slide.addText("→", {
    x: 4.1, y: diagramY + 0.3, w: 0.6, h: 0.5,
    fontSize: 28, color: C.accent, align: "center",
  });
  slide.addText("→", {
    x: 4.1, y: diagramY + 1.0, w: 0.6, h: 0.5,
    fontSize: 28, color: C.accent, align: "center",
  });

  // Symlinks
  const links = [
    ".agents/skills/",
    ".claude/skills/",
  ];

  links.forEach((link, i) => {
    const y = diagramY + 0.2 + i * 0.7;
    slide.addShape(pres.shapes.RECTANGLE, {
      x: 4.8, y, w: 2.8, h: 0.5,
      fill: { color: C.accentDim },
    });
    slide.addText(link, {
      x: 4.9, y, w: 2.6, h: 0.5,
      fontSize: 12, color: C.grayLight, fontFace: FONT.mono, valign: "middle",
    });
  });

  // Benefit text
  slide.addText("All agents share the same skill definitions.", {
    x: 1.0, y: 4.6, w: 10, h: 0.5,
    fontSize: 16, color: C.gray, fontFace: FONT.body,
  });
  slide.addText("Update once → works everywhere.", {
    x: 1.0, y: 5.1, w: 10, h: 0.5,
    fontSize: 18, bold: true, color: C.accent, fontFace: FONT.body,
  });

  // Right side: What's in a skill
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 8.0, y: 2.4, w: 4.8, h: 3.5,
    fill: { color: C.bgLight },
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 8.0, y: 2.4, w: 0.06, h: 3.5, fill: { color: "6366F1" },
  });
  slide.addText("What's in a Skill?", {
    x: 8.2, y: 2.55, w: 4.4, h: 0.5,
    fontSize: 16, bold: true, color: C.grayLight, fontFace: FONT.title, margin: 0,
  });
  slide.addText([
    { text: "skills/{name}/", options: { bold: true, breakLine: true } },
    { text: "├── SKILL.md    ", options: { breakLine: true } },
    { text: "│   (instructions)", options: { color: C.gray, breakLine: true } },
    { text: "├── scripts/    ", options: { breakLine: true } },
    { text: "│   (automation)", options: { color: C.gray, breakLine: true } },
    { text: "└── reference/  ", options: { breakLine: true } },
    { text: "    (docs, examples)", options: { color: C.gray } },
  ], {
    x: 8.3, y: 3.2, w: 4.3, h: 2.5,
    fontSize: 12, color: C.gray, fontFace: FONT.mono,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Slide 6: AGENTS.md Sync
// ═══════════════════════════════════════════════════════════════════════════════
{
  const slide = pres.addSlide();
  slide.background = { color: C.bg };
  addSideAccent(slide);
  addTitle(slide, "AGENTS.md Sync", "One prompt → four targets");

  // Detection
  slide.addText("Auto-detects prompt files:", {
    x: 1.0, y: 2.2, w: 5, h: 0.5,
    fontSize: 14, color: C.gray, fontFace: FONT.body,
  });

  const sources = ["AGENTS.md", "CLAUDE.md", "COPILOT.md", "CODEX.md", ".agents/rules/*.md"];
  const sourceY = 2.7;

  sources.forEach((s, i) => {
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 1.0 + i * 2.1, y: sourceY, w: 2.0, h: 0.4,
      fill: { color: C.accentDim }, rectRadius: 0.05,
    });
    slide.addText(s, {
      x: 1.0 + i * 2.1, y: sourceY, w: 2.0, h: 0.4,
      fontSize: 10, color: C.accent, fontFace: FONT.mono, align: "center", valign: "middle",
    });
  });

  // Arrow
  slide.addText("↓", {
    x: 5.5, y: 3.3, w: 1, h: 0.6,
    fontSize: 32, color: C.accent, align: "center",
  });

  // Outputs
  const outputs = [
    { target: "AGENTS.md", agent: "Codex / OpenCode", path: "project root" },
    { target: "CLAUDE.md", agent: "Claude Code", path: "project root" },
    { target: "copilot-instructions.md", agent: "Copilot", path: ".github/" },
    { target: "agent-sync.md", agent: "Antigravity", path: ".agents/rules/" },
  ];

  const cardStartY = 3.8;
  const cardH = 0.75;

  outputs.forEach((o, i) => {
    const y = cardStartY + i * (cardH + 0.12);

    slide.addShape(pres.shapes.RECTANGLE, {
      x: 1.0, y, w: 11, h: cardH,
      fill: { color: C.bgLight },
    });
    slide.addShape(pres.shapes.RECTANGLE, {
      x: 1.0, y, w: 0.05, h: cardH, fill: { color: C.accent },
    });

    slide.addText(o.target, {
      x: 1.2, y: y + 0.15, w: 3.5, h: 0.5,
      fontSize: 13, bold: true, color: C.grayLight, fontFace: FONT.mono, margin: 0,
    });
    slide.addText(o.agent, {
      x: 4.8, y: y + 0.15, w: 3.0, h: 0.5,
      fontSize: 12, color: C.accent, fontFace: FONT.body, margin: 0,
    });
    slide.addText(o.path, {
      x: 8.0, y: y + 0.15, w: 3.5, h: 0.5,
      fontSize: 11, color: C.gray, fontFace: FONT.mono, margin: 0,
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Slide 7: Usage
// ═══════════════════════════════════════════════════════════════════════════════
{
  const slide = pres.addSlide();
  slide.background = { color: C.bg };
  addSideAccent(slide);
  addTitle(slide, "Getting Started", "Install and use in seconds");

  // Install
  slide.addText("Install", {
    x: 1.0, y: 2.2, w: 2, h: 0.5,
    fontSize: 16, bold: true, color: C.grayLight, fontFace: FONT.title,
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 1.0, y: 2.7, w: 5.5, h: 0.7,
    fill: { color: C.bgLight },
  });
  slide.addText("npm install -g @bitkyc08/agent-sync", {
    x: 1.2, y: 2.8, w: 5.2, h: 0.5,
    fontSize: 14, color: C.accent, fontFace: FONT.mono,
  });

  // Commands
  slide.addText("Commands", {
    x: 1.0, y: 3.8, w: 2, h: 0.5,
    fontSize: 16, bold: true, color: C.grayLight, fontFace: FONT.title,
  });

  const commands = [
    { cmd: "agent-sync", desc: "Interactive wizard (all steps)" },
    { cmd: "agent-sync mcp", desc: "MCP config sync (global → 6 CLIs)" },
    { cmd: "agent-sync skills", desc: "Skills symlink sync (project)" },
    { cmd: "agent-sync agents", desc: "AGENTS.md generation (project)" },
    { cmd: "agent-sync all", desc: "Run all with detected defaults" },
  ];

  const cmdY = 4.3;

  commands.forEach((c, i) => {
    const y = cmdY + i * 0.65;

    slide.addShape(pres.shapes.RECTANGLE, {
      x: 1.0, y, w: 3.2, h: 0.55,
      fill: { color: C.bgLight },
    });
    slide.addText(c.cmd, {
      x: 1.1, y: y + 0.08, w: 3.0, h: 0.4,
      fontSize: 12, color: C.accent, fontFace: FONT.mono, valign: "middle",
    });
    slide.addText(c.desc, {
      x: 4.4, y: y + 0.08, w: 5.5, h: 0.4,
      fontSize: 12, color: C.gray, fontFace: FONT.body, valign: "middle",
    });
  });

  // Right side: config location
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 8.5, y: 2.2, w: 4.3, h: 2.8,
    fill: { color: C.bgLight },
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 8.5, y: 2.2, w: 0.06, h: 2.8, fill: { color: "F59E0B" },
  });
  slide.addText("Config Location", {
    x: 8.7, y: 2.4, w: 4.0, h: 0.5,
    fontSize: 14, bold: true, color: C.grayLight, fontFace: FONT.title, margin: 0,
  });
  slide.addText([
    { text: "~/.agent-sync/", options: { bold: true, breakLine: true } },
    { text: "├── mcp.json", options: { breakLine: true } },
    { text: "│   (unified MCP)", options: { color: C.gray, breakLine: true } },
    { text: "└── backups/", options: { breakLine: true } },
    { text: "    (auto-backups)", options: { color: C.gray } },
  ], {
    x: 8.8, y: 3.0, w: 3.8, h: 1.8,
    fontSize: 12, color: C.gray, fontFace: FONT.mono,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Slide 8: Summary
// ═══════════════════════════════════════════════════════════════════════════════
{
  const slide = pres.addSlide();
  slide.background = { color: C.bg };

  // Top accent bar
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: "100%", h: 0.15, fill: { color: C.accent },
  });

  // Title
  slide.addText("One Command. All Agents.", {
    x: 0.6, y: 2.0, w: 12, h: 1.0,
    fontSize: 48, bold: true, color: C.grayLight, fontFace: FONT.title, align: "center",
  });

  // Stats row
  const stats = [
    { num: "6", label: "AI CLIs supported" },
    { num: "3", label: "Sync modes" },
    { num: "1", label: "Command to rule them all" },
  ];

  const statW = 3.5;
  const statStartX = (13.33 - stats.length * statW - (stats.length - 1) * 0.5) / 2;
  const statY = 3.8;

  stats.forEach((s, i) => {
    const x = statStartX + i * (statW + 0.5);

    slide.addText(s.num, {
      x, y: statY, w: statW, h: 1.2,
      fontSize: 72, bold: true, color: C.accent, fontFace: FONT.title, align: "center",
    });
    slide.addText(s.label, {
      x, y: statY + 1.2, w: statW, h: 0.5,
      fontSize: 16, color: C.gray, fontFace: FONT.body, align: "center",
    });
  });

  // Install CTA
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 4.0, y: 5.8, w: 5.3, h: 0.8,
    fill: { color: C.accent }, rectRadius: 0.1,
  });
  slide.addText("npm i -g @bitkyc08/agent-sync", {
    x: 4.0, y: 5.8, w: 5.3, h: 0.8,
    fontSize: 18, bold: true, color: C.bg, fontFace: FONT.mono, align: "center", valign: "middle",
  });

  // Footer
  slide.addText("MIT License • github.com/bitkyc08/agent-sync", {
    x: 0.6, y: 6.8, w: 12, h: 0.4,
    fontSize: 12, color: C.gray, fontFace: FONT.body, align: "center",
  });
}

// ─── Write File ──────────────────────────────────────────────────────────────
const outputPath = join(__dirname, "agent-sync.pptx");
pres.writeFile({ fileName: outputPath })
  .then(() => console.log(`✅ Created: ${outputPath}`))
  .catch(err => console.error("❌ Error:", err));

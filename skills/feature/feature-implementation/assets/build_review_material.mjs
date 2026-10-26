#!/usr/bin/env node
// build_review_material.mjs — 生成阶段审查材料（让审查"看材料"而不是"自己找"）
// 用法:
//   node build_review_material.mjs --feature "系统参数重构" --stage 1 --base 51581ec62 [--root <仓库根>] [--out <路径>]
// 产物: specs/features/<功能名>/reports/<阶段N>_审查材料.md
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const BT = String.fromCharCode(96);
const FENCE = BT + BT + BT;
const TICK_RE = new RegExp(BT + '([^' + BT + ']+)' + BT, 'g');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) out[key] = true;
      else { out[key] = next; i++; }
    }
  }
  return out;
}
const args = parseArgs(process.argv.slice(2));
if (!args.feature || !args.stage || !args.base) {
  console.error('用法: node build_review_material.mjs --feature "<功能名>" --stage <N|CR-编号> --base <阶段起点 commit> [--root <仓库根>] [--out <路径>]');
  process.exit(2);
}
const root = path.resolve(typeof args.root === 'string' ? args.root : process.cwd());
const stage = String(args.stage);
const label = /^\d+$/.test(stage) ? '阶段' + stage : stage;
const reportsDir = path.join(root, 'specs', 'features', args.feature, 'reports');
const packPath = path.join(reportsDir, label + '_上下文包.md');
const evidDir = path.join(reportsDir, label + '_证据');
const base = String(args.base);

function norm(p) {
  return String(p).replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '').trim();
}

const pack = fs.existsSync(packPath) ? fs.readFileSync(packPath, 'utf8') : '';
const cards = [];
let cur = null;
for (const line of pack.split(/\r?\n/)) {
  const h = line.match(/^###\s*9\.\d+\s+(Task-\d+)[：:]\s*(.*)$/);
  if (h) { cur = { id: h[1], title: h[2].trim(), decls: [] }; cards.push(cur); continue; }
  if (cur && /^##\s/.test(line)) { cur = null; continue; }
  if (!cur) continue;
  const f = line.match(/^-\s*\*\*涉及文件\*\*[：:]\s*(.*)$/);
  if (!f) continue;
  let m;
  TICK_RE.lastIndex = 0;
  while ((m = TICK_RE.exec(f[1])) !== null) {
    const v = m[1].trim();
    if (v.includes('/') || v.includes('.')) cur.decls.push(v);
  }
}

function matchDeclared(file, decl) {
  const f = norm(file);
  let d = norm(decl);
  if (!d) return false;
  if (d.indexOf('...') >= 0 || d.indexOf('…') >= 0) {
    const tail = norm(d.split(/\.{3}|…/).pop());
    if (!tail) return false;
    return f === tail || f.endsWith('/' + tail) || f.includes('/' + tail);
  }
  if (d.endsWith('/')) d = d.slice(0, -1);
  if (f === d || f.startsWith(d + '/')) return true;
  if (!d.includes('/')) return path.posix.basename(f) === path.posix.basename(d);
  // 任务卡里的路径可能省略了仓库前缀（如 logistics-backend/），退化为后缀匹配
  if (f.endsWith('/' + d) || f.includes('/' + d + '/')) return true;
  const segs = d.split('/');
  if (segs.length === 1) return path.posix.basename(f) === segs[0];
  return false;
}

function gitCall(argsArr) {
  try {
    return execFileSync('git', ['-C', root, '-c', 'core.quotepath=false'].concat(argsArr), { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    return null;
  }
}

const statOut = gitCall(['diff', '--stat=200', base]);
const nameStatusOut = gitCall(['diff', '--name-only', base]);
const statusOut = gitCall(['status', '--porcelain']);
const changed = new Set();
if (nameStatusOut) {
  for (const line of nameStatusOut.split(/\r?\n/)) {
    const f = norm(line);
    if (f) changed.add(f);
  }
}
if (statusOut) {
  for (const line of statusOut.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let p = line.slice(3).trim();
    if (p.includes(' -> ')) p = p.split(' -> ').pop().trim();
    p = p.replace(/^"|"$/g, '');
    if (p) changed.add(norm(p));
  }
}

const mapping = new Map();
for (const c of cards) mapping.set(c.id, []);
const outOfScope = [];
const docs = [];
for (const file of [...changed].sort()) {
  if (file.startsWith('specs/')) { docs.push(file); continue; }
  const hits = cards.filter((c) => c.decls.some((d) => matchDeclared(file, d))).map((c) => c.id);
  if (!hits.length) outOfScope.push(file);
  else for (const h of hits) mapping.get(h).push(file);
}

const evidence = [];
if (fs.existsSync(evidDir)) {
  for (const d of fs.readdirSync(evidDir, { withFileTypes: true })) {
    if (!d.isDirectory() || !/^Task-\d+$/.test(d.name)) continue;
    const dir = path.join(evidDir, d.name);
    const files = [];
    for (const f of fs.readdirSync(dir)) {
      const st = fs.statSync(path.join(dir, f));
      files.push({ name: f, size: st.size });
    }
    let markers = '';
    const rec = files.find((f) => /\.md$/i.test(f.name));
    if (rec) {
      const txt = fs.readFileSync(path.join(dir, rec.name), 'utf8');
      markers = ['RED', 'GREEN', 'Tests run', 'BUILD', '查询', '结论'].filter((k) => txt.includes(k)).join(' / ');
    }
    evidence.push({ task: d.name, files, markers });
  }
}

let fullLogTail = [];
let fullLogName = null;
if (fs.existsSync(evidDir)) {
  const cand = fs.readdirSync(evidDir, { withFileTypes: true })
    .filter((d) => d.isFile() && /全量.*\.log$/i.test(d.name))
    .map((d) => d.name);
  if (cand.length) {
    fullLogName = cand[0];
    const lines = fs.readFileSync(path.join(evidDir, fullLogName), 'utf8').split(/\r?\n/);
    fullLogTail = lines.slice(Math.max(0, lines.length - 31));
  }
}

const L = [];
L.push('# ' + args.feature + ' — ' + label + ' 审查材料');
L.push('');
L.push('> 由 build_review_material.mjs 生成（' + new Date().toISOString().replace('T', ' ').slice(0, 19) + '）。审查以此为主索引，只对「超界文件」与「证据异常任务」打开 diff/证据。');
L.push('');
L.push('## 0. 元信息');
L.push('');
L.push('| 项 | 值 |');
L.push('|---|---|');
L.push('| 阶段起点 commit | ' + base + ' |');
L.push('| 任务数 | ' + cards.length + ' |');
L.push('| 改动文件数 | ' + changed.size + ' |');
L.push('| 声明外文件数 | ' + outOfScope.length + ' |');
L.push('| 文档/证据改动数 | ' + docs.length + ' |');
L.push('| 阶段末全量日志 | ' + (fullLogName || '未找到') + ' |');
L.push('');

L.push('## 1. 文件 → 任务映射');
L.push('');
for (const c of cards) {
  const files = mapping.get(c.id);
  L.push('### ' + c.id + ' ' + c.title);
  L.push('');
  if (!files.length) L.push('- （无改动命中该任务声明文件）');
  else for (const f of files) L.push('- ' + f);
  L.push('');
}
L.push('### 声明外改动（先核对：是否在执行回执「变更文件」清单里；没有=越界嫌疑）');
L.push('');
if (!outOfScope.length) L.push('- 无');
else for (const f of outOfScope) L.push('- ' + f);
L.push('');
L.push('### 文档 / 证据改动（specs/ 下，按流程应有）');
L.push('');
if (!docs.length) L.push('- 无');
else for (const f of docs) L.push('- ' + f);
L.push('');

L.push('## 2. 证据清单');
L.push('');
for (const e of evidence) {
  L.push('### ' + e.task);
  L.push('');
  L.push('- 标记: ' + (e.markers || '（未识别到 RED/GREEN/汇总行）'));
  for (const f of e.files) L.push('- ' + f.name + ' (' + f.size + ' B)');
  L.push('');
}

L.push('## 3. 阶段末全量日志（尾部 30 行）');
L.push('');
if (!fullLogTail.length) L.push('（未找到全量日志，按「全量只跑一次」校验会 FAIL）');
else {
  L.push(FENCE + 'text');
  for (const l of fullLogTail) L.push(l);
  L.push(FENCE);
}
L.push('');

L.push('## 4. diff --stat');
L.push('');
L.push(FENCE + 'text');
if (statOut) for (const l of statOut.split(/\r?\n/)) L.push(l);
else L.push('（git 不可用或 base 无效）');
L.push(FENCE);
L.push('');

const outPath = typeof args.out === 'string' ? path.resolve(args.out) : path.join(reportsDir, label + '_审查材料.md');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, L.join('\n'), 'utf8');

console.log('审查材料已生成: ' + outPath);
console.log('任务 ' + cards.length + ' 个 / 改动 ' + changed.size + ' 个文件 / 声明外 ' + outOfScope.length + ' 个 / 全量日志 ' + (fullLogName || '缺失'));
if (outOfScope.length) console.log('声明外文件: ' + outOfScope.slice(0, 10).join(', ') + (outOfScope.length > 10 ? ' …' : ''));

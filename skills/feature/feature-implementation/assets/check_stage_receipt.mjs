#!/usr/bin/env node
// check_stage_receipt.mjs — 阶段回执/证据包机械校验（0 模型回合）
// 用法:
//   node check_stage_receipt.mjs --feature "系统参数重构" --stage 1 [--tasks Task-01,Task-02] [--root <仓库根>] [--json]
//   node check_stage_receipt.mjs --feature "系统参数重构" --stage 1 --clean [--force]   # 清理原始日志/截图，保留 *.md
// 退出码: 0=全部通过; 1=有 FAIL; 2=参数错误
import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) out[key] = true;
      else { out[key] = next; i++; }
    } else out._.push(a);
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
if (!args.feature || !args.stage) {
  console.error('用法: node check_stage_receipt.mjs --feature "<功能名>" --stage <N|CR-编号> [--tasks Task-01,Task-02] [--root <仓库根>] [--clean [--force]] [--json]');
  process.exit(2);
}

const root = path.resolve(typeof args.root === 'string' ? args.root : process.cwd());
const stage = String(args.stage);
const label = /^\d+$/.test(stage) ? '阶段' + stage : stage;
const reportsDir = path.join(root, 'specs', 'features', args.feature, 'reports');
const packPath = path.join(reportsDir, label + '_上下文包.md');
const evidDir = path.join(reportsDir, label + '_证据');
const pack = fs.existsSync(packPath) ? fs.readFileSync(packPath, 'utf8') : '';
const packLines = pack.split(/\r?\n/);
const summaryLines = packLines.filter((l) => /^-\s*(?:\d{4}-\d{2}-\d{2}\s+)?(Task-\d+)/.test(l.trim()));

let tasks = [];
if (args.tasks && typeof args.tasks === 'string') tasks = args.tasks.split(',').map((s) => s.trim()).filter(Boolean);
if (!tasks.length && fs.existsSync(evidDir)) {
  tasks = fs.readdirSync(evidDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^Task-\d+$/.test(d.name))
    .map((d) => d.name)
    .sort();
}
if (!tasks.length) {
  const ids = new Set();
  for (const l of packLines) {
    const m = l.match(/^###\s*9\.\d+\s+(Task-\d+)/) || l.match(/^-\s*(Task-\d+)/);
    if (m) ids.add(m[1]);
  }
  tasks = [...ids].sort();
}

const results = [];
for (const task of tasks) {
  const res = { task, fails: [], warns: [], notes: [] };
  const dir = path.join(evidDir, task);
  if (!fs.existsSync(dir)) {
    res.fails.push('证据目录不存在: ' + path.relative(root, dir));
  } else {
    const files = fs.readdirSync(dir).filter((f) => f.startsWith(task + '_'));
    const mds = files.filter((f) => /\.md$/i.test(f));
    if (!mds.length) {
      res.fails.push('缺少验收记录（' + task + '_*.md）');
    } else {
      const recName = mds.find((f) => f.indexOf('验收记录') >= 0) || mds[0];
      const rec = fs.readFileSync(path.join(dir, recName), 'utf8');
      res.notes.push('记录: ' + recName + ' (' + rec.length + ' 字符)');
      const hasCmd = /命令[:：]|mvn |npm |pnpn |node |gradle|psql|SELECT |curl |\.\/|java -jar/.test(rec);
      const hasResult = /Tests run|BUILD SUCCESS|BUILD FAILURE|通过|失败|PASS|FAIL|查询结果|结论/.test(rec);
      if (!hasCmd) res.fails.push('验收记录缺命令原文（原始日志会被清理，必须自包含）');
      if (!hasResult) res.fails.push('验收记录缺结果/汇总行');
      if (/见日志|见截图/.test(rec) && !hasCmd) res.fails.push('验收记录只是引用已删文件');
      if (rec.length < 200) res.warns.push('验收记录过短（<200 字符），疑似不自包含');
      if (/RED/.test(rec) && !/GREEN/.test(rec)) res.warns.push('记录里有 RED 但没看到 GREEN');
    }
  }
  const sum = summaryLines.find((l) => new RegExp('(^|[^A-Za-z0-9-])' + task + '([^0-9]|$)').test(l));
  if (!sum) {
    res.warns.push('上下文包 §10 缺该任务摘要行');
  } else {
    const m = sum.match(/自检[:：]\s*(\d+)\s*\/\s*(\d+)/);
    if (m) {
      res.notes.push('§10 自检 ' + m[1] + '/' + m[2]);
      if (m[1] !== m[2]) res.fails.push('自检未全过: ' + m[1] + '/' + m[2]);
    } else {
      res.warns.push('§10 摘要缺「自检 N/N」');
    }
  }
  results.push(res);
}

let fullLog = null;
if (fs.existsSync(evidDir)) {
  const cands = fs.readdirSync(evidDir, { withFileTypes: true })
    .filter((d) => d.isFile() && /全量.*\.log$/i.test(d.name))
    .map((d) => d.name);
  if (cands.length) fullLog = cands[0];
  else results.length && results[results.length - 1].warns.push('证据根目录未找到阶段末全量日志（建议 ' + label + '_全量测试.log）');
}

const hardFails = results.filter((r) => r.fails.length);
const softWarns = results.filter((r) => r.warns.length);
const pass = hardFails.length === 0;

if (args.json) {
  console.log(JSON.stringify({ pass, tasks: results, fullLog, pack: pack ? path.relative(root, packPath) : null }, null, 2));
} else {
  console.log('阶段回执校验 — ' + args.feature + ' / ' + label);
  console.log('上下文包: ' + (pack ? path.relative(root, packPath) : '未找到（' + path.relative(root, packPath) + '）'));
  console.log('证据目录: ' + (fs.existsSync(evidDir) ? path.relative(root, evidDir) : '未找到'));
  console.log('阶段末全量日志: ' + (fullLog || '未找到'));
  console.log('');
  console.log('任务'.padEnd(10) + '结果'.padEnd(6) + '自检'.padEnd(8) + '说明');
  for (const r of results) {
    const chk = r.notes.find((n) => n.startsWith('§10 自检'));
    const verdict = r.fails.length ? 'FAIL' : r.warns.length ? 'WARN' : 'PASS';
    const detail = r.fails.concat(r.warns).join('；') || r.notes.join('；');
    console.log(r.task.padEnd(10) + verdict.padEnd(6) + (chk ? chk.replace('§10 自检 ', '') : '-').padEnd(8) + detail);
  }
  console.log('');
  if (pass) console.log('结论: PASS —— ' + results.length + ' 个任务证据齐全' + (softWarns.length ? '（' + softWarns.length + ' 条 WARN 建议补齐）' : ''));
  else console.log('结论: FAIL —— ' + hardFails.length + ' 个任务有问题，先补齐再验收');
}

if (args.clean) {
  if (!pass && !args.force) {
    console.error('存在 FAIL，拒绝清理（确认要清可加 --force）');
    process.exit(1);
  }
  let removed = 0;
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(log|png|jpg|jpeg|webp)$/i.test(e.name)) { fs.unlinkSync(p); removed++; }
    }
  };
  if (fs.existsSync(evidDir)) walk(evidDir);
  console.log('已清理 ' + removed + ' 个原始证据文件（只保留 *.md 验收记录）');
}

process.exit(pass ? 0 : 1);

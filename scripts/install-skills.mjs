#!/usr/bin/env node
/**
 * 把技能包里的 14 个 skill 平铺安装到目标 skills 目录。
 *
 * 用法：
 *   node scripts/install-skills.mjs                       # 默认装到 ~/.agents/skills
 *   node scripts/install-skills.mjs -t ~/.claude/skills    # 指定目标（可重复）
 *   node scripts/install-skills.mjs --dry-run              # 只看会做什么
 *   node scripts/install-skills.mjs --force                # 覆盖内容有差异的 skill（先备份）
 *
 * 行为：
 *   - 只装 manifest 里声明的 skill，平铺为 <target>/<name>/，不带 project/ feature/ universal/ 层目录
 *   - 目标目录里其它来源的 skill 只列出、绝不删除
 *   - 已存在且内容一致 → 跳过；内容有差异 → 默认拒绝，除非 --force（此时先备份到同级 _skills_backup_<时间戳>）
 *   - 每次复制后按文件哈希回验，不一致即报错
 * 退出码：0 成功；1 有阻塞或校验失败；2 参数错误
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = join(ROOT, 'skills', 'manifest.json');

function usage(code = 0) {
  const text = `用法: node scripts/install-skills.mjs [-t <skills 目录>]... [-n] [-f]

  -t, --target <dir>   目标 skills 目录，可重复；默认 ~/.agents/skills
  -n, --dry-run        只打印计划，不做任何改动
  -f, --force          覆盖内容有差异的 skill（覆盖前自动备份）
  -h, --help           显示本帮助`;
  (code === 0 ? console.log : console.error)(text);
  process.exit(code);
}

function expandTarget(p) {
  if (p === '~') return homedir();
  if (p.startsWith('~/') || p.startsWith('~\\')) return join(homedir(), p.slice(2));
  return resolve(p);
}

const opts = { targets: [], force: false, dryRun: false };
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 1) {
  const a = argv[i];
  if (a === '-h' || a === '--help') usage(0);
  else if (a === '-n' || a === '--dry-run') opts.dryRun = true;
  else if (a === '-f' || a === '--force') opts.force = true;
  else if (a === '-t' || a === '--target') {
    const v = argv[++i];
    if (!v) usage(2);
    opts.targets.push(v);
  } else if (a.startsWith('--target=')) opts.targets.push(a.slice('--target='.length));
  else {
    console.error(`未知参数: ${a}`);
    usage(2);
  }
}
if (!opts.targets.length) opts.targets.push('~/.agents/skills');

/** 相对路径 → 内容哈希 的映射，用来判断"内容一致"和复制后回验。 */
function hashTree(dir) {
  const map = new Map();
  const walk = (d) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) {
        const rel = relative(dir, full).split(sep).join('/');
        map.set(rel, createHash('sha1').update(readFileSync(full)).digest('hex'));
      }
    }
  };
  walk(dir);
  return map;
}

function sameTree(a, b) {
  const ha = hashTree(a);
  const hb = hashTree(b);
  if (ha.size !== hb.size) return false;
  for (const [k, v] of ha) if (hb.get(k) !== v) return false;
  return true;
}

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const skills = manifest.skills ?? [];
if (!skills.length) {
  console.error('manifest 里没有 skill');
  process.exit(1);
}

const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

let failed = false;

for (const rawTarget of opts.targets) {
  const target = expandTarget(rawTarget);
  const backupDir = join(dirname(target), `_skills_backup_${stamp}`);
  const plan = [];
  let backupUsed = false;

  for (const s of skills) {
    const src = join(ROOT, s.path);
    const dest = join(target, s.name);
    if (!existsSync(src)) {
      plan.push({ name: s.name, action: 'error', reason: `源目录不存在: ${s.path}` });
      failed = true;
      continue;
    }
    if (!existsSync(dest)) plan.push({ name: s.name, action: 'install' });
    else if (sameTree(src, dest)) plan.push({ name: s.name, action: 'unchanged' });
    else if (opts.force) plan.push({ name: s.name, action: 'update' });
    else plan.push({ name: s.name, action: 'blocked', reason: '内容与技能包不同' });
  }

  const blocked = plan.filter((p) => p.action === 'blocked' || p.action === 'error');
  if (blocked.length && !opts.dryRun) failed = true;

  console.log(`${opts.dryRun ? '[演练] ' : ''}目标: ${target}`);
  for (const p of plan) {
    const mark = { install: '新增', update: '更新', unchanged: '跳过', blocked: '拒绝', error: '错误' }[p.action];
    const note =
      p.action === 'unchanged' ? '（已是最新）' : p.reason ? `（${p.reason}）` : '';
    console.log(`  ${mark}  ${p.name}${note}`);
  }

  if (existsSync(target)) {
    const managed = new Set(skills.map((s) => s.name));
    const extras = readdirSync(target, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !managed.has(e.name))
      .map((e) => e.name)
      .sort();
    if (extras.length) {
      const shown = extras.slice(0, 10).join(', ');
      console.log(
        `  提示: 目标里另有 ${extras.length} 个本包不管理的目录（保持原样，不删除）: ${shown}${extras.length > 10 ? ' …' : ''}`,
      );
    }
  }

  if (opts.dryRun) {
    if (blocked.length) {
      console.log(`  提示: ${blocked.length} 个 skill 需要 --force 才能覆盖`);
      failed = true;
    }
    console.log('');
    continue;
  }

  if (blocked.length) {
    console.log(`  → 跳过写入；需要覆盖请加 --force（会先备份）\n`);
    continue;
  }

  mkdirSync(target, { recursive: true });

  for (const p of plan) {
    if (p.action !== 'install' && p.action !== 'update') continue;
    const src = join(ROOT, skills.find((s) => s.name === p.name).path);
    const dest = join(target, p.name);

    if (p.action === 'update') {
      mkdirSync(backupDir, { recursive: true });
      cpSync(dest, join(backupDir, p.name), { recursive: true });
      backupUsed = true;
      rmSync(dest, { recursive: true, force: true });
    }
    cpSync(src, dest, { recursive: true });

    if (!sameTree(src, dest)) {
      console.error(`  校验失败: ${p.name} 复制后内容与源不一致`);
      failed = true;
    }
  }

  const added = plan.filter((p) => p.action === 'install').length;
  const updated = plan.filter((p) => p.action === 'update').length;
  const skipped = plan.filter((p) => p.action === 'unchanged').length;

  if (backupUsed) console.log(`  备份: ${backupDir}`);
  console.log(`  → 共 ${skills.length} 个 skill：新增 ${added} / 更新 ${updated} / 跳过 ${skipped}\n`);
}

process.exit(failed ? 1 : 0);

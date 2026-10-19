#!/usr/bin/env node
/**
 * SpecForgeX 技能包自检。
 *
 * 用法：node scripts/check-skills.mjs
 * 退出码：0 = 全部通过；1 = 有 error。
 *
 * 校验项：
 *   1. 每个 skills/<layer>/<name>/SKILL.md 都有可解析的 front-matter，且 name 与目录名一致
 *   2. skills/manifest.json 覆盖全部 skill，path 真实存在，layer/kind 合法、name 不重名、同层 step 不重号
 *   3. SKILL.md 中引用的 assets/xxx 都存在；assets/ 里没有没人引用的死文件（警告）
 *   4. SKILL.md 里不残留 {{占位符}}（占位符只属于 assets 模板）
 *   5. SKILL.md 里不出现相对 skill 目录的 specs/ 或 docs/ 链接（路径基准见 CONSTITUTION 第四节）
 *   6. specs/ 下的两份机制文件与技能包里的分发副本逐字一致（比较前归一化行尾）
 *   7. 中英 README 章节结构一致、都覆盖全部 skill 名单，且声明的 skill 数量与 manifest 相符
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LAYERS = ['project', 'feature', 'universal'];

const errors = [];
const warnings = [];
const fail = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

const abs = (p) => join(ROOT, p);
const read = (p) => readFileSync(abs(p), 'utf8');
const has = (p) => existsSync(abs(p));

/**
 * 归一化后读取：去 BOM、CRLF/CR 统一为 LF。
 * 用于"逐字一致"这类按内容比较的场景——行尾差异不能让内容相同的两份文件判定为不一致。
 */
const readNormalized = (p) =>
  read(p)
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

function parseFrontMatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const out = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    out[kv[1]] = v;
  }
  return out;
}

/** 去掉代码块与行内代码——SKILL.md 里用反引号引述占位符是允许的，散文里残留才是问题。 */
function stripCode(text) {
  return text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
}

// ---------- 1. 收集 skill ----------
const found = [];
for (const layer of LAYERS) {
  const layerDir = abs(posix.join('skills', layer));
  if (!existsSync(layerDir)) {
    fail(`skills/${layer}/ 不存在（三层结构：project / feature / universal）`);
    continue;
  }
  for (const entry of readdirSync(layerDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const rel = posix.join('skills', layer, entry.name);
    if (!has(posix.join(rel, 'SKILL.md'))) {
      warn(`${rel}/ 没有 SKILL.md，已忽略`);
      continue;
    }
    found.push({ name: entry.name, layer, path: rel, dir: abs(rel) });
  }
}

// ---------- 2. manifest ----------
const manifestPath = 'skills/manifest.json';
let manifestCount = 0;
if (!has(manifestPath)) {
  fail(`缺少 ${manifestPath}`);
} else {
  let manifest = null;
  try {
    manifest = JSON.parse(read(manifestPath));
  } catch (e) {
    fail(`${manifestPath} 不是合法 JSON：${e.message}`);
  }
  if (manifest) {
    const KINDS = ['step', 'flow', 'gate', 'change', 'standalone'];
    const declared = manifest.skills ?? [];
    const listed = new Map(declared.map((s) => [s.path, s]));
    for (const s of found) {
      if (!listed.has(s.path)) fail(`manifest 缺少 ${s.path}`);
    }
    const seenNames = new Set();
    const seenSteps = new Map();
    for (const [p, s] of listed) {
      if (!has(posix.join(p, 'SKILL.md'))) {
        fail(`manifest 里的 ${p} 不存在（目录被移走或改名了？）`);
        continue;
      }
      if (s.name !== posix.basename(p)) {
        fail(`manifest: name "${s.name}" 与目录名 "${posix.basename(p)}" 不一致`);
      }
      if (!LAYERS.includes(s.layer)) {
        fail(`manifest: ${s.name} 的 layer="${s.layer}" 不在 ${LAYERS.join(' / ')} 里`);
      } else if (!p.startsWith(`skills/${s.layer}/`)) {
        fail(`manifest: ${s.name} 的 layer=${s.layer}，但路径不在 skills/${s.layer}/ 下`);
      }
      if (!KINDS.includes(s.kind)) {
        fail(`manifest: ${s.name} 的 kind="${s.kind}" 不在 ${KINDS.join(' / ')} 里`);
      }
      if (seenNames.has(s.name)) fail(`manifest: name "${s.name}" 重复`);
      seenNames.add(s.name);
      // step 只在同一 layer 内有意义：项目级 1..7、功能级 1..4，编号不可重号
      if (s.step != null) {
        const key = `${s.layer}#${s.step}`;
        if (seenSteps.has(key)) {
          fail(`manifest: ${s.layer} 层的 step=${s.step} 重复（${seenSteps.get(key)} 与 ${s.name}）`);
        } else {
          seenSteps.set(key, s.name);
        }
      }
    }
    manifestCount = declared.length;
  }
}

// ---------- 3~5. 逐个 skill ----------
for (const s of found) {
  const file = posix.join(s.path, 'SKILL.md');
  const text = read(file);
  const fm = parseFrontMatter(text);

  if (!fm) {
    fail(`${file}: 缺少或无法解析 front-matter（必须是 --- 包裹的 YAML）`);
    continue;
  }
  if (!fm.name) fail(`${file}: front-matter 缺 name`);
  else if (fm.name !== s.name) fail(`${file}: name "${fm.name}" 与目录名 "${s.name}" 不一致`);
  if (!fm.description) fail(`${file}: front-matter 缺 description`);
  else if (fm.description.length < 20) warn(`${file}: description 只有 ${fm.description.length} 字，可能无法被正确触发`);

  if (/\{\{|\}\}/.test(stripCode(text))) {
    fail(`${file}: 散文里残留 {{占位符}}——占位符只应出现在 assets/ 模板里，或写成反引号引述`);
  }
  if (/\]\((specs|docs)\//.test(text)) {
    fail(`${file}: 含相对 skill 目录的 ${text.match(/\]\((specs|docs)\//)[1]}/ 链接；改用反引号行内路径（路径基准见 CONSTITUTION 第四节）`);
  }

  const refs = [...text.matchAll(/assets\/([\p{L}\p{N}_.\-]+)/gu)].map((m) => m[1]);
  const assetDir = join(s.dir, 'assets');
  const onDisk = existsSync(assetDir)
    ? readdirSync(assetDir).filter((f) => !f.startsWith('.'))
    : [];
  for (const r of new Set(refs)) {
    if (!existsSync(join(assetDir, r))) fail(`${file}: 引用了不存在的 assets/${r}`);
  }
  for (const f of onDisk) {
    if (!refs.includes(f)) warn(`${s.path}/assets/${f} 未被 SKILL.md 引用（可能是死文件）`);
  }
}

// ---------- 6. 机制文件同步 ----------
const PAIRS = [
  ['specs/CONSTITUTION.md', 'skills/project/project-requirements-clarification/assets/constitution-template.md'],
  ['specs/TOOLCHAIN.md', 'skills/project/project-requirements-clarification/assets/toolchain-template.md'],
];
for (const [a, b] of PAIRS) {
  if (!has(a) || !has(b)) {
    fail(`机制文件缺失：${a} 或 ${b}`);
    continue;
  }
  if (readNormalized(a) !== readNormalized(b)) {
    fail(`${a} 与 ${b} 内容不一致——两份必须逐字相同，改一处就要同步另一处`);
  }
}

// ---------- 7. 中英 README 结构一致 + 名单覆盖 ----------
const README_ZH = 'README.md';
const README_EN = 'README.en.md';
if (has(README_ZH) && has(README_EN)) {
  const levels = (p) =>
    read(p)
      .split(/\r?\n/)
      .filter((line) => /^#{2,3} /.test(line))
      .map((line) => line.match(/^#+/)[0]);
  const zh = levels(README_ZH);
  const en = levels(README_EN);
  if (zh.length !== en.length) {
    fail(
      `${README_ZH} 有 ${zh.length} 个章节标题，${README_EN} 有 ${en.length} 个——两份结构必须一一对应（改了中文记得同步英文）`,
    );
  } else if (zh.join(' ') !== en.join(' ')) {
    fail(`${README_ZH} 与 ${README_EN} 的标题层级顺序不一致`);
  }

  // 两个 README 都必须点到每一个 skill 的名字——新增 skill 只改 manifest 会在这里被抓住
  for (const p of [README_ZH, README_EN]) {
    const body = read(p);
    for (const s of found) {
      if (!body.includes(s.name)) fail(`${p}: 没有提到 ${s.name}（新增 skill 要同步到两份 README）`);
    }
  }

  // 标题里声明的 skill 数量必须与 manifest 对得上
  const counts = [
    [README_ZH, /全览[^（(]*[（(](\d+)\s*个/],
    [README_EN, /overview\s*\((\d+)\s*skills/i],
  ];
  for (const [p, re] of counts) {
    const m = read(p).match(re);
    if (!m) {
      warn(`${p}: 没找到"skill 总数"的声明，无法校验数量是否与 manifest 一致`);
    } else if (manifestCount && Number(m[1]) !== manifestCount) {
      fail(`${p}: 声明有 ${m[1]} 个 skill，manifest 里有 ${manifestCount} 个——改数量时三处要同步`);
    }
  }
} else if (has(README_ZH) && !has(README_EN)) {
  warn('没有 README.en.md，中文版的结构未被英文版对应');
}

// ---------- 输出 ----------
const assetCount = found.reduce((n, s) => {
  const d = join(s.dir, 'assets');
  return n + (existsSync(d) ? readdirSync(d).length : 0);
}, 0);

console.log(`发现 ${found.length} 个 skill（${LAYERS.join(' / ')}），${assetCount} 个 assets 文件`);
for (const w of warnings) console.log(`  warn  ${w}`);
for (const e of errors) console.log(`  ERROR ${e}`);
console.log(errors.length === 0 ? `\n通过：0 error，${warnings.length} warning` : `\n失败：${errors.length} error，${warnings.length} warning`);
process.exit(errors.length === 0 ? 0 : 1);

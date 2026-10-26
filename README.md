# SpecForgeX

> 简体中文 | [English](README.en.md)

> ⚠️ **授权限制**：本仓库与上游 SpecForge **都没有 LICENSE 文件**，按现行法律默认「保留所有权利」。你可以阅读、fork、克隆本仓库；但**商用、分发到 GitHub 之外、或再许可，必须先取得上游作者授权**。详见文末[「与上游的关系、授权与致谢」](#与上游的关系授权与致谢)。

基于 [SpecForge](https://github.com/MingYuePop/SpecForge) V3 改造的文档驱动 AI 开发工作流。核心理念继承自上游——**文档驱动**（所有决策落到文档，换窗口不失忆）、**阶段分离**（每个 Skill 只干一件事）、**AC 贯穿**（验收标准从需求到测试全程可追溯）；SpecForgeX 补上的是工程层：**审查关卡、收敛判定、变更归档、工具链配置化**。

---

## Skill 全览（14 个，三层结构）

### 第一层：项目级 —— 新项目启动时走一遍（7 个）

| Skill | 角色 | 干什么 | 产出 |
|---|---|---|---|
| `project-requirements-clarification` | 需求挖掘专家 | 苏格拉底式提问，把"我想做个博客"这类模糊想法聊清楚：核心价值、目标用户、关键特性、约束。**首次使用时询问后创建 CONSTITUTION.md 和 TOOLCHAIN.md 两个机制文件** | 对话总结（不生成业务文档） |
| `project-product-overview` | 首席产品官 | 把需求总结升级为正式产品文档：愿景、核心板块、用户画像、可量化的验收标准 | `specs/产品概述.md` |
| `project-tech-stack` | CTO | 基于《产品概述》选**最合适而非最热门**的技术组合，给选项、给解释、给推荐 | `specs/技术栈.md` |
| `project-structure` | 系统架构师 | 把产品核心板块映射成代码模块，按高内聚低耦合设计目录结构 | `specs/项目结构.md` |
| `project-dev-standards` | 技术委员会 | 制定可执行的"法律法规"：命名、代码风格、Git 规范、错误处理、AI 协作协议，每条规则配正误对比示例 | `specs/开发规范.md` |
| `project-roadmap-planning` | 技术产品经理 | 依赖分析 → 里程碑划分（MVP/完整版/增强版）→ 开发顺序，**每个功能预置垂直切片种子**（按用户行为粗划 2~5 片，供后续任务规划直接参考） | `specs/开发路线图.md` |
| `project-initialization` | DevOps 工程师 | 唯一的执行类 Skill：按文档创建目录骨架、配置文件、git init；**并引导填写 TOOLCHAIN.md**（测试命令、验收工具）。项目已存在时不动任何文件，只做 TOOLCHAIN 引导 | 项目骨架 + `docs/开发记录/初始化记录.md` |

### 第二层：功能级 —— 每个功能循环使用（6 个）

| Skill | 角色 | 干什么 | 产出 |
|---|---|---|---|
| `feature-requirements-clarification` | 产品搭档 | 自然对话挖透单个功能的需求（场景/流程/边界/规则/范围/质量六维），产出 Given-When-Then 格式的验收标准（AC）；用户已把需求写清楚时走**快车道**（AC 草稿 + 假设清单，每条带推荐默认），非功能指标只在确有可度量值时入 AC——AC 质量决定后面每一步 | `specs/features/{功能名}/需求.md` + 初始化 `开发日志.md` |
| `feature-tech-design` | 技术搭档 | 从 AC 反推数据模型、接口、核心逻辑；先看现有代码能复用什么；关键决策（新依赖、多方案取舍）必须和你确认；末尾附 AC 覆盖总表防遗漏 | `specs/features/{功能名}/技术方案.md` |
| `feature-task-planning` | 技术主管 | 按垂直切片（用户行为）拆原子任务，每个任务带通俗解释、可执行的验证标准、类型标注（A 纯逻辑 / B UI / C schema）；测试不单列任务，融入执行 | `specs/features/{功能名}/任务规划.md` |
| `feature-implementation` | TDD 编排者 | 主会话只编排不写码：每阶段开一个**执行会话**（逐任务续聊）和一个**审查会话**，任务卡预写进**阶段上下文包**（子代理只读一页，不重复注入文档），每任务交结构化回执 + **证据包**、做一次工作提交并过 `feature-review` 审查（读证据 + 定向复跑，不重跑全量）；全部任务完成后主会话亲自**收尾自检**（全量回归 + AC 对账 + 记账核对），过了才出**收敛判定**，再把工作提交压平成一个**交付提交**。无子代理工具的环境自动降级为主会话执行 | 代码 + 测试 + `reports/阶段N_完成报告.md` |
| `feature-review` | 代码审查员 | **审查关卡**，由 implementation 在每个任务验收后**派只读审查会话执行**（可随阶段复用，每任务独立裁定；改动以每任务工作提交为第一证据），也可手动"审查 Task-03"。证据式审查：核对**证据包**里的 RED/GREEN 与验收记录、定向复跑关键用例、查 diff 越界、对规范，裁定 PASS / FAIL / 待验证 + 整改清单；FAIL 记入错题本 | 审查裁定（按固定格式记入 开发日志） |
| `feature-evolution` | 产品架构师 | **变更管家**，两种用法：① 对已有功能提修改 → 影响分析（含跨功能检查）→ 生成变更文件夹，正典不动；② "归档 CR-XXX" → 核验完成后把变更归并回正典并追加变更日志 | `specs/changes/{功能名}/CR-XXX-{slug}/`（变更提案 / 变更任务 / 归并清单；CR 编号功能内自增，不同功能并行不撞号） |

### 第三层：通用 —— 随叫随到（1 个）

| Skill | 角色 | 干什么 | 产出 |
|---|---|---|---|
| `bugfix-workflow` | 排查编排者 | 先判断是不是真 bug（行为与设计不符才算）；简单问题快速修，复杂问题铁律"没复现不动代码"且**派排查子代理执行**（主会话只收回执，上下文不膨胀）；修复过 **feature-review 审查**后才裁三态 verified / partial / failed | `docs/BUG修复文档/` 报告 |

### 两个机制文件（不是 Skill，但每个 Skill 都遵守）

- **`specs/CONSTITUTION.md`（项目宪法）**：上下文按需加载规则（禁止全量读 specs/，只读当前功能相关文档）、六条项目原则、阶段边界守卫（含"我知道风险，直接做"的用户越级出口）、开发日志与审查记录格式、路径与占位符约定、以及**机制文件缺失协议**（老项目首次接入时统一怎么补）
- **`specs/TOOLCHAIN.md`（工具链配置）**：本项目的测试命令、lint、UI 验收工具、数据库验证工具——所有 Skill 按这张表执行验证，不再假设你用的是 Supabase 还是别的

---

## 怎么用

### 第 0 步：安装

```bash
node scripts/install-skills.mjs                       # 装到 ~/.agents/skills
node scripts/install-skills.mjs -t ~/.claude/skills   # 或指定别的目录（可重复传）
node scripts/install-skills.mjs --dry-run             # 先看会做什么，不动文件
```

脚本需要 Node.js 18+，读 `skills/manifest.json` 把 14 个 skill **平铺**到目标目录（最终形如 `~/.agents/skills/feature-review/SKILL.md`）。已存在且内容一致就跳过；内容有差异默认拒绝，加 `--force` 才覆盖，且覆盖前先备份到同级 `_skills_backup_<时间戳>`。目标目录里其它来源的 skill **只列出、绝不删除**。

不想用脚本就手动复制：把 `skills/project/`、`skills/feature/`、`skills/universal/` **下面的 14 个目录**分别复制过去，保持平铺。

> ⚠️ 不要把 `project/`、`feature/`、`universal/` 这三个层目录整个拷进去：多数工具只在 skills 根目录下找一层 `SKILL.md`，带层目录会一个 skill 都加载不到。分层只是仓库里的组织方式，不是安装结构。

`specs/` 留在本仓库作为机制文件参考副本——用户项目里的 CONSTITUTION/TOOLCHAIN 由工作流在你确认后生成，不用手动拷。

### 第 1 步：新项目 —— 7 步打地基（建议同一窗口连着做完）

```
/project-requirements-clarification 我想做一个XX        ← 首次询问后生成 CONSTITUTION/TOOLCHAIN
/project-product-overview 请基于需求总结生成产品概述
/project-tech-stack 请进行技术选型
/project-structure 请设计项目目录结构
/project-dev-standards 请制定开发规范
/project-roadmap-planning 请规划开发路线图               ← 每个功能带切片种子
/project-initialization 初始化项目                        ← 引导你填 TOOLCHAIN（测试命令等）
```

> 上面的 `/project-xxx` 只是示意写法——按你所用工具的方式调用同名 skill（例如直接说"用 project-tech-stack 做技术选型"，或用工具提供的 skill 调用入口）。

每步产出都是下一步的输入。每份文档生成后花两分钟扫一眼——文档阶段的错，比写完代码再改便宜一百倍。

### 第 2 步：开发功能 —— 4 步循环（按路线图逐个功能跑）

```
① /feature-requirements-clarification 我想给文章列表加个搜索
      ↓ 产出 需求.md（含 AC）+ 开发日志.md
② /feature-tech-design 搜索功能
      ↓ 产出 技术方案.md（AC 覆盖总表）
③ /feature-task-planning 搜索功能
      ↓ 产出 任务规划.md（切片+任务+验证标准+类型标注）
④ /feature-implementation 完成搜索功能的任务 第1阶段
      ↓ 开场：生成阶段上下文包（AC / 方案片段 / 任务卡 / 命令）→ 开执行会话 + 审查会话
      ↓ 每任务：执行会话交回执 + 证据包 + 工作提交 → 审查会话定向取证裁定 → 勾选
      ↓ 阶段收尾：主会话自检（全量回归 + AC 对账）→ 收敛判定 + 阶段报告 + 开发日志 → 工作提交压平成一个交付提交
```

建议：①②③ 同一窗口连做（上下文强关联）；④ 有子代理工具的环境一个窗口可逐阶段做完整个功能（每阶段仍由你点名触发）——每阶段复用执行 / 审查两个会话，子代理只读一页上下文包，任务卡、回执、证据都有固定格式，主会话上下文不膨胀；会话不能续聊时退回"每任务一卡"，卡里仍带上下文包与执行摘要。没有子代理工具时退回主会话执行，再考虑按阶段分窗口。review 由 implementation 在每任务后触发、开发日志由各 Skill 按固定格式追加——不需要你手动维护。

### 第 3 步：改已完成的功能 —— 变更三步曲

```
① /feature-evolution 搜索功能加一个搜索历史
      ↓ 影响分析（含跨功能检查）→ 生成 specs/changes/搜索功能/CR-001-搜索历史/
      ↓ 正典文档不动！变更隔离在文件夹里
② /feature-implementation 完成搜索功能的变更任务 CR-001
      ↓ 执行 变更任务.md，流程同上（含 review）
③ /feature-evolution 归档 CR-001
      ↓ 核验全完成 → 按 归并清单.md 归并正典+变更日志 → 移入 changes/archive/{功能名}/
```

文档漂移（改了代码忘了同步文档）在这里被流程终结：正典只在归档时改，改什么由 归并清单.md 说了算。改动超过原功能 70% 时它会劝你走新功能流程而不是硬塞。

### 第 4 步：修 bug

```
/bugfix-workflow 评论发布之后页面没有刷新
```

先判断是不是真 bug（想加功能/改行为请走上面的流程），复杂问题没复现不动代码，修完报告带三态裁定。

### 项目文档结构（用起来之后长这样）

```
你的项目/
├── specs/
│   ├── CONSTITUTION.md / TOOLCHAIN.md       ← 机制文件
│   ├── 产品概述.md / 技术栈.md / 开发规范.md ...  ← 项目级文档
│   ├── features/{功能名}/                    ← 每个功能一个目录
│   │   ├── 需求.md / 技术方案.md / 任务规划.md   ← 正典三件套
│   │   ├── 开发日志.md                        ← 时间序开发日志
│   │   └── reports/                          ← 阶段报告、上下文包、证据包/截图
│   └── changes/{功能名}/CR-{编号}-{slug}/     ← 进行中变更（编号功能内自增）+ archive/{功能名}/
└── docs/开发记录/（初始化记录、越级记录）、docs/BUG修复文档/
```

### 实用建议

- **一次只做一件事**：一条消息只提一个功能的需求，不要"顺便把 XX 也改了"
- **同一功能别开两个执行窗口**：文档是唯一共享状态，两个窗口整文件重写会互相覆盖（见 CONSTITUTION 的并发约定）
- **主动调用 Skill**：自己点名调用（`/feature-xxx`，或直接说"用 feature-xxx"，取决于你的工具），比丢一句模糊描述等 AI 猜要稳
- **Needs Work 不要放过**：阶段报告的收敛判定出现 Needs Work 时，差异清单就是下一步的待办

---

## 与 SpecForge V3 的差异

| # | 改造 | 解决什么问题 |
|---|------|-------------|
| 1 | CONSTITUTION.md 取代 GUARDRAILS + PROJECT-CONTEXT，上下文按需加载 | 120 行说服文浪费 token；规则互相矛盾 |
| 2 | TOOLCHAIN.md 工具链配置化 | Playwright/Supabase 等原作者栈假设，换项目即失效 |
| 3 | 变更文件夹模式 + 归档归并 | 文档漂移靠用户手动同步 |
| 4 | feature-review 审查关卡 | 上游 README 承诺未做的审核闭环 |
| 5 | 收敛判定 + bugfix 三态裁定 | "记录"升级为"判定"，问题不得静默 |
| 6 | 开发日志累积记录 | 散落的阶段报告没有连续记忆 |
| 7 | TDD 分类 A/B/C | 表演性 TDD——为 UI/建表任务硬造假测试 |
| 8 | 修引用断裂（死链/跳号/路径 typo） | V3 重做留下的残渣 |
| 9 | 路线图切片种子 + 项目级 7 skill 统一 | 项目级停留在 V2 风格 |
| 10 | 守卫越级出口 | 守卫和用户打架 |
| 11 | 任务派子代理串行执行 + 收尾自检门禁 | 主会话亲手写码，上下文随代码量爆炸；任务做完即收工，没人对整体做一次核对 |
| 12 | 上游文档变更传播（原则七）+ 路线图完成回写 + 每任务工作提交/每阶段交付提交门禁 | 技术栈一改下游文档全过期没人管；功能做完了路线图还停在旧状态；审查拿不到干净的 diff 证据 |
| 13 | bugfix 审查关卡 + 复杂排查子代理化 + 错题本消费闭环 | 修 bug 免审查的质量洼地；排查试错撑爆主会话；错题本只定义没人写 |
| 14 | 阶段会话 + 上下文包 + 证据包 + 定向测试 | 每任务两次冷启动、每个子代理重读全部文档、执行与审查各跑一遍全量测试——任务越多人越慢 |

> **子代理执行已会话化，仍未采纳并行**：每个阶段开一个执行会话与一个审查会话，逐任务续聊（一次一个任务），主会话只收结构化回执，上下文不再随代码量膨胀；同时任务卡预写进上下文包、审查读证据包并只跑定向验证，冷启动从"每任务 2 次"降到"每阶段 2 次"，文档注入与全量测试次数也降为原来的数分之一（切片越大越明显）。**并行**派发依然不做——瓶颈在验收与联调（一次浏览器走查常抓出近十个 bug），而能并行的任务大多共享 locales / 路由 / 菜单等配置文件，并行会让 `feature-review` 失去干净的工作区与 diff 证据（每任务工作提交只解决 diff，不解决测试环境串扰）。等"隔离工作树 + 独立测试库"具备后再评估。

## 老项目迁移（一次性，两分钟）

1. **补机制文件**：直接调用任一 skill，它检测到缺失会按 CONSTITUTION 的"机制文件缺失协议"问你要不要初始化；同意则自动生成，拒绝则照常工作、产出文档标注"未接入 SpecForgeX 机制文件"。
2. **填 TOOLCHAIN**：调用 `/project-initialization`——检测到项目已存在时它不动任何文件，只做工具链引导，把测试命令、Lint、UI 验收工具写进 `specs/TOOLCHAIN.md`。
3. **旧文档不用动**：V3 的单文件结构（`specs/features/{功能名}.md` 等）所有 skill 内置兼容读取；旧 GUARDRAILS / PROJECT-CONTEXT 文件可留（CONSTITUTION 兼容处理）可删。

## 与上游的关系、授权与致谢

- **来源**：Fork of [MingYuePop/SpecForge](https://github.com/MingYuePop/SpecForge)，仓库名改为 SpecForgeX。内容以 V3 基线 `5d2c453`（2026-03-22）为起点；历史已压成单一初始提交，与上游提交历史不重合，逐处对照请按该基线比对。
- **继承与新增**：Skill 名与"文档驱动 / 阶段分离 / AC 贯穿"方法论继承自上游；审查关卡、变更文件夹与归档、收敛判定、TDD 分类、manifest 与自检脚本为本仓库新增。
- **授权**：上游**没有 LICENSE 文件**（默认"保留所有权利"），本仓库也未另设 LICENSE。作为 GitHub Fork，在平台内查看、fork、克隆是被允许的；**商用、分发到 GitHub 之外或再许可，需先取得上游授权**。上游若补上 MIT（其 README 明确欢迎 PR），本仓库会跟随同一许可。
- **设计参考**：[obra/superpowers](https://github.com/obra/superpowers)（任务后审查、子代理执行）、[github/spec-kit](https://github.com/github/spec-kit)（constitution、收敛循环、三态裁定）、[Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec)（变更文件夹 + archive 归并）、[Trellis](https://docs.trytrellis.app)（按任务注入 spec、开发日志）、[mattpocock/skills](https://github.com/mattpocock/skills)（决策拷问：设计树 / 待定边界 / 每题带推荐答案）。

## 自检

改完 skill 后跑 `npm test`（等价于 `node scripts/check-skills.mjs`，Node 18+）。它校验 front-matter、manifest（路径 / layer / kind / name 唯一 / 同层 step 不重号）、assets 引用、占位符残留、机制文件副本（比较前归一化行尾，避免 CRLF 造成假失败），以及双语 README 的章节结构、skill 名单与声明的数量是否和 manifest 对得上。有问题直接告诉你要改哪。

同一套检查在 push / PR 时由 GitHub Actions 自动跑（Node 18 / 20 / 22 三档），并额外冒烟四项：安装脚本演练、真实安装、重复安装幂等、安装产物里的机制文件与 `specs/` 逐字一致——所以忘记手动跑也不会把不一致推进主干。

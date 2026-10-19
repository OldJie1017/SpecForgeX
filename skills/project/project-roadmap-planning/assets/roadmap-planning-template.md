# 项目开发路线图 (Development Roadmap)

## 0. 策略概览
*   **开发策略**: {{例如：优先完成用户系统，然后打通核心支付链路，最后完善后台管理}}
*   **MVP 目标**: {{简述 MVP 包含的范围}}

## 1. 里程碑一：MVP (核心闭环)
> 目标：实现最基础的业务流程，完成从 0 到 1 的闭环。

- [ ] **Phase 1.1: 基础设施 (Infrastructure)**
    *   **模块**: `Auth` / `Common`
    *   **说明**: 用户注册登录、JWT 认证、公共组件库。
    *   **切片种子**: 认证：注册登录 → 会话保持 → 权限控制
    *   **启动提示词**: `/feature-requirements-clarification 认证`

- [ ] **Phase 1.2: 核心业务 (Core Business)**
    *   **模块**: {{例如：商品模块、订单模块}}
    *   **说明**: {{简述}}
    *   **切片种子**: {{按用户行为粗划 2~5 个切片，如：商品：浏览列表 → 查看详情 → 加入购物车}}
    *   **启动提示词**: `/feature-requirements-clarification {{功能名}}`

## 2. 里程碑二：功能完善 (Feature Complete)
> 目标：补充辅助功能，提升用户体验。

- [ ] **Phase 2.1: {{模块名称}}**
    *   **模块**: ...
    *   **说明**: ...
    *   **切片种子**: ...
    *   **启动提示词**: `/feature-requirements-clarification {{功能名}}`

## 3. 里程碑三：运营与优化 (Ops & Optimization)
> 目标：后台管理、数据统计、性能优化。

- [ ] **Phase 3.1: 后台管理 (Admin Dashboard)**
    *   **模块**: Admin
    *   **说明**: 数据管理、用户管理。
    *   **切片种子**: 后台：登录 → 数据看板 → 内容管理
    *   **启动提示词**: `/feature-requirements-clarification 后台管理`

---
**使用指南**:
1.  **功能开发**: 按顺序逐个功能走功能级流程（`feature-requirements-clarification` → `feature-tech-design` → `feature-task-planning` → `feature-implementation`）。贴着每个 Module 的**启动提示词**复制执行，不要自己拼命令；切片种子是任务规划的起点参考。
2.  每完成一个功能，回来勾选进度。

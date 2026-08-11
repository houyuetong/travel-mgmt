# 分支管理策略（Branching Strategy）

本仓库采用 **GitHub Flow 简化版**：单一主干（`main`）兼任功能集成与版本发布，不设 `develop` 分支。

## 1. 分支模型总览

```
main（唯一开发主分支：集成 + 发布）
 ├── feature/<功能名>   （从 main 检出，完成后合并回 main 并删除）
 └── tag vX.Y           （从 main 创建，表示已发布版本）
       └── release/vX.Y （从 tag 创建，仅该版本的缺陷修复）
```

## 2. 分支角色与命名规范

| 分支/标签 | 角色 | 规范 |
|-----------|------|------|
| `main` | 唯一开发主分支，承担功能集成与版本发布 | 禁止直接提交新功能；仅允许合并 `feature/*`、创建 tag、文档/配置类维护 |
| `feature/<功能名>` | 新功能开发分支 | 从 `main` 检出；命名须遵循 `feature/<功能名>`（如 `feature/travel-mgmt-v1.3`）；开发完成后合并回 `main` 并删除 |
| `release/vX.Y` | 版本归档分支 | 从对应 tag `vX.Y` 创建；仅允许缺陷修复，禁止开发/合并新功能 |
| `tag vX.Y` | 版本发布标记 | 从 `main` 创建；命名须与 CHANGELOG 版本号一致 |

## 3. 开发流程

```bash
git checkout -b feature/<功能名> main
# 开发并提交
git commit -m "feat: <变更说明>"
# 合并回 main
git checkout main
git pull origin main
git merge --no-ff feature/<功能名>
git push origin main
# 删除 feature 分支
git branch -d feature/<功能名>
```

## 4. 发布流程

1. 合并全部 `feature/*` 到 `main`；
2. 同步更新三处 `package.json` 的 `version` 字段（根 / `client` / `server`）；
3. 在 `CHANGELOG.md` 顶部追加对应版本章节（版本号须与第 2 步一致）；
4. 创建 tag：`git tag -a vX.Y -m "release vX.Y"`；
5. 补建归档分支：`git branch release/vX.Y vX.Y`；
6. 推送：`git push origin main vX.Y`、`git push -u origin release/vX.Y`。

## 5. 约束与检查

- 分支 / tag 命名在仓库内必须唯一；
- **打 tag 前** `CHANGELOG.md` 必须已包含对应版本章节且版本号与 `package.json` 一致；
- `release/*` 分支禁止混入新功能，仅缺陷修复；
- 违规处理：若发现 `main` 直接提交新功能或 `release` 混入新功能，回退相关提交并改走规范流程。

## 6. 常用命令速查

| 操作 | 命令 |
|------|------|
| 检出 feature 分支 | `git checkout -b feature/<功能名> main` |
| 合并 feature 到 main | `git checkout main && git merge --no-ff feature/<功能名>` |
| 打 tag | `git tag -a vX.Y -m "release vX.Y"` |
| 补建归档分支 | `git branch release/vX.Y vX.Y` |
| 推送 main + tag | `git push origin main vX.Y` |
| 推送归档分支 | `git push -u origin release/vX.Y` |
| 查看全部 tag | `git tag -l` |
| 查看全部分支 | `git branch -a` |
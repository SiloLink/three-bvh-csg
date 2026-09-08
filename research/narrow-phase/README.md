# CSG optimization handoff

给 Xinqiang 的实验分支。五项改动已经放在仓库根目录的真实源码中，每项一个 commit，可逐项 review 或 cherry-pick。分支基于已合入 singleton 修复的 `8a53705c`；这些提交仍需正式集成和发布验收。

## 提交顺序

| Commit | 改动 | 主要验收 |
|---|---|---|
| `5c60e77` | 镜像变换下的共面分类 | 两种 splitter、两种精度、三个镜像轴、平移及共同旋转，五种实体运算 |
| `30f0aa6` | 保留结果 affine 矩阵 | shear、world 更新、已有父节点、多 target 和 target 复用；结果使用 `matrixAutoUpdate=false` |
| `79183fb` | 重置 CDT 投影向量池 | 重复 100 次，保留向量从 30,300 降到稳定 10 个，输出字节不变 |
| `cc8cb6a` | 自适应稳健 incircle | 100,000 组谓词符号、300 组三角剖分；生成构建接入锁定依赖 |
| `5bd07d4` | CDT 边/点距离下界 | 2,000,000 次浮点边界比较，无错误排除 |

先阅读根目录 `src/`、`tests/` 和每条 commit 的 diff。incircle 的维护入口是根目录 `scripts/cdt-incircle.cjs` 与 `npm run build-cdt2d`，不要只手改生成的 `src/libs/cdt2d.js`。

## 本地开发

需要 Node 24、npm；研究复现另需 Git、Python 3.11+。安装依赖时需要 npm registry 网络访问。

```sh
npm ci
npm test
npm run lint
npm run build
```

修改根目录源码，在 `tests/` 添加回归。结果的 `matrixAutoUpdate` 语义见根 README；调用方若继续使用 position/quaternion/scale 编辑结果，需明确处理完整 affine 矩阵。

## 六项目完整流水线对照

```sh
python3 research/narrow-phase/handoff.py prepare ../csg-research-runtime
python3 research/narrow-phase/handoff.py install ../csg-research-runtime
python3 research/narrow-phase/handoff.py compare ../csg-research-runtime --base 30f0aa6 --candidate 5bd07d4 --run-name acceptance
```

`prepare` 的目标目录必须为空或不存在。约需 3 GB 空间，完整大项目可能使用约 6–8 GiB 进程树内存。`install` 通过 npx 使用 pnpm 11.7.0，重建冻结消费者的依赖和模块链接。

`compare` 从指定 Git commit 提取真实库源码，接入同一份冻结消费者，顺序运行六项目的两个版本：SGD Duplex、Digital Hub、WBDG Office、BYH Donauwörth、DMSW v28、BVG v1。配置为 3 workers、batch=100、1536 MiB geometry budget、10 mm UI 容差；每个项目交替 A/B 次序。要求 CSV 逐字节相同、coverage 除输出 URI 外完全相同、候选数相同、评估错误为零。

以上基线包含两项正确性修复，因此只对照三个性能提交。若要验证其他提交组合，改变 `--base`、`--candidate`；结果变化会让对照失败，需要独立判断其正确性。每次重跑使用新的 `--run-name`，输出位于工作目录 `commit-bench/`，汇总为 `commit-comparison-<run-name>.json`。

计时包括本地加载、broad phase、缓存、narrow phase、CSV/coverage 写入和 worker 收尾；不含网络传输和 Cloud Run 启动。单轮验收不是稳定性能承诺，正式跑分应多轮顺序 A/B。

本次提交的单轮实测如下，六项目共 12 次完整运行、331,174 次候选评估，CSV、coverage 和证据摘要全部通过对照：

| 项目 | 基线秒数 | 优化秒数 |
|---|---:|---:|
| SGD Duplex | 2.191 | 2.018 |
| Digital Hub | 21.534 | 9.843 |
| WBDG Office | 17.338 | 9.937 |
| BYH Donauwörth | 19.459 | 9.562 |
| DMSW v28 | 137.781 | 86.382 |
| BVG v1 | 184.348 | 123.626 |
| 合计 | 382.651 | 241.368 |

合计减少 36.9%，仅指这轮本地运行。垂直早退未参与本次对照。

## 历史研究记录

[完整审计](AUDIT.md) 保留三轮优化研究、失败方案及 singleton 判断的后续更正。[历史交接验证](validation.json) 记录原始实验的复现验收；新的代码提交验收另见 [提交验证](commit-validation.json)。

- `scripts/`：67 个独立研究脚本和说明，使用正常源码扩展名。
- `archives/historical-sources.tar.gz`：1,925 个历史库、消费者及变体快照，约 2.6 MiB；需要时由 `prepare` 还原，不在日常开发目录铺开。
- `archives/data-*.tar.gz`：六项目的 75 个 Parquet 和元数据。
- `archives/evidence-*.tar.gz`：三轮共 82 次完整任务的 CSV、coverage、日志、CPU profile 和原始测量。
- `archives/commit-validation.tar.gz`：上述新提交的 12 次完整运行和数值、构建检查原始证据；文件索引与哈希在 `commit-validation.json`。
- [manifest](manifest.json)：全部 2,890 个原始文件的大小、SHA-256 和存储位置。
- [历史 patch 索引](patches/index.json)：13 个旧实验增量，包含互斥或未采用的方案；当前实现以 Git commits 为准。

没有 `.env`、云凭证、`node_modules` 或 `.git`。项目数据属于内部研究交接，后续公开分发应按各来源的授权处理。

验证历史证据或重放旧实验：

```sh
python3 research/narrow-phase/handoff.py verify
python3 research/narrow-phase/handoff.py check ../csg-research-runtime
python3 research/narrow-phase/handoff.py replay ../csg-research-runtime --run-name historical
```

`verify` 对照原始文件及新提交证据哈希；`check` 运行历史数值检查与报告对照；`replay` 重跑旧 edge-bounds 和 vertical-skip 两个原型，各自与历史结果比较。它们不把当前库提交冒充旧实验版本。

`prepare` 还原历史研究运行目录。新提交的证据归档可单独解压查看，其中原始报告的绝对 URI 保留，归档内文件按 `commit-validation.json` 的相对路径定位。

还原时只有工作副本的绝对路径、coverage URI/digest 被调整；原始归档字节和计时不变。历史 detectionIdentity 包含绝对路径，复现入口仅在计算身份时恢复原路径命名，实际读取使用新目录。

## 消费者侧的垂直早退

这是 `clash-detection` 的业务容差判定，保留为 [消费者 patch](patches/vertical-skip.patch)、[whole-pair 策略](scripts/audit/vertical-bound/policy.mjs)、[world-Z helper](scripts/audit/vertical-bound/numerics/world-z-bounds.mjs) 与 [数值论证](scripts/audit/vertical-bound/numerics/PROOF.md)。没有应用到当前库。

必须保留 Duplicate 例外，按所有 brush-pair 区间的总高度判定。它会纠正部分旧报告，不能宣称与现行 CSG 输出等价；未计算的体积、尺寸和 rawCollision 必须有明确诊断语义。历史 shadow 中 44 条正例差异包括 WBDG 41 条既有报告和 DMSW 3 条诊断控制差异，不能把后者计作修复既有误报。

## 仍需正式验收的边界

- 原解析盒体 sweep 的 4 项 CDT 失败仍需处理；本分支没有宣称整个几何库已被证明正确。
- 真实数据存在重复面、退化面或非流形拓扑；不能按某个模型特调，也不能默认自动删面能恢复正确实体。
- `no-delaunay` 改变 28/69 条样本报告；水平 OBB 短边早退有独立反例。二者均未采用。
- `ray-side` 依赖 BVH 私有布局且独立收益小；position-only、coplanar、combined 的原始记录保留，未叠入当前实现。
- 输出 buffer 容量复用仍受消费者 live index/drawRange 契约限制。
- npm scoped 包发布、消费者正式依赖升级和 Cloud Run 验证尚未执行。本分支未 push。

# three-bvh-csg 窄阶段审计

审计日期：2026-09-07 至 2026-09-08。范围：源码、clash-detection 消费路径、隔离实验和六个本地项目的完整流水线验证。产品仓库没有编辑、提交、切换分支或发布。前期审计使用两个独立调查子代理；全量基准和后续 profile 未增加子代理，垂直认证研究复用一个数值调查子代理。

## 结论

**最新提交复核（2026-09-08）**：PR #2 的 head 已从本报告原始基线 `52f18b2` 更新为 `febaf15bc399d6a5167512bf355c84784fee2cd7`，合入 PR #3 的 singleton 修复。沿边切割回归已消除；旧的两项失败测试使用未闭合的 clipping brush B，不满足 hollow 操作的输入契约，不能当作必须保留的行为。此前将这两项失败视为恢复上游处理的阻碍，判断不准确，应撤回。最新 head 本地测试 70 passed、1 TODO，lint/类型检查通过；镜像和 shear 问题仍复现。详细复核见本文末尾，前文性能结果仍对应各节明确记录的历史实验版本。

最值得实施的性能改动是替换 CDT 的全量精确 incircle 运算，使用 `robust-predicates@3.0.3` 的自适应稳健 `incircle`。保留 Delaunay、Float64、完整 INTERSECTION 和原有分类规则。本地实验中，69 对 DMSW 历史碰撞样本的预热 CSG 耗时下降 47.4%；500 个实际 broad-phase 候选下降 37.0%。两轮原版/候选的完整报告相等，position、normal、index 原始字节 SHA-256 及 drawRange 全部一致。

同时必须修复：CDT 临时向量池持续增长、先前发现的 singleton 边界回归、镜像变换的共面法线分类、shear 结果矩阵丢失。性能实验保留了原版行为；它不消除这些已知错误。

后续四项目全量实测：完整流水线耗时下降 21.0%–27.7%，16 次任务的报告和覆盖记录一致，处理错误为零。完整项目收益及 BVG 剩余热点见后续全量验证章节。新一轮已验证通用的 CDT 线段/点距离预排除；在前轮优化之上，五个非微型项目的全流程进一步下降 7.7%–38.8%，详见末尾通用优化章节。

垂直早退的后续研究已经建立输入高度的保守浮点上界，并在隔离副本中执行完整项目。它可以直接证明部分几何交集不超过现有高度容差，但**不与当前 CSG 输出完全等价**：独立封闭盒体出现近阈值数值误报，真实 WBDG 数据也存在交集输出超出输入交叠范围的报告。下文“垂直高度认证与真实早退实验”分别记录几何证明、报告变化及实际收益；它不是已可发布的完整正确性修复。

## 审计基线

| 项目 | 实际基线 |
|---|---|
| three-bvh-csg 本地 main | d6709dd27a86944397c1179cbef79ad2b338aa5c |
| CSG 实验源码 | development / PR #2，52f18b2647c283bbd62f4f2caf50cda98a3e3e02 |
| 消费者实验源码 | clash-detection f890805，本地 narrow 源码与该提交一致 |
| 本地原装依赖 | patched three-bvh-csg 0.0.18 / three-mesh-bvh 0.9.10 |
| 实验依赖 | fork 52f18b2 / three-mesh-bvh 0.9.11 / three 0.179.1 |
| Node | v24.16.0，macOS；早期样本单进程，全量 3 个 persistent worker |
| PR #28 | 90744be22eef77a0288e686c3c389f2dc5ccbeb8；CSG 调用配置相同，但消费者缓存身份及异常处理代码比本地旧，未把整个 PR #28 当成本次运行基线 |

CDTTriangleSplitter、GeometryBuilder 和 operationsUtils 的源码在本地已安装 patched 包与 fork 中一致，故向量池等问题并非仅存在于未发布 fork。对 PR #28 的检查使用了远端 exact-head 文件，保存在 `root/pr28-narrow-phase.js`。

## 已复现的正确性与资源问题

### P1：CDT projected-vector pool 从未重置

[CDTTriangleSplitter.js:20](__CSG_RESEARCH_ROOT__/three-bvh-csg/src/core/CDTTriangleSplitter.js:20) 只清理 `_paramPool`，未清理模块级 `_vectorPool`；后者每次 triangulation 继续保留所有投影向量。Evaluator reset、输出 geometry.dispose 和 GC 都不能解除这些强引用。

Float64 position/normal、重复计算同一对旋转盒体 1,000 次：

| 指标 | 原版 | 隔离副本清理向量池 |
|---|---:|---:|
| 保留 Vector3 | 303,000 | 10 |
| 强制 GC 后 heap | 42.21 MB | 10.06 MB |
| 输出 position/normal/index SHA-256 | 相同 | 相同 |

修复位置：`edgesToIndices` 入口与 `_paramPool.clear()` 一起重置向量池。生命周期已追踪：向量只在当前 triangulation 内使用；cdt2dPoints 是数值副本，输出三角形复制坐标。该问题会增加长任务内存及 GC 压力；上述固定负载不用于估算生产每小时泄漏量。

[复现脚本](__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/csg-agent/pool-leak.mjs)。

### P1：singleton 逻辑跨过真实切割边界

[PR head operations.js:370](__CSG_RESEARCH_ROOT__/review-artifacts/csg-pr2/head/src/core/operations/operations.js:370) 把所有“非共面、仍只有一个三角形”的情况归回原 half-edge component。当切割沿已有边发生时，也不会产生新三角形，但该边仍必须分隔内外区域。

`BoxGeometry(1,1,1,2,2,2)` 与位于 x=-1 的 `BoxGeometry(2,2,2,2,2,2)`：intersection 体积应为 0.5，实际 0.3333；subtraction 应为 0.5，实际 1.5；hollow intersection 应保留 24 个三角形，实际为零。两个 splitter、Float32/Float64 均复现。

已有 360 场景 × 5 操作的解析盒体 sweep：fork 211 项失败，原 main 4 项失败；仅禁用该 shortcut 的隔离控制组恢复到原来的 4 项失败。自适应谓词候选仍为 211 项，没有新增失败，也没有修复这一问题。

正确修复需区分点接触与沿边相交，保留交线边界；不应以简单放大 epsilon 或多数票来补救错误连通区域。

[复现脚本](__CSG_RESEARCH_ROOT__/review-artifacts/csg-pr2/minimal.mjs)。

### P1：镜像变换导致共面分类错误

[PR head operations.js:412](__CSG_RESEARCH_ROOT__/review-artifacts/csg-pr2/head/src/core/operations/operations.js:412) 比较经过变换后的三角形法线，但未修正负 determinant 导致的 winding 翻转。

两个相同单位盒体，仅把 B 的 scale.x 设为 -1，几何实体不变，intersection 应为 1，实际为空；再将 B 平移 x=0.2，应为 0.8，实际为 0.2666667。负 x/y/z 缩放均复现。实验副本对共面 normal-dot 乘相对矩阵 determinant 的符号，恢复六个简单案例；仍需更广泛的镜像、旋转、嵌套组合验证。

消费者接受负 determinant 矩阵并原样送入 CSG，此输入路径可达。但扫描本地 DMSW 的 107,938 个 direct-geometry placement，没有发现镜像或奇异矩阵；不能把它归因为这批数据的实际错误。

[复现脚本](__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/csg-agent/correctness-probes.mjs)、[隔离控制](__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/csg-agent/mirror-fix-probe.mjs)。

### P1：结果矩阵从 affine 降为 TRS，丢失 shear

输入 [narrow-phase.js:589](__CSG_RESEARCH_ROOT__/clash-detection/backend/src/core/narrow/narrow-phase.js:589) 明确保留原始 affine matrix；CSG [Evaluator.js:144](__CSG_RESEARCH_ROOT__/three-bvh-csg/src/core/Evaluator.js:144) 将结果矩阵分解为 position/quaternion/scale。消费者随后在 [1072](__CSG_RESEARCH_ROOT__/clash-detection/backend/src/core/narrow/narrow-phase.js:1072) 调用 updateMatrixWorld，覆盖精确结果矩阵。

大小 2 和 1 的嵌套盒体都使用 determinant=1 的 shear `x'=x+y`：交集应为 1，调用 updateMatrixWorld 后变成 1.4066783736891373。已在安装包与 fork 两条路径复现。修复应保留结果的完整 affine matrix，并覆盖后续 world-vertex 提取时的更新。

DMSW 只有最大约 1.14e-6 的列向量非正交误差，没有显著 shear（阈值 1e-4）；本问题是可达输入契约缺陷，不是该数据集已证实的主因。

[fork 复现](__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/root/shear-fork-repro.mjs)。

### P2：库生命周期与复用接口存在缺陷

- [Brush.disposeCacheData:118](__CSG_RESEARCH_ROOT__/three-bvh-csg/src/core/Brush.js:118) 清缓存却保留 `_hash`。下一次 prepareGeometry 提前返回，随后 bvhcast 对 null 抛异常。已复现；当前消费者不通过此方法复用同一 Brush，优先级低于前述路径。
- [GeometryBuilder:116](__CSG_RESEARCH_ROOT__/three-bvh-csg/src/core/operations/GeometryBuilder.js:116) 遍历不存在的 `attributeData.attributes`，且 `.delete` 不是普通对象方法。Evaluator 首次运行后改变 attributes 不会正确清除旧字段。本次 position-only 实验均用全新 Evaluator。
- [GeometryBuilder:312](__CSG_RESEARCH_ROOT__/three-bvh-csg/src/core/operations/GeometryBuilder.js:312) 用 TypedArray `.type` 比较构造类型，实际为 undefined，因此重复提供 target 仍重新分配。改为真正容量复用之前，消费者必须按 live indices/drawRange 读取顶点；目前 `getObjectWorldVertices` 读取全部 position.count，直接引入更大容量的复用缓冲会污染尺寸。

## 性能证据与优化排序

### 1. 首选：自适应稳健 incircle，保留精确符号与 Delaunay

CPU profile 对 69 对实际几何预热重放采样，18,583 个 sample 中，scaleLinearExpansion 15.2%、linearExpansionSum 13.9%、robustSubtract 12.9%，三者合计约 42%。当前 `cdt2d` 的 Delaunay refinement 调用 robust-in-sphere[4]，每次做全量 expansion 运算。

实验使用 `robust-predicates@3.0.3` 的 **incircle**，未使用不稳健的 incirclefast。该实现根据误差界判断是否需要高精度计算；保留难例的稳健判定。[上游实现与 API](https://github.com/mourner/robust-predicates)。

| 样本 | 原版 CSG 中位数 | 候选 CSG 中位数 | 下降 | 验证 |
|---|---:|---:|---:|---|
| 69 对、跨 14 个专业组合的历史碰撞样本 | 544.431 ms | 286.184 ms | 47.4% | 68 正、1 负、0 error；完整报告和原始几何哈希相同 |
| 500 个实际 broad-phase 候选 | 3271.808 ms | 2062.347 ms | 37.0% | 260 正、240 负、0 error；完整报告和原始几何哈希相同 |

上表候选仅含向量池修复与 incircle 替换，输入/输出 normals 保留。69 对独立七次预热测量也约 535.7 → 270.0 ms。计时测量不包含 CPU profiler 或字节哈希，哈希单独重放获取。每轮比较均使用相同版本、相同数据和缓存设置的独立进程。

额外验证：10 万组随机、重复点、近共圆、近共线及多数量级输入，谓词符号差异为零；原库 46 tests 通过、1 todo；1,800 项盒体检查没有新增失败。生产变更应从可复现的依赖/构建输入实现，不能只手改生成的 `src/libs/cdt2d.js`。本次仅在隔离产物中验证替换可行性。

### 2. 必修：重置 projected-vector pool

其收益主要是长期内存稳定性。固定短批次并未显示显著速度收益，不能把它本身宣传为大幅提速。

### 3. 可随同清理，但不是主攻点

- position-only input/output：volume、碰撞尺寸只消费位置；BVH 和分类从三角形位置推导 face normal。省去 Float64 normal 分配、computeVertexNormals、SAB copy 和输出插值。69 对单独实验与原报告及 position/index 完全一致，但相对 pool-only 的预热 CSG 提升约 1%，四组合成几何也无稳定的大收益。
- 复用已计算的共面交线：[operationsUtils:79](__CSG_RESEARCH_ROOT__/three-bvh-csg/src/core/operations/operationsUtils.js:79) 与 93 对同一 triangle pair 重复计算，中间没有修改结果数组。消除重复计算通过样本 parity，速度差在小幅波动范围。
- 非共面缓存交线 A/B 可以共享只读 Line3，现有 coplanar 路径已如此；CDT 会复制它。尚未单独测收益。
- 负例延迟计算输入实体 volume/box；缓存不变的 brush world box；去除未使用的 boundingSphere。源码支持可行性，未测量收益。
- CDT adjacency graph 当前仍在构建，而 Evaluator 中唯一遍历使用点被注释掉。公开导出的 CDTTriangleSplitter 暴露 triangleConnectivity，不应未经契约整理就全局删掉。

### 不建议直接采用的捷径

- 关闭 Delaunay：约 252 ms/69 对，确实快，但 28 条报告改变。例：相交体积 29,518,412.031 → 28,329,845.456 mm³。上游说明 `delaunay:false` 会改用任意 triangulation；当前 CSG 的数值/分类路径对这种变化敏感。[cdt2d API](https://github.com/mikolalysenko/cdt2d)。
- 任意减少多数票、降低精度、放宽 epsilon、改为布尔相交：会影响输出契约或正确性，未证明可替代当前实现。
- 直接增加 worker：使用 child_process.fork，各 worker 独立解码 parquet、建立 geometry/BVH；当前 SAB 不是跨 worker 共享。必须同时测 CPU、内存、冷启动和调度。
- AABB overlap-volume 上界提前排除理论上有价值，但要证明浮点上界足够保守并保留 Duplicate 规则；本次未作为已验证优化。

## 验证边界

- 500 对由当前 broad phase 在 architecture/structure 的 23,038 个对象上按指定 IFC 类型组合抽样获得，零 tolerance；它不是完整业务矩阵或全项目跑分。69 对来自五专业历史正例报告的稳定分层选样；当前运行有一条为负例，不把历史报告当当前真值。
- 输入 parquet 的路径、大小和 SHA-256 已保存。初次加载和预处理可占很大时间；上述主表只报告预热 CSG。后续已补四项目全部模型、完整矩阵和 3-worker 流水线，见下文；未运行当前 Cloud Run 服务或端到端发布。
- 原算法已有可复现的错误。候选和原版相等证明优化未改变这些样本的行为；发布前仍要先完成正确性修复，并对修正后的组合重新做解析、差分与项目验证。
- 本次未迁移 clash-detection 依赖、未配置 npm 发布、未修改 PR、未合并。

## 建议实施顺序

1. 修复 singleton 边界、mirror、shear，补独立解析回归；修复向量池，并验证内存平台期。
2. 从可复现构建输入替换稳健 incircle；在第一步的正确性基线上重放本次样本，并补更大模型、负例、接触/近共面/小体积/大坐标/镜像/shear 案例。
3. 在修正后的基线上验证并接入通用 CDT 线段/点距离预排除；position-only、重复共面计算和资源生命周期清理优先级更低。
4. 本地完整项目与 3-worker 基线现已完成；正确性修复后重放同一项目，再在目标 Cloud Run 配置验证，之后决定 npm 发布和消费者升级。

## 可复核产物

- [汇总结果](__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/root/verified-summary.json)
- [输入 SHA-256](__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/root/input-sha256.json)
- [CPU profile](__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/root/baseline.cpuprofile)
- [候选采样脚本](__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/root/collect-broad.mjs)
- [完整报告及原始几何验证脚本](__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/root/verify-run.mjs)
- [10 万组谓词差分](__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/root/predicate-parity.mjs)
- [500 对原版结果](__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/root/verify-broad-baseline.json)
- [500 对候选结果](__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/root/verify-broad-adaptive-only.json)

## 本地全项目验证（后续实测）

使用隔离的 clash-detection `f890805` 和 CSG fork `52f18b2`；候选仅改变 projected-vector pool 重置和 `robust-predicates@3.0.3` 的稳健 incircle。两份 backend/src 的逐文件 SHA-256 完全相同，CSG 仅两个文件不同。保留 Float64、Delaunay、normal、完整 INTERSECTION 和所有分类/容差规则。

实际调用现有 `runBroadNarrowReport` 和本地原子报告 writer，使用 3 个 persistent worker、batch size 100、总 geometry budget 1536 MiB、cache frequency threshold 5。矩阵来自已有 UI parity builder，再经现有 normalizeMatrixRequest；水平和垂直容差均 10 mm，使用默认类型和语义过滤，不设楼层范围，不抽样候选。

硬件：Mac16,8，14 核、48 GiB RAM，Node 24.16.0。每次独立进程、顺序运行 A/B；进程缓存重新建立，未清空 OS 文件缓存。计时包含 Parquet 加载、两次 broad phase、缓存策略、worker/CSG、结果指标、CSV 与覆盖记录写出及 worker 关闭。未计入 IFC 解析、上传下载、Cloud Run 启动或云端数据分组。

| 完整项目 | 模型 | 候选对 | 碰撞行 | 原版 → 候选 | 全流程下降 | CSG 下降 | 每版次数 |
|---|---:|---:|---:|---:|---:|---:|---:|
| WBDG Office | 3 | 7,761 | 2,691 | 16.83 → 12.17 s | 27.7% | 31.9% | 3 |
| BYH Donauwörth | 6 | 6,198 | 1,419 | 18.59 → 14.30 s | 23.0% | 27.1% | 3 |
| DMSW v28 | 5 | 94,436 | 18,087 | 126.37 → 92.40 s | 26.9% | 35.0% | 1 |
| BVG v1 | 5 | 47,811 | 17,727 | 187.59 → 148.13 s | 21.0% | 24.8% | 1 |

小项目采用 3 轮中位数，大项目为各 1 次全量。共完成 16 次完整任务、368,248 次候选对评估；四组单轮候选合计 156,206，对应 39,924 条碰撞。每个项目的全部 A/B CSV 逐字节相等；覆盖记录除产物 URI 外完全一致，实际 evidence chunk 的 SHA-256 也重新验证。所有任务 evaluation failures = 0，coverage errors = 0。

共享开发机存在并发负载，短任务有可见波动：WBDG 原版 15.60–18.69 s、候选 11.43–14.83 s；BYH 原版 18.54–27.29 s、候选 14.21–15.16 s。未把偏慢的单次基线当作额外优化收益。大项目结果足以说明可行性，但没有多轮置信区间。

用于同类工作负载的初步预算，可先按全流程耗时下降约 20%–30% 估算。不能把早期 37%–47% 的预热 CSG 收益直接用于整个任务，也不能把本机秒数用于 Cloud Run。历史 2026-07-11 DMSW 云端 297.89 s、Lars 63 分钟属于其他引擎/输入/机器条件，未作为本次 A/B 基线。

### 内存边界

Pool 修复消除了已经复现的强引用积累，但本次全任务 RSS 并没有一致下降。两秒采样的父进程加所有 worker 的 RSS 峰值：DMSW 6.48 → 7.97 GiB；BVG 6.24 → 7.64 GiB。该指标是进程 RSS 合计，不是容器独占物理内存；GC 时机和动态批次分配也没有固定。当前证据不支持降低部署内存配置或承诺整体内存收益。

### BVG 的剩余热点

候选版最慢 10 批、1,000 对，只占全部候选的 2.1%，消耗 54.3% 的 CSG 时间。第 240–244 批均为 electrical/IfcCableCarrierSegment 与 electrical/IfcBuildingElementProxy：500 对（1.0%）消耗候选版 CSG 的 39.3%，原版 134.99 → 候选 119.97 worker-seconds，仅降低 11.1%；最终只有 13 对进入碰撞报告。worker-seconds 为各 worker 时长之和，不能与墙钟时间直接相加。

独立重放并 profile 第 241 批 100 对（不混入全量计时）：83 对为 124 × 64,536 个三角形；代表性 Proxy geometry_id=414693，有 30 个实例，Name 前缀为 Placeholder:Leehrrohr_Verteilerkasten_ERD。该批 98 对原始 CSG 判定相交，97 对随后被 tolerance 过滤，最终 1 对为碰撞；重放与完整 CSV 一致。采样自耗时约 46% 落在射线遍历/相交相关函数，edgesToIndices 和 distanceSqToLine3 合计约 14.5%。

这为下一轮提供了具体目标：在这些实际负例上验证保守的容差上界提前排除，并减少高面数 Proxy 的射线分类及切割边工作。这里没有实现早退，也没有声称 97 对都可以安全提前排除。当前 tolerance 只过滤 Overlapping，且依赖相交体的定向包围盒；Duplicate 等分类、多个 brush、镜像/shear 与数值误差都必须保留。对无法证明安全的情况仍需完整 CSG。

本次全量差分验证的是优化的行为一致性；上一轮已确认的 singleton、mirror、shear 正确性问题仍需修复，并在修正后的组合上重跑验证。

### 全量证据

- [结果、全部轮次和 parity 检查](__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/full-project-bench/comparison.json)
- [输入目录与机器配置](__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/full-project-bench/machine.json)
- [源码与依赖 SHA 清单](__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/full-project-bench/code-manifest.json)
- [57 个输入文件及仓库状态复核](__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/full-project-bench/integrity-check.json)
- [完整流水线执行脚本](__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/full-project-bench/run-full.mjs)
- [顺序执行与 RSS 采样脚本](__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/full-project-bench/run-queue.py)
- [完整报告比较脚本](__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/full-project-bench/compare.py)
- [BVG 慢批次与精确候选](__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/full-project-bench/bvg-v1/hot-batches.json)
- [BVG 逐对 Trace 和三角形数量](__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/full-project-bench/bvg-v1/hot-241-diagnostics.json)
- [BVG 慢批次 CPU profile](__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/full-project-bench/bvg-v1/hot-241-adaptive.cpuprofile)

## 通用优化深化（2026-09-08）

本轮遵守“不针对某个模型特调”：只以 BVG 第 241 批发现热点；原型不读取项目、模型、对象名称、GUID、IFC 类型或特定面数，不新增几何容差。源码在新增验证项目开跑前固定，115 个文件的 SHA-256 随后未变。新增此前没有用于本轮原型设计的 SGD Duplex 和 Digital Hub；另重跑 WBDG、BYH、DMSW、BVG。仅使用 workspace 的隔离副本，两个产品仓库的 HEAD、dirty 文件清单、diff SHA 均未变。

### 已验证候选：CDT 内使用保守距离下界

`CDTTriangleSplitter.edgesToIndices` 对每对切割边计算 `distanceSqToLine3`，再对每条边和每个候选顶点计算最近点。许多组合在一个坐标轴上就已经相距足够远。

原型为每条二维投影边预计算区间。若任一轴的区间距离平方已经大于等于原有 `RELATIVE_EPSILON * epsilonScale`，原来的严格小于判断不可能接受这一组合，因此跳过昂贵距离计算。其余组合仍运行原代码，保持遍历顺序、顶点合并、Delaunay、输出索引和分类不变。整体最坏复杂度仍为 O(E² + EV)，改进来自更便宜的排除，而非减少射线或近似几何。

这不是简单的端点包围盒：Three 的最近点使用浮点 `p + (q - p) * t`，且 t 被限制到 [0,1]。`p + (q - p)` 在 binary64 中可能不等于 q。原型区间包含 p、q 和这个实际算出的端点，利用浮点乘加的单调性包住有限的计算结果，再使用单轴平方下界。例如 p=1e16、q=1 时，计算端点为 0；只取 [1,1e16] 会错误排除与 0 的接触。该取消误差反例已纳入独立测试。

这里的证明针对现有距离判定的行为等价性，不会使原先不准确的距离/CSG 算法变成精确几何算法。没有改动原有 epsilon。

原型只多出一个 20 行辅助文件，并在 splitter 增加预计算及两处检查；消费者 backend/src 全部文件逐字节相同。

### 完整流水线的额外收益

本表参考版本是**已经包含前轮稳健 incircle 和向量池修复的 `adaptive-only`**；候选 `edge-bounds` 仅再加入上述距离预排除。不是与最初未优化 fork 比较，也不把两轮百分比直接相加。机器、依赖、3-worker、batch=100、1536 MiB geometry budget、UI 默认 10 mm 矩阵和完整本地流水线范围同前一节。

| 项目 | 模型 | 候选对 | 碰撞行 | 前轮版本 → 本轮候选 | 全流程额外下降 | CSG worker 时间下降 | 每版次数 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Digital Hub（新增验证） | 4 | 9,321 | 2,669 | 14.959 → 9.160 s | 38.8% | 31.2% | 3 |
| SGD Duplex（新增验证） | 2 | 60 | 10 | 2.120 → 1.990 s | 6.1% | 0.2% | 3 |
| WBDG Office | 3 | 7,761 | 2,691 | 11.837 → 9.018 s | 23.8% | 25.7% | 3 |
| BYH Donauwörth | 6 | 6,198 | 1,419 | 14.509 → 9.176 s | 36.8% | 29.6% | 3 |
| DMSW v28 | 5 | 94,436 | 18,087 | 96.845 → 89.431 s | 7.7% | 10.7% | 1 |
| BVG v1 | 5 | 47,811 | 17,727 | 151.571 → 117.145 s | 22.7% | 24.5% | 1 |

四个较短项目采用三轮中位数，交错执行顺序；两个大项目每版一次。共 28 次完整任务、424,534 次候选对评估；六个独立项目合计 165,587 对、42,603 行碰撞。所有 CSV 逐字节一致，覆盖记录除输出 URI 等非业务字段外一致，所有 evidence chunk 的实际 SHA-256 通过，evaluation failure 与 coverage error 都为零。

SGD Duplex 只有 60 对，CSG 中位数 0.443913 → 0.443111 worker-seconds，几乎没有改善；总任务 0.13 s 的差异不能归为稳定算法收益。BYH 时间范围为参考 14.194–17.712 s、候选 8.861–11.234 s；Digital Hub 为参考 14.823–15.228 s、候选 9.053–10.169 s。共享开发机仍有负载波动，没有大项目多轮置信区间，也未运行 Cloud Run。本轮不能推出对所有模型统一提速或降低部署内存的承诺。

独立预热重放（计时与字节哈希分开）：BVG 慢批 100 对的 CSG 32.688 → 26.914 s，下降 17.7%（单次）；另外 500 个 DMSW broad-phase 候选的三轮 CSG 中位数 2.114 → 1.447 s，下降 31.6%。这两组共 600 次 CSG 的完整结果，以及 position、normal、index 原始字节哈希和 drawRange 全部相同。

### 正确性证据及其边界

- 300,000 次线段对和 300,000 次点/线段距离检查，没有错误预排除；覆盖退化线段、相接、取消误差和 1e-300 至 1e300 坐标量级。
- 额外 1,000,000 次线段比较和 1,000,000 次点比较，阈值包含 0、最小 subnormal、实际距离及其相邻浮点数、Infinity；没有错误预排除。输入覆盖近接触、零长度、1e-320 至 1e300 量级。
- 2,640 项 CSG 输出检查没有差异、没有异常：360 个解析盒体场景 × 5 操作，另 120 个几何/配置组合 × 7 操作。比较所有属性及索引原始字节、groups、drawRange、结果矩阵及体积；覆盖 Float32/64、两种 splitter、box/sphere/torus/cylinder/open plane、旋转、大坐标、镜像、shear、缩放和 groups。
- 原库测试 46 passed、1 todo。解析盒体检查参考版本仍有 211 项失败，候选也是 211；这是**没有新增失败**，不是所有几何计算正确。singleton、mirror、shear 修复仍是合入性能改动之前的必要工作。
- 75 个输入文件 SHA-256 与大小、115 个冻结源码 SHA-256、两个产品仓库状态均复核一致。

### 水平容差早退被独立反例否定

“输入包围盒短边小于水平容差，则交集也小于容差”不成立。当前水平尺寸来自 XY 最小面积矩形的短边；这个量不随集合包含关系单调变化。不同的最优方向会改变短边。

独立构造一个封闭棱柱包含于矩形盒：外盒水平短边 9.677761 mm，实际 CSG 交集最小面积矩形短边 10.526883 mm，高度 100 mm，体积 16,536.846 mm³，分类为 Overlapping。对现有 10 mm（附加 0.1 mm 边界）的过滤契约，交集应保留，但按输入短边早退会漏报。该反例没有使用任何项目几何或对象类型。

另外，4×4×4 mm 的完全重合盒体分类为 Duplicate，当前契约明确不受 tolerance 过滤。任何通用早退都必须保留此例外，不能只检查尺寸。

### 垂直早退仍有很大机会，但没有认证为安全改动

本小节是早退尚未启用时的阶段性结论。后续已完成的输入认证与实际早退实验见本文最后一节；当前 CSG 输出等价性已被独立反例否定。

垂直方向固定为 world Z，真实几何交集的 Z 区间确实受两个输入区间交集限制，不存在上述水平最优方向问题。额外只读重放发现：慢批 100 对中，83 对的输入 AABB 交叠高度低于等于 10.1 mm，其中 81 对最后被 tolerance 过滤、2 对原始 CSG 为负，没有最终正例。这 83 对占该诊断重放 CSG 时间的 99.93%；这是候选工作的成本占比，**不是已实测的早退提速**。水平 XY 直径上界符合阈值的对数为零。

仍缺两个证明：第一，正式入口必须根据当前输入 metrics 排除可能为 Duplicate 的情况；不能先默认 Overlapping。第二，普通 `Box3.applyMatrix4` 不是认证的浮点上界，现有 CSG 也有已知的分类/矩阵错误，不能直接假定生成顶点及其后续度量严格位于输入 AABB 交集内。需要定义一般的浮点误差包络或认证的几何界限，并在修正后的 CSG 基线上验证所有变换、近容差、接触和多 brush 情况。不能为 BVG 的 8 mm 结果增加特定余量或对象白名单。本轮没有启用这个早退。

### 射线结果精简：收益不足，暂不优先

独立原型保留相同 BVH 遍历、三角形求交、最近命中及平局顺序，只为最终命中的三角形计算正反面，省去每个候选命中的 point/face/normal/UV 等结果构造。没有减少多数票或改变射线方向。

72,000 条独立射线与 BVH 原接口的最近 faceIndex、距离、点坐标和正反面完全一致，覆盖 direct/indirect、Float32/64、不同构建策略、有限 near/far、轴向含负零、表面起点及共位反向三角形。但 BVG 慢批单独只有 32.688 → 32.259 s（1.3%）差异；与 edge-bounds 组合为 26.121 s（相对参考下降 20.1%），比单独 edge-bounds 再少约 0.79 s，仅一次测量。

原型还依赖 BVH 0.9.11 的私有 `_roots`、`_indirectBuffer` 和节点布局。现有证据不足以为这一收益增加版本耦合；若未来继续，应从 BVH 的正式查询接口设计入手。不能把“采样里射线占比很高”推导为“精简命中对象必然大幅提速”。

### 本轮可复核产物

- [完整项目对照及每轮校验](__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/general-optimizations/comparison.json)
- [原型冻结清单与新增验证项目](__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/general-optimizations/validation-plan.json)
- [通用距离下界辅助函数](__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/root/variants/edge-bounds/csg/src/core/edgeBounds.js)
- [隔离 splitter 调用位置](__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/root/variants/edge-bounds/csg/src/core/CDTTriangleSplitter.js:21)
- [独立射线和距离性质检查](__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/general-optimizations/properties.json)
- [额外浮点边界检查](__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/general-optimizations/bounds-boundaries.json)
- [2,640 项 CSG 原始输出对照](__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/general-optimizations/csg-parity.json)
- [600 对真实数据原始几何和报告对照](__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/general-optimizations/probe-comparison.json)
- [水平容差反例](__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/general-optimizations/tolerance-counterexample.json)
- [垂直上界机会统计，未启用早退](__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/general-optimizations/tolerance-bound-opportunity.json)
- [库测试日志](__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/general-optimizations/library-tests.log)
- [输入、源码和产品仓库状态复核](__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/general-optimizations/integrity-check.json)

## 垂直高度认证与真实早退实验（2026-09-08）

### 判定的正确性范围

固定 world Z 上，真实交集属于两个输入几何的交集，因此其高度受输入 Z 区间交叠范围限制。本轮原型逐次向外舍入仿射变换的乘法、加法，以及最终高度相减和米到毫米的换算；使用相邻 binary64 值构成上界，不增加经验 epsilon。

实际入口先保留 exact-same-brush 的 Duplicate 快捷路径，再用现有输入 metrics 和 `classifyClash(intersectionVolume: Infinity)` 判断是否仍可能是 Duplicate。现行 Duplicate 必要条件是输入包围盒在 1 mm 内相互包含、输入体积差比例不超过 0.10，实际交集另需达到较小输入体积的 0.98。若这些输入条件可能满足，原型继续 CSG。这里沿用当前分类函数，没有重新发明分类阈值。

其余对象对先求**所有 brush A × brush B 非空 Z 交叠区间的总包围区间**，再判断认证高度是否不超过已有 `verticalToleranceMm + 0.1`。不能逐个跳过小交集：两个各高 4 mm、相隔 1 m 的交集，总高度为 1,004 mm，必须保留。无法认证的输入、关闭的垂直容差或溢出计算均继续原路径。原型不读取模型、GUID、IFC 类型或面数，也没有对 BVG 的 8 mm 数据增加特例。

界限相对于消费者已加载的静态 Float64 顶点和已存储的 affine Matrix4。局部包围盒来自 `geometryFromTypedArrays` 对全部顶点的 extrema 扫描；运行时 placement 不再改变，缓存以实际 Brush 实例为键。只需对局部盒的八个角执行区间运算，避免为每对重新扫描高面数几何。这里的包围盒所有权已追踪；不能把库中任意可能过期的 `geometry.boundingBox` 直接当成证明。

独立数值验证使用 BigInt 表示 binary64 的精确二进制有理数，不复用区间算法作为 oracle：

- 40,010 个仿射点案例，27,243 个成功认证；其余明确不认证，没有错误包围。
- 3,000 个 mesh 案例，2,968 个成功认证；独立三角形内部凸组合以及 20,842 个输入顶点的精确和普通浮点 Z 坐标均在界内。
- 30,000 个高度换算案例，29,997 个成功认证、3 个溢出拒绝；没有低估精确高度。
- 覆盖镜像、shear、零与负零、subnormal、取消误差、巨大有限值、溢出、非仿射矩阵及 10.1 mm 相邻浮点值。
- 5 个实际 CSG/消费者契约场景和 750 个 Duplicate 必要条件检查全部通过，包括微小 Duplicate、多 brush 总区间和阈值上方正例。

这些证据支持“真实有界输入几何的交集低于容差”的判定；不证明上游 IFC 转换、输入实体有效性、CSG 分类、体积或生成顶点均正确，也不保证沿用既有错误输出时报告逐字节不变。

### 已确认的输出等价性反例

独立构造封闭盒体 A = 4×4×1.8 m，使用普通 shear `z += 0.2*x`；盒体 B = 1×1×0.01009999999999999 m，沿 X 平移 0.3 m，严格包含于 A。认证输入交集高度为 **10.099999999999998 mm**，实际消费者对 CSG 输出度量得到 **10.100000000000026 mm**。它被分类为 Overlapping，体积约 10,100,000 mm³，没有被 tolerance 或 fill-ratio 过滤。

只做 B → A 局部坐标 → world 的浮点往返变换也会产生同样高度；无需极端 shear，也不是丢失 affine 矩阵才能触发。数学交集就是 B，现有输出产生近阈值误报。故输入认证可以纠正该负例，但不能宣称与现行数值输出等价。任意增加一个经验余量仍不能证明所有尺度与变换下的等价性。

随后六项目 shadow 执行全部 CSG，仅记录原型本来会跳过的对象对。165,587 对中有 45,264 对满足认证条件，其中当前对照报告仍有 44 条正例：WBDG 41 条，DMSW 3 条。其余四项目没有这类正例。

WBDG 的 41 条均在前轮 `edge-bounds` 报告中已经存在。三个代表案例另用完整输入顶点扫描、精确 BigInt world-Z 和实际输出 live index/drawRange 复核：

| 认证输入交叠高度上界 | 输出高度 | 活跃输出顶点 / 全部顶点 | 旧 edge-bounds 状态 |
|---:|---:|---:|---|
| 0.305 mm | 904 mm | 178 / 178 | 正例；原始 position/index 哈希及体积与控制组相同 |
| 0.280 mm | 20.72 mm | 80 / 80 | 正例；原始 position/index 哈希及体积与控制组相同 |
| 约 1.11e-13 mm | 26 mm | 550 / 550 | 正例；控制组改变了几何和体积 |

每对只有一次 CSG，fresh/cached 均复现，输入位置、矩阵和包围盒前后未变。904 mm 案例中有 26 个活跃输出顶点和 22 个完整三角形处于认证交叠 Z 区间之外。这不是未使用 position 尾部、缓存身份或多 brush 总高度的问题。

输入质量也是实证限制：904 mm 案例的一个 fitting 有 396 个唯一有向面，每面重复三次，共 1,188 个三角形；其他样例也有重复面或退化三角形。它们不满足库声明的正常闭合 two-manifold 输入要求。本轮确认了输出违反交集必要包围关系，但没有把重复面直接认定为根因，没有自动修复网格，也没有声称所有 WBDG 差异具有同一成因。

### 对照设计与诊断语义

两种计时版本都基于前两轮的 `edge-bounds`，再共同应用三项**诊断控制**：禁用 singleton shortcut、修正共面反射方向、保留完整 affine 结果矩阵。`vertical-control` 继续完整求交，`vertical-skip` 仅增加上述通用负例判定；281 个源码文件在计时前固定。

诊断控制不是最终修复：1,800 项解析盒体检查从原 fork 的 211 项失败恢复到旧 main 的 4 项失败，但现有库测试仍是 **44 passed、2 failed、1 todo**。两项失败是 singleton 点接触测试；全面禁用快捷路径没有正确区分点接触和沿边切割。DMSW 的那 3 条正例由该控制引入，前轮 `edge-bounds` 中没有，不能计入修复既有线上误报的收益。

早退不计算 raw CSG，因此负例的交集体积、尺寸和 rawCollision 不再有原来的诊断值；原型将未计算的数值标为 `NA`、rawCollision 标为 null。CSV 正例可以逐条核对，但原始负例诊断不等价。真实集成必须定义这种“由输入上界确认低于容差”的结果语义，并处理对应的证据/语义版本；不能伪造已执行 CSG 或将未计算体积写成零。此次只是隔离实验，没有修改产品 API 或版本。

### 完整流水线实测

沿用六个项目的相同 Parquet、矩阵、10 mm UI 容差、3 个 persistent worker、batch=100 和 1536 MiB geometry budget。计时包含数据加载、broad phase、缓存准备、narrow phase、CSV 与 coverage 写入及 worker 收尾；不包含网络下载、上传或 Cloud Run 启动。计时进程没有 shadow 逐对记录、CPU profiler 或原始几何哈希。各项目反转执行顺序复测，大项目每版两次、四个短项目每版三次，以下为每版中位数。

| 项目 | 候选对 | 对照 → 认证早退 | 全流程下降 | CSG worker 时间下降 | 提前排除对数 | 正例减少 | 每版次数 |
|---|---:|---:|---:|---:|---:|---:|---:|
| BVG v1 | 47,811 | 127.419 → 79.574 s | 37.5% | 47.8% | 6,510 | 0 | 2 |
| DMSW v28 | 94,436 | 84.062 → 77.298 s | 8.0% | 17.6% | 31,567 | 3（控制副作用） | 2 |
| WBDG Office | 7,761 | 8.633 → 6.443 s | 25.4% | 29.9% | 2,395 | 41（既有报告） | 3 |
| BYH Donauwörth | 6,198 | 8.917 → 8.074 s | 9.5% | 13.3% | 2,456 | 0 | 3 |
| Digital Hub | 9,321 | 8.934 → 8.653 s | 3.1% | 8.5% | 2,322 | 0 | 3 |
| SGD Duplex | 60 | 1.905 → 1.699 s | 10.8% | 24.7% | 14 | 0 | 3 |

六项目各版中位数之和为 **239.869 → 181.741 s，下降 24.2%**。这是本地这组负载的加权收益，不能推广成所有项目固定提速；尤其不能把它与前两轮百分比直接相加，因为本轮两版共同使用了不同的 CSG 诊断控制。

BVG 对照两次为 128.497、126.340 s，早退为 77.161、81.987 s；按对应轮次下降 40.0% 和 35.1%。DMSW 为 84.264、83.859 s 对 78.488、76.107 s，下降 6.9% 和 9.2%。WBDG 对照范围 8.600–9.936 s、早退 6.211–6.791 s。Digital Hub 只减少约 0.28 s、SGD 约 0.21 s，运行范围重叠且加载/启动占比高，不把这两项认定为稳定的整体提速。

认证判定本身的六项目 worker 耗时中位数之和约 **0.821 s**，已包含在上表总时间里。CSG worker 时间是所有 worker 的工作量总和，不是墙钟时间；不能直接用它推算用户等待时间。BVG 只有 13.6% 的候选对被排除，却集中消耗了 shadow 中约 47.1% 的 CSG 时间。DMSW 排除了 33.4% 的候选对，但剩余求交、加载和前处理仍然占主要成本，因此全流程改善小得多。

### 全量验证结果与实施边界

- 本轮共 **32 次计时全量任务 + 6 次 shadow 全量任务 = 38 次**，874,615 次候选对评估；覆盖六项目的 165,587 个独立候选对。所有任务 evaluation failure 与 coverage error 为零。
- 每次对照 CSV 均与 shadow 逐字节相同。每次早退恰好减少已记录的 WBDG 41 条和 DMSW 3 条，没有其他删除、没有新增、没有任何保留行字段变化。
- 178 条 Duplicate 全部原样保留：BVG 108、BYH 46、DMSW 24。其余三个项目没有 Duplicate。
- 每次 CSV SHA-256、coverage 文件 SHA-256、实际 evidence chunk 大小/数量/排序/首尾哈希及 digest、根据 CSV 独立重建的 detected-pair digest 均验证通过。coverage 除符合预期的 detectedPairs 及输出 URI 外相同；检测集合发生变化的两项目不宣称完整 coverage 字节相同。
- 75 个输入文件大小与 SHA-256、24 个项目配置文件、281 个冻结运行源码文件均未变。两版 CSG 源码完全相同；运行源码仅 `backend/src/core/narrow/narrow-phase.js` 不同，差异为认证早退及其计时。
- 两个产品仓库 HEAD、dirty 清单和 `git diff HEAD --binary` SHA-256 与本轮开始相同。所有执行进程结束；没有编辑产品、创建分支、提交、推送或发布。本轮未测整个进程树峰值 RSS，也未做 Cloud Run 验证。

结论：这个方向值得落地研究，BVG 的完整任务实测已从约两分钟降到约八十秒；输入高度证书也不需要模型特调。它应作为 **clash-detection 的通用几何负例判定**，而非加入 three-bvh-csg 的业务容差。下一步实现应复用已有 tolerance 常量及 Duplicate 条件，依赖受控的不可变几何缓存，并明确未求交结果的诊断含义。

在合入之前仍需完成 singleton 点接触/沿边切割的正确区分，并验证此前的镜像和 affine 修复；不能把本轮全面禁用 shortcut 的控制组作为最终修复。真实重复面问题需按输入几何契约进一步定位，不能因一个模型出现重复三角形就直接自动删面。前两轮已验证的行为等价性能优化，与本轮会纠正部分既有报告的几何判定，必须按各自的正确性契约验证。

### 本轮复核产物

- [完整计时、逐轮 CSV/coverage 对照](__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/vertical-bound/comparison.json)
- [全部执行 CSG 的 shadow 统计](__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/vertical-bound/shadow-summary.json)
- [认证算法与边界论证](__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/vertical-bound/numerics/PROOF.md)
- [独立精确算术检查](__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/vertical-bound/numerics/test-world-z-bounds.json)
- [Duplicate 与多 brush 契约检查](__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/vertical-bound/test-policy.json)
- [普通 shear 的独立阈值反例](__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/vertical-bound/numerics/output-overrun-reproduction.json)
- [真实 WBDG 顶点和索引复核](__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/vertical-bound/numerics/REAL-FORENSICS.md)
- [通用 whole-pair 判定原型](__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/vertical-bound/policy.mjs)
- [控制组库测试，含两项失败](__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/vertical-bound/control-library-tests.log)
- [输入、运行源码与产品状态复核](__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/vertical-bound/integrity-check.json)

## PR #2 最新 singleton 修复复核（2026-09-08）

远端 PR #2 的当前 head 为 [`febaf15b`](https://github.com/SiloLink/three-bvh-csg/commit/febaf15bc399d6a5167512bf355c84784fee2cd7)，合入 [PR #3](https://github.com/SiloLink/three-bvh-csg/pull/3)；PR #2 仍 open、尚未合入 main。本地产品 checkout 仍为 `d6709dd`，本次从 GitHub exact SHA 下载到独立 review-artifacts 目录验证，没有切换或修改产品仓库。

相对 `52f18b2`，提交只改两个文件：删除 `operations.js` 中“只有一个非共面三角形就跳回 half-edge component”的 10 行快捷路径，重写 `CSG.SingletonFragment.test.js`。恢复 upstream 的 split-fragment 处理能保留沿既有边发生的真实切割边界，不需要先人为判定 singleton 是点接触还是线接触。

**修正此前的测试判断**：旧的两个非共面测试以开放的单三角形作为 clipping brush B。README 的 hollow-operation 契约只允许 A 非闭合，仍要求 B 为闭合 two-manifold。其零三角形预期不足以定义合法输入行为，不能以这两项失败要求保留原错误 shortcut。新测试用闭合盒体覆盖点、边、面接触，并检查沿已有边切割的体积、表面积和边界；这不是单纯删掉合法失败场景来使测试变绿。此前“控制组两项测试失败，因此仍必须修复 singleton 点接触”的结论应撤回。历史控制的原始测试结果保留作为当时执行记录，不再作为该修复的阻碍。

本地 exact-head 验证：

- `npm test`：**70 passed、1 TODO、0 failed**，包括 28 项 singleton 回归；两种 splitter、Float32/Float64 均覆盖。
- `npm run lint`：exit 0，ESLint 0 errors、11 warnings，TypeScript no-emit 检查通过。
- 原审计沿边切割反例：两种 splitter × Float32/Float64，intersection 与 subtraction 体积均约 0.5；hollow intersection 面积 3、24 个三角形，全部恢复正确。
- 独立 360 场景 × 5 操作 sweep：失败从旧 fork 的 211 项降到 **4 项**；没有旧 main 通过而新 head 失败的场景。剩余 4 项在旧 main 中也失败，均为 CDT 盒体场景；部分错误输出数值不同，不能宣称所有操作与旧 main 逐字节等价。
- 镜像问题仍在：相同单位盒体仅镜像 B 的 X/Y/Z 任一轴，intersection 期望体积 1、实际为 0；再平移 X=0.2，期望 0.8、实际约 0.266667。
- shear 结果矩阵问题仍在：嵌套盒体 `x'=x+y`，CSG 结果更新 matrixWorld 前体积约 1，更新后约 **1.406678**；该提交没有修改 Evaluator 的 affine → TRS 路径。

因此，这项 singleton 回归可以标记为已修复；镜像、affine、向量池和性能候选属于其余审计项。此次没有对新 head 重跑六项目全量或性能测试，之前的提速数字不能改写为本提交的新实测结果。

证据：[汇总与源码/产品状态](__CSG_RESEARCH_ROOT__/review-artifacts/csg-pr2/febaf15-check/verification.json)、[库测试](__CSG_RESEARCH_ROOT__/review-artifacts/csg-pr2/febaf15-check/library-tests.log)、[lint](__CSG_RESEARCH_ROOT__/review-artifacts/csg-pr2/febaf15-check/lint.log)、[解析 sweep](__CSG_RESEARCH_ROOT__/review-artifacts/csg-pr2/febaf15-check/box-sweep.json)、[镜像复现](__CSG_RESEARCH_ROOT__/review-artifacts/csg-pr2/febaf15-check/mirror-results.jsonl)、[shear 复现](__CSG_RESEARCH_ROOT__/review-artifacts/csg-pr2/febaf15-check/shear-result.json)。

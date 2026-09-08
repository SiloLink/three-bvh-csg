from pathlib import Path
import json,statistics,collections
root=Path(__file__).resolve().parent;report=root.parent/'AUDIT.md';results=json.load(open(root/'comparison.json'));byname={r['project']:r for r in results};labels={'wbdg-office':'WBDG Office','byh-donauworth':'BYH Donauwörth','dmsw-v28':'DMSW v28','bvg-v1':'BVG v1'};order=list(labels)
lines=['## 本地全项目验证（后续实测）','',
'使用隔离的 clash-detection `f890805` 和 CSG fork `52f18b2`；候选仅改变 projected-vector pool 重置和 `robust-predicates@3.0.3` 的稳健 incircle。两份 backend/src 的逐文件 SHA-256 完全相同，CSG 仅两个文件不同。保留 Float64、Delaunay、normal、完整 INTERSECTION 和所有分类/容差规则。',
'',
'实际调用现有 `runBroadNarrowReport` 和本地原子报告 writer，使用 3 个 persistent worker、batch size 100、总 geometry budget 1536 MiB、cache frequency threshold 5。矩阵来自已有 UI parity builder，再经现有 normalizeMatrixRequest；水平和垂直容差均 10 mm，使用默认类型和语义过滤，不设楼层范围，不抽样候选。',
'',
'硬件：Mac16,8，14 核、48 GiB RAM，Node 24.16.0。每次独立进程、顺序运行 A/B；进程缓存重新建立，未清空 OS 文件缓存。计时包含 Parquet 加载、两次 broad phase、缓存策略、worker/CSG、结果指标、CSV 与覆盖记录写出及 worker 关闭。未计入 IFC 解析、上传下载、Cloud Run 启动或云端数据分组。',
'',
'| 完整项目 | 模型 | 候选对 | 碰撞行 | 原版 → 候选 | 全流程下降 | CSG 下降 | 每版次数 |',
'|---|---:|---:|---:|---:|---:|---:|---:|']
for name in order:
 r=byname[name];a=r['baseline'][0];models=len(json.load(open(root/name/'project.json'))['models']);lines.append(f"| {labels[name]} | {models} | {a['candidates']:,} | {a['clashes']:,} | {r['baselineMedianSeconds']:.2f} → {r['adaptiveMedianSeconds']:.2f} s | {r['wallReductionPercent']:.1f}% | {r['csgReductionPercent']:.1f}% | {len(r['baseline'])} |")
lines += ['',
'小项目采用 3 轮中位数，大项目为各 1 次全量。共完成 16 次完整任务、368,248 次候选对评估；四组单轮候选合计 156,206，对应 39,924 条碰撞。每个项目的全部 A/B CSV 逐字节相等；覆盖记录除产物 URI 外完全一致，实际 evidence chunk 的 SHA-256 也重新验证。所有任务 evaluation failures = 0，coverage errors = 0。',
'',
'共享开发机存在并发负载，短任务有可见波动：WBDG 原版 15.60–18.69 s、候选 11.43–14.83 s；BYH 原版 18.54–27.29 s、候选 14.21–15.16 s。未把偏慢的单次基线当作额外优化收益。大项目结果足以说明可行性，但没有多轮置信区间。',
'',
'用于同类工作负载的初步预算，可先按全流程耗时下降约 20%–30% 估算。不能把早期 37%–47% 的预热 CSG 收益直接用于整个任务，也不能把本机秒数用于 Cloud Run。历史 2026-07-11 DMSW 云端 297.89 s、Lars 63 分钟属于其他引擎/输入/机器条件，未作为本次 A/B 基线。',
'',
'### 内存边界','',
'Pool 修复消除了已经复现的强引用积累，但本次全任务 RSS 并没有一致下降。两秒采样的父进程加所有 worker 的 RSS 峰值：DMSW 6.48 → 7.97 GiB；BVG 6.24 → 7.64 GiB。该指标是进程 RSS 合计，不是容器独占物理内存；GC 时机和动态批次分配也没有固定。当前证据不支持降低部署内存配置或承诺整体内存收益。',
'',
'### BVG 的剩余热点','',
'候选版最慢 10 批、1,000 对，只占全部候选的 2.1%，消耗 54.3% 的 CSG 时间。第 240–244 批均为 electrical/IfcCableCarrierSegment 与 electrical/IfcBuildingElementProxy：500 对（1.0%）消耗候选版 CSG 的 39.3%，原版 134.99 → 候选 119.97 worker-seconds，仅降低 11.1%；最终只有 13 对进入碰撞报告。worker-seconds 为各 worker 时长之和，不能与墙钟时间直接相加。',
'',
'独立重放并 profile 第 241 批 100 对（不混入全量计时）：83 对为 124 × 64,536 个三角形；代表性 Proxy geometry_id=414693，有 30 个实例，Name 前缀为 Placeholder:Leehrrohr_Verteilerkasten_ERD。该批 98 对原始 CSG 判定相交，97 对随后被 tolerance 过滤，最终 1 对为碰撞；重放与完整 CSV 一致。采样自耗时约 46% 落在射线遍历/相交相关函数，edgesToIndices 和 distanceSqToLine3 合计约 14.5%。',
'',
'这为下一轮提供了具体目标：在这些实际负例上验证保守的容差上界提前排除，并减少高面数 Proxy 的射线分类及切割边工作。这里没有实现早退，也没有声称 97 对都可以安全提前排除。当前 tolerance 只过滤 Overlapping，且依赖相交体的定向包围盒；Duplicate 等分类、多个 brush、镜像/shear 与数值误差都必须保留。对无法证明安全的情况仍需完整 CSG。',
'',
'本次全量差分验证的是优化的行为一致性；上一轮已确认的 singleton、mirror、shear 正确性问题仍需修复，并在修正后的组合上重跑验证。',
'',
'### 全量证据','',
f'- [结果、全部轮次和 parity 检查]({root}/comparison.json)',
f'- [输入目录与机器配置]({root}/machine.json)',
f'- [源码与依赖 SHA 清单]({root}/code-manifest.json)',
f'- [57 个输入文件及仓库状态复核]({root}/integrity-check.json)',
f'- [完整流水线执行脚本]({root}/run-full.mjs)',
f'- [顺序执行与 RSS 采样脚本]({root}/run-queue.py)',
f'- [完整报告比较脚本]({root}/compare.py)',
f'- [BVG 慢批次与精确候选]({root}/bvg-v1/hot-batches.json)',
f'- [BVG 逐对 Trace 和三角形数量]({root}/bvg-v1/hot-241-diagnostics.json)',
f'- [BVG 慢批次 CPU profile]({root}/bvg-v1/hot-241-adaptive.cpuprofile)',
'']
s=report.read_text();s=s.replace('隔离实验和本地 DMSW 数据。','隔离实验和四个本地项目的完整流水线验证。');s=s.replace('仅使用两个独立调查子代理。','前期审计使用两个独立调查子代理；全量基准和后续 profile 未增加子代理。');s=s.replace('| Node | v24.16.0，macOS，本机单进程 |','| Node | v24.16.0，macOS；早期样本单进程，全量 3 个 persistent worker |');s=s.replace('没有运行当前 Cloud Run 服务、完整生产项目、所有模型、全部 worker 调度或端到端发布。','后续已补四项目全部模型、完整矩阵和 3-worker 流水线，见下文；未运行当前 Cloud Run 服务或端到端发布。');s=s.replace('4. 最后运行完整项目与真实 worker 配置，对比报告、峰值 RSS、GC、prep/CSG/加载/写出占比，再决定 npm 发布和消费者升级。','4. 本地完整项目与 3-worker 基线现已完成；正确性修复后重放同一项目，再在目标 Cloud Run 配置验证，之后决定 npm 发布和消费者升级。')
intro='后续四项目全量实测：完整流水线耗时下降 21.0%–27.7%，16 次任务的报告和覆盖记录一致，处理错误为零。完整项目收益及 BVG 剩余热点见后续全量验证章节。\n\n'
s=s.replace('## 审计基线\n',intro+'## 审计基线\n')
marker='## 本地全项目验证（后续实测）'
if marker in s:s=s[:s.index(marker)]
s=s.rstrip()+'\n\n'+'\n'.join(lines);report.write_text(s)
print('Updated',report,'full benchmark section line',s[:s.index(marker)].count('\n')+1)

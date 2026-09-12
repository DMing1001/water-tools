# 水利计算工具集 | Water Engineering Tools

在线水利工程计算工具集合，依据国家及行业规范编制。

🔗 **在线使用：** https://citeglow.com/water-tools/

> 说明：工具集定位为自用与熟悉用户的工程计算页，**暂不与主站「引用追踪 / 期刊投稿」做强绑定**；主站导航入口已预留，待内容更成熟后再公开推送。

## 工具列表

### 堤防工程
- ✅ [堤顶高程计算](./dike-crest-elevation/) — GB 50286-2013 莆田试验站公式（已上线）
- ⚠️ [堤防渗流计算](./seepage.html) — 浸润线 / 渗流量 / 出逸比降（**待验证**）
- ⚠️ [堤防稳定分析](./stability.html) — 瑞典圆弧法 / 毕肖普法（**待验证**）

### 桥梁水文
- ✅ [桥墩冲刷计算](./bridge-scour/) — SL/T 808-2025、JTG C30、TB 10017（已上线）
- ✅ [桥梁壅水计算](./bridge-scour/backwater.html) — TB 10017 / JTG C30-2015（已上线）

### 水力学
- ✅ [水位流量关系计算](./manning-qh.html) — Manning + 堰流 + 复合断面（已上线）
- 🚧 水跃计算 — 共轭水深、水跃长度、能量损失（开发中）

### 水文
- ✅ [P-III 型 Kp 值查询](./kp-table/) — 陕西省水文手册完整表（已上线）
- 🚧 [水文频率分析](./frequency-analysis/) — P-III 型曲线适配 / 设计洪水（开发中，预览页）
- 🚧 暴雨强度公式 — 参数拟合与计算（开发中）

图例：✅ 已上线　⚠️ 待验证（公式需再与规范/Excel 交叉核对）　🚧 开发中

## 技术栈

- 纯前端：HTML + CSS + JavaScript，单文件或少量文件
- 零依赖，浏览器直接打开
- 支持 GitHub Pages / Vercel 静态部署

## 使用方式

1. 直接用浏览器打开对应的 `index.html`
2. 或访问线上地址 https://citeglow.com/water-tools/

## 添加新工具

1. 在根目录创建新文件夹（如 `new-tool/`）或独立 HTML
2. 放入 `index.html`（或工具页）
3. 在根目录 `index.html` 的工具列表中添加卡片（含状态标签）
4. 同步本 README 与完成度
5. **双仓库同步**：`water-tools` 与 `Citation-tracker/water-tools` 都要更新
6. Push 即上线（citeglow.com 从 Citation-tracker 部署）

## 免责声明

本工具集仅供参考学习，实际工程请以规范原文及审查意见为准。

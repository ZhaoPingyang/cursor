# 贵金属实时行情 Web 应用（黄金 / 白银）

这是在 `cursor` 仓库下创建的一个纯前端 Web 应用，用于**实时获取并展示当前市场黄金、白银的价格变化以及交易相关数据**。  
数据来源于 **Metals.Dev** 提供的公开 API。

> 注意：为了安全起见，本项目不会在代码中硬编码任何 API Key，需要你在界面中手动输入自己的 Metals.Dev API Key。

## 功能特性

- **实时价格**：定时从 Metals.Dev 拉取最新的黄金、白银现货价格。
- **价格变化**：在应用运行期间，对比上一次请求结果，显示价格涨跌及百分比变化。
- **多市场交易数据（部分）**：展示 Metals.Dev 提供的部分交易相关指标，例如：
  - `lbma_gold_am` / `lbma_gold_pm`
  - `lbma_silver`
  - `mcx_gold` / `mcx_silver`
  - `ibja_gold`
- **多币种支持**：可切换 USD / EUR / CNY 等计价货币。
- **可配置刷新间隔**：支持自定义刷新频率（默认 10 秒）。
- **原始数据查看**：右下角展示完整 JSON 响应，方便调试或二次开发。

## 目录结构

```text
precious-metals-dashboard/
  ├─ index.html     # 主页面
  ├─ style.css      # 样式（纯 CSS，现代卡片风格）
  └─ app.js         # 业务逻辑：调用 API、更新 DOM、轮询
```

## 使用方法

1. 在浏览器中打开 `index.html`（例如用 VSCode / Cursor 的 Live Server，或直接用系统浏览器打开文件）。
2. 注册或登录 [Metals.Dev](https://metals.dev/) 获取一个 API Key（有免费计划）。
3. 在页面右上角输入框中粘贴你的 **API Key**。
4. 选择计价货币、刷新间隔，点击「开始实时获取」。
5. 稍等片刻，即可看到黄金 / 白银价格、涨跌情况以及部分交易市场数据。

## API 说明（简要）

项目使用的主要接口：

```text
GET https://api.metals.dev/v1/latest?api_key=YOUR_KEY&currency=USD&unit=toz
```

核心返回字段（节选）：

- `metals.gold` / `metals.silver`：黄金、白银现货价格。
- `metals.lbma_gold_am` / `metals.lbma_gold_pm`：伦敦金（AM / PM）定盘价。
- `metals.lbma_silver`：伦敦银定盘价。
- `metals.mcx_gold` / `metals.mcx_silver`：MCX 市场价格。
- `metals.ibja_gold`：IBJA 市场黄金价格。
- `currency`：此次请求使用的货币（例如 `USD`）。
- `unit`：单位（例如 `toz`）。
- `timestamp`：数据时间戳。

## 安全与部署提示

- 浏览器前端直连 Metals.Dev 时，**API Key 会在前端暴露**，适合自用工具或内网环境。
- 如果你打算对外公开部署，建议增加一个后端代理服务，由后端持有 API Key，前端只访问你的后端接口。

## 后续可以扩展的方向

- 增加历史价格曲线（调用 Metals.Dev 的历史或时间序列接口）。
- 支持更多金属品种（铂金、钯金等）。
- 提供告警功能（价格突破某个阈值时提醒）。


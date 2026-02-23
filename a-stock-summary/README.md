# A股当日市场摘要

一个简单的 Web 应用，用于快速查看当日 A 股市场数据摘要，包括主要指数、两市涨跌家数、成交额以及涨跌幅榜。

## 功能

- **主要指数**：上证指数、深证成指、创业板指、科创50、沪深300、上证50、中小100 的实时行情与涨跌幅
- **两市概览**：上涨/下跌/平盘家数、涨停/跌停家数、两市总成交额
- **涨幅榜 / 跌幅榜**：当日涨幅、跌幅前列的个股列表

## 环境要求

- Python 3.8+
- 网络可访问 A 股数据源（新浪、东方财富等，由 akshare 使用）

## 安装与运行

```bash
cd a-stock-summary
# 若系统没有 pip 命令，用下面任一方式安装依赖：
python3 -m pip install -r requirements.txt
# 或：pip3 install -r requirements.txt

python3 app.py
```

在浏览器中打开：<http://127.0.0.1:5050>

## 技术说明

- **后端**：Flask，使用 [AKShare](https://github.com/akfamily/akshare) 获取 A 股实时行情与指数数据
- **前端**：原生 HTML/CSS/JS，深色主题，响应式布局
- 数据仅供学习与参考，不构成任何投资建议

## 接口

| 路径 | 说明 |
|------|------|
| `GET /` | 前端页面 |
| `GET /api/summary` | 当日摘要（指数 + 两市概览） |
| `GET /api/hot` | 涨幅榜 |
| `GET /api/fall` | 跌幅榜 |

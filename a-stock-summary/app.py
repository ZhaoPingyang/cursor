# -*- coding: utf-8 -*-
"""
A股当日市场数据摘要 - 后端 API
使用东方财富 push2 接口获取实时/当日数据并汇总
"""
import json
from datetime import datetime
from typing import List, Dict, Any

import requests
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__, static_folder="static", static_url_path="")
CORS(app)


# -----------------------------
# 东方财富 HTTP 接口封装
# -----------------------------

EM_HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json, text/plain, */*",
}


def _em_get(url: str, params: Dict[str, Any], timeout: float = 5.0) -> Dict[str, Any]:
    """简单封装 GET 请求，带超时和基础错误处理"""
    resp = requests.get(url, params=params, headers=EM_HEADERS, timeout=timeout)
    resp.raise_for_status()
    # 东方财富返回 JSON，最外层就是对象
    return resp.json()


def fetch_a_share_list() -> List[Dict[str, Any]]:
    """
    从东方财富 clist 接口获取全市场 A 股快照
    字段：
      f12: 代码
      f14: 名称
      f2 : 最新价
      f3 : 涨跌幅(%)
      f4 : 涨跌额
      f6 : 成交额(元)
    """
    url = "https://push2.eastmoney.com/api/qt/clist/get"
    params = {
        "pn": 1,
        "pz": 5000,          # 覆盖全部 A 股
        "po": 1,
        "np": 1,
        "fltt": 2,
        "invt": 2,
        "fid": "f3",
        "fs": "m:0+t:6",     # 沪深京 A 股
        "fields": "f12,f14,f2,f3,f4,f6",
    }
    data = _em_get(url, params)
    diff = (data.get("data") or {}).get("diff") or []
    out: List[Dict[str, Any]] = []

    def _detect_market_from_code(code: str) -> str:
        """
        根据股票代码简单区分沪/深：
          - 沪市常见：600/601/603/605/688/689/900 开头
          - 深市常见：000/001/002/003/300/301 开头
          其余标记为 OTHER
        """
        if not code:
            return "OTHER"
        prefix3 = code[:3]
        if prefix3 in {"600", "601", "603", "605", "688", "689", "900"}:
            return "SH"
        if prefix3 in {"000", "001", "002", "003", "300", "301"}:
            return "SZ"
        return "OTHER"

    for item in diff:
        code = item.get("f12") or ""
        out.append(
            {
                "code": code,                     # 股票代码
                "name": item.get("f14"),          # 名称
                "price": item.get("f2"),          # 最新价
                "pct_change": item.get("f3"),     # 涨跌幅
                "change": item.get("f4"),         # 涨跌额
                "amount": item.get("f6"),         # 成交额(元)
                "market": _detect_market_from_code(code),  # 市场：SH / SZ / OTHER
            }
        )
    return out


def get_index_spot() -> List[Dict[str, Any]]:
    """获取主要指数实时行情（东方财富 ulist.np 接口）"""
    url = "https://push2.eastmoney.com/api/qt/ulist.np/get"
    # secids: 市场.代码  1=上证 0=深证
    index_map = {
        "1.000001": "上证指数",
        "0.399001": "深证成指",
        "0.399006": "创业板指",
        "1.000688": "科创50",
        "1.000300": "沪深300",
        "1.000016": "上证50",
        "0.399005": "中小100",
    }
    params = {
        "fltt": 2,
        "invt": 2,
        "fields": "f2,f3,f4,f12,f13,f14,f5,f6,f15,f16,f17,f18",
        "secids": ",".join(index_map.keys()),
    }
    try:
        data = _em_get(url, params)
    except Exception as e:
        return [{"error": f"获取指数失败: {e}"}]

    diff = (data.get("data") or {}).get("diff") or []
    out: List[Dict[str, Any]] = []
    for item in diff:
        code = item.get("f12")
        name = index_map.get(f"{item.get('f13')}.{code}", item.get("f14") or "")
        out.append(
            {
                "code": code,
                "name": name,
                "price": float(item.get("f2") or 0),
                "change": float(item.get("f4") or 0),
                "pct_change": float(item.get("f3") or 0),
                "open": float(item.get("f17") or 0),
                "high": float(item.get("f15") or 0),
                "low": float(item.get("f16") or 0),
                "volume": float(item.get("f5") or 0),
                "amount": float(item.get("f6") or 0),
            }
        )
    return out


def get_market_summary():
    """获取两市概览：涨跌家数、成交额等（基于 A 股实时行情聚合）"""
    try:
        snapshot = fetch_a_share_list()
        if not snapshot:
            return {"error": "未获取到行情数据"}

        up = down = flat = 0
        limit_up = limit_down = 0
        total_amount = 0.0

        for item in snapshot:
            pct = float(item.get("pct_change") or 0)
            amt = float(item.get("amount") or 0)
            total_amount += amt
            if pct > 0:
                up += 1
            elif pct < 0:
                down += 1
            else:
                flat += 1

            # 涨跌停（近似：涨跌幅 >= 9.9 或 <= -9.9）
            if pct >= 9.9:
                limit_up += 1
            elif pct <= -9.9:
                limit_down += 1

        return {
            "up": up,
            "down": down,
            "flat": flat,
            "total_amount": round(total_amount, 2),
            "limit_up": limit_up,
            "limit_down": limit_down,
            "total_count": len(snapshot),
        }
    except Exception as e:
        return {"error": str(e)}


def get_hot_stocks(asc=False, top=10):
    """获取涨幅或跌幅前 N 的个股（asc=True 为跌幅榜）"""
    try:
        snapshot = fetch_a_share_list()
        if not snapshot:
            return []

        # 排序：涨幅榜降序，跌幅榜升序
        snapshot_sorted = sorted(
            snapshot,
            key=lambda x: float(x.get("pct_change") or 0),
            reverse=not asc,
        )
        top_list = snapshot_sorted[:top]

        return [
            {
                "code": str(item.get("code") or ""),
                "name": str(item.get("name") or ""),
                "price": float(item.get("price") or 0),
                "pct_change": float(item.get("pct_change") or 0),
                "amount": float(item.get("amount") or 0),
                "market": str(item.get("market") or ""),
            }
            for item in top_list
        ]
    except Exception as e:
        return []


@app.route("/")
def index():
    return send_from_directory("static", "index.html")


@app.route("/api/summary")
def api_summary():
    """当日市场摘要：指数 + 两市涨跌家数 + 成交额"""
    indices = get_index_spot()
    summary = get_market_summary()
    if isinstance(indices, list) and isinstance(summary, dict) and "error" in summary:
        return jsonify({"indices": indices, "market": summary, "ok": False})
    return jsonify({
        "indices": indices,
        "market": summary,
        "date": datetime.now().strftime("%Y-%m-%d"),
        "time": datetime.now().strftime("%H:%M:%S"),
        "ok": True,
    })


@app.route("/api/hot")
def api_hot():
    """涨幅榜"""
    return jsonify({"list": get_hot_stocks(asc=False, top=15), "ok": True})


@app.route("/api/fall")
def api_fall():
    """跌幅榜"""
    return jsonify({"list": get_hot_stocks(asc=True, top=15), "ok": True})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5050, debug=True)

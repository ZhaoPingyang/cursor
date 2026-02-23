(function () {
  const API_BASE = "";

  // 简单的会话内时序数据，用于折线图
  let indexChart = null;
  let marketChart = null;
  const timeLabels = [];
  const shSeries = [];
  const szSeries = [];
  const upSeries = [];
  const downSeries = [];
  const MAX_POINTS = 60; // 最多保留 60 个点

  function el(id) {
    return document.getElementById(id);
  }

  function formatNum(n) {
    if (n == null || Number.isNaN(n)) return "—";
    return Number(n).toLocaleString("zh-CN", { maximumFractionDigits: 2 });
  }

  function formatPct(n) {
    if (n == null || Number.isNaN(n)) return "—";
    const s = (Number(n) >= 0 ? "+" : "") + Number(n).toFixed(2) + "%";
    return s;
  }

  function pctClass(pct) {
    if (pct == null || Number.isNaN(pct)) return "flat";
    const n = Number(pct);
    if (n > 0) return "up";
    if (n < 0) return "down";
    return "flat";
  }

  function formatAmount(yuan) {
    if (yuan == null || Number.isNaN(yuan)) return "—";
    const yi = Number(yuan) / 1e8;
    if (yi >= 10000) return (yi / 10000).toFixed(2) + " 万亿";
    return yi.toFixed(2) + " 亿";
  }

  function renderIndices(data) {
    const container = el("indexGrid");
    if (!data || data.length === 0) {
      container.innerHTML = '<div class="error">暂无指数数据</div>';
      return;
    }
    if (data.error) {
      container.innerHTML = '<div class="error">' + (data.error || "加载失败") + "</div>";
      return;
    }
    container.innerHTML = data
      .map(
        (item) => `
        <div class="index-card">
          <div class="name">${item.name || ""}</div>
          <div class="price">${formatNum(item.price)}</div>
          <div class="pct ${pctClass(item.pct_change)}">${formatPct(item.pct_change)}</div>
        </div>
      `
      )
      .join("");
  }

  function renderMarket(market) {
    const container = el("marketOverview");
    if (!market || market.error) {
      container.innerHTML =
        '<div class="error">' + (market && market.error ? market.error : "暂无概览数据") + "</div>";
      return;
    }
    container.innerHTML = `
      <div class="overview-item up">
        <div class="label">上涨家数</div>
        <div class="value">${formatNum(market.up)}</div>
      </div>
      <div class="overview-item down">
        <div class="label">下跌家数</div>
        <div class="value">${formatNum(market.down)}</div>
      </div>
      <div class="overview-item">
        <div class="label">平盘</div>
        <div class="value">${formatNum(market.flat)}</div>
      </div>
      <div class="overview-item up">
        <div class="label">涨停</div>
        <div class="value">${formatNum(market.limit_up)}</div>
      </div>
      <div class="overview-item down">
        <div class="label">跌停</div>
        <div class="value">${formatNum(market.limit_down)}</div>
      </div>
      <div class="overview-item amount">
        <div class="label">两市成交额</div>
        <div class="value">${formatAmount(market.total_amount)}</div>
      </div>
    `;
  }

  function updateCharts(summaryData) {
    if (!summaryData) return;

    const timeLabel = summaryData.time || "";
    const indices = summaryData.indices || [];
    const market = summaryData.market || {};

    // 选取上证指数和深证成指
    const sh = indices.find((i) => (i.name || "").includes("上证指数"));
    const sz = indices.find((i) => (i.name || "").includes("深证成指"));

    timeLabels.push(timeLabel);
    shSeries.push(sh ? Number(sh.price) || 0 : 0);
    szSeries.push(sz ? Number(sz.price) || 0 : 0);
    upSeries.push(market.up != null ? Number(market.up) : 0);
    downSeries.push(market.down != null ? Number(market.down) : 0);

    // 控制数组长度
    const trimTo = (arr) => {
      while (arr.length > MAX_POINTS) arr.shift();
    };
    trimTo(timeLabels);
    [shSeries, szSeries, upSeries, downSeries].forEach(trimTo);

    const commonOptions = {
      responsive: true,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: true },
        tooltip: { enabled: true },
      },
      scales: {
        x: {
          ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
        },
      },
    };

    const indexCtx = document.getElementById("indexChart").getContext("2d");
    const marketCtx = document.getElementById("marketChart").getContext("2d");

    if (!indexChart) {
      indexChart = new Chart(indexCtx, {
        type: "line",
        data: {
          labels: timeLabels,
          datasets: [
            {
              label: "上证指数",
              data: shSeries,
              borderColor: "#d81e06",
              backgroundColor: "rgba(216,30,6,0.1)",
              tension: 0.2,
            },
            {
              label: "深证成指",
              data: szSeries,
              borderColor: "#0052d9",
              backgroundColor: "rgba(0,82,217,0.1)",
              tension: 0.2,
            },
          ],
        },
        options: commonOptions,
      });
    } else {
      indexChart.data.labels = [...timeLabels];
      indexChart.data.datasets[0].data = [...shSeries];
      indexChart.data.datasets[1].data = [...szSeries];
      indexChart.update();
    }

    if (!marketChart) {
      marketChart = new Chart(marketCtx, {
        type: "line",
        data: {
          labels: timeLabels,
          datasets: [
            {
              label: "上涨家数",
              data: upSeries,
              borderColor: "#f44336",
              backgroundColor: "rgba(244,67,54,0.1)",
              tension: 0.2,
            },
            {
              label: "下跌家数",
              data: downSeries,
              borderColor: "#009688",
              backgroundColor: "rgba(0,150,136,0.1)",
              tension: 0.2,
            },
          ],
        },
        options: commonOptions,
      });
    } else {
      marketChart.data.labels = [...timeLabels];
      marketChart.data.datasets[0].data = [...upSeries];
      marketChart.data.datasets[1].data = [...downSeries];
      marketChart.update();
    }
  }

  function renderTable(containerId, list) {
    const container = el(containerId);
    if (!list || list.length === 0) {
      container.innerHTML = '<div class="error">暂无数据</div>';
      return;
    }
    container.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>代码</th>
            <th>市场</th>
            <th>名称</th>
            <th>最新价</th>
            <th>涨跌幅</th>
            <th>成交额</th>
          </tr>
        </thead>
        <tbody>
          ${list
            .map(
              (row) => `
            <tr>
              <td>${row.code || ""}</td>
              <td>${row.market === "SH" ? "沪" : row.market === "SZ" ? "深" : (row.market || "")}</td>
              <td>${row.name || ""}</td>
              <td>${formatNum(row.price)}</td>
              <td class="pct-cell ${pctClass(row.pct_change)}">${formatPct(row.pct_change)}</td>
              <td class="amount-cell">${formatAmount(row.amount)}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;
  }

  async function fetchSummary() {
    try {
      const res = await fetch(API_BASE + "/api/summary");
      const data = await res.json();
      el("date").textContent = data.date || "";
      el("time").textContent = data.time || "";
      renderIndices(data.indices || []);
      renderMarket(data.market || {});
      updateCharts(data);
    } catch (e) {
      renderIndices({ error: "网络错误" });
      renderMarket({ error: "网络错误" });
    }
  }

  async function fetchHot() {
    try {
      const res = await fetch(API_BASE + "/api/hot");
      const data = await res.json();
      renderTable("hotTable", data.list || []);
    } catch (e) {
      el("hotTable").innerHTML = '<div class="error">加载失败</div>';
    }
  }

  async function fetchFall() {
    try {
      const res = await fetch(API_BASE + "/api/fall");
      const data = await res.json();
      renderTable("fallTable", data.list || []);
    } catch (e) {
      el("fallTable").innerHTML = '<div class="error">加载失败</div>';
    }
  }

  async function refresh() {
    el("btnRefresh").disabled = true;
    await Promise.all([fetchSummary(), fetchHot(), fetchFall()]);
    el("btnRefresh").disabled = false;
  }

  el("btnRefresh").addEventListener("click", refresh);
  refresh();
})();

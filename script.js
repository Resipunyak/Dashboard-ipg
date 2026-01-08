const csvUrl =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vSPZTE6FgI7d2Dy5ErZpf5w-PvK1fvRkDsPiKKwaG_D8bQY8BSVZQSkXVeKnlu9sQ/pub?output=csv";

let statusChart, segmentChart, monthlyChart;

/* ================= DATE PARSER ================= */
function parseDate(val) {
  if (!val) return null;

  // kalau sudah Date object
  if (val instanceof Date) return val;

  const s = val.toString().trim();

  // format: 3-Jan / 03-Jan / 3- Jan
  const m = s.match(/(\d{1,2})\s*-\s*([A-Za-z]{3})/);
  if (m) {
    return new Date(`${m[1]}-${m[2]}-2026`);
  }

  return null;
}


/* ================= LOAD CSV ================= */
Papa.parse(csvUrl, {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: res => processData(res.data)
});

Chart.defaults.font.family = "Segoe UI, Arial, sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.color = "#374151";
Chart.defaults.devicePixelRatio = 2; // 🔥 HD / Retina

/* ================= PROCESS ================= */
function processData(data) {
  let open = 0, close = 0, qtyTotal = 0;
  let segmentCount = {}, monthly = {};

  const tbody = document.getElementById("projectTable");
  tbody.innerHTML = "";

  data.forEach((row, i) => {

    // 🔥 NORMALIZE HEADER
    const d = {};
    Object.keys(row).forEach(k => {
      const clean = k.replace(/\s+/g," ").replace(/\n/g,"").trim();
      d[clean] = row[k];
    });

    const rawStatus = (d["STATUS DELIVERY"] || "")
  .toString()
  .trim()
  .toUpperCase();

let status = null;

if (rawStatus === "OPEN") {
  status = "OPEN";
} else if (rawStatus === "CLOSED") {
  status = "CLOSE";
}

if (!status) return; // buang data invalid


    status === "OPEN" ? open++ : close++;

    const qty = Number(d["QTY PROD"]) || 0;
    qtyTotal += qty;

    const seg = d["SEGMENT"] || "Unknown";
    segmentCount[seg] = (segmentCount[seg] || 0) + 1;

const etd = (d["ETD"] || "").toString().trim();

// ambil bulan dari ETD: 3-Jan / 03-Jan / 3-Jan-2026
const etdDate = parseDate(d["ETD"]);
if (etdDate) {
  const now = new Date();
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const key = monthNames[etdDate.getMonth()] + " 2026";

  if (!monthly[key]) {
    monthly[key] = { OPEN: 0, CLOSE: 0 };
  }

  // 🔥 RULE BISNIS
  if (status === "CLOSE") {
    monthly[key].CLOSE++;
  } else if (status === "OPEN" && etdDate >= now) {
    // OPEN hanya boleh muncul di bulan sekarang & depan
    monthly[key].OPEN++;
  }
}



    tbody.innerHTML += `
      <tr>
        <td>${i+1}</td>
        <td>${d["CUSTOMER"]||"-"}</td>
        <td>${d["PART NUMBER"]||"-"}</td>
        <td>${qty}</td>
        <td>${d["EVENT"]||"-"}</td>
        <td>${d["ETD"]||"-"}</td>
        <td class="status-${status.toLowerCase()}">${status}</td>
      </tr>`;
  });
  

  /* KPI */
  document.getElementById("kpiOpen").innerText = open;
  document.getElementById("kpiTotal").innerText = open + close;
  document.getElementById("kpiQty").innerText = qtyTotal;

buildStatus(open, close);
buildSegment(segmentCount);
buildMonthly(monthly);

// 🔥 WAJIB: paksa canvas render
forceChartResize();


}

/* ================= CHARTS ================= */
function buildStatus(o, c){
  statusChart?.destroy();

  const ctx = document.getElementById("statusChart");

  statusChart = new Chart(ctx,{
    type:"bar",
    data:{
      labels:["OPEN","CLOSE"],
      datasets:[{
        data:[o,c],
        backgroundColor:[COLORS.open, COLORS.close],
        borderRadius: 8,
        barThickness: 50
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      plugins:{
        legend:{ display:false },
        tooltip:{ enabled:true }
      },
      scales:{
        x:{ grid:{ display:false } },
        y:{
          beginAtZero:true,
          grid:{ color: COLORS.grid }
        }
      }
    }
  });
}



function buildSegment(d){
  segmentChart?.destroy();

  const labels = Object.keys(d);
  const values = Object.values(d);
  const total = values.reduce((a,b)=>a+b,0);

  segmentChart = new Chart(document.getElementById("segmentChart"),{
    type:"doughnut",
    data:{
      labels,
      datasets:[{
        data:values,
        backgroundColor:[
          COLORS.pink,
          COLORS.blue,
          COLORS.yellow,
          COLORS.green,
          COLORS.purple
        ],
        borderWidth: 4,
        borderColor: "#fff"
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      cutout:"60%",
      plugins:{
        legend:{ position:"bottom" },
        tooltip:{ enabled:true },
        datalabels:{
          color:"#fff",
          font:{ weight:"bold" },
          formatter:v=>Math.round(v/total*100)+"%"
        }
      }
    },
    plugins:[ChartDataLabels]
  });
}


function buildMonthly(d){
  const order = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const lbl = order
  .map(m => m + " 2026")
  .filter(k => d[k]);

  monthlyChart?.destroy();

  monthlyChart = new Chart(document.getElementById("monthlyChart"),{
    type:"bar",
    data:{
      labels:lbl,
      datasets:[
        {
          label:"OPEN",
          data:lbl.map(k=>d[k].OPEN),
          backgroundColor: COLORS.open,
          borderRadius: 6
        },
        {
          label:"CLOSE",
          data:lbl.map(k=>d[k].CLOSE),
          backgroundColor: COLORS.close,
          borderRadius: 6
        }
      ]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      plugins:{
        legend:{ position:"top" }
      },
      scales:{
        x:{ stacked:true, grid:{ display:false }},
        y:{
          stacked:true,
          beginAtZero:true,
          grid:{ color: COLORS.grid }
        }
      }
    }
  });
}


const COLORS = {
  open: "#22c55e",
  close: "#ef4444",
  blue: "#3b82f6",
  yellow: "#facc15",
  green: "#16a34a",
  pink: "#db2777",
  purple: "#8b5cf6",
  grid: "#e5e7eb"
};
function forceChartResize() {
  setTimeout(() => {
    window.dispatchEvent(new Event("resize"));
  }, 300);
}
function updateDateTime() {
  const now = new Date();

  const dateOptions = {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  };

  const timeOptions = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  };

  document.getElementById("currentDate").innerText =
    now.toLocaleDateString('en-GB', dateOptions);

  document.getElementById("currentTime").innerText =
    now.toLocaleTimeString('en-GB', timeOptions);
}

setInterval(updateDateTime, 1000);
updateDateTime();

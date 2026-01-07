const csvUrl =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vSPZTE6FgI7d2Dy5ErZpf5w-PvK1fvRkDsPiKKwaG_D8bQY8BSVZQSkXVeKnlu9sQ/pub?output=csv";

let statusChart, segmentChart, monthlyChart;

/* ================= DATE PARSER ================= */
function parseDate(val) {
  if (!val) return null;
  val = val.toString().trim();

  if (/^\d{1,2}-[A-Za-z]{3}$/.test(val)) {
    return new Date(`${val}-2026`);
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

    const rawStatus = (d["STATUS DELIVERY"] || "").toUpperCase();
    const status =
      rawStatus.includes("OPEN") ? "OPEN" :
      rawStatus.includes("CLOSE") ? "CLOSE" : null;
    if (!status) return;

    status === "OPEN" ? open++ : close++;

    const qty = Number(d["QTY PROD"]) || 0;
    qtyTotal += qty;

    const seg = d["SEGMENT"] || "Unknown";
    segmentCount[seg] = (segmentCount[seg] || 0) + 1;

    const dt = parseDate(d["ETD"]);
    if (dt) {
      const key = dt.toLocaleString("en-US",{month:"short",year:"numeric"});
      if (!monthly[key]) monthly[key]={OPEN:0,CLOSE:0};
      monthly[key][status]++;
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

  buildStatus(open,close);
  buildSegment(segmentCount);
  buildMonthly(monthly);
}

/* ================= CHARTS ================= */
function buildStatus(o,c){
  statusChart?.destroy();
  statusChart=new Chart(document.getElementById("statusChart"),{
    type:"bar",
    data:{labels:["OPEN","CLOSE"],datasets:[{data:[o,c],backgroundColor:["#22c55e","#ef4444"]}]},
    options:{responsive:true,maintainAspectRatio:false}
  });
}

function buildSegment(d){
  segmentChart?.destroy();
  segmentChart=new Chart(document.getElementById("segmentChart"),{
    type:"pie",
    data:{labels:Object.keys(d),datasets:[{data:Object.values(d)}]},
    plugins:[ChartDataLabels]
  });
}

function buildMonthly(d){
  const lbl=Object.keys(d);
  if(!lbl.length) return;
  monthlyChart?.destroy();
  monthlyChart=new Chart(document.getElementById("monthlyChart"),{
    type:"bar",
    data:{
      labels:lbl,
      datasets:[
        {label:"OPEN",data:lbl.map(k=>d[k].OPEN),backgroundColor:"#22c55e"},
        {label:"CLOSE",data:lbl.map(k=>d[k].CLOSE),backgroundColor:"#ef4444"}
      ]
    },
    options:{responsive:true,maintainAspectRatio:false,scales:{x:{stacked:true},y:{stacked:true}}}
  });
}
function updateDateTime(){
  const now = new Date();

  document.getElementById("currentDate").innerText =
    now.toLocaleDateString("en-GB", {
      weekday:"long",
      day:"2-digit",
      month:"long",
      year:"numeric"
    });

  document.getElementById("currentTime").innerText =
    now.toLocaleTimeString("en-GB");
}

updateDateTime();
setInterval(updateDateTime,1000);

/* 中藥材查詢庫 — 邏輯
   資料來自 data.js 的全域 HERB_DATA（Notion 中藥材保存資料庫匯出）。
   欄位 key 沿用 Notion 中文欄名，靠下方 FIELD_GROUPS 設定驅動渲染。 */

/* ══════════════════════════════════════════════════════════════
   CONFIG — 品牌／Logo 占位。朋友做好 logo、公司名定案後，只改這一段。
   ══════════════════════════════════════════════════════════════ */
const CONFIG = {
  brandName: "中藥材查詢庫",          // 公司名未定，先占位；定案後改這裡
  brandTagline: "採購辨真偽・辨品質",
  brandLogo: "🌿",                    // Logo 占位：先用 emoji
  // 之後有 logo 圖檔時：把 brandLogo 設成 null，並填 brandLogoImg（放一張圖進 repo）
  brandLogoImg: null,                 // 例："logo.png"（放在同資料夾）
  showNotionLink: false,              // 自用可設 true 顯示「開 Notion」連結；公開建議 false
};

/* ══════════════════════════════════════════════════════════════
   欄位分區設定 — 決定詳情裡欄位的順序、分組、是否預設折疊
   ══════════════════════════════════════════════════════════════ */
const FIELD_GROUPS = [
  { key:"core", label:"🔎 採購辨識", open:true, fold:false, emphasize:true,
    fields:["真偽與偽品","辨識要點","市售等級","特殊注意事項"] },
  { key:"id", label:"基本識別", open:true, fold:false,
    fields:["基源（學名）","科別","藥用部位","別名／商品名"] },
  { key:"law", label:"法規與賣法", open:true, fold:true,
    fields:["賣法分類","法規分類","網售限制(FDA)","入藥料理"] },
  { key:"store", label:"保存方式", open:true, fold:true,
    fields:["易變質類型","建議保存溫度","建議濕度／環境","防護／保存方式",
            "建議保存期限","變質判斷","開封後保存提醒","保存依據層級"] },
  { key:"med", label:"藥用與出處", open:true, fold:true,
    fields:["適應症","用法用量","指標成分","收載藥典","鑑別來源","出處"] },
];

const F_NAME = "藥材名（正名）";
const F_ALIAS = "別名／商品名";
const F_SOURCE = "基源（學名）";
const F_SELL = "賣法分類";
const F_LAW = "法規分類";
const F_CAUTION = "特殊注意事項";

const SELL_OPTIONS = ["可單方販售","須複方","限茶包型態","台灣不可作食品販售","待查"];

/* ── 工具 ── */
// 全形→半形、去空白、小寫；供搜尋比對用
function norm(s){
  if(!s) return "";
  return String(s)
    .replace(/[！-～]/g, c => String.fromCharCode(c.charCodeAt(0)-0xFEE0))
    .replace(/　/g," ")
    .replace(/\s+/g,"")
    .toLowerCase();
}
function isEmpty(v){
  if(v==null) return true;
  if(Array.isArray(v)) return v.length===0;
  return String(v).trim()==="";
}
// 警示判定：限醫療不可網售，或特殊注意含毒性/硫燻等關鍵字
const WARN_RE = /劇毒|有毒|小毒|烏頭鹼|毒性|硫磺|硫燻|石棉|限醫療|孕婦(?:忌|慎)|保育類/;
function isWarn(h){
  return h[F_LAW]==="限醫療不可網售" || WARN_RE.test(h[F_CAUTION]||"");
}
function fieldToText(v){
  return Array.isArray(v) ? v.join("、") : (v==null?"":String(v));
}
// 部分 Notion 欄位值含 <br> 當換行（如附子/牡蠣的市售等級分項）。
// 安全渲染：切開 <br> 後用 text node + 真正的 <br> 元素，絕不用 innerHTML（免注入）。
function setFieldText(el, text){
  const parts = String(text).split(/<br\s*\/?>/i);
  parts.forEach((p, idx)=>{
    if(idx>0) el.appendChild(document.createElement("br"));
    el.appendChild(document.createTextNode(p));
  });
}

/* ── 狀態 ── */
let ALL = [];
let state = { q:"", sell:"" };

/* ── 啟動 ── */
function init(){
  // 品牌套用
  document.getElementById("brandName").textContent = CONFIG.brandName;
  document.title = CONFIG.brandName;
  document.getElementById("brandTagline").textContent = CONFIG.brandTagline;
  const logoEl = document.getElementById("brandLogo");
  if(CONFIG.brandLogoImg){ logoEl.innerHTML = `<img src="${CONFIG.brandLogoImg}" alt="logo">`; }
  else { logoEl.textContent = CONFIG.brandLogo; }

  // 資料檢查
  if(typeof HERB_DATA==="undefined" || !Array.isArray(HERB_DATA.herbs)){
    document.getElementById("count").innerHTML = "<b>資料載入失敗</b>（找不到 data.js）";
    return;
  }
  ALL = HERB_DATA.herbs;
  const meta = HERB_DATA.meta || {};
  const metaStr = `${meta.count ?? ALL.length} 味 · 更新 ${meta.exportedAt||"—"}`;
  document.getElementById("dataMeta").textContent = metaStr;
  document.getElementById("footMeta").textContent = `資料快照：${metaStr}`;
  if(meta.count!=null && meta.count!==ALL.length){
    console.warn(`meta.count(${meta.count}) 與實際筆數(${ALL.length}) 不符`);
  }

  buildFilters();
  bindUI();
  applyTheme(localStorage.getItem("tcm-theme"));
  render();
}

/* ── 篩選列 ── */
function buildFilters(){
  const box = document.getElementById("filters");
  const frag = document.createDocumentFragment();
  const mkChip = (label, on, cls, fn) => {
    const b = document.createElement("button");
    b.className = "chip"+(cls?` ${cls}`:"")+(on?" on":"");
    b.textContent = label;
    b.addEventListener("click", fn);
    return b;
  };
  // 賣法分類（只列資料中實際出現的）
  const present = SELL_OPTIONS.filter(o => ALL.some(h => h[F_SELL]===o));
  frag.appendChild(mkChip("全部", state.sell==="", "", ()=>{ state.sell=""; render(); }));
  present.forEach(o=>{
    frag.appendChild(mkChip(o, state.sell===o, "", ()=>{ state.sell = state.sell===o?"":o; render(); }));
  });
  box.replaceChildren(frag);
}
function refreshChips(){
  document.querySelectorAll("#filters .chip").forEach(c=>{
    const t = c.textContent;
    if(t==="全部") c.classList.toggle("on", state.sell==="");
    else c.classList.toggle("on", state.sell===t);
  });
}

/* ── UI 綁定 ── */
function bindUI(){
  const q = document.getElementById("q");
  const clear = document.getElementById("clearBtn");
  q.addEventListener("input", ()=>{
    state.q = q.value;
    clear.hidden = !q.value;
    render();
  });
  clear.addEventListener("click", ()=>{ q.value=""; state.q=""; clear.hidden=true; q.focus(); render(); });
  document.getElementById("themeBtn").addEventListener("click", toggleTheme);
}

/* ── 篩選 + 渲染 ── */
function filtered(){
  const nq = norm(state.q);
  return ALL.filter(h=>{
    if(state.sell && h[F_SELL]!==state.sell) return false;
    if(nq){
      const hay = norm(h[F_NAME]) + norm(h[F_ALIAS]) + norm(h[F_SOURCE]);
      if(!hay.includes(nq)) return false;
    }
    return true;
  });
}

function render(){
  refreshChips();
  const rows = filtered();
  const list = document.getElementById("list");
  const empty = document.getElementById("empty");
  const total = ALL.length;
  const cnt = document.getElementById("count");
  cnt.innerHTML = (state.q||state.sell)
    ? `符合 <b>${rows.length}</b> / ${total} 味`
    : `共 <b>${total}</b> 味`;

  if(rows.length===0){ list.replaceChildren(); empty.hidden=false; return; }
  empty.hidden=true;

  const frag = document.createDocumentFragment();
  rows.forEach((h,i)=> frag.appendChild(renderCard(h,i)));
  list.replaceChildren(frag);
}

function renderCard(h, i){
  const card = document.createElement("article");
  card.className = "card";

  // 卡頭
  const head = document.createElement("div");
  head.className = "chead";
  head.setAttribute("role","button");
  head.setAttribute("tabindex","0");
  head.setAttribute("aria-expanded","false");

  const nameBox = document.createElement("div");
  nameBox.className = "cname";
  const mn = document.createElement("div"); mn.className="mname"; mn.textContent = h[F_NAME]||"（無名）";
  nameBox.appendChild(mn);
  if(!isEmpty(h[F_ALIAS])){
    const al = document.createElement("div"); al.className="malias"; al.textContent = h[F_ALIAS];
    nameBox.appendChild(al);
  }

  const pills = document.createElement("div");
  pills.className = "cpills";
  if(!isEmpty(h[F_SELL])){
    const p=document.createElement("span"); p.className=`pill p-sell ${h[F_SELL]}`; p.textContent=h[F_SELL]; pills.appendChild(p);
  }
  if(isWarn(h)){
    const p=document.createElement("span"); p.className="pill warn"; p.textContent="⚠️ 警示"; pills.appendChild(p);
  }

  const caret = document.createElement("span"); caret.className="caret"; caret.textContent="▸"; caret.setAttribute("aria-hidden","true");

  head.append(nameBox, pills, caret);

  // 詳情
  const detail = document.createElement("div");
  detail.className = "detail";
  detail.appendChild(renderDetail(h));

  const toggle = ()=>{
    const open = card.classList.toggle("open");
    head.setAttribute("aria-expanded", open?"true":"false");
  };
  head.addEventListener("click", toggle);
  head.addEventListener("keydown", e=>{
    if(e.key==="Enter"||e.key===" "){ e.preventDefault(); toggle(); }
  });

  card.append(head, detail);
  return card;
}

function renderDetail(h){
  const frag = document.createDocumentFragment();
  FIELD_GROUPS.forEach(g=>{
    const rows = g.fields.filter(f=> !isEmpty(h[f]));
    if(rows.length===0) return;

    const group = document.createElement("section");
    group.className = "group"+(g.emphasize?" core":"")+(g.fold?" folded":"");

    const label = document.createElement("div");
    label.className = "glabel"+(g.fold?"":" static");
    label.textContent = g.label;
    if(g.fold){
      const gc=document.createElement("span"); gc.className="gcaret"; gc.textContent="▾"; label.appendChild(gc);
      label.addEventListener("click", ()=> group.classList.toggle("folded"));
    }
    group.appendChild(label);

    const body = document.createElement("div"); body.className="gbody";
    rows.forEach(f=>{
      const row = document.createElement("div"); row.className="field";
      const lb = document.createElement("div"); lb.className="flabel"; lb.textContent = fieldLabel(f);
      const tx = document.createElement("div"); tx.className="ftext";
      if(f==="易變質類型" || f==="收載藥典"){
        (h[f]||[]).forEach(t=>{ const s=document.createElement("span"); s.className="tag"; s.textContent=t; tx.appendChild(s); });
      } else {
        setFieldText(tx, fieldToText(h[f]));
      }
      row.append(lb, tx);
      body.appendChild(row);
    });
    group.appendChild(body);
    frag.appendChild(group);
  });

  if(CONFIG.showNotionLink && h.url){
    const a=document.createElement("a"); a.className="opennt"; a.href=h.url; a.target="_blank"; a.rel="noopener";
    a.textContent="↗ 開 Notion 原頁"; frag.appendChild(a);
  }
  return frag;
}

// 詳情裡欄位標籤：把長欄名縮短好排版
function fieldLabel(f){
  const map = {
    "藥材名（正名）":"正名","別名／商品名":"別名","基源（學名）":"基源","科別":"科別","藥用部位":"部位",
    "真偽與偽品":"真偽偽品","辨識要點":"辨識要點","市售等級":"市售等級","特殊注意事項":"特殊注意",
    "賣法分類":"賣法","法規分類":"法規","網售限制(FDA)":"網售FDA","入藥料理":"入藥料理",
    "易變質類型":"易變質","建議保存溫度":"溫度","建議濕度／環境":"濕度","防護／保存方式":"保存方式",
    "建議保存期限":"保存期限","變質判斷":"變質判斷","開封後保存提醒":"開封提醒","保存依據層級":"依據層級",
    "適應症":"適應症","用法用量":"用法用量","指標成分":"指標成分","收載藥典":"收載藥典","鑑別來源":"鑑別來源","出處":"出處",
  };
  return map[f]||f;
}

/* ── 主題 ── */
function applyTheme(t){
  if(t==="dark"||t==="light") document.documentElement.setAttribute("data-theme", t);
  else document.documentElement.removeAttribute("data-theme");
}
function toggleTheme(){
  const cur = document.documentElement.getAttribute("data-theme");
  const sysDark = matchMedia("(prefers-color-scheme:dark)").matches;
  // 循環：跟隨系統 → 反系統 → 跟隨系統
  let next;
  if(!cur) next = sysDark?"light":"dark";
  else next = null;
  applyTheme(next);
  if(next) localStorage.setItem("tcm-theme", next); else localStorage.removeItem("tcm-theme");
  toast(next ? (next==="dark"?"深色主題":"淺色主題") : "跟隨系統");
}

/* ── toast ── */
let toastT;
function toast(msg){
  const el = document.getElementById("toast");
  el.textContent = msg; el.classList.add("show");
  clearTimeout(toastT); toastT = setTimeout(()=> el.classList.remove("show"), 1600);
}

document.addEventListener("DOMContentLoaded", init);

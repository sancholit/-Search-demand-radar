const D=window.RADAR_DATA,$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const fmt=n=>new Intl.NumberFormat("ru-RU",{notation:n>=1e5?"compact":"standard",maximumFractionDigits:1}).format(n);
const full=n=>new Intl.NumberFormat("ru-RU").format(n);
const dr=s=>new Intl.DateTimeFormat("ru-RU",{day:"2-digit",month:"long",year:"numeric"}).format(new Date(s+"T00:00:00"));
const PERIOD_LABELS={"24h":"24 часа","7d":"7 дней","1m":"1 месяц","3m":"3 месяца","6m":"6 месяцев","9m":"9 месяцев","12m":"12 месяцев"};
let activePeriod="24h";

$("#date").textContent=dr(D.date)+(D.time?" · "+D.time:"");
if($("#methodNote"))$("#methodNote").innerHTML=`<b>Срез:</b> ${D.notes?.current||""}<br><b>Важно:</b> ${D.notes?.scores||""}`;

const periodsBox=$(".periods");
const periodMessage=document.createElement("div");
periodMessage.id="periodMessage";
periodMessage.className="period-message";
periodMessage.hidden=true;
periodsBox.insertAdjacentElement("afterend",periodMessage);

function structuralOf(items){return items.filter(x=>x.st==="Наблюдать")}
function renderKpis(items,total){
  $("#k1").textContent=full(total??items.length);
  $("#k2").textContent=structuralOf(items).length;
  $("#k3").textContent=fmt(items.reduce((a,x)=>a+(x.s||0),0));
}
function emptyBlock(title,text){return `<div class="empty-state"><b>${title}</b><span>${text}</span></div>`}

function renderOverview(items,total){
 renderKpis(items,total);
 const structural=structuralOf(items);
 const top=[...items].sort((a,b)=>b.s-a.s).slice(0,10),mx=Math.max(...top.map(x=>x.s),1);
 $("#bars").innerHTML=top.length?top.map(x=>`<div class="bar"><b title="${x.q}">${x.q}</b><div class="track"><div class="fill" style="width:${Math.max(4,x.s/mx*100)}%"></div></div><em>${fmt(x.s)}</em></div>`).join(""):emptyBlock("Нет данных","Для выбранного периода данные ещё не загружены.");
 $("#candidates").innerHTML=structural.length?[...structural].sort((a,b)=>b.o-a.o).map(x=>`<div class="candidate"><div><b>${x.q}</b><small>${x.c} · рост +${full(x.g)}%</small></div><span class="score">${x.o}</span></div>`).join(""):emptyBlock("Нет структурных кандидатов","Для выбранного периода пока нет рассчитанного слоя.");
 const sc=$("#scatter");
 sc.querySelectorAll(".dot,.empty-state").forEach(x=>x.remove());
 if(!items.length){sc.insertAdjacentHTML("beforeend",emptyBlock("Нет матрицы","Trend × Opportunity появится после загрузки данных за этот период."));return}
 const maxS=Math.max(...items.map(x=>x.s),1);
 items.forEach(x=>{let n=document.createElement("div"),z=8+Math.sqrt(x.s/maxS)*17;n.className="dot "+(x.st==="Наблюдать"?"good":"");n.style.cssText=`left:${6+x.o*.88}%;bottom:${6+x.t*.88}%;width:${z}px;height:${z}px`;n.innerHTML=`<div class="tip"><b>${x.q}</b><br>Trend ${x.t} · Opportunity ${x.o}<br>${full(x.s)}+ поисков</div>`;sc.appendChild(n)});
}

function periodUnavailable(period){
  const label=PERIOD_LABELS[period]||period;
  $("#k1").textContent="—";$("#k2").textContent="—";$("#k3").textContent="—";
  $("#bars").innerHTML=emptyBlock(`Срез «${label}» ещё не загружен`,period==="7d"?"Google Trending Now поддерживает 7-дневный период, но отдельный 7-дневный набор ещё не импортирован в радар.":"Собственная история радара начинается 01.09.2026. Этот горизонт будет заполняться по мере накопления снимков и подключения Wordstat / Google Ads API.");
  $("#candidates").innerHTML=emptyBlock("Нет подмены 24-часовыми данными","Радар больше не показывает текущий срез под видом другого периода.");
  const sc=$("#scatter");sc.querySelectorAll(".dot,.empty-state").forEach(x=>x.remove());sc.insertAdjacentHTML("beforeend",emptyBlock("Историческая матрица недоступна","Она появится после появления фактических данных за выбранный горизонт."));
  periodMessage.hidden=false;
  periodMessage.innerHTML=`<b>${label}:</b> фактический набор данных пока отсутствует. 24-часовые показатели намеренно скрыты, чтобы не создавать ложное сравнение.`;
  $("#availability").textContent="Данных за период пока нет";$("#availability").style.color="var(--warn)";
}
function setPeriod(period){
 activePeriod=period;
 $$(".period").forEach(x=>x.classList.toggle("active",x.dataset.p===period));
 if(period==="24h"){
   periodMessage.hidden=true;
   $("#availability").textContent="Данные доступны";$("#availability").style.color="var(--green)";
   renderOverview(D.items,D.totalClusters||D.items.length);
 }else periodUnavailable(period);
}

function radar(){
 const cats=[...new Set(D.items.map(x=>x.c))].sort();$("#cat").innerHTML='<option value="">Все категории</option>'+cats.map(c=>`<option>${c}</option>`).join("");filter();
}
function filter(){
 const q=$("#search").value.toLowerCase(),c=$("#cat").value,s=$("#status").value,o=$("#only").checked;
 let a=D.items.filter(x=>(!q||x.q.toLowerCase().includes(q))&&(!c||x.c===c)&&(!s||x.st===s)&&(!o||x.st==="Наблюдать")).sort((a,b)=>b.o-a.o);
 $("#body").innerHTML=a.map(x=>`<tr>
 <td class="topic-cell" data-label="Тема"><b>${x.q}</b><small>${x.c}</small></td>
 <td data-label="Категория"><span class="badge">${x.c}</span></td>
 <td data-label="Поиски 24ч"><strong>${full(x.s)}+</strong></td>
 <td data-label="Рост"><strong>+${full(x.g)}%</strong></td>
 <td data-label="Trend"><span class="meter"><b>${x.t}</b><i style="--w:${x.t}%"></i></span></td>
 <td data-label="Opportunity"><span class="meter op"><b>${x.o}</b><i style="--w:${x.o}%"></i></span></td>
 <td data-label="Eventness">${x.e}</td>
 <td data-label="Статус"><span class="badge ${x.st==="Наблюдать"?"good":"warn"}">${x.st}</span></td>
 </tr>`).join("");
 if(!a.length)$("#body").innerHTML=`<tr class="no-results"><td colspan="8">По выбранным фильтрам ничего не найдено.</td></tr>`;
}
function ai(){
 $("#aicards").innerHTML=D.ai.filter(x=>!(x.p==="Яндекс"&&(x.m.includes("Месячная аудитория взаимодействующих")||x.m.includes("Доля запросов, на которые")))).map(x=>`<article><div class="eyebrow">${x.p} · ${x.c}</div><strong>${String(x.v).replace(".",",")} ${x.u}</strong><h3>${x.m}</h3><p>${x.geo} · ${x.per}</p>${x.src?`<a href="${x.src}" target="_blank" rel="noreferrer">Источник ↗</a>`:""}</article>`).join("");
}
function sources(){
 $("#sourcecards").innerHTML=D.sources.map(x=>`<article><div class="eyebrow">${x.a}</div><h3>${x.n}</h3><p>${x.r}</p><p>${x.h}</p><a href="${x.u}" target="_blank" rel="noreferrer">Открыть источник ↗</a></article>`).join("");
}
function show(id){$$(".view").forEach(x=>x.classList.toggle("active",x.id===id));$$(".nav").forEach(x=>x.classList.toggle("active",x.dataset.view===id));scrollTo({top:0,behavior:"smooth"})}
$$(".nav").forEach(b=>b.onclick=()=>show(b.dataset.view));$("#openRadar").onclick=()=>show("radar");
["#search","#cat","#status","#only"].forEach(s=>$(s).addEventListener("input",filter));
$$(".period").forEach(b=>b.onclick=()=>setPeriod(b.dataset.p));
setPeriod("24h");radar();ai();sources();

const D=window.RADAR_DATA,$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const fmt=n=>new Intl.NumberFormat("ru-RU",{notation:n>=1e5?"compact":"standard",maximumFractionDigits:1}).format(n);
const full=n=>new Intl.NumberFormat("ru-RU").format(n);
const dr=s=>new Intl.DateTimeFormat("ru-RU",{day:"2-digit",month:"long",year:"numeric"}).format(new Date(s+"T00:00:00"));
$("#date").textContent=dr(D.date)+(D.time?" · "+D.time:"");
$("#k1").textContent=full(D.totalClusters||D.items.length);
const structural=D.items.filter(x=>x.st==="Наблюдать");
$("#k2").textContent=structural.length;
$("#k3").textContent=fmt(D.items.reduce((a,x)=>a+x.s,0));
if($("#methodNote"))$("#methodNote").innerHTML=`<b>Срез:</b> ${D.notes?.current||""}<br><b>Важно:</b> ${D.notes?.scores||""}`;

function overview(){
 const top=[...D.items].sort((a,b)=>b.s-a.s).slice(0,10),mx=Math.max(...top.map(x=>x.s));
 $("#bars").innerHTML=top.map(x=>`<div class="bar"><b title="${x.q}">${x.q}</b><div class="track"><div class="fill" style="width:${Math.max(4,x.s/mx*100)}%"></div></div><em>${fmt(x.s)}</em></div>`).join("");
 $("#candidates").innerHTML=[...structural].sort((a,b)=>b.o-a.o).map(x=>`<div class="candidate"><div><b>${x.q}</b><small>${x.c} · рост +${full(x.g)}%</small></div><span class="score">${x.o}</span></div>`).join("");
 const sc=$("#scatter"),maxS=Math.max(...D.items.map(x=>x.s));
 D.items.forEach(x=>{let n=document.createElement("div"),z=8+Math.sqrt(x.s/maxS)*17;n.className="dot "+(x.st==="Наблюдать"?"good":"");n.style.cssText=`left:${6+x.o*.88}%;bottom:${6+x.t*.88}%;width:${z}px;height:${z}px`;n.innerHTML=`<div class="tip"><b>${x.q}</b><br>Trend ${x.t} · Opportunity ${x.o}<br>${full(x.s)}+ поисков / 24ч</div>`;sc.appendChild(n)});
}
function radar(){
 const cats=[...new Set(D.items.map(x=>x.c))].sort();$("#cat").innerHTML='<option value="">Все категории</option>'+cats.map(c=>`<option>${c}</option>`).join("");filter();
}
function filter(){
 const q=$("#search").value.toLowerCase(),c=$("#cat").value,s=$("#status").value,o=$("#only").checked;
 let a=D.items.filter(x=>(!q||x.q.toLowerCase().includes(q))&&(!c||x.c===c)&&(!s||x.st===s)&&(!o||x.st==="Наблюдать")).sort((a,b)=>b.o-a.o);
 $("#body").innerHTML=a.map(x=>`<tr><td><b>${x.q}</b></td><td><span class="badge">${x.c}</span></td><td>${full(x.s)}+</td><td>+${full(x.g)}%</td><td><span class="meter"><b>${x.t}</b><i style="--w:${x.t}%"></i></span></td><td><span class="meter op"><b>${x.o}</b><i style="--w:${x.o}%"></i></span></td><td>${x.e}</td><td><span class="badge ${x.st==="Наблюдать"?"good":"warn"}">${x.st}</span></td></tr>`).join("");
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
$$(".period").forEach(b=>b.onclick=()=>{$$(".period").forEach(x=>x.classList.remove("active"));b.classList.add("active");let now=b.dataset.p==="24h";$("#availability").textContent=now?"Данные доступны":(D.notes?.history||"История накапливается / подключается API");$("#availability").style.color=now?"var(--green)":"var(--warn)"});
overview();radar();ai();sources();

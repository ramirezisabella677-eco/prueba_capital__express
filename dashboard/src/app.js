import initialData from '../data/portfolio.json';
import {sum,ratio,money,compact,pct,number,dateLabel,esc,totals,groupBy,aging,coverageRows,provision,policyChecks,filterInvoices,scopeLabel,summary} from './analytics.js';
import {makeSummaryPdf} from './report.js';

let data=initialData;
const views=[['overview','Resumen','grid'],['composition','Composición','layers'],['aging','Antigüedad','clock'],['income','Ingresos y provisiones','chart'],['insurance','Seguros','shield'],['policy','Política y acciones','check'],['invoices','Facturas','file']];
const state={view:'overview',cut:Object.keys(data.cuts).sort().at(-1),filters:{status:'Todas'},group:'region',age:'mora',query:'',page:1,sort:'saldo_pendiente_usd',direction:-1,drawer:null};
const root=document.querySelector('#app');
const paths={grid:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',layers:'m12 3 10 6-10 6L2 9zM2 13l10 6 10-6M2 17l10 6 10-6',clock:'M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',chart:'M4 20V10M10 20V4M16 20v-7M22 20H2',shield:'M12 3 3 7v5c0 5 9 10 9 10s9-5 9-10V7zM8 12l3 3 5-6',check:'M9 11l3 3L22 4M20 12v8H3V3h12',file:'M14 2H5v20h14V7zM14 2v6h6M8 12h8M8 16h8',download:'M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4',arrow:'M5 12h14m-6-6 6 6-6 6',close:'M6 6l12 12M6 18 18 6',search:'M21 21l-6-6M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',reset:'M3 10a9 9 0 1 1 1 8M3 4v6h6',upload:'M12 17V4m-5 5 5-5 5 5M3 17v4h18v-4',info:'M12 10v7M12 6v1M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',chevron:'m9 5 7 7-7 7',filter:'M3 5h18l-7 8v6l-4 2v-8z'};
const icon=(name,extra='')=>`<svg class="icon ${extra}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.info}"/></svg>`;
const cut=()=>data.cuts[state.cut];
const selected=()=>filterInvoices(cut(),state.filters);
const shortMoney=n=>`$${compact(n)}`;
const chip=(text,type='neutral')=>`<span class="chip ${type}">${esc(text)}</span>`;
const riskType=status=>status==='Desviación observada'||status==='Vencida'?'danger':status==='Por verificar'||status==='No verificable'||status.includes('verificar')?'warning':status==='Sin desviación observada'||status==='Vigente en registro'?'success':'neutral';
const option=(value,label,chosen)=>`<option value="${esc(value)}" ${value===chosen?'selected':''}>${esc(label??value)}</option>`;
const currentTitle=()=>views.find(v=>v[0]===state.view)?.[1];
const chartTitle=(title,subtitle,extra='')=>`<div class="section-heading"><div><h2>${title}</h2>${subtitle?`<p>${subtitle}</p>`:''}</div>${extra}</div>`;
const empty=()=>`<div class="empty">${icon('filter')}<h3>No hay facturas para esta selección</h3><p>Modifica los filtros o vuelve a la cartera completa.</p><button class="button secondary" data-action="reset">Limpiar filtros</button></div>`;
function metric(label,value,note,accent=''){
 return `<div class="metric ${accent}"><div class="eyebrow">${label}</div><strong>${value}</strong><span>${note}</span></div>`;
}
function shell(){
 const cuts=Object.keys(data.cuts).sort().reverse();
 return `<aside class="sidebar"><a class="brand" href="#overview" data-view="overview" aria-label="Capital Express, resumen"><span class="brand-mark">c<span>e</span></span><span class="brand-name">capital<span>express</span></span></a><div class="workspace-label">PORTAFOLIO DEL GRUPO</div><nav aria-label="Secciones del dashboard">${views.map(([id,label,i])=>`<button data-view="${id}" class="nav-item ${state.view===id?'active':''}" title="${label}" ${state.view===id?'aria-current="page"':''}>${icon(i)}<span>${label}</span>${state.view===id?'<i></i>':''}</button>`).join('')}</nav><div class="sidebar-footer"><span class="online-dot"></span> Análisis al corte<span>CE · AE · CE UK</span><div class="sidebar-note">Datos del ejercicio<br>Moneda de reporte USD</div></div></aside>
 <div class="main-shell"><header class="topbar"><div class="breadcrumbs">Cartera consolidada ${icon('chevron')} <b>${currentTitle()}</b></div><div class="top-actions"><button class="icon-button" data-action="load" aria-label="Cargar datos de otro corte" title="Cargar archivo JSON generado por el proceso">${icon('upload')}</button><button class="button primary" data-action="pdf">${icon('download')}<span>Síntesis PDF</span></button></div></header>
 <main><div class="page-heading"><div><div class="eyebrow">CAPITAL EXPRESS GROUP</div><h1>${state.view==='overview'?'Control de cartera':currentTitle()}</h1><p>Una vista de la operación y sus prioridades de riesgo.</p></div><div class="cut-selector"><label for="cut">CORTE DE CARTERA</label><select id="cut" aria-label="Fecha de corte">${cuts.map(c=>option(c,dateLabel(c),state.cut)).join('')}</select><span>USD · tipos de cambio de cierre</span></div></div>
 <section class="filterbar" aria-label="Filtros de cartera"><div class="status-switch" role="group" aria-label="Estado de facturas">${[['Todas','Total'],['Abierta','Pendiente'],['Pagada','Pagado']].map(([s,label])=>`<button data-status="${s}" class="${state.filters.status===s?'selected':''}">${label}</button>`).join('')}</div>${filterSelect('region','Región','Todas las regiones')}${filterSelect('client','Cliente','Todos los clientes')}${filterSelect('debtor','Deudor','Todos los deudores')}${filterSelect('entity','Entidad','Todas las entidades')}<button class="icon-button reset" data-action="reset" title="Limpiar filtros" aria-label="Limpiar filtros">${icon('reset')}</button></section>
 <div class="selection-note"><span>${number(selected().length)} de ${number(cut().invoices.length)} facturas ${state.filters.term?`· Plazo ${state.filters.term} días <button class="text-button" data-action="clear-term">Quitar plazo ×</button>`:''}</span><span class="dot-note">Saldo pendiente aproximado · fuente sin residual conciliado</span></div>
 <div id="workspace" class="workspace">${renderPage()}</div><footer class="page-footer"><span>Capital Express / Advance Express · Corte ${dateLabel(state.cut)}</span><button class="text-button" data-view="policy">Fuente: Politica_Extracto ${icon('arrow')}</button></footer></main></div><div id="drawer-root">${state.drawer?drawer():''}</div><div id="toast" role="status" aria-live="polite"></div><input id="data-file" type="file" accept="application/json,.json" hidden>`;
}
function filterSelect(key,label,placeholder){
 const field={region:'region',client:'cliente',debtor:'deudor',entity:'entidad'}[key];
 const available=key==='debtor'&&state.filters.client?cut().invoices.filter(r=>r.cliente===state.filters.client):cut().invoices;
 const values=[...new Set(available.map(r=>r[field]))].sort();
 return `<label class="filter-select"><span>${label}</span><select data-filter="${key}" aria-label="Filtrar por ${label.toLowerCase()}">${option('',placeholder,state.filters[key]||'')}${values.map(v=>option(v,v,state.filters[key])).join('')}</select></label>`;
}
function renderPage(){
 const rows=selected();
 if(!rows.length)return empty();
 return ({overview:overview,composition:composition,aging:ageView,income:income,insurance:insurance,policy:policy,invoices:invoices})[state.view](rows);
}
function overview(rows){
 const t=totals(rows),global=totals(cut().invoices),checks=policyChecks(cut(),rows),p=provision(rows);
 const priorities=checks.filter(c=>c.count>0&&c.priority===1);
 const regions=groupBy(rows,'region'),top=coverageRows(cut(),rows).filter(r=>r.globalPending>0).slice(0,5);
 return `<section class="metrics">${metric('IMPORTE FINANCIADO',shortMoney(t.financed),`${number(t.count)} facturas · abiertas y pagadas`)}${metric('SALDO PENDIENTE',shortMoney(t.pending),`${number(t.openCount)} facturas abiertas`)}${metric('OPERACIONES PAGADAS',shortMoney(t.paid),`${number(t.paidCount)} facturas según el export`)}${metric('MORA 90 DÍAS O MÁS',shortMoney(t.mora90),`${pct(ratio(t.mora90,t.pending))} del saldo pendiente`,'risk')}</section>
 <div class="attention-strip"><div class="attention-icon">${icon('shield')}</div><div><strong>${priorities.length} controles requieren una decisión operativa</strong><span>Concentración, seguro y canales de cobro. Las aprobaciones no fueron aportadas.</span></div><button class="text-button" data-view="policy">Revisar política ${icon('arrow')}</button></div>
 <div class="two-columns"><section class="section">${chartTitle('Composición del financiado','Importe original financiado, en USD',`<button class="text-button" data-view="composition">Explorar ${icon('arrow')}</button>`)}<div class="composition-main">${donut(t.pending,t.paid)}<div class="region-breakdown">${regions.map(g=>`<button class="region-row" data-drill="region" data-value="${esc(g.name)}"><span><i class="legend-square ${g.name==='Estados Unidos'?'teal':'slate'}"></i>${esc(g.name)}</span><strong>${shortMoney(g.financed)}</strong><small>${pct(ratio(g.financed,t.financed))} · ${g.count} facturas</small></button>`).join('')}<div class="region-foot">${t.clients} clientes<span>${t.debtors} deudores</span></div></div></div><div class="chart-note">Pendiente ${pct(ratio(t.pending,t.financed))} <span>Pagado ${pct(ratio(t.paid,t.financed))}</span></div></section>
 <section class="section">${chartTitle('Concentración por deudor','Saldo pendiente global · umbral de política 30%',`<button class="text-button" data-view="insurance">Ver deudores ${icon('arrow')}</button>`)}<div class="concentration-list">${top.length?top.map(r=>`<button class="concentration-row" data-drill="debtor" data-value="${esc(r.name)}"><span class="row-title">${esc(r.name)}<b class="${r.concentration>.3?'danger-text':''}">${pct(r.concentration)}</b></span><span class="track"><i style="width:${Math.min(100,r.concentration*100)}%" class="${r.concentration>.3?'danger-bg':''}"></i><em style="left:30%"></em></span><small>${shortMoney(r.globalPending)}<span>${r.count} facturas en selección</span></small></button>`).join(''):'<p class="muted">La selección no tiene saldo pendiente.</p>'}</div></section></div>
 <section class="section">${chartTitle('Prioridades de la operación','Montos relacionados con cada control; pueden superponerse.',`<span class="small-label">REFERENCIA: POLITICA_EXTRACTO</span>`)}${controlTable(checks.filter(c=>c.count>0).sort((a,b)=>a.priority-b.priority||b.amount-a.amount).slice(0,5))}</section>
 <div class="three-notes"><button data-view="aging"><span>ANTIGÜEDAD</span><strong>${pct(ratio(t.overdue,t.pending))}</strong><small>del saldo pendiente está vencido ${icon('arrow')}</small></button><button data-view="income"><span>INGRESOS DEL ARCHIVO</span><strong>${shortMoney(t.fees)}</strong><small>comisiones devengadas, sin costos ${icon('arrow')}</small></button><button data-view="insurance"><span>PROVISIÓN DE REFERENCIA</span><strong>${shortMoney(p.known)}</strong><small>calculable parcial; falta saldo inicial ${icon('arrow')}</small></button></div>
 <p class="fineprint">El total financiado incluye operaciones ya pagadas. Para riesgo y seguro se usa el saldo vivo global (${money(global.pending)}). El nominal total de la selección es ${money(t.nominal)}.</p>`;
}
function donut(pending,paid){
 const total=pending+paid,part=ratio(pending,total),circ=2*Math.PI*72;
 return `<div class="donut-wrap"><svg viewBox="0 0 190 190" role="img" aria-label="${pct(part)} pendiente, ${pct(1-part)} pagado"><circle cx="95" cy="95" r="72" fill="none" stroke="#dce4e8" stroke-width="21"/><circle cx="95" cy="95" r="72" fill="none" stroke="#247b70" stroke-width="21" stroke-dasharray="${part*circ} ${circ}" transform="rotate(-90 95 95)"/><text x="95" y="90" text-anchor="middle" class="donut-number">${pct(part,0)}</text><text x="95" y="111" text-anchor="middle" class="donut-label">PENDIENTE</text></svg></div>`;
}
function bars(groups,{field='value',drill='',percent=false}={}){
 const max=Math.max(...groups.map(g=>g[field]),1),total=sum(groups,field);
 return `<div class="bar-list">${groups.map((g,index)=>`<${drill?'button':'div'} class="bar-row" ${drill?`data-drill="${drill}" data-value="${esc(g.name)}"`:''}><div class="bar-caption"><span>${esc(g.name)}</span><strong>${money(g[field])}</strong></div><div class="track"><i style="width:${g[field]/max*100}%" class="${index===0?'':'light-bg'}"></i></div><small>${number(g.count??g.rows?.length??0)} facturas <span>${pct(ratio(g[field],total))} del grupo</span></small></${drill?'button':'div'}>`).join('')}</div>`;
}
function composition(rows){
 const labels={region:'Región',cliente:'Cliente',deudor:'Deudor',entidad:'Entidad'},drills={region:'region',cliente:'client',deudor:'debtor',entidad:'entity'};
 const groups=groupBy(rows,state.group),t=totals(rows);
 return `<section class="metrics">${metric('FINANCIADO DE LA SELECCIÓN',shortMoney(t.financed),`${number(t.count)} facturas`)}${metric('NOMINAL DE FACTURAS',shortMoney(t.nominal),'Valor de factura en USD')}${metric('CLIENTES',number(t.clients),'Identidades normalizadas')}${metric('DEUDORES',number(t.debtors),'Consolidados entre clientes')}</section>
 <section class="section">${chartTitle('De la cartera a cada factura','Selecciona una barra para profundizar. El saldo pendiente aparece separado del financiado total.')}<div class="segmented" role="group" aria-label="Agrupar composición">${Object.entries(labels).map(([k,v])=>`<button data-group="${k}" class="${state.group===k?'selected':''}">${v}</button>`).join('')}</div><div class="composition-layout"><div>${bars(groups.slice(0,10),{drill:drills[state.group]})}${groups.length>10?`<p class="fineprint">Se muestran los 10 mayores de ${groups.length}; la tabla incluye todos.</p>`:''}</div><div class="composition-explainer"><span class="eyebrow">LECTURA DE LA SELECCIÓN</span><strong>${labels[state.group]}</strong><p>Importe financiado en operaciones abiertas y pagadas.</p><div><span>Principal participación</span><b>${esc(groups[0]?.name||'—')}</b><strong>${pct(ratio(groups[0]?.financed||0,t.financed))}</strong></div><button class="button secondary" data-view="invoices">Abrir detalle de facturas ${icon('arrow')}</button></div></div>
 <div class="table-scroll"><table><thead><tr><th>${labels[state.group]}</th><th>Facturas</th><th>Financiado USD</th><th>Pendiente USD</th><th>Operaciones pagadas USD</th><th>Participación</th><th></th></tr></thead><tbody>${groups.map(g=>`<tr><td>${esc(g.name)}</td><td>${g.count}</td><td>${money(g.financed)}</td><td>${money(g.pending)}</td><td>${money(g.paid)}</td><td>${pct(ratio(g.financed,t.financed))}</td><td><button class="icon-button" aria-label="Ver ${esc(g.name)}" data-drill="${drills[state.group]}" data-value="${esc(g.name)}">${icon('chevron')}</button></td></tr>`).join('')}</tbody></table></div></section>`;
}
function ageView(rows){
 const t=totals(rows),modes={mora:'Días de mora',financiacion:'Tiempo financiado',emision:'Desde emisión',plazo:'Plazo pactado'};
 const bins=aging(rows,state.age);
 const base=state.age==='mora'?'saldo pendiente':'importe financiado';
 const notes={mora:'Solo facturas abiertas. Los vencimientos estimados están incluidos e identificados.',financiacion:'Días entre financiación y corte. No es duración real hasta el cobro; las pagadas no tienen fecha de liquidación.',emision:'Días entre emisión y corte; no equivale a días de mora.',plazo:'Distribución por plazo contractual informado, contrastable contra el máximo de 90 días.'};
 return `<section class="metrics">${metric('SALDO VENCIDO',shortMoney(t.overdue),`${pct(ratio(t.overdue,t.pending))} del pendiente`)}${metric('MORA 90+',shortMoney(t.mora90),'Regla especial de provisión','risk')}${metric('VENCIMIENTOS ESTIMADOS',number(t.estimated),'Se conservan separados de la fuente')}${metric('FECHAS EN REVISIÓN',number(t.fundingUnknown),'Financiación con versiones distintas')}</section>
 <section class="section">${chartTitle('Antigüedad y plazos',`Medida: ${base} en USD`)}<div class="segmented">${Object.entries(modes).map(([k,v])=>`<button data-age="${k}" class="${state.age===k?'selected':''}">${v}</button>`).join('')}</div><p class="context-note">${notes[state.age]}</p><div class="column-chart" role="img" aria-label="Distribución de ${esc(modes[state.age])}">${columns(bins)}</div><div class="table-scroll"><table><thead><tr><th>Tramo</th><th>Facturas</th><th>${state.age==='mora'?'Pendiente':'Financiado'} USD</th><th>Participación del tramo</th></tr></thead><tbody>${bins.map(g=>`<tr><td>${esc(g.name)}</td><td>${g.count}</td><td>${money(g.value)}</td><td>${pct(ratio(g.value,sum(bins,'value')))}</td></tr>`).join('')}</tbody></table></div></section>
 <section class="section">${chartTitle('Distribución por plazo pactado','Haz clic en un plazo para abrir sus facturas.')}<div class="term-grid">${groupBy(rows,r=>String(r.detail.plazo_dias)).sort((a,b)=>Number(a.name)-Number(b.name)).map(g=>`<button data-term="${g.name}" class="term-item"><span>${g.name} días ${Number(g.name)>90?chip('Excede 90','danger'):''}</span><strong>${number(g.count)}</strong><small>${money(g.financed)} financiados ${icon('arrow')}</small></button>`).join('')}</div></section>`;
}
function columns(groups){
 const max=Math.max(...groups.map(g=>g.value),1);
 return groups.map((g,index)=>`<div class="chart-column"><div class="column-label">${shortMoney(g.value)}</div><div class="column-space"><div class="column-bar ${index===groups.length-1&&state.age==='mora'?'danger-bg':''}" style="height:${Math.max(g.value?3:0,g.value/max*100)}%"></div></div><strong>${esc(g.name)}</strong><small>${g.count} facturas</small></div>`).join('');
}
function income(rows){
 const t=totals(rows),p=provision(rows),groups=groupBy(rows,'cliente',r=>r.detail.comisiones_devengadas_usd);
 return `<section class="metrics">${metric('COMISIONES DEVENGADAS',shortMoney(t.fees),'Ingreso informado en el archivo')}${metric('INGRESO / FINANCIADO',pct(t.feeRatio,2),'Indicador acumulado, sin anualizar')}${metric('PROVISIÓN CALCULABLE',shortMoney(p.known),'Referencia parcial al cierre')}${metric('SALDO SIN TASA DEFINIDA',shortMoney(p.unpriced),'Mora 1–89 o vencimiento estimado')}</section>
 <div class="information-strip">${icon('info')}<div><strong>Las provisiones sí afectan el resultado; falta medir su variación.</strong><p>Tenemos el saldo de referencia al cierre, no la provisión inicial ni los costos. Por eso no se calcula utilidad neta ni se resta automáticamente el saldo de provisión de las comisiones.</p></div></div>
 <div class="two-columns"><section class="section">${chartTitle('Comisiones por cliente','Fuente completa o selección activa; no equivalen a ingresos exclusivos de agosto.')}<div>${bars(groups,{field:'value',drill:'client'})}</div></section><section class="section">${chartTitle('Provisión según la política','Base: anticipo vivo aproximado. Sin sustituir incertidumbre por cero.')}<div class="provision-detail"><div><span>Referencia calculable</span><strong>${money(p.known)}</strong><small>1% de no vencida y 100% de mora 90+ sin cupo o con póliza vencida, según fuente.</small></div><div><span>Mora 90+ con cobertura no certificada</span><strong>${money(p.scenarioLow)} – ${money(p.scenarioHigh)}</strong><small>Escenarios adicionales del 10% / 100%. Falta acreditar cobertura y elegibilidad.</small></div><div><span>Saldo sin tasa o mora confirmada</span><strong>${money(p.unpriced)}</strong><small>El extracto no fija tasa para mora 1–89. La mora estimada no se trata como confirmada.</small></div></div><p class="context-note">La suma de referencia y escenarios no representa una provisión total certificada: quedan ${money(p.unpriced)} de exposición sin tasa determinable.</p><details><summary>Qué falta para una rentabilidad neta</summary><p>Provisión al inicio del período, movimientos y reversiones, pérdidas realizadas, costos de fondeo y operación, y comisiones del mismo período. La política del ejercicio rige las tasas; <a href="${esc(data.sources.impairment)}" target="_blank" rel="noreferrer">IFRS 9, párrafo 5.5.8</a>, explica el ajuste reconocido en resultados.</p></details></section></div>
 <section class="section">${chartTitle('Ingreso y exposición por cliente','El cociente es informativo; la antigüedad de cada operación afecta su comparabilidad.')}<div class="table-scroll"><table><thead><tr><th>Cliente</th><th>Financiado USD</th><th>Comisiones USD</th><th>Ingreso / financiado</th><th>Pendiente USD</th></tr></thead><tbody>${groups.map(g=>`<tr><td><button class="table-link" data-drill="client" data-value="${esc(g.name)}">${esc(g.name)}</button></td><td>${money(g.financed)}</td><td>${money(g.fees)}</td><td>${pct(g.feeRatio,2)}</td><td>${money(g.pending)}</td></tr>`).join('')}</tbody></table></div></section>`;
}
function insurance(rows){
 const coverage=coverageRows(cut(),rows),t=totals(rows);
 const expired=sum(coverage.filter(r=>r.status==='Vencida'),'selectedPending');
 const missing=sum(coverage.filter(r=>['Sin cupo','Vigencia por verificar','Pólizas múltiples'].includes(r.status)),'selectedPending');
 const excess=sum(coverage,'excess');
 const potential=sum(coverage,'potential');
 return `<section class="metrics">${metric('SALDO PENDIENTE',shortMoney(t.pending),'Exposición de la selección')}${metric('EXCESO DE CUPO GLOBAL',shortMoney(excess),'Deudores presentes en la selección','risk')}${metric('PÓLIZA VENCIDA',shortMoney(expired),'Saldo seleccionado relacionado','risk')}${metric('CUPO / VIGENCIA POR ACLARAR',shortMoney(missing),'Sin cupo, fecha o alcance inequívoco')}</section>
 <div class="information-strip">${icon('shield')}<div><strong>Vigencia y cupo no equivalen a cobertura confirmada.</strong><p>El consumo usa anticipo vivo de todos los clientes y entidades del deudor. Capacidad potencial dentro de cupo vigente de los deudores visibles: ${money(potential)}; falta confirmar identidad, aprobación y elegibilidad.</p></div></div>
 <section class="section">${chartTitle('Cobertura por deudor','Cupos y consumo global permanecen consolidados aunque filtres un cliente.')}<div class="table-scroll"><table class="coverage-table"><thead><tr><th>Deudor / póliza</th><th>Vigencia</th><th>Pendiente selección</th><th>Consumo global</th><th>Cupo aprobado</th><th>Uso de cupo</th><th>Headroom teórico</th><th>Expiración</th></tr></thead><tbody>${coverage.map(r=>`<tr><td><button class="table-link" data-drill="debtor" data-value="${esc(r.name)}">${esc(r.name)}</button><small class="table-sub">${esc(r.policy?.poliza||'Sin póliza inequívoca')}${r.literalIssues?' · nombre por validar':''}</small></td><td>${chip(r.status,riskType(r.status))}</td><td>${money(r.selectedPending)}</td><td>${money(r.globalPending)}</td><td>${r.limit==null?'—':money(r.limit)}</td><td>${r.utilization==null?'—':`<b class="${r.utilization>1?'danger-text':''}">${pct(r.utilization)}</b><span class="mini-track"><i style="width:${Math.min(100,r.utilization*100)}%" class="${r.utilization>1?'danger-bg':''}"></i></span>`}</td><td class="${r.headroom<0?'danger-text':''}">${r.headroom==null?'—':money(r.headroom)}</td><td>${dateLabel(r.expiry)}</td></tr>`).join('')}</tbody></table></div><p class="fineprint">No se suman pólizas superpuestas. Headroom = cupo registrado menos anticipo vivo global; puede estar bloqueado por vencimiento, disputa o falta de soporte.</p></section>`;
}
function policy(rows){
 const checks=policyChecks(cut(),rows),flagged=checks.filter(c=>c.count>0),unknown=checks.filter(c=>c.count==null);
 return `<div class="policy-intro"><div><span class="eyebrow">REFERENCIA NORMATIVA DEL EJERCICIO</span><h2>De la regla a la acción</h2><p>Sin excepciones ni soportes adicionales aportados. Una señal en los datos y un incumplimiento documental confirmado son estados diferentes.</p></div><div class="policy-counters"><b>${flagged.length}<span>con señales</span></b><b>${unknown.length}<span>no verificables</span></b></div></div>
 <section class="section">${chartTitle('Controles sobre la cartera','Los montos se refieren al objeto de cada control y pueden superponerse.')}<div class="control-list">${checks.map(c=>`<article class="control" id="control-${c.id}"><div class="control-head"><span class="control-number">${esc(c.rules)}</span><div><h3>${esc(c.title)}</h3><p>Politica_Extracto · filas ${esc(c.rules)}</p></div>${chip(c.status,riskType(c.status))}</div><div class="control-body"><div><strong>${c.amount==null?'Sin evidencia':money(c.amount)}</strong><span>${c.count==null?'No evaluable con el archivo':`${c.count} ${['cheque','redirect','thirdparty'].includes(c.id)?'movimientos':'registros relacionados'}`}</span></div><p>${esc(c.explanation)}</p><div><span class="eyebrow">ACCIÓN</span><p>${esc(c.action)}</p></div></div></article>`).join('')}</div></section>
 <section class="section">${chartTitle('Extracto fuente','Se conserva la redacción original, incluida la nota de la fila 21.')}<details class="policy-source"><summary>Consultar las ${data.policy.length} filas del manual recibido</summary><div class="policy-text">${data.policy.filter(r=>r.texto||r.seccion).map(r=>`<p><b>${r.fila_politica}</b><span>${esc(r.seccion||r.texto)}${r.nota?` <em>${esc(r.nota)}</em>`:''}</span></p>`).join('')}</div></details><p class="fineprint">El control de advance usa la región por moneda acordada. La compra retroactiva tiene una redacción amplia; se muestra la financiación previa y se mantiene pendiente la aprobación y la aclaración del alcance.</p></section>`;
}
function controlTable(checks){
 return `<div class="table-scroll"><table class="priority-table"><thead><tr><th>Control</th><th>Estado</th><th>Monto relacionado USD</th><th>Acción requerida</th><th></th></tr></thead><tbody>${checks.map(c=>`<tr><td><strong>${esc(c.title)}</strong><small class="table-sub">Política · filas ${esc(c.rules)}</small></td><td>${chip(c.status,riskType(c.status))}</td><td>${money(c.amount)}</td><td class="action-cell">${esc(c.action)}</td><td><button class="icon-button" data-control="${c.id}" aria-label="Ver control ${esc(c.title)}">${icon('chevron')}</button></td></tr>`).join('')}</tbody></table></div>`;
}
function invoices(rows){
 const q=state.query.toLocaleUpperCase('es');
 let visible=rows.filter(r=>!q||[r.factura,r.cliente,r.deudor,r.numero_poliza].some(v=>String(v||'').toLocaleUpperCase('es').includes(q)));
 visible.sort((a,b)=>{const av=a[state.sort],bv=b[state.sort];return(typeof av==='number'?av-bv:String(av??'').localeCompare(String(bv??'')))*state.direction;});
 const pages=Math.max(1,Math.ceil(visible.length/20));state.page=Math.min(state.page,pages);
 const page=visible.slice((state.page-1)*20,state.page*20);
 return `<section class="section invoice-section">${chartTitle('Facturas de la selección','Una fila por factura. El cupo, la concentración y el conteo del deudor no se suman entre filas.',`<button class="button secondary" data-action="csv">${icon('download')} CSV de selección</button>`)}<div class="table-toolbar"><label class="search">${icon('search')}<input id="invoice-search" placeholder="Buscar factura, cliente, deudor o póliza" value="${esc(state.query)}" aria-label="Buscar facturas"></label><span>${number(visible.length)} resultados</span></div><div class="table-scroll"><table class="invoice-table"><thead><tr>${[['factura','Factura / cliente'],['deudor','Deudor'],['estado','Estado'],['region','Región'],['importe_factura_usd','Nominal USD'],['advance_usd','Advance USD'],['saldo_pendiente_usd','Pendiente USD'],['dias_mora','Mora'],['porcentaje_factura_deudor','% del deudor']].map(([key,label])=>`<th><button data-sort="${key}">${label} ${state.sort===key?(state.direction===1?'↑':'↓'):''}</button></th>`).join('')}<th></th></tr></thead><tbody>${page.map(r=>`<tr><td><button class="table-link" data-invoice="${r.id}">${esc(r.factura)}</button><small class="table-sub">${esc(r.cliente)}</small></td><td>${esc(r.deudor)}</td><td>${chip(r.estado,r.estado==='Abierta'?'warning':'success')}</td><td>${esc(r.region)}</td><td>${money(r.importe_factura_usd)}</td><td>${money(r.advance_usd)}</td><td>${money(r.saldo_pendiente_usd)}</td><td class="${r.dias_mora>=90?'danger-text':''}">${r.dias_mora??'—'}${r.vencimiento_estimado==='Sí'?'<small title="Vencimiento estimado"> est.</small>':''}</td><td>${pct(r.porcentaje_factura_deudor,2)}</td><td><button class="icon-button" data-invoice="${r.id}" aria-label="Abrir factura ${esc(r.factura)}">${icon('chevron')}</button></td></tr>`).join('')}</tbody></table></div><div class="pagination"><span>Mostrando ${visible.length?(state.page-1)*20+1:0}–${Math.min(state.page*20,visible.length)} de ${number(visible.length)}</span><div><button class="button secondary" data-page="${state.page-1}" ${state.page<=1?'disabled':''}>Anterior</button><b>${state.page} / ${pages}</b><button class="button secondary" data-page="${state.page+1}" ${state.page>=pages?'disabled':''}>Siguiente</button></div></div></section>`;
}
function drawer(){
 const r=cut().invoices.find(r=>r.id===state.drawer);if(!r)return'';
 const fields=[['Cliente',r.cliente],['Deudor',r.deudor],['Entidad',r.entidad],['Región operativa',r.region],['Moneda original',r.moneda_origen],['Emisión',dateLabel(r.fecha_emision)],['Vencimiento',dateLabel(r.fecha_vencimiento)],['Vencimiento estimado',r.vencimiento_estimado],['Financiación',dateLabel(r.detail.fecha_financiacion)],['Plazo pactado',`${r.detail.plazo_dias} días`],['Nominal USD',money(r.importe_factura_usd,2)],['Advance rate',pct(r.advance_rate,2)],['Advance USD',money(r.advance_usd,2)],['Pendiente aproximado USD',money(r.saldo_pendiente_usd,2)],['Días de mora',r.dias_mora??'No aplica; pagada'],['Póliza',r.numero_poliza||'Sin póliza en fuente'],['Estado de póliza',r.estado_poliza],['Cupo del deudor USD',r.cupo_aprobado_usd==null?'—':money(r.cupo_aprobado_usd)],['Expiración',dateLabel(r.fecha_expiracion_poliza)],['Concentración viva global',pct(r.concentracion_deudor,2)],['Facturas del deudor',r.numero_facturas_deudor],['Peso nominal dentro del deudor',pct(r.porcentaje_factura_deudor,2)],['Fila(s) fuente',r.detail.filas_origen],['Estado de conciliación',r.detail.estado_conciliacion]];
 return `<button class="drawer-backdrop" data-action="close-drawer" aria-label="Cerrar detalle"></button><aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title"><div class="drawer-header"><div><span class="eyebrow">DETALLE DE FACTURA</span><h2 id="drawer-title">${esc(r.factura)}</h2></div><button class="icon-button" data-action="close-drawer" aria-label="Cerrar detalle">${icon('close')}</button></div>${chip(r.estado,r.estado==='Abierta'?'warning':'success')}<dl>${fields.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl><p class="context-note">Cupo y concentración son atributos del deudor. No equivalen a cobertura confirmada de esta factura. Los porcentajes del deudor se calculan con todas sus facturas al corte.</p><button class="button secondary" data-drill="debtor" data-value="${esc(r.deudor)}">Ver todas las facturas del deudor ${icon('arrow')}</button></aside>`;
}
function render(){root.innerHTML=shell();document.title=`Capital Express · ${currentTitle()}`;}
function toast(text){const t=document.querySelector('#toast');t.textContent=text;t.classList.add('visible');setTimeout(()=>t.classList.remove('visible'),4200);}
function navigate(view){state.view=view;state.page=1;state.drawer=null;render();window.scrollTo({top:0,behavior:'smooth'});}
root.addEventListener('click',event=>{
 const button=event.target.closest('button,[data-view]');if(!button||button.disabled)return;
 if(button.dataset.view){event.preventDefault();navigate(button.dataset.view);return;}
 if(button.dataset.status){state.filters.status=button.dataset.status;state.page=1;render();return;}
 if(button.dataset.group){state.group=button.dataset.group;render();return;}
 if(button.dataset.age){state.age=button.dataset.age;render();return;}
 if(button.dataset.drill){const kind=button.dataset.drill;state.filters[kind]=button.dataset.value;state.drawer=null;state.page=1;
  if(kind==='region'){state.filters.client='';state.filters.debtor='';state.group='cliente';state.view='composition';}
  else if(kind==='client'){state.filters.debtor='';state.group='deudor';state.view='composition';}
  else state.view='invoices';render();window.scrollTo({top:0,behavior:'smooth'});return;}
 if(button.dataset.term){state.filters.term=button.dataset.term;navigate('invoices');return;}
 if(button.dataset.page){state.page=Number(button.dataset.page);render();return;}
 if(button.dataset.sort){state.direction=state.sort===button.dataset.sort?-state.direction:-1;state.sort=button.dataset.sort;render();return;}
 if(button.dataset.invoice){state.drawer=button.dataset.invoice;document.querySelector('#drawer-root').innerHTML=drawer();document.querySelector('.drawer [data-action="close-drawer"]').focus();return;}
 if(button.dataset.control){navigate('policy');document.querySelector(`#control-${button.dataset.control}`)?.scrollIntoView({behavior:'smooth',block:'center'});return;}
 const action=button.dataset.action;
 if(action==='reset'){state.filters={status:'Todas'};state.query='';state.page=1;render();}
 if(action==='clear-term'){delete state.filters.term;render();}
 if(action==='close-drawer'){state.drawer=null;document.querySelector('#drawer-root').innerHTML='';}
 if(action==='load')document.querySelector('#data-file').click();
 if(action==='pdf'){
  try{makeSummaryPdf(cut(),selected(),state.filters).save(`Sintesis_Cartera_${state.cut}${Object.values(state.filters).some(v=>v&&v!=='Todas')?'_filtrada':''}.pdf`);toast('Síntesis de una página descargada. Incluye el alcance de los filtros.');}
  catch(error){toast(`No se pudo generar el PDF: ${error.message}`);}
 }
 if(action==='csv'){
  const q=state.query.toLocaleUpperCase('es');
  const rows=selected().filter(r=>!q||[r.factura,r.cliente,r.deudor,r.numero_poliza].some(v=>String(v||'').toLocaleUpperCase('es').includes(q)));
  const keys=Object.keys(rows[0]||cut().invoices[0]||{}).filter(k=>!['detail','id','debtorId','clientId'].includes(k));
  const encode=v=>`"${String(v??'').replaceAll('"','""')}"`;
  const csv='\ufeff'+[keys.map(encode).join(','),...rows.map(r=>keys.map(k=>encode(r[k])).join(','))].join('\r\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));a.download=`Cartera_${state.cut}_seleccion.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast(`${rows.length} facturas exportadas con sus 24 campos de negocio.`);
 }
});
root.addEventListener('change',async event=>{
 const target=event.target;
 if(target.id==='cut'){state.cut=target.value;state.filters={status:'Todas'};state.drawer=null;state.page=1;render();}
 if(target.dataset.filter){state.filters[target.dataset.filter]=target.value;if(target.dataset.filter==='client')state.filters.debtor='';state.page=1;render();}
 if(target.id==='data-file'&&target.files[0]){
  try{
   const next=JSON.parse(await target.files[0].text());
   if(!next.cuts||!Object.keys(next.cuts).length||!Array.isArray(next.policy)||!next.config||!next.sources)throw new Error('Usa portfolio.json generado por actualizar_dashboard.py.');
   for(const [date,c] of Object.entries(next.cuts)){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Array.isArray(c.invoices)||!Array.isArray(c.insurance)||!Array.isArray(c.payments)||c.invoices.length>100000)throw new Error('Estructura de corte no válida.');
    if(c.invoices.some(r=>!r.id||!r.detail||!Number.isFinite(r.advance_usd)||!Number.isFinite(r.importe_factura_usd)||r.fecha_corte!==date))throw new Error('Facturas incompletas o importes inválidos.');
   }
   data=next;state.cut=Object.keys(data.cuts).sort().at(-1);state.filters={status:'Todas'};state.page=1;state.drawer=null;render();toast('Datos cargados para esta sesión.');
  }catch(error){toast(error.message);}
 }
});
let searchTimer;
root.addEventListener('input',event=>{
 if(event.target.id==='invoice-search'){
  state.query=event.target.value;state.page=1;const position=event.target.selectionStart;
  clearTimeout(searchTimer);searchTimer=setTimeout(()=>{render();const input=document.querySelector('#invoice-search');input?.focus();input?.setSelectionRange(position,position);},180);
 }
});
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&state.drawer){state.drawer=null;document.querySelector('#drawer-root').innerHTML='';}
 if(event.key==='Tab'&&state.drawer){
  const focusable=[...document.querySelectorAll('.drawer button,.drawer a,.drawer input')];const first=focusable[0],last=focusable.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
 }
});
render();

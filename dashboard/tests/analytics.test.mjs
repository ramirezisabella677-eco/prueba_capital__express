import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {totals,filterInvoices,coverageRows,policyChecks,aging,provision,summary,sum} from '../src/analytics.js';
import {makeSummaryPdf} from '../src/report.js';
const data=JSON.parse(readFileSync(new URL('../data/portfolio.json',import.meta.url),'utf8'));
const cut=data.cuts[Object.keys(data.cuts).sort().at(-1)];
const near=(a,b)=>assert.ok(Math.abs(a-b)<.02,`${a} != ${b}`);

test('total incluye pagadas y abiertas; saldo vivo conserva conciliación del ETL',()=>{
 const all=totals(cut.invoices),open=totals(filterInvoices(cut,{status:'Abierta'})),paid=totals(filterInvoices(cut,{status:'Pagada'}));
 assert.equal(all.count,870);assert.equal(open.count,516);assert.equal(paid.count,354);
 near(all.financed,open.financed+paid.financed);near(all.pending,22999975.14);near(paid.pending,0);
 near(all.financed,all.pending+all.paid);assert.ok(all.financed>all.pending);
});
test('filtros combinados no introducen datos ni confunden región con moneda de reporte',()=>{
 const rows=filterInvoices(cut,{status:'Abierta',region:'Internacional',entity:'CE UK'});
 assert.ok(rows.length);assert.ok(rows.every(r=>r.estado==='Abierta'&&r.region==='Internacional'&&r.entidad==='CE UK'));
 assert.equal(filterInvoices(cut,{client:'NO EXISTE'}).length,0);
});
test('concentración de política mantiene denominador global bajo filtro de cliente',()=>{
 const global=coverageRows(cut).find(r=>r.name==='AURORA AUTOMOTIVE GMBH');
 const client=global.rows[0].cliente,filtered=filterInvoices(cut,{client});
 const selected=coverageRows(cut,filtered).find(r=>r.id===global.id);
 near(selected.globalPending,global.globalPending);assert.equal(selected.concentration,global.concentration);
 assert.ok(selected.selectedPending<selected.globalPending);
 const policy=policyChecks(cut,filtered).find(c=>c.id==='concentration');
 assert.equal(policy.matches.some(r=>r.id===global.id),global.concentration>.3);
});
test('cupo por deudor se presenta una vez y no se multiplica por sus facturas',()=>{
 const rows=coverageRows(cut);assert.equal(rows.length,26);
 const aurora=rows.find(r=>r.name==='AURORA AUTOMOTIVE GMBH');assert.equal(aurora.limit,5515000);
 assert.ok(aurora.rows.length>1);assert.equal(new Set(rows.map(r=>r.id)).size,rows.length);
});
test('mora excluye pagadas y no envejece saldo cero',()=>{
 const bins=aging(cut.invoices,'mora');assert.equal(sum(bins,'count'),516);
 near(sum(bins,'value'),totals(cut.invoices).pending);
 assert.equal(sum(aging(filterInvoices(cut,{status:'Pagada'}),'mora'),'count'),0);
});
test('fechas de financiación conflictivas permanecen en tramo de revisión',()=>{
 const unknown=aging(cut.invoices,'financiacion').find(b=>b.name==='Fecha en revisión');
 assert.equal(unknown.count,2);assert.equal(totals(cut.invoices).estimated,7);
});
test('provisión no inventa tasa para mora 1–89 ni certifica cobertura incierta',()=>{
 const p=provision(cut.invoices);assert.ok(p.unpriced>0);assert.ok(p.scenarioHigh>p.scenarioLow);
 near(p.scenarioLow,p.uncertain90*.1);near(p.scenarioHigh,p.uncertain90);
 const paid=provision(filterInvoices(cut,{status:'Pagada'}));near(paid.known,0);near(paid.unpriced,0);
 assert.ok(p.calculableRatio<1);
});
test('política diferencia evidencia ausente de cumplimiento',()=>{
 const checks=policyChecks(cut,cut.invoices);
 assert.equal(checks.find(c=>c.id==='bank').status,'No verificable');
 assert.equal(checks.find(c=>c.id==='onboarding').count,null);
 assert.ok(checks.find(c=>c.id==='advance').count>0);
 assert.ok(checks.find(c=>c.id==='expired').count>0);
 assert.equal(checks.find(c=>c.id==='cheque').count,1);
});
test('síntesis identifica alcance y no denomina utilidad a las comisiones',()=>{
 const rows=filterInvoices(cut,{status:'Pagada'}),s=summary(cut,rows,{status:'Pagada'});
 assert.match(s.scope,/Pagada/);assert.match(s.sections[3][1],/No es utilidad neta/);
 near(s.t.pending,0);assert.equal(s.t.count,354);
});
test('PDF de cartera completa y filtros se limita a una página A4',()=>{
 for(const filters of [{status:'Todas'},{status:'Abierta'},{status:'Pagada'},{client:'ANDALUR TRANSPORTE SL'}]){
  const doc=makeSummaryPdf(cut,filterInvoices(cut,filters),filters);
  assert.equal(doc.getNumberOfPages(),1);assert.equal(Math.round(doc.internal.pageSize.getWidth()),210);
  assert.ok(doc.output('arraybuffer').byteLength>5000);
 }
});
test('vista vacía puede generar síntesis sin NaN ni excepciones',()=>{
 const s=summary(cut,[],{client:'NO EXISTE'});assert.equal(s.t.count,0);
 assert.ok(!JSON.stringify(s.sections).includes('NaN'));assert.equal(makeSummaryPdf(cut,[],{client:'NO EXISTE'}).getNumberOfPages(),1);
});

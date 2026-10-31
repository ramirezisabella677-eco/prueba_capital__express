export const sum=(rows,field)=>rows.reduce((a,r)=>a+Number(typeof field==='function'?field(r):r[field]||0),0);
export const ratio=(a,b)=>b?a/b:0;
export const money=(n,d=0)=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'USD',maximumFractionDigits:d,minimumFractionDigits:d}).format(Number(n)||0);
export const compact=n=>new Intl.NumberFormat('es-CO',{notation:'compact',maximumFractionDigits:2}).format(Number(n)||0);
export const pct=(n,d=1)=>new Intl.NumberFormat('es-CO',{style:'percent',maximumFractionDigits:d}).format(Number(n)||0);
export const number=n=>new Intl.NumberFormat('es-CO').format(Number(n)||0);
export const dateLabel=s=>s?new Intl.DateTimeFormat('es-CO',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(s+'T00:00:00Z')):'Sin fecha';
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const active=r=>r.estado==='Abierta';

export function filterInvoices(cut,filters={}){
 return cut.invoices.filter(r=>(!filters.status||filters.status==='Todas'||r.estado===filters.status)
  &&(!filters.region||r.region===filters.region)&&(!filters.client||r.cliente===filters.client)
  &&(!filters.debtor||r.deudor===filters.debtor)&&(!filters.entity||r.entidad===filters.entity)
  &&(!filters.term||Number(r.detail.plazo_dias)===Number(filters.term)));
}
export function totals(rows){
 const open=rows.filter(active),paid=rows.filter(r=>!active(r));
 const financed=sum(rows,'advance_usd'),fees=sum(rows,r=>r.detail.comisiones_devengadas_usd);
 return {count:rows.length,openCount:open.length,paidCount:paid.length,
  debtors:new Set(rows.map(r=>r.debtorId)).size,clients:new Set(rows.map(r=>r.clientId)).size,
  nominal:sum(rows,'importe_factura_usd'),financed,pending:sum(open,'saldo_pendiente_usd'),
  paid:sum(paid,'advance_usd'),fees,feeRatio:ratio(fees,financed),
  overdue:sum(open.filter(r=>r.dias_mora>0),'saldo_pendiente_usd'),
  mora90:sum(open.filter(r=>r.dias_mora>=90),'saldo_pendiente_usd'),
  estimated:rows.filter(r=>r.vencimiento_estimado==='Sí').length,
  fundingUnknown:rows.filter(r=>r.detail.antiguedad_financiacion_dias==null).length};
}
export function groupBy(rows,key,measure='advance_usd'){
 const map=new Map();
 for(const r of rows){const label=typeof key==='function'?key(r):r[key];if(!map.has(label))map.set(label,[]);map.get(label).push(r);}
 return [...map].map(([name,items])=>({name,rows:items,count:items.length,value:sum(items,measure),...totals(items)})).sort((a,b)=>b.value-a.value);
}
export function aging(rows,mode='mora'){
 const definitions=mode==='plazo'?[[30,'30 días'],[45,'45 días'],[60,'60 días'],[90,'90 días'],[Infinity,'Más de 90']]:
  mode==='mora'?[[0,'No vencida'],[30,'1–30 días'],[60,'31–60 días'],[89,'61–89 días'],[Infinity,'90+ días']]:
  [[30,'0–30 días'],[60,'31–60 días'],[90,'61–90 días'],[120,'91–120 días'],[Infinity,'121+ días']];
 const bins=definitions.map(([,label])=>({name:label,rows:[],value:0,count:0}));
 let unknown=0,unknownValue=0;
 for(const r of rows){
  if(mode==='mora'&&!active(r))continue;
  const days=mode==='mora'?r.dias_mora:mode==='plazo'?r.detail.plazo_dias:
    mode==='emision'?r.detail.antiguedad_emision_dias:r.detail.antiguedad_financiacion_dias;
  if(days==null){unknown++;unknownValue+=r.advance_usd;continue;}
  const index=definitions.findIndex(([limit])=>days<=limit);
  const bin=bins[index];bin.rows.push(r);bin.count++;bin.value+=mode==='mora'?r.saldo_pendiente_usd:r.advance_usd;
 }
 if(unknown)bins.push({name:'Fecha en revisión',value:unknownValue,count:unknown,rows:[]});
 return bins;
}
export function coverageRows(cut,selected=cut.invoices){
 const totalPending=totals(cut.invoices).pending;
 const selectedGroups=groupBy(selected,'debtorId');
 return selectedGroups.map(g=>{
  const all=cut.invoices.filter(r=>r.debtorId===g.name),global=totals(all);
  const policies=cut.insurance.filter(p=>p.id_deudor===g.name);
  const policy=policies.length===1?policies[0]:null;
  const status=!policies.length?'Sin cupo':!policy?'Pólizas múltiples':!policy.fecha_expiracion?'Vigencia por verificar':
   policy.fecha_expiracion<all[0].fecha_corte?'Vencida':'Vigente en registro';
  const limit=policy?policy.cupo_aprobado_usd:null;
  const potential=status==='Vigente en registro'?Math.min(global.pending,limit):0;
  return {id:g.name,name:g.rows[0].deudor,rows:g.rows,globalRows:all,count:g.count,selectedPending:g.pending,
   globalPending:global.pending,globalNominal:sum(all.filter(active),'importe_factura_usd'),
   concentration:ratio(global.pending,totalPending),limit,status,policy,policies,potential,
   expiry:policy?.fecha_expiracion,utilization:limit?global.pending/limit:null,
   excess:limit==null?null:Math.max(0,global.pending-limit),headroom:limit==null?null:limit-global.pending,
   literalIssues:all.filter(r=>active(r)&&r.detail.coincidencia_literal_nombre_seguro===false).length};
 }).sort((a,b)=>b.globalPending-a.globalPending);
}
export function provision(rows){
 let known=0,scenarioLow=0,scenarioHigh=0,unpriced=0,pricedBalance=0,uncertain90=0;
 for(const r of rows.filter(active)){
  const d=r.detail;
  if(d.provision_referencia_usd!=null){known+=d.provision_referencia_usd;pricedBalance+=r.saldo_pendiente_usd;}
  else if(d.provision_escenario_10_usd!=null&&d.provision_escenario_100_usd!=null){
   scenarioLow+=d.provision_escenario_10_usd;scenarioHigh+=d.provision_escenario_100_usd;uncertain90+=r.saldo_pendiente_usd;
  }else unpriced+=r.saldo_pendiente_usd;
 }
 return {known,scenarioLow,scenarioHigh,unpriced,pricedBalance,uncertain90,
  conditionalLow:known+scenarioLow,conditionalHigh:known+scenarioHigh,
  calculableRatio:ratio(pricedBalance,totals(rows).pending)};
}
export function policyChecks(cut,rows){
 const open=rows.filter(active),coverage=coverageRows(cut,rows),debtors=new Set(rows.map(r=>r.debtorId));
 const payments=cut.payments.filter(p=>p.id_deudor?debtors.has(p.id_deudor):rows.length===cut.invoices.length);
 const check=(id,title,rules,matches,explanation,action,priority=2,uncertain=false)=>({id,title,rules,count:matches.length,
  amount:id==='headroom'?sum(matches,'excess'):sum(matches,r=>r.saldo_pendiente_usd??r.importe_usd??r.selectedPending??0),
  status:matches.length?(uncertain?'Por verificar':'Desviación observada'):'Sin desviación observada',
  explanation,action,priority,matches});
 const concentration=coverage.filter(r=>r.concentration>.30+1e-10&&r.selectedPending>0);
 const excess=coverage.filter(r=>r.excess>0&&r.selectedPending>0);
 const expired=coverage.filter(r=>r.status==='Vencida'&&r.selectedPending>0);
 const missing=coverage.filter(r=>['Sin cupo','Vigencia por verificar','Pólizas múltiples'].includes(r.status)&&r.selectedPending>0);
 const checks=[
  check('concentration','Concentración por deudor ≤ 30%','5, 32',concentration,
   'El denominador es el saldo financiado vivo global. No hay evidencia de excepción del CEO.',
   'Detener nuevas compras que incrementen concentración; escalar excepción al CEO.',1,true),
  check('headroom','Exceso sobre cupo del deudor','16, 21, 22, 30',excess,
   'El monto muestra el exceso global de los deudores visibles, consolidando todos sus clientes y entidades. No se acumulan pólizas superpuestas.',
   'Congelar incrementos de exposición del deudor y validar cupo con Riesgo.',1),
  check('expired','Póliza vigente al corte','24',expired,
   'La renovación en trámite no acredita vigencia.',
   'Detener financiación al deudor hasta acreditar renovación efectiva.',1),
  check('insurance','Cupo y vigencia verificables','16, 23, 24',missing,
   'Se distinguen ausencia en fuente, fecha faltante y pólizas múltiples.',
   'Exigir certificado, aprobación e identidad del asegurado antes de nuevas compras.',1,true),
  check('advance','Advance rate dentro de 85% / 80%','6',open.filter(r=>r.advance_rate>(r.region==='Estados Unidos'?.85:.80)+1e-9),
   'Región operativa por moneda solicitada: USD = Estados Unidos; otras = Internacional. No acredita domicilio jurídico.',
   'Revisar excepciones y corregir porcentaje de anticipos nuevos.',2),
  check('term','Plazo de pago ≤ 90 días','7',open.filter(r=>r.detail.plazo_dias>90||r.detail.plazo_calculado_dias>90),
   'Se contrasta el plazo informado con emisión a vencimiento original.',
   'Revisar elegibilidad y documentar corrección del plazo.',2),
  check('delivery','Emisión entre entrega y +30 días','13',open.filter(r=>r.detail.desfase_emision_entrega_dias<0||r.detail.desfase_emision_entrega_dias>30),
   'Las observaciones del export no sustituyen una entrega firmada.',
   'Solicitar evidencia de entrega y validar elegibilidad antes de financiar.',2),
  check('retro','Financiación previa a emisión','17',open.filter(r=>r.detail.financiacion_antes_emision===true),
   'La condición de fechas es observable; la aprobación gerencial no está disponible.',
   'Requerir autorización explícita; aclarar el alcance de la redacción de compra retroactiva.',2,true),
  check('literal','Nombre literal del asegurado','23',open.filter(r=>r.detail.coincidencia_literal_nombre_seguro===false),
   'La equivalencia analítica no acredita coincidencia formal ante la aseguradora.',
   'Validar identidad y certificado del asegurado sin deshacer la consolidación analítica.',2,true),
  check('cheque','Cobros recibidos en cheque','34',payments.filter(p=>p.medio?.toUpperCase()==='CHEQUE'),
   'Monto del cobro, no saldo de una factura ni pérdida esperada.',
   'Aplicar freeze trigger y validar liquidación y canal de cobro.',1),
  check('redirect','Pagos reenviados por el cliente','27, 28',payments.filter(p=>p.ordenante_original?.toUpperCase().includes('REENVIO')),
   'El reenvío es una señal de posible fallo de redirección; no prueba todas sus causas.',
   'Verificar NOA/DACA y restablecer el canal controlado.',1,true),
  check('thirdparty','Ordenante de tercero no acreditado','34',payments.filter(p=>p.ordenante_original?.toUpperCase().includes('PERSONA NATURAL')),
   'Falta evidencia de relación entre ordenante y deudor.',
   'Detener nueva operación y verificar origen y relación del pago.',1,true),
  check('dispute','Disputas o notas de crédito abiertas','15, 29',open.filter(r=>r.detail.notas_credito_relacionadas),
   'Notas de crédito relacionadas pendientes de conciliación; no se descontaron de saldo.',
   'Aclarar estado y resolver disputa o ajuste antes de continuar financiando.',1,true),
 ];
 checks.push(...[
  ['delivery-proof','Evidencia de entrega firmada','14','No se recibieron soportes firmados.'],
  ['bank','Cambios de cuenta verificados','33','No se recibió registro de cambios ni verificaciones telefónicas.'],
  ['seasonal','Solicitudes reiteradas de incremento','35','No se recibió historial de solicitudes de línea.'],
  ['onboarding','Onboarding y deudores nuevos','36','No se recibió historial ni expediente de onboarding.'],
 ].map(([id,title,rules,explanation])=>({id,title,rules,count:null,amount:null,status:'No verificable',explanation,
  action:'Solicitar evidencia operativa; no interpretar la falta de datos como cumplimiento.',priority:3,matches:[]})));
 return checks;
}
export function scopeLabel(filters={}){
 return [filters.status||'Todas',filters.region,filters.client,filters.debtor,filters.entity,filters.term?`Plazo ${filters.term} días`:null].filter(Boolean).join(' · ');
}
export function summary(cut,rows,filters={}){
 const t=totals(rows),p=provision(rows),coverage=coverageRows(cut,rows);
 const ranked=groupBy(rows,'deudor','saldo_pendiente_usd');
 const main=ranked.find(r=>r.pending>0);
 const checks=policyChecks(cut,rows);
 const issues=checks.filter(c=>c.count>0).sort((a,b)=>a.priority-b.priority||b.amount-a.amount).slice(0,3);
 const validExposure=sum(coverage.filter(r=>r.status==='Vigente en registro'),'selectedPending');
 const expiredExposure=sum(coverage.filter(r=>r.status==='Vencida'),'selectedPending');
 const regional=groupBy(rows,'region').map(r=>`${r.name} ${pct(ratio(r.financed,t.financed))}`).join('; ');
 const terms=groupBy(rows,r=>String(r.detail.plazo_dias)).sort((a,b)=>b.count-a.count);
 return {t,p,coverage,issues,scope:scopeLabel(filters),date:rows[0]?.fecha_corte||cut.invoices[0]?.fecha_corte,
  sections:[
   ['Tamaño y composición',`${number(t.count)} facturas de ${t.clients} clientes y ${t.debtors} deudores. Importe financiado total ${money(t.financed)}: pendiente aproximado ${money(t.pending)} y financiado de operaciones pagadas ${money(t.paid)}. Nominal total ${money(t.nominal)}. ${regional}.`],
   ['Antigüedad',`Mora pendiente ${money(t.overdue)} (${pct(ratio(t.overdue,t.pending))} del saldo vivo); 90 días o más ${money(t.mora90)}. ${t.estimated} vencimientos estimados y ${t.fundingUnknown} fechas de financiación en revisión.${terms.length?` Plazo más frecuente: ${terms[0].name} días (${pct(ratio(terms[0].count,t.count))} de facturas).`:''} Las pagadas no se envejecen como saldo vivo.`],
   ['Concentración',main?`Mayor saldo pendiente: ${main.name}, ${money(main.pending)}. ${coverage.filter(r=>r.concentration>.30&&r.selectedPending>0).length} deudor(es) seleccionado(s) supera(n) el 30% del saldo vivo global; no hay aprobación del CEO aportada. El filtro no altera el denominador de política.`:'La selección no tiene saldo pendiente; no hay concentración viva que evaluar.'],
   ['Ingresos y provisiones',`Comisiones devengadas del archivo ${money(t.fees)}; ingreso/importe financiado ${pct(t.feeRatio)}, sin anualizar. Provisión calculable de referencia ${money(p.known)} (parcial). Mora 90+ de cobertura no certificada: escenario adicional ${money(p.scenarioLow)}–${money(p.scenarioHigh)}. Saldo sin tasa o mora confirmada ${money(p.unpriced)}. No es utilidad neta; faltan variación de provisión y costos.`],
   ['Seguros',`Saldo seleccionado con póliza vigente en registro ${money(validExposure)}; con póliza vencida ${money(expiredExposure)}. Exceso de cupo global de deudores visibles ${money(sum(coverage,'excess'))}. El cupo se consume con anticipo vivo global por deudor. Vigencia y cupo no certifican cobertura indemnizable.`],
   ['Decisiones prioritarias',issues.length?issues.map(i=>`${i.title}: ${money(i.amount)} relacionados. ${i.action}`).join(' '):'No se detectan desviaciones cuantificables en esta selección; las verificaciones documentales pendientes siguen abiertas.'],
  ]};
}

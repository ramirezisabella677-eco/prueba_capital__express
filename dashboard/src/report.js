import {jsPDF} from 'jspdf';
import {summary,money,number,dateLabel} from './analytics.js';

const plain=text=>String(text).replaceAll('\u00a0',' ').replaceAll('≤','<=').replaceAll('≥','>=').replace(/[–—]/g,'-');
export function makeSummaryPdf(cut,rows,filters={}){
 const s=summary(cut,rows,filters),doc=new jsPDF({unit:'mm',format:'a4'});
 const ink=[24,46,62],muted=[91,108,121],accent=[31,117,107];
 doc.setProperties({title:`Capital Express - Síntesis de cartera ${s.date}`,subject:'Entregable B, diagnóstico de cartera',author:'Capital Express'});
 doc.setFillColor(...ink);doc.rect(0,0,210,12,'F');
 doc.setFont('helvetica','bold');doc.setTextColor(...ink);doc.setFontSize(19);
 doc.text('CAPITAL EXPRESS',16,26);
 doc.setFontSize(10);doc.setTextColor(...accent);doc.text('DIAGNÓSTICO DE CARTERA · ENTREGABLE B',16,34);
 doc.setFont('helvetica','normal');doc.setTextColor(...muted);doc.setFontSize(8.2);
 doc.text(plain(`Corte ${dateLabel(s.date)} | USD de cierre | Saldo pendiente aproximado`),16,41);
 const scope=doc.splitTextToSize(plain(`Alcance: ${s.scope}`),178);
 doc.text(scope.slice(0,3),16,47);
 let y=49+Math.min(scope.length,3)*3.5;
 const stats=[['FINANCIADO TOTAL',money(s.t.financed)],['PENDIENTE',money(s.t.pending)],['FACTURAS',number(s.t.count)],['MORA 90+',money(s.t.mora90)]];
 doc.setDrawColor(222,230,234);doc.line(16,y,194,y);y+=7;
 stats.forEach(([label,value],index)=>{
  const x=16+index*45;
  doc.setFontSize(7);doc.setTextColor(...muted);doc.text(label,x,y);
  doc.setFontSize(12);doc.setTextColor(...ink);doc.setFont('helvetica','bold');doc.text(plain(value),x,y+6);doc.setFont('helvetica','normal');
 });y+=13;doc.line(16,y,194,y);y+=8;
 // Medir antes de dibujar: el resultado siempre cabe en una página A4.
 let font=9;
 const height=size=>s.sections.reduce((total,[,body])=>{doc.setFontSize(size);return total+7+doc.splitTextToSize(plain(body),178).length*(size*.40)+4;},0);
 while(y+height(font)>270&&font>7.7)font-=.2;
 for(const [title,body] of s.sections){
  doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(...accent);doc.text(plain(title),16,y);y+=5;
  doc.setFont('helvetica','normal');doc.setFontSize(font);doc.setTextColor(...ink);
  const lines=doc.splitTextToSize(plain(body),178);doc.text(lines,16,y,{lineHeightFactor:1.12});
  y+=lines.length*(font*.40)+6;
 }
 if(y>278)throw new Error('La síntesis excede una página. Acortar alcance o textos antes de exportar.');
 doc.setDrawColor(222,230,234);doc.line(16,281,194,281);doc.setTextColor(...muted);doc.setFontSize(7);
 doc.text('Fuente: archivo de cartera y Politica_Extracto. Montos de riesgos superpuestos; no son sumables.',16,286);
 doc.text('Comisiones del archivo y provisión al cierre no son flujos comparables ni utilidad neta. Cobertura pendiente de soporte.',16,290);
 doc.text('1 / 1',194,286,{align:'right'});
 return doc;
}

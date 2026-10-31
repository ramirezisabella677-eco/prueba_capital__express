import {readFile,mkdir,copyFile} from 'node:fs/promises';
import {makeSummaryPdf} from '../src/report.js';
const dataset=JSON.parse(await readFile('data/portfolio.json','utf8'));
await mkdir('artifacts',{recursive:true});await mkdir('dist',{recursive:true});
for(const [date,cut] of Object.entries(dataset.cuts)){
 const name=`Sintesis_Cartera_${date}.pdf`;
 makeSummaryPdf(cut,cut.invoices,{status:'Todas'}).save(`artifacts/${name}`);
 await copyFile(`artifacts/${name}`,`dist/${name}`);
 console.log(`PDF independiente: artifacts/${name}`);
}

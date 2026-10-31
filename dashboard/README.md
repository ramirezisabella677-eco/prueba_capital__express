# Capital Express · Dashboard operativo

Aplicación local, sin backend, preparada para Vercel. Incluye siete vistas y la generación automática de una síntesis de una página A4 para el entregable B.

## Abrir y usar

Abrir `dist/index.html` directamente en Chrome o Edge. El JavaScript, los gráficos, los datos y la generación del PDF están incluidos; no requiere CDN, cuentas ni conexión a internet para funcionar.

También puede servirse por HTTP:

```powershell
cd dashboard
npm ci
npm run build
npm run dev
```

La dirección local es `http://127.0.0.1:4173`. La compilación genera también `artifacts/Sintesis_Cartera_2026-08-31.pdf` y una copia en `dist/`.

- **Total / Pendiente / Pagado:** filtra por estado fuente. Total incluye todas las facturas canónicas del archivo, con abiertas y pagadas separadas en los indicadores.
- **Región, cliente, deudor y entidad:** filtros combinables. Las barras de composición permiten profundizar de región a cliente, deudor y factura.
- **Antigüedad:** mora, tiempo desde financiación, tiempo desde emisión y plazo pactado. Las fechas conflictivas se conservan en revisión; los vencimientos estimados no se ocultan.
- **Ingresos y provisiones:** comisiones devengadas, relación ingreso/financiado, referencia parcial y escenarios de provisión, sin presentar utilidad neta.
- **Seguros:** saldo seleccionado, consumo global por deudor, cupo registrado, utilización, exceso, headroom y expiración.
- **Política y acciones:** condición observable, monto relacionado, filas del manual, incertidumbre y acción. Se conserva el extracto completo.
- **Facturas:** búsqueda, ordenamiento, paginación e inspector. El CSV exporta los 24 campos de las facturas filtradas, incluyendo la búsqueda de la tabla.
- **Síntesis PDF:** descarga directa de una página, calculada con la selección de filtros globales. El alcance está impreso en el documento. La búsqueda de la tabla no altera el alcance del diagnóstico.
- **Cargar datos:** el icono de carga acepta un `portfolio.json` generado por el proceso. El cambio dura la sesión y no escribe en los archivos fuente.

Para el entregable B de toda la cartera, limpiar filtros y seleccionar **Total** antes de descargar. El PDF precompilado del directorio `artifacts/` siempre utiliza la cartera completa de su corte.

## Qué significa cada importe

| Indicador | Definición |
|---|---|
| Importe financiado total | Suma del advance original en USD, incluyendo abiertas y pagadas. No es exposición pendiente. |
| Saldo pendiente | Anticipo de las facturas abiertas como aproximación al residual. No se vuelven a descontar cobros. |
| Operaciones pagadas | Advance original de las facturas marcadas pagadas; no implica conciliación bancaria independiente. |
| Nominal | Importe de las facturas en USD; las notas de crédito permanecen separadas y sin netear. |
| Concentración de política | Saldo pendiente global del deudor / saldo pendiente global de la cartera al corte. Un filtro de cliente no cambia el denominador. |
| Consumo del seguro | Advance vivo global del deudor, consolidado entre clientes y entidades, según fila 22. |
| Headroom | Cupo registrado menos consumo global. Un resultado positivo no certifica cupo utilizable. |
| Cobertura potencial | Mínimo entre saldo vivo y cupo con vigencia registrada. Falta acreditar identidad, aprobación y elegibilidad. |
| Comisiones | Ingreso devengado informado para las operaciones del archivo; no es ingreso exclusivo de agosto ni flujo de caja cobrado. |
| Ingreso / financiado | Comisiones seleccionadas / advance original seleccionado; no anualizado y sin costos. |

La región es la clasificación operativa acordada por moneda original: USD = Estados Unidos, otras = Internacional. El control de advance aplica 85% / 80% a esa clasificación y deja visible que no certifica país jurídico del deudor.

## Provisiones y rentabilidad

La política del ejercicio es la fuente de las tasas. Se conservan los cálculos del ETL:

- Saldo no vencido con fecha fuente: objetivo del 1% sobre saldo financiado aproximado.
- Mora confirmada de 90 días o más sin cupo en la fuente o con póliza vencida: referencia del 100%.
- Mora confirmada de 90 días o más con cobertura no certificada: escenarios del 10% y 100%, sin afirmar cobertura efectiva.
- Mora de 1–89 días: tasa no especificada en el extracto. Vencimientos estimados: no se presentan como mora confirmada para provisionar. Estos saldos se muestran como no determinables.

El resultado es **parcial**, no una provisión contable certificada. Los escenarios adicionales no incluyen el saldo sin tasa. Un dato desconocido no se convierte en cero.

El gasto o reversión reconocido en resultados es el ajuste de la provisión, no una resta automática de su saldo final contra las comisiones acumuladas. Faltan saldo inicial de provisión, movimientos, bajas, pérdidas, costos de fondeo y operación y cifras del mismo período. Por eso la aplicación no presenta utilidad neta ni tasa anualizada. Referencia conceptual: [IFRS 9, párrafo 5.5.8, explicado por IFRS Foundation](https://www.ifrs.org/projects/completed-projects/2019/curing-of-a-credit-impaired-financial-asset-ifrs-9/tad-presentation-of-unrecognised-interest-following-the-curing-of-a-credit-impaired-financial-asset/). Esta referencia no reemplaza las tasas de `Politica_Extracto`.

## Política y evidencia

Los controles relacionan concentración, advance, plazo, emisión/entrega, financiación previa, seguro, discrepancias de nombre, notas de crédito y canales de cobro con las filas del extracto. Las verificaciones sin evidencia —soportes firmados, cambios de cuenta, solicitudes reiteradas y onboarding— se muestran como no verificables, no como cumplimiento.

Los montos de controles pueden superponerse. En seguro, el exceso es global para los deudores presentes en la selección; en cobros, el monto corresponde al movimiento y no al saldo de una factura. No se suman esos montos como una pérdida o exposición única.

La composición usa el importe financiado de la selección. Los controles de concentración y cupo siempre mantienen la base global de riesgo. Las operaciones pagadas pueden mostrar señales históricas de canal de cobro, pero no generan saldo vivo.

## Actualización mensual

Desde la carpeta raíz del caso:

```powershell
python actualizar_dashboard.py --input 'cartera_septiembre.xlsx' --corte 2026-09-30
```

El comando ejecuta el ETL existente, reúne los cortes de `salidas_v2`, valida el cruce core/detalle, exporta `dashboard/data/portfolio.json`, compila la web y genera un PDF completo para cada corte. No envía mensajes ni publica el sitio.

Para regenerar solo desde las salidas ya validadas:

```powershell
python actualizar_dashboard.py --solo-exportar
```

La primera vez se necesita `npm ci` dentro de `dashboard`. Los cambios en el manual requieren revisar umbrales, referencias y reglas; el código no interpreta automáticamente un nuevo texto normativo. No se muestran tendencias hasta disponer de varios cortes.

## Vercel

Seleccionar **dashboard** como Root Directory del proyecto. El repositorio debe incluir `data/portfolio.json`, las fuentes, `package.json`, `package-lock.json` y `vercel.json`.

La configuración declarada utiliza preset **Other**, comando `npm run build` y salida `dist`. La actualización de datos ocurre localmente con Python; Vercel compila el JSON ya preparado con Node. No necesita Python, base de datos ni variables de entorno en Vercel. El proyecto queda preparado para desplegar; esta entrega no lo publica.

Documentación: [configuración estática de Vercel](https://vercel.com/docs/project-configuration/vercel-json).

## Comprobaciones

```powershell
cd dashboard
npm test
npm run build
npm run dev
# En otra terminal, con el servidor local disponible:
npm run test:browser
```

Las pruebas de cálculo verifican filtros, separación pagado/pendiente, denominadores globales, consolidación de seguros, antigüedad, provisiones parciales y una página A4 tanto para selección completa como filtrada. El navegador verifica siete vistas, recorrido de región a factura, búsqueda, inspector, descargas, móvil y apertura directa del HTML. `playwright-core` utiliza Chrome ya instalado; no descarga navegadores. Ajustar `executablePath` en la prueba si Chrome está en otra ubicación.

La generación mensual, el módulo analítico y el módulo PDF se entregan en código fuente. La captura de pantalla es evidencia de QA; las cifras publicadas proceden de los archivos y controles del ETL.

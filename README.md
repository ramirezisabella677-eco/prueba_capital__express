# Capital Express · Dashboard de cartera

Dashboard estatico con filtros de cartera, indicadores de riesgo y descarga de una sintesis PDF. El codigo de la aplicacion y los datos preparados estan en `dashboard/`.

## Desplegar en Vercel

Importar este repositorio desde GitHub y configurar:

| Opcion | Valor |
| --- | --- |
| Production Branch | `main` |
| Root Directory | `dashboard` |
| Framework Preset | `Other` |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

`dashboard/vercel.json` ya declara el framework, la compilacion, la salida y las cabeceras HTTP. No se necesitan variables de entorno, Python ni una base de datos en Vercel.

Documentacion: [configurar la compilacion en Vercel](https://vercel.com/docs/builds/configure-a-build).

## Desarrollo y comprobaciones

```sh
cd dashboard
npm ci
npm test
npm run build
npm run dev
```

Abrir `http://127.0.0.1:4173`. La compilacion tambien genera el PDF de la cartera en `dist/`.

## Contenido versionado

Se incluyen las fuentes, los scripts, las pruebas, `package-lock.json` y `dashboard/data/portfolio.json`, necesario para compilar la aplicacion. Los datos de ese JSON quedan integrados en el dashboard publicado.

Las dependencias, la salida compilada, los artefactos y los documentos originales del caso permanecen fuera del repositorio. El proceso Python para preparar nuevos cortes se conserva localmente; despues de ejecutarlo, se debe subir el nuevo `dashboard/data/portfolio.json` para actualizar el despliegue.

Ver [la documentacion del dashboard](dashboard/README.md) para las definiciones de indicadores y el funcionamiento de las vistas.

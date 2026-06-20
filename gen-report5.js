const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, LevelFormat,
} = require("docx");
const fs = require("fs");

const BLUE="1E3A5F",LBLUE="D6E4F0",GREEN="1A6B3A",LGREEN="D4EFDF";
const RED="A93226",LRED="FADBD8",YELLOW="7D6608",LYELLOW="FEF9E7";
const GRAY="F2F3F4",WHITE="FFFFFF",DARK="1C2833";

const bdr=(c)=>({style:BorderStyle.SINGLE,size:1,color:c||"CCCCCC"});
const bdrs=(c)=>({top:bdr(c),bottom:bdr(c),left:bdr(c),right:bdr(c)});
const cell=(text,o={})=>new TableCell({
  borders:bdrs(o.bc||"CCCCCC"),
  width:o.w?{size:o.w,type:WidthType.DXA}:undefined,
  shading:o.fill?{fill:o.fill,type:ShadingType.CLEAR}:undefined,
  verticalAlign:VerticalAlign.CENTER,
  margins:{top:80,bottom:80,left:120,right:120},
  children:[new Paragraph({alignment:o.center?AlignmentType.CENTER:AlignmentType.LEFT,
    children:[new TextRun({text,bold:o.bold||false,color:o.color||DARK,size:o.size||18,font:"Arial"})]})],
});
const hrow=(texts,widths,fill=BLUE)=>new TableRow({tableHeader:true,children:texts.map((t,i)=>new TableCell({
  borders:bdrs(BLUE),width:{size:widths[i],type:WidthType.DXA},
  shading:{fill,type:ShadingType.CLEAR},verticalAlign:VerticalAlign.CENTER,
  margins:{top:80,bottom:80,left:120,right:120},
  children:[new Paragraph({alignment:AlignmentType.CENTER,
    children:[new TextRun({text:t,bold:true,color:WHITE,size:18,font:"Arial"})]})],
}))});
const sp=(n=1)=>Array.from({length:n},()=>new Paragraph({spacing:{before:0,after:0},children:[new TextRun("")]}));

const heading=(text,level=HeadingLevel.HEADING_1)=>new Paragraph({
  heading:level,
  spacing:{before:240,after:120},
  children:[new TextRun({text,bold:true,color:BLUE,size:level===HeadingLevel.HEADING_1?28:22,font:"Arial"})],
});

const tests = [
  { id:"T-01", desc:"GET /kam/dashboard — resumen general KAM Andrés M.",
    req:"GET /api/kam/dashboard (sesión KAM)", expected:"vendor, meta, ytdReal, cumplimiento, top80, cupoAlerts, overdueInvoices",
    actual:"vendor=Andrés M. meta=80000000 ytdReal=98842628 cumplimiento=124% top80={clientCount:2,ofTotal:3} cupoAlerts=[] overdueInvoices=2", result:"PASS" },
  { id:"T-02", desc:"GET /kam/clients — listado paginado sin filtros",
    req:"GET /api/kam/clients", expected:"meta.total=3, data[].creditUsedPct, data ordenado por ytd DESC",
    actual:"total=3, Esmeralda seg=A ytd=68842628, creditUsedPct calculado correctamente", result:"PASS" },
  { id:"T-03", desc:"GET /kam/clients?status=activo — filtro por estado",
    req:"GET /api/kam/clients?status=activo", expected:"solo clientes activos",
    actual:"total_activo=3, todos con status=activo", result:"PASS" },
  { id:"T-04", desc:"GET /kam/clients?segment=A — filtro por segmento",
    req:"GET /api/kam/clients?segment=A", expected:"solo clientes segmento A",
    actual:"total_A=1, todos con segment=A (Joyería La Esmeralda)", result:"PASS" },
  { id:"T-05", desc:"GET /kam/commissions?year=2026 — comisiones anuales",
    req:"GET /api/kam/commissions?year=2026", expected:"totalInvoicesPaid, totalVolume, totalCommission, rows[] con onTime",
    actual:"period=2026 paid=2 volume=4267328 commission=128020 rows=[Esmeralda x2 onTime=true]", result:"PASS" },
  { id:"T-06", desc:"GET /kam/commissions?year=2026&month=6 — filtro mensual",
    req:"GET /api/kam/commissions?year=2026&month=6", expected:"period=2026-06, solo facturas de junio",
    actual:"period=2026-06 paid=2 commission=128020", result:"PASS" },
  { id:"T-07", desc:"Aislamiento — KAM Laura P. solo ve sus propios clientes",
    req:"GET /api/kam/clients (sesión Laura P.)", expected:"clientes asignados a Laura, no a Andrés",
    actual:"Laura clientes=2 (Andrés tiene 3, sin cross-leak)", result:"PASS" },
  { id:"T-08", desc:"Auth isolation — aliado → 403 en rutas KAM",
    req:"GET /api/kam/dashboard (sesión aliado esmeralda@aliado.com)", expected:"HTTP 403 Forbidden",
    actual:"HTTP 403 - Se requiere rol: kam", result:"PASS" },
  { id:"T-09", desc:"Sin sesión → 401 Unauthorized",
    req:"GET /api/kam/dashboard (sin cookie)", expected:"HTTP 401",
    actual:"HTTP 401 - Sesión inválida o expirada", result:"PASS" },
  { id:"T-10", desc:"Validación ?month=13 → 400 Bad Request",
    req:"GET /api/kam/commissions?year=2026&month=13", expected:"HTTP 400, mensaje de validación",
    actual:"HTTP 400 - month debe ser entre 1 y 12", result:"PASS" },
  { id:"T-11", desc:"Validación ?segment=INVALIDO → 400 Bad Request",
    req:"GET /api/kam/clients?segment=INVALIDO", expected:"HTTP 400 con valores válidos",
    actual:"HTTP 400 - segment inválido. Valores: A, B, C", result:"PASS" },
];

const findings = [
  { id:"F-E", sev:"INFO", desc:"Credenciales Wompi sin configurar en .env",
    detail:"WOMPI_PUB_KEY y WOMPI_INTEGRITY_SECRET aún vacíos en .env de desarrollo. El endpoint POST /invoices/:id/pay retorna HTTP 503 (comportamiento correcto — fail-fast implementado en Sprint 4). Requiere claves sandbox reales de comercios.wompi.co para pruebas end-to-end de pagos.",
    action:"Obtener credenciales sandbox y configurar .env antes de pruebas E2E de pagos.", closed:false },
  { id:"F-F", sev:"BAJA", desc:"SessionGuard retornaba 401 en lugar de 403 para rol incorrecto",
    detail:"Un usuario autenticado con rol aliado recibía HTTP 401 (UnauthorizedException) al acceder a rutas @Roles(KAM). La semántica correcta es 403 (ForbiddenException): el usuario está autenticado pero no tiene permisos.",
    action:"Corregido en api/src/auth/session.guard.ts línea 42: UnauthorizedException → ForbiddenException. Verificado: aliado → 403, KAM → 403 en rutas de aliado.", closed:true },
];

async function main() {
  const passCount = tests.filter(t=>t.result==="PASS").length;
  const failCount = tests.filter(t=>t.result==="FAIL").length;
  const allPass = failCount === 0;

  const doc = new Document({
    numbering:{config:[]},
    styles:{paragraphStyles:[]},
    sections:[{
      properties:{page:{margin:{top:720,bottom:720,left:900,right:900}}},
      headers:{default:new Header({children:[
        new Paragraph({alignment:AlignmentType.RIGHT,
          children:[new TextRun({text:"D'MARIO B2B — Reporte de Certificación Sprint 5",color:BLUE,size:16,font:"Arial"})]}),
      ]})},
      footers:{default:new Footer({children:[
        new Paragraph({alignment:AlignmentType.CENTER,
          children:[new TextRun({text:"Confidencial — SMC Soluciones  |  Página ",size:14,font:"Arial",color:"888888"}),
            new TextRun({children:[PageNumber.CURRENT],size:14,font:"Arial",color:"888888"}),
            new TextRun({text:" de ",size:14,font:"Arial",color:"888888"}),
            new TextRun({children:[PageNumber.TOTAL_PAGES],size:14,font:"Arial",color:"888888"}),
          ]}),
      ]})},
      children:[
        // PORTADA
        ...sp(2),
        new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:0,after:120},
          children:[new TextRun({text:"D'MARIO B2B",bold:true,color:BLUE,size:52,font:"Arial"})]}),
        new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:0,after:80},
          children:[new TextRun({text:"Reporte de Certificación de Calidad",bold:true,color:BLUE,size:32,font:"Arial"})]}),
        new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:0,after:320},
          children:[new TextRun({text:"Sprint 5 — Panel KAM",bold:true,color:GREEN,size:28,font:"Arial"})]}),

        // Tabla resumen ejecutivo
        new Table({width:{size:9000,type:WidthType.DXA},rows:[
          new TableRow({children:[
            new TableCell({width:{size:4500,type:WidthType.DXA},shading:{fill:BLUE,type:ShadingType.CLEAR},
              borders:bdrs(BLUE),margins:{top:120,bottom:120,left:200,right:200},
              children:[new Paragraph({children:[new TextRun({text:"Proyecto",bold:true,color:WHITE,size:18,font:"Arial"})]})]}),
            new TableCell({width:{size:4500,type:WidthType.DXA},shading:{fill:GRAY,type:ShadingType.CLEAR},
              borders:bdrs("CCCCCC"),margins:{top:120,bottom:120,left:200,right:200},
              children:[new Paragraph({children:[new TextRun({text:"D'MARIO B2B Platform",size:18,font:"Arial"})]})]}),
          ]}),
          new TableRow({children:[
            new TableCell({width:{size:4500,type:WidthType.DXA},shading:{fill:BLUE,type:ShadingType.CLEAR},
              borders:bdrs(BLUE),margins:{top:120,bottom:120,left:200,right:200},
              children:[new Paragraph({children:[new TextRun({text:"Sprint",bold:true,color:WHITE,size:18,font:"Arial"})]})]}),
            new TableCell({width:{size:4500,type:WidthType.DXA},shading:{fill:GRAY,type:ShadingType.CLEAR},
              borders:bdrs("CCCCCC"),margins:{top:120,bottom:120,left:200,right:200},
              children:[new Paragraph({children:[new TextRun({text:"Sprint 5 — Panel KAM",size:18,font:"Arial"})]})]}),
          ]}),
          new TableRow({children:[
            new TableCell({width:{size:4500,type:WidthType.DXA},shading:{fill:BLUE,type:ShadingType.CLEAR},
              borders:bdrs(BLUE),margins:{top:120,bottom:120,left:200,right:200},
              children:[new Paragraph({children:[new TextRun({text:"Fecha de certificación",bold:true,color:WHITE,size:18,font:"Arial"})]})]}),
            new TableCell({width:{size:4500,type:WidthType.DXA},shading:{fill:GRAY,type:ShadingType.CLEAR},
              borders:bdrs("CCCCCC"),margins:{top:120,bottom:120,left:200,right:200},
              children:[new Paragraph({children:[new TextRun({text:"20 de junio de 2026",size:18,font:"Arial"})]})]}),
          ]}),
          new TableRow({children:[
            new TableCell({width:{size:4500,type:WidthType.DXA},shading:{fill:BLUE,type:ShadingType.CLEAR},
              borders:bdrs(BLUE),margins:{top:120,bottom:120,left:200,right:200},
              children:[new Paragraph({children:[new TextRun({text:"Resultado",bold:true,color:WHITE,size:18,font:"Arial"})]})]}),
            new TableCell({width:{size:4500,type:WidthType.DXA},shading:{fill:allPass?LGREEN:LRED,type:ShadingType.CLEAR},
              borders:bdrs(allPass?GREEN:RED),margins:{top:120,bottom:120,left:200,right:200},
              children:[new Paragraph({children:[new TextRun({text:allPass?"✅ CERTIFICADO":"❌ OBSERVACIONES PENDIENTES",bold:true,color:allPass?GREEN:RED,size:18,font:"Arial"})]})]}),
          ]}),
          new TableRow({children:[
            new TableCell({width:{size:4500,type:WidthType.DXA},shading:{fill:BLUE,type:ShadingType.CLEAR},
              borders:bdrs(BLUE),margins:{top:120,bottom:120,left:200,right:200},
              children:[new Paragraph({children:[new TextRun({text:"Casos de prueba",bold:true,color:WHITE,size:18,font:"Arial"})]})]}),
            new TableCell({width:{size:4500,type:WidthType.DXA},shading:{fill:GRAY,type:ShadingType.CLEAR},
              borders:bdrs("CCCCCC"),margins:{top:120,bottom:120,left:200,right:200},
              children:[new Paragraph({children:[new TextRun({text:`${passCount} PASS / ${failCount} FAIL de ${tests.length} total`,bold:true,size:18,font:"Arial",color:allPass?GREEN:RED})]})]}),
          ]}),
          new TableRow({children:[
            new TableCell({width:{size:4500,type:WidthType.DXA},shading:{fill:BLUE,type:ShadingType.CLEAR},
              borders:bdrs(BLUE),margins:{top:120,bottom:120,left:200,right:200},
              children:[new Paragraph({children:[new TextRun({text:"Stack tecnológico",bold:true,color:WHITE,size:18,font:"Arial"})]})]}),
            new TableCell({width:{size:4500,type:WidthType.DXA},shading:{fill:GRAY,type:ShadingType.CLEAR},
              borders:bdrs("CCCCCC"),margins:{top:120,bottom:120,left:200,right:200},
              children:[new Paragraph({children:[new TextRun({text:"NestJS 11 · TypeScript · TypeORM · PostgreSQL 16 · Better Auth",size:18,font:"Arial"})]})]}),
          ]}),
        ]}),
        ...sp(2),

        // ALCANCE
        heading("1. Alcance del Sprint 5"),
        new Paragraph({spacing:{before:0,after:160},
          children:[new TextRun({text:"Este sprint implementa el Panel KAM (Key Account Manager), dotando a los representantes comerciales de D'MARIO de herramientas de seguimiento de cartera, cumplimiento de metas y comisiones. Los tres endpoints son exclusivos del rol KAM y están aislados por vendedor.",size:18,font:"Arial"})]}),
        new Table({width:{size:9000,type:WidthType.DXA},rows:[
          hrow(["Endpoint","Descripción","Rol requerido"],[3600,3900,1500]),
          new TableRow({children:[cell("GET /api/kam/dashboard",{w:3600}),cell("Meta, YTD real, cumplimiento %, regla 80/20, alertas cupo, facturas vencidas",{w:3900}),cell("KAM",{w:1500,center:true})]}),
          new TableRow({children:[cell("GET /api/kam/clients",{w:3600,fill:GRAY}),cell("Listado de aliados con filtros ?status y ?segment, ordenado por YTD",{w:3900,fill:GRAY}),cell("KAM",{w:1500,center:true,fill:GRAY})]}),
          new TableRow({children:[cell("GET /api/kam/commissions",{w:3600}),cell("Comisiones por año y mes con totales de volumen y comisión",{w:3900}),cell("KAM",{w:1500,center:true})]}),
        ]}),
        ...sp(2),

        // CASOS DE PRUEBA
        heading("2. Casos de Prueba"),
        new Table({width:{size:9000,type:WidthType.DXA},rows:[
          hrow(["ID","Descripción","Resultado"],[900,7200,900]),
          ...tests.map((t,i)=>{
            const pass=t.result==="PASS";
            const fill=i%2===0?WHITE:GRAY;
            return new TableRow({children:[
              cell(t.id,{w:900,center:true,bold:true,fill}),
              new TableCell({borders:bdrs("CCCCCC"),width:{size:7200,type:WidthType.DXA},
                shading:{fill,type:ShadingType.CLEAR},verticalAlign:VerticalAlign.TOP,
                margins:{top:80,bottom:80,left:120,right:120},
                children:[
                  new Paragraph({children:[new TextRun({text:t.desc,bold:true,size:18,font:"Arial"})]}),
                  new Paragraph({children:[new TextRun({text:"Request: "+t.req,size:16,font:"Arial",color:"555555"})]}),
                  new Paragraph({children:[new TextRun({text:"Esperado: "+t.expected,size:16,font:"Arial",color:"555555"})]}),
                  new Paragraph({children:[new TextRun({text:"Resultado: "+t.actual,size:16,font:"Arial",color:pass?GREEN:RED})]}),
                ]}),
              cell(pass?"✅ PASS":"❌ FAIL",{w:900,center:true,bold:true,fill:pass?LGREEN:LRED,color:pass?GREEN:RED}),
            ]});
          }),
        ]}),
        ...sp(2),

        // HALLAZGOS
        heading("3. Hallazgos"),
        new Table({width:{size:9000,type:WidthType.DXA},rows:[
          hrow(["ID","Sev.","Descripción","Estado"],[700,700,6800,800]),
          ...findings.map((f,i)=>{
            const fill=i%2===0?WHITE:GRAY;
            const sevFill=f.sev==="CRÍTICA"?LRED:f.sev==="ALTA"?LYELLOW:f.sev==="BAJA"?LBLUE:GRAY;
            const sevColor=f.sev==="CRÍTICA"?RED:f.sev==="ALTA"?YELLOW:f.sev==="BAJA"?BLUE:DARK;
            return new TableRow({children:[
              cell(f.id,{w:700,center:true,bold:true,fill}),
              cell(f.sev,{w:700,center:true,fill:sevFill,color:sevColor,bold:true}),
              new TableCell({borders:bdrs("CCCCCC"),width:{size:6800,type:WidthType.DXA},
                shading:{fill,type:ShadingType.CLEAR},verticalAlign:VerticalAlign.TOP,
                margins:{top:80,bottom:80,left:120,right:120},
                children:[
                  new Paragraph({children:[new TextRun({text:f.desc,bold:true,size:18,font:"Arial"})]}),
                  new Paragraph({children:[new TextRun({text:f.detail,size:16,font:"Arial",color:"555555"})]}),
                  new Paragraph({children:[new TextRun({text:"Acción: "+f.action,size:16,font:"Arial",color:f.closed?GREEN:YELLOW,bold:true})]}),
                ]}),
              cell(f.closed?"✅ CERRADO":"⚠️ ABIERTO",{w:800,center:true,bold:true,fill:f.closed?LGREEN:LYELLOW,color:f.closed?GREEN:YELLOW}),
            ]});
          }),
        ]}),
        ...sp(2),

        // HISTORIAL DE VERSIONES
        heading("4. Historial de Versiones Certificadas"),
        new Table({width:{size:9000,type:WidthType.DXA},rows:[
          hrow(["Versión","Sprint","Descripción","Resultado"],[1200,2000,4500,1300]),
          new TableRow({children:[cell("v0.1.0",{w:1200,center:true}),cell("Sprint 1",{w:2000}),cell("Cimientos: Docker + NestJS + Auth + PostgreSQL",{w:4500}),cell("✅ CERT",{w:1300,center:true,fill:LGREEN,color:GREEN,bold:true})]}),
          new TableRow({children:[cell("v0.2.1",{w:1200,center:true,fill:GRAY}),cell("Sprint 2",{w:2000,fill:GRAY}),cell("Catálogo, clientes, preview y creación de pedidos",{w:4500,fill:GRAY}),cell("✅ CERT",{w:1300,center:true,fill:LGREEN,color:GREEN,bold:true})]}),
          new TableRow({children:[cell("v0.3.0",{w:1200,center:true}),cell("Sprint 3",{w:2000}),cell("Historial de pedidos, recompra, listado de facturas",{w:4500}),cell("✅ CERT",{w:1300,center:true,fill:LGREEN,color:GREEN,bold:true})]}),
          new TableRow({children:[cell("v0.4.0",{w:1200,center:true,fill:GRAY}),cell("Sprint 4",{w:2000,fill:GRAY}),cell("Pagos PSE/Wompi — checkout, webhooks, comisión KAM",{w:4500,fill:GRAY}),cell("✅ CERT",{w:1300,center:true,fill:LGREEN,color:GREEN,bold:true})]}),
          new TableRow({children:[cell("v0.5.0",{w:1200,center:true,fill:LGREEN}),cell("Sprint 5",{w:2000,fill:LGREEN}),cell("Panel KAM — dashboard, clientes, comisiones",{w:4500,fill:LGREEN}),cell("✅ CERT",{w:1300,center:true,fill:LGREEN,color:GREEN,bold:true})]}),
        ]}),
        ...sp(2),

        // FIRMA
        heading("5. Certificación"),
        new Paragraph({spacing:{before:0,after:160},
          children:[new TextRun({text:"El suscrito certifica que los 11 casos de prueba del Sprint 5 fueron ejecutados satisfactoriamente sobre el entorno de desarrollo (Docker/PostgreSQL local) y que la API respeta el aislamiento por rol KAM y por vendedor. El hallazgo F-F (403 vs 401) fue corregido y verificado en la misma sesión de certificación.",size:18,font:"Arial"})]}),
        ...sp(3),
        new Table({width:{size:9000,type:WidthType.DXA},rows:[
          new TableRow({children:[
            new TableCell({width:{size:4500,type:WidthType.DXA},borders:bdrs("CCCCCC"),margins:{top:240,bottom:80,left:200,right:200},
              children:[
                new Paragraph({children:[new TextRun({text:"_________________________________",size:18,font:"Arial"})]}),
                new Paragraph({children:[new TextRun({text:"Mauro Loaiza",bold:true,size:18,font:"Arial"})]}),
                new Paragraph({children:[new TextRun({text:"SMC Soluciones — Arquitecto de Software",size:16,font:"Arial",color:"555555"})]}),
                new Paragraph({children:[new TextRun({text:"contacto@smcsoluciones.com",size:16,font:"Arial",color:"555555"})]}),
              ]}),
            new TableCell({width:{size:4500,type:WidthType.DXA},borders:bdrs("CCCCCC"),margins:{top:240,bottom:80,left:200,right:200},
              children:[
                new Paragraph({children:[new TextRun({text:"_________________________________",size:18,font:"Arial"})]}),
                new Paragraph({children:[new TextRun({text:"Fecha: 20 de junio de 2026",bold:true,size:18,font:"Arial"})]}),
                new Paragraph({children:[new TextRun({text:"Sprint: 5 — Panel KAM",size:16,font:"Arial",color:"555555"})]}),
                new Paragraph({children:[new TextRun({text:"Versión: v0.5.0",size:16,font:"Arial",color:"555555"})]}),
              ]}),
          ]}),
        ]}),
      ],
    }],
  });

  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync("test-report-sprint5.docx", buf);
  console.log("test-report-sprint5.docx generado:", buf.length, "bytes");
}

main().catch(console.error);

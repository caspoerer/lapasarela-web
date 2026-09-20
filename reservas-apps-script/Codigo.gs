/**
 * La Pasarela: receptor de solicitudes de reserva.
 * Guarda cada solicitud en la hoja "Reservas" de esta planilla,
 * avisa al restaurante por correo y envía un acuse de recibo al cliente.
 *
 * Instalación: ver GUIA_DESPLIEGUE.md, paso 6.
 */

const CONFIG = {
  HOJA: 'Reservas',
  CORREO_RESTAURANTE: 'reservas@lapasarela.cl',   // <- quién recibe los avisos (puede ser una lista separada por comas)
  NOMBRE: 'La Pasarela',
  DIRECCION: 'Av. Príncipe de Gales 6519-A, La Reina, Santiago',
  WHATSAPP: '+56 9 0000 0000',
  MAX_PERSONAS: 30
};

const ENCABEZADOS = ['Recibida', 'Fecha', 'Hora', 'Personas', 'Nombre', 'Correo', 'Teléfono', 'Comentarios', 'Idioma', 'Estado'];

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents || '{}');
    if (d.empresa) return responder({ ok: true }); // trampa anti-spam

    const errores = validar(d);
    if (errores.length) return responder({ ok: false, error: errores.join(', ') });

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      hoja().appendRow([new Date(), d.fecha, d.hora, Number(d.personas), limpiar(d.nombre, 80),
        limpiar(d.email, 120), limpiar(d.telefono, 30), limpiar(d.comentarios, 500), d.idioma || 'es', 'Pendiente']);
    } finally {
      lock.releaseLock();
    }

    avisarRestaurante(d);
    acusarRecibo(d);
    return responder({ ok: true });
  } catch (err) {
    console.error(err);
    return responder({ ok: false, error: 'server' });
  }
}

// Permite comprobar que el script está publicado abriendo su URL en el navegador.
function doGet() {
  return responder({ ok: true, servicio: 'reservas La Pasarela' });
}

function validar(d) {
  const e = [];
  if (!d.nombre || String(d.nombre).trim().length < 2) e.push('nombre');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(d.email || ''))) e.push('email');
  if (!d.telefono || String(d.telefono).replace(/\D/g, '').length < 8) e.push('telefono');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d.fecha || ''))) e.push('fecha');
  if (!/^\d{1,2}:\d{2}$/.test(String(d.hora || ''))) e.push('hora');
  const p = Number(d.personas);
  if (!(p >= 1 && p <= CONFIG.MAX_PERSONAS)) e.push('personas');
  return e;
}

function hoja() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let h = ss.getSheetByName(CONFIG.HOJA);
  if (!h) {
    h = ss.insertSheet(CONFIG.HOJA);
    h.appendRow(ENCABEZADOS);
    h.setFrozenRows(1);
    h.getRange(1, 1, 1, ENCABEZADOS.length).setFontWeight('bold');
  }
  return h;
}

function limpiar(s, max) {
  return String(s || '').replace(/^[=+\-@]/, "'").slice(0, max); // evita fórmulas inyectadas en la planilla
}

function fechaLegible(iso) {
  const p = String(iso).split('-');
  return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : iso;
}

function avisarRestaurante(d) {
  const cuerpo = [
    'Nueva solicitud de reserva desde lapasarela.cl',
    '',
    `Fecha: ${fechaLegible(d.fecha)}  Hora: ${d.hora}  Personas: ${d.personas}`,
    `Nombre: ${d.nombre}`,
    `Correo: ${d.email}`,
    `Teléfono: ${d.telefono}`,
    `Idioma: ${d.idioma || 'es'}`,
    d.comentarios ? `Comentarios: ${d.comentarios}` : '',
    '',
    'Queda como "Pendiente" en la planilla. Confirma al cliente y cambia el estado.'
  ].join('\n');
  MailApp.sendEmail({
    to: CONFIG.CORREO_RESTAURANTE,
    replyTo: d.email,
    subject: `Reserva: ${fechaLegible(d.fecha)} ${d.hora}, ${d.personas} pers., ${d.nombre}`,
    body: cuerpo
  });
}

function acusarRecibo(d) {
  const f = fechaLegible(d.fecha);
  const textos = {
    es: {
      asunto: `Recibimos tu solicitud de reserva en ${CONFIG.NOMBRE}`,
      cuerpo: `Hola ${d.nombre}:\n\nRecibimos tu solicitud para el ${f} a las ${d.hora}, ${d.personas} personas. ` +
        `Te confirmaremos la mesa a la brevedad.\n\nSi necesitas cambiar algo, responde este correo o escríbenos al ${CONFIG.WHATSAPP}.\n\n` +
        `${CONFIG.NOMBRE}\n${CONFIG.DIRECCION}`
    },
    en: {
      asunto: `We've received your booking request at ${CONFIG.NOMBRE}`,
      cuerpo: `Hi ${d.nombre},\n\nWe've received your request for ${f} at ${d.hora}, ${d.personas} guests. ` +
        `We'll confirm your table shortly.\n\nIf you need to change anything, reply to this email or message us at ${CONFIG.WHATSAPP}.\n\n` +
        `${CONFIG.NOMBRE}\n${CONFIG.DIRECCION}`
    },
    pt: {
      asunto: `Recebemos sua solicitação de reserva no ${CONFIG.NOMBRE}`,
      cuerpo: `Olá, ${d.nombre}.\n\nRecebemos sua solicitação para ${f} às ${d.hora}, ${d.personas} pessoas. ` +
        `Confirmaremos a mesa em breve.\n\nSe precisar alterar algo, responda este e-mail ou fale conosco pelo ${CONFIG.WHATSAPP}.\n\n` +
        `${CONFIG.NOMBRE}\n${CONFIG.DIRECCION}`
    }
  };
  const t = textos[d.idioma] || textos.es;
  MailApp.sendEmail({ to: d.email, replyTo: CONFIG.CORREO_RESTAURANTE, name: CONFIG.NOMBRE, subject: t.asunto, body: t.cuerpo });
}

function responder(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

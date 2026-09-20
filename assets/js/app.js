/* La Pasarela — sitio público.
   Todo el contenido vive en /content/site.json y /content/menu.json
   (se edita desde /admin/). Este archivo solo lo muestra. */
(function () {
  "use strict";

  var LANGS = ["es", "en", "pt"];
  var UI = { // textos fijos que no necesitan edición
    es: { vegetariano: "vegetariano", vegano: "vegano", "sin gluten": "sin gluten", picante: "picante", "para compartir": "para compartir",
          invalid: "Revisa los campos marcados.", wa_msg: "Hola, quisiera reservar una mesa en La Pasarela", people: "personas" },
    en: { vegetariano: "vegetarian", vegano: "vegan", "sin gluten": "gluten-free", picante: "spicy", "para compartir": "to share",
          invalid: "Please check the highlighted fields.", wa_msg: "Hi, I'd like to book a table at La Pasarela", people: "guests" },
    pt: { vegetariano: "vegetariano", vegano: "vegano", "sin gluten": "sem glúten", picante: "picante", "para compartir": "para compartilhar",
          invalid: "Verifique os campos destacados.", wa_msg: "Olá, gostaria de reservar uma mesa no La Pasarela", people: "pessoas" }
  };

  var site, menu, lang, activeCat = null;
  var inline = !!window.__CONTENT__; // versión de vista previa con el contenido incrustado

  function $(s, el) { return (el || document).querySelector(s); }
  function $all(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  function detectLang() {
    var m = location.pathname.match(/^\/(en|pt)(\/|$)/);
    if (m) return m[1];
    var q = new URLSearchParams(location.search).get("lang");
    if (q && LANGS.indexOf(q) > -1) return q;
    return "es";
  }

  function T(key) {
    var v = site[lang] && site[lang][key];
    if (v == null || v === "") v = site.es[key];
    return v == null ? "" : v;
  }

  function load() {
    if (inline) return Promise.resolve(window.__CONTENT__);
    var opts = { cache: "no-cache" };
    return Promise.all([
      fetch("/content/site.json", opts).then(function (r) { return r.json(); }),
      fetch("/content/menu.json", opts).then(function (r) { return r.json(); })
    ]).then(function (res) { return { site: res[0], menu: res[1] }; });
  }

  /* ---------- textos ---------- */
  function renderTexts() {
    var g = site.general;
    document.documentElement.lang = lang;
    document.title = T("meta_title");
    var md = $('meta[name="description"]'); if (md) md.setAttribute("content", T("meta_description"));

    $all("[data-t]").forEach(function (el) {
      var txt = T(el.getAttribute("data-t")).replace("{max}", g.max_personas);
      el.textContent = txt;
    });
    $all("[data-t-paras]").forEach(function (el) {
      el.innerHTML = T(el.getAttribute("data-t-paras")).split(/\n\s*\n/).map(function (p) {
        return "<p>" + esc(p.trim()) + "</p>";
      }).join("");
    });
    $all("[data-g]").forEach(function (el) { el.textContent = g[el.getAttribute("data-g")] || ""; });
    $all("[data-g-href]").forEach(function (el) { el.href = g[el.getAttribute("data-g-href")] || "#"; });
    $all("[data-img]").forEach(function (el) {
      var src = site.imagenes && site.imagenes[el.getAttribute("data-img")];
      if (src && el.getAttribute("src") !== src) el.src = src;
    });

    var tel = $(".foot .tel"); tel.href = "tel:" + (g.telefono || "").replace(/[^\d+]/g, "");
    var mail = $(".foot .mail"); mail.href = "mailto:" + g.email;
    var ig = $(".foot .ig"); ig.href = "https://instagram.com/" + g.instagram; ig.textContent = "@" + g.instagram;

    $all(".langs button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.lang === lang)); });
    $all(".wa").forEach(function (a) { a.href = waLink(UI[lang].wa_msg); });

    var route = $(".route");
    route.innerHTML = (site[lang].recorrido || site.es.recorrido || []).map(function (s) {
      return "<li><strong>" + esc(s.lugar) + "</strong><span>" + esc(s.texto) + "</span></li>";
    }).join("");
  }

  /* ---------- carta ---------- */
  function catName(c) { return c["nombre_" + lang] || c.nombre_es; }

  function renderMenu() {
    var cats = (menu.categorias || []).filter(function (c) {
      return (c.platos || []).some(function (p) { return p.visible !== false; });
    });
    if (!activeCat || !cats.some(function (c) { return c.id === activeCat; })) activeCat = cats[0] && cats[0].id;

    var tabs = $(".tabs"), panels = $(".panels");
    tabs.innerHTML = cats.map(function (c) {
      var sel = c.id === activeCat;
      return '<button type="button" role="tab" id="tab-' + esc(c.id) + '" aria-controls="panel-' + esc(c.id) +
        '" aria-selected="' + sel + '" tabindex="' + (sel ? 0 : -1) + '" data-cat="' + esc(c.id) + '">' + esc(catName(c)) + "</button>";
    }).join("");

    panels.innerHTML = cats.map(function (c) {
      var note = c["nota_" + lang] || c.nota_es;
      var items = c.platos.filter(function (p) { return p.visible !== false; }).map(function (p) {
        var desc = p["desc_" + lang] || p.desc_es;
        var price = site.general.mostrar_precios && p.precio ? '<span class="leader" aria-hidden="true"></span><span class="price">$' + esc(p.precio) + "</span>" : "";
        var tags = (p.etiquetas || []).length ? '<ul class="tags">' + p.etiquetas.map(function (t) {
          return "<li>" + esc(UI[lang][t] || t) + "</li>"; }).join("") + "</ul>" : "";
        return '<article class="dish"><div class="dish-head"><h3>' + esc(p.nombre) + "</h3>" + price + "</div>" +
          (desc ? "<p>" + esc(desc) + "</p>" : "") + tags + "</article>";
      }).join("");
      return '<div role="tabpanel" id="panel-' + esc(c.id) + '" aria-labelledby="tab-' + esc(c.id) + '"' +
        (c.id === activeCat ? "" : " hidden") + ">" + (note ? '<p class="panel-note">' + esc(note) + "</p>" : "") +
        '<div class="dishes">' + items + "</div></div>";
    }).join("");
  }

  function selectCat(id, focus) {
    activeCat = id;
    $all(".tabs [role=tab]").forEach(function (b) {
      var on = b.dataset.cat === id;
      b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    });
    $all(".panels [role=tabpanel]").forEach(function (p) { p.hidden = p.id !== "panel-" + id; });
  }

  /* ---------- reservas ---------- */
  function waLink(text) { return "https://wa.me/" + (site.general.whatsapp || "") + "?text=" + encodeURIComponent(text); }

  function setupForm() {
    var f = $("#reserva"), g = site.general;
    var horas = String(g.horas_reserva || "").split(",").map(function (h) { return h.trim(); }).filter(Boolean);
    var prevH = f.hora.value, prevP = f.personas.value;
    f.hora.innerHTML = horas.map(function (h) { return "<option>" + esc(h) + "</option>"; }).join("");
    var max = parseInt(g.max_personas, 10) || 8, opts = "";
    for (var i = 1; i <= max; i++) opts += '<option value="' + i + '">' + i + "</option>";
    f.personas.innerHTML = opts;
    if (prevH) f.hora.value = prevH;
    f.personas.value = prevP || "2";
    var today = new Date(); today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    f.fecha.min = today.toISOString().slice(0, 10);
  }

  function submitForm(e) {
    e.preventDefault();
    var f = e.target, status = $(".status"), btn = f.querySelector("button[type=submit]");
    var ok = true;
    ["nombre", "email", "telefono", "fecha", "hora", "personas"].forEach(function (n) {
      var valid = f[n].checkValidity() && String(f[n].value).trim() !== "";
      f[n].setAttribute("aria-invalid", String(!valid)); if (!valid) ok = false;
    });
    if (!ok) { status.className = "status err"; status.textContent = UI[lang].invalid; return; }
    if (f.empresa.value) return; // trampa anti-spam

    var data = {
      nombre: f.nombre.value.trim(), email: f.email.value.trim(), telefono: f.telefono.value.trim(),
      fecha: f.fecha.value, hora: f.hora.value, personas: f.personas.value,
      comentarios: f.comentarios.value.trim(), idioma: lang, empresa: ""
    };
    var endpoint = site.general.reservas_endpoint;

    if (!endpoint) { // sin servidor configurado: se arma el mensaje por WhatsApp
      var msg = UI[lang].wa_msg + ":\n" + data.fecha + " " + data.hora + ", " + data.personas + " " + UI[lang].people +
        "\n" + data.nombre + " / " + data.telefono + " / " + data.email + (data.comentarios ? "\n" + data.comentarios : "");
      window.open(waLink(msg), "_blank", "noopener");
      return;
    }

    btn.disabled = true; btn.textContent = T("form_enviando");
    status.className = "status"; status.textContent = "";
    fetch(endpoint, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(data) })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.error || "error");
        f.reset(); setupForm();
        status.className = "status ok"; status.textContent = T("form_exito");
      })
      .catch(function () { status.className = "status err"; status.textContent = T("form_error"); })
      .then(function () { btn.disabled = false; btn.textContent = T("form_enviar"); });
  }

  /* ---------- idioma ---------- */
  function setLang(l, push) {
    lang = l;
    renderTexts(); renderMenu(); setupForm();
    if (push && !inline && history.pushState) {
      history.pushState({ lang: l }, "", (l === "es" ? "/" : "/" + l + "/") + location.hash);
    }
  }

  /* ---------- arranque ---------- */
  load().then(function (c) {
    site = c.site; menu = c.menu; lang = detectLang();
    setLang(lang, false);

    $(".langs").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-lang]"); if (b && b.dataset.lang !== lang) setLang(b.dataset.lang, true);
    });
    $(".tabs").addEventListener("click", function (e) {
      var b = e.target.closest("[role=tab]"); if (b) selectCat(b.dataset.cat, false);
    });
    $(".tabs").addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      var ids = $all(".tabs [role=tab]").map(function (b) { return b.dataset.cat; });
      var i = ids.indexOf(activeCat) + (e.key === "ArrowRight" ? 1 : -1);
      selectCat(ids[(i + ids.length) % ids.length], true);
    });
    $("#reserva").addEventListener("submit", submitForm);
    window.addEventListener("popstate", function () { setLang(detectLang(), false); });
  }).catch(function (err) { console.error("No se pudo cargar el contenido", err); });
})();

# Guía de despliegue: www.lapasarela.cl

Esta carpeta (la que descomprimiste, `lapasarela-web`) es el sitio completo. Todo se sube tal cual; no hay que compilar nada.

## Qué contiene

| Carpeta / archivo | Para qué sirve |
|---|---|
| `index.html`, `en/`, `pt/` | La página pública en español, inglés y portugués |
| `assets/` | Estilos, código, logo y fotos |
| `content/site.json` | Textos, horario, contacto y fotos (se editan desde /admin) |
| `content/menu.json` | La carta: platos, descripciones y precios (se edita desde /admin) |
| `admin/` | Panel privado de edición (www.lapasarela.cl/admin) |
| `reservas-apps-script/Codigo.gs` | Script de Google que recibe las reservas |
| `_headers`, `_redirects`, `robots.txt`, `sitemap.xml` | Configuración técnica de Cloudflare y Google |

---

## Paso 1. Subir la carpeta a GitHub

1. Entra a github.com con tu cuenta **caspoerer**.
2. Arriba a la derecha: **+ → New repository**.
3. Nombre: `lapasarela-web`. Marca **Private**. No agregues README. Clic en **Create repository**.
4. En la página que aparece, clic en el enlace **uploading an existing file**.
5. Abre la carpeta `lapasarela-web` en tu computador, selecciona **todo lo que está adentro** (no la carpeta misma) y arrástralo a la ventana de GitHub.
   - Ojo: los archivos que empiezan con punto o guion bajo (`_headers`, `_redirects`) a veces el Mac los oculta. Si no los ves, en el Finder presiona `Cmd + Shift + .`
6. Abajo, clic en **Commit changes**.

Resultado: en GitHub debes ver `index.html`, `admin`, `assets`, `content`, etc. en la raíz del repositorio.

## Paso 2. Publicar en Cloudflare Pages

1. Entra a dash.cloudflare.com (la misma cuenta donde está el DNS de lapasarela.cl).
2. Menú izquierdo: **Workers & Pages → Create → pestaña Pages → Connect to Git**.
3. Autoriza GitHub y elige el repositorio `lapasarela-web`.
4. Configuración:
   - Framework preset: **None**
   - Build command: *(vacío)*
   - Build output directory: `/`
5. **Save and Deploy**. En un minuto tendrás una dirección tipo `lapasarela-web.pages.dev` para revisar el sitio.

## Paso 3. Conectar el dominio

1. En el proyecto de Pages: **Custom domains → Set up a custom domain**.
2. Agrega `www.lapasarela.cl` y confirma. Repite con `lapasarela.cl`.
3. Cloudflare crea los registros DNS solo, porque el dominio ya está en tu cuenta.

**Antes de confirmar**, revisa en **DNS → Records** de lapasarela.cl:
- Si ya existe un registro `A` o `CNAME` para `@` o `www` apuntando a otro servicio, Cloudflare te pedirá reemplazarlo; está bien.
- **No toques los registros `MX`, `TXT` (SPF/DKIM) ni los de Google**: son los del correo de Google Workspace.

El candado HTTPS se activa solo en unos minutos.

## Paso 4. Activar el acceso privado de edición (/admin)

El panel usa GitHub para identificar a quién puede editar. Se configura una sola vez.

**4a. Desplegar el autenticador**
1. Abre github.com/sveltia/sveltia-cms-auth y presiona el botón **Deploy to Cloudflare**.
2. Sigue el asistente con tu cuenta de Cloudflare.
3. Al terminar, en **Workers & Pages → sveltia-cms-auth**, copia su URL: `https://sveltia-cms-auth.TU-SUBDOMINIO.workers.dev`

**4b. Registrar la aplicación en GitHub**
1. github.com → tu foto → **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Datos:
   - Application name: `La Pasarela CMS`
   - Homepage URL: `https://www.lapasarela.cl`
   - Authorization callback URL: `https://sveltia-cms-auth.TU-SUBDOMINIO.workers.dev/callback`
3. **Register application**. Luego **Generate a new client secret**. Copia el **Client ID** y el **Client secret**.

**4c. Cargar las claves en el Worker**
En Cloudflare → `sveltia-cms-auth` → **Settings → Variables and Secrets**, agrega:
- `GITHUB_CLIENT_ID` = el Client ID
- `GITHUB_CLIENT_SECRET` = el Client secret (tipo *Secret*)
- `ALLOWED_DOMAINS` = `www.lapasarela.cl, lapasarela.cl`

Guarda y vuelve a desplegar el Worker.

**4d. Apuntar el panel al Worker**
En GitHub, abre `admin/config.yml`, clic en el lápiz y reemplaza:
```
base_url: https://sveltia-cms-auth.CAMBIAR.workers.dev
```
por la URL real de tu Worker. **Commit changes**.

Listo: entra a **www.lapasarela.cl/admin**, presiona *Sign in with GitHub* y edita.

## Paso 5. Dar acceso a otras personas

Cada editor necesita una cuenta gratuita de GitHub.
Repositorio `lapasarela-web` → **Settings → Collaborators → Add people** → su usuario. Al aceptar la invitación ya puede entrar a /admin.
Para quitarle el acceso, se elimina de esa misma lista.

## Paso 6. Activar las reservas en planilla + correo

Mientras no hagas este paso, el formulario de reservas abre WhatsApp con el mensaje armado.

1. Con tu cuenta de Workspace, crea una Google Sheet llamada **Reservas La Pasarela**.
2. Menú **Extensiones → Apps Script**.
3. Borra lo que aparece y pega todo el contenido de `reservas-apps-script/Codigo.gs`.
4. Arriba en `CONFIG`, revisa `CORREO_RESTAURANTE` y `WHATSAPP`. Guarda (ícono de disquete).
5. **Implementar → Nueva implementación → tipo: Aplicación web**.
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
6. **Implementar**, autoriza los permisos y copia la **URL de la aplicación web** (termina en `/exec`).
7. Entra a www.lapasarela.cl/admin → **Textos y datos del sitio → Datos generales** → pega la URL en *URL del script de reservas* → **Guardar**.

Desde ahí, cada solicitud queda en la hoja "Reservas" con estado *Pendiente*, te llega un correo y el cliente recibe un acuse de recibo en su idioma.

Si algún día cambias el script, usa **Implementar → Gestionar implementaciones → editar → Nueva versión** para que la URL no cambie.

## Cómo se edita el día a día

- **Carta**: /admin → Carta → abre la categoría → edita el plato. Para ocultar un plato sin borrarlo, desmarca *Mostrar en la web*.
- **Textos**: /admin → Textos y datos del sitio → abre el idioma.
- **Fotos**: en cada campo de imagen, *Upload* y elige la foto (ideal: horizontal, JPG o WebP, 2000 px de ancho, menos de 700 KB).
- **Precios**: se muestran con `$` automáticamente. Hay un interruptor para ocultarlos todos.

Cada vez que guardas, Cloudflare publica el cambio en uno o dos minutos.

## Opcional: doble candado para /admin

Si quieres que ni siquiera se vea la pantalla de ingreso: Cloudflare → **Zero Trust → Access → Applications → Add → Self-hosted**, dominio `www.lapasarela.cl/admin`, y una regla que permita solo los correos de tu equipo (código por correo). Es gratis hasta 50 usuarios.

## Pendientes antes del lanzamiento

- [ ] Horario real (el actual es un ejemplo)
- [ ] Teléfono y WhatsApp reales (hoy: +56 9 0000 0000)
- [ ] Precios reales (hoy todos en $19.990, como en el PDF)
- [ ] Descripción de **Conchas del Estuario** (en el PDF repite la del Edamame)
- [ ] Confirmar con cocina las etiquetas vegetariano/vegano
- [ ] Revisar traducciones al inglés y portugués con alguien nativo
- [ ] Crear el correo `reservas@lapasarela.cl` en Workspace (o cambiarlo en /admin y en el script)

## Si modificas el diseño (solo para quien programe)

`en/index.html` y `pt/index.html` son copias exactas de `index.html`. Si cambias `index.html`, vuelve a copiarlo en esas dos carpetas.

# Reseñas BYN

El formulario guarda reseñas mediante `POST /api/reviews`. La lista pública se obtiene de `GET /api/reviews`, con seis opiniones por página y un cursor para cargar más. No se envían a WhatsApp ni se almacenan solo en el navegador.

## Producción en Vercel

1. Conectar un almacén **Vercel Blob privado** al proyecto `byn-servicios-site` para Production y Preview. Nunca usar un almacén público.
2. Confirmar que se haya añadido `BLOB_READ_WRITE_TOKEN` o la conexión OIDC (`BLOB_STORE_ID` y `VERCEL_OIDC_TOKEN`). Las credenciales permanecen en el servidor.
3. Si se usa OIDC, añadir `REVIEWS_RATE_SECRET` con un valor aleatorio estable de al menos 32 bytes. Con un token de lectura/escritura, este se usa como secreto de respaldo.
4. Publicar el proyecto completo desde la raíz, no únicamente `dist`: Vercel debe incluir `api/`, `lib/`, `package.json` y el archivo de bloqueo. No hay paso de compilación; los archivos estáticos están en `dist`.
5. Comprobar que `GET /api/reviews` devuelve JSON. La falta de almacenamiento devuelve un error explícito, no un éxito falso ni un respaldo temporal.

Cada opinión es un archivo JSON independiente con escritura exclusiva, sin sobrescribir reseñas previas. Un identificador evita duplicados al reintentar dentro del intervalo de cinco minutos. La clave contiene un HMAC rotativo por intervalo, nunca la dirección IP en claro; el navegador recibe solo nombre, comuna, estrellas, comentario, fecha e identificador.

Protecciones básicas: consentimiento de publicación, validación del lado servidor, origen permitido, límite de tamaño, campo antispam y una reseña por visitante cada cinco minutos. Esto no sustituye un CAPTCHA si aumenta el abuso. No se afirma que las reseñas estén verificadas; se publican directamente. Las reseñas enviadas anteriormente por WhatsApp no se importan automáticamente.

## Desarrollo y pruebas

`npm install` y `npm run dev` sirven la web en http://127.0.0.1:4174 con guardado local en `.local-data/reviews/`, ignorado por Git. Este respaldo es solo para desarrollo y nunca se usa en producción.

`npm test` ejecuta validación, persistencia entre instancias, reintentos, límites, paginación y fallos del almacén. Las pruebas usan directorios temporales aislados, no opiniones públicas.

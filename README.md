# Encuentro Tech — Arquitectura con DAO, Repository y DTO

API para una plataforma de eventos tecnológicos, talleres y conferencias. Refactor de la plataforma para encapsular la persistencia en DAO, ofrecer operaciones de dominio mediante repositories y filtrar todas las respuestas sensibles con DTO. Se mantienen las rutas y los flujos de sesiones, eventos e inscripciones de la etapa anterior.

## Tecnologías y requisitos

Node.js 22 o superior, npm, JavaScript con módulos ESM, Express 5, dotenv y Mongoose. Bcrypt protege las contraseñas. Jsonwebtoken y cookie-parser gestionan la autenticación. Passport utiliza estrategias locales y JWT. Nodemailer envía las confirmaciones.

## Instalación y ejecución

```bash
npm install
cp .env.example .env
# Completar las variables del archivo .env
npm start
# Desarrollo con reinicio automático:
npm run dev
```

Necesitás una instancia MongoDB accesible y una URL propia en `MONGO_URL`; puede ser local o Atlas. No se incluyen cuentas, conexiones de terceros ni credenciales. El servidor espera la conexión y la creación de índices antes de escuchar peticiones; ante un fallo de configuración o conexión finaliza con error.

Para las transacciones de cupos, MongoDB debe funcionar como **replica set** o cluster compatible (por ejemplo, Atlas). Un MongoDB standalone no admite este flujo. Se requiere MongoDB 6 o superior para el índice parcial de inscripciones activas.

| Variable | Uso |
|---|---|
| `PORT` | Puerto HTTP; 8080 por defecto |
| `NODE_ENV` | `development`, `test` o `production` |
| `MONGO_URL` | URL propia de MongoDB (obligatoria) |
| `JWT_SECRET` | Clave privada propia de al menos 32 caracteres; obligatoria |
| `JWT_EXPIRES_IN` | Expiración del JWT, por defecto `1h` |
| `MAIL_HOST` | Host SMTP propio |
| `MAIL_PORT` | Puerto SMTP; 587 por defecto, 465 utiliza TLS directo |
| `MAIL_USER` / `MAIL_PASS` | Credenciales SMTP; dejar ambas vacías solo si el servidor local no requiere autenticación |
| `MAIL_FROM` | Remitente admitido por tu servidor SMTP |

El archivo `.env` es local y se excluye de Git. `.env.example` solo incluye nombres de variables y valores públicos de desarrollo.

Podés generar una clave con `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. La cookie `currentUser` dura una hora, tiene `httpOnly`, `sameSite: lax`, `path: /` y `secure` únicamente en producción. Usá HTTPS en producción. Cambiar `JWT_EXPIRES_IN` modifica el token; la cookie conserva la hora exigida por el contrato. Logout borra la cookie del cliente; no revoca un JWT previamente copiado.

## Estructura y responsabilidades

```text
src/
  app.js                 # configura Express y conecta routers
  server.js              # configura el arranque del servidor
  config/                # entorno, conexión MongoDB y Passport
  routes/                # método, URL y middlewares
  controllers/           # request y response
  services/              # reglas de negocio
  repositories/          # operaciones de persistencia
  dao/                   # único acceso a modelos y operaciones Mongoose
  dto/                   # contratos públicos de usuarios, eventos y tickets
  models/                # User y Event, Ticket
  middlewares/           # errores, autenticación y autorización
  utils/                 # helpers reutilizables
tests/                   # pruebas unitarias, HTTP e integración
```

### Flujo de una petición

```text
Router → middleware de autenticación/autorización → controller → service → repository → DAO → modelo
                                                       ↓
                                                      DTO → JSON
```

- **Routes:** declaran métodos, paths y middlewares. No consultan datos ni calculan cupos.
- **Controllers:** extraen parámetros, llaman al service y coordinan status, cookies y DTO de respuesta.
- **Services:** validan registros y credenciales, fechas, estados, duplicados, cupos y propiedad. Coordinan el correo después de confirmar una reserva. Los helpers contienen validaciones reutilizables; la operación de negocio las invoca desde el service.
- **Repositories:** traducen pedidos del dominio a consultas del DAO. Ejemplos: `findByEmail`, `findPublishedEvents`, `findActiveRegistration`, `countReservedPlaces`, `findUserTickets` y `cancelTicket`.
- **DAO:** son los únicos archivos que importan modelos. Ejecutan find, aggregate, populate, create y update. Devuelven objetos planos; ningún service llama a save ni necesita documentos Mongoose.
- **Models:** definen schemas, referencias, restricciones e índices.
- **DTO:** usan listas explícitas de campos permitidos. `CurrentUserDTO` conserva `{ id, email, role }`; `UserResponseDTO` controla registro y listado administrativo; `EventResponseDTO` controla eventos; `TicketResponseDTO` controla todas las rutas de tickets y aplica `TicketEventDTO` al evento poblado. Un usuario poblado se reduce a su ID.
- **Config y utilidades:** configuran entorno, cookies, Passport y correo. `config/db.js` delega la conexión e inicialización a `databaseDAO`. Las transacciones se solicitan desde services mediante `unitOfWorkRepository`; su ejecución concreta queda en el DAO de base de datos.

Las estrategias `register`, `login` y `current` están en `src/config/passport.config.js` y delegan las reglas en `sessions.service.js`. Passport identifica al usuario; no crea tokens ni responde por los controllers. El controller de login solicita al service el JWT y configura la cookie. Se mantiene la posibilidad de añadir proveedores externos sin modificar `app.js`; Google/GitHub no se implementan en esta etapa.

### Compatibilidad y seguridad de respuestas

Se mantienen los métodos, paths, códigos HTTP, cookies y sobres JSON de la preentrega 7. Los tickets conservan `_id`, y los eventos y usuarios conservan `id`, para no exigir cambios a los clientes. El populate de mis tickets conserva `event: { _id, title, date, location }`. No se devuelven `__v`, `reservationVersion`, contraseñas, hashes ni campos añadidos accidentalmente a los documentos relacionados. La eliminación de metadatos internos es deliberada: los DTO mantienen el contrato funcional público.

El middleware centralizado mantiene el formato `{ status: 'error', message }` y distingue **400** datos inválidos, **401** sin sesión, **403** sin permisos, **404** inexistente, **409** conflicto y **500** fallo interno. Los mensajes internos de la persistencia no se envían al cliente.

## Rutas

| Método | Ruta | Acceso y respuesta |
|---|---|---|
| GET | `/api/health` | Público, estado del servidor (200) |
| GET | `/api/events` | Público, lista paginada (200) |
| POST | `/api/sessions/register` | Público, crea usuario (201) |
| POST | `/api/sessions/login` | Público, autentica y configura cookie (200) |
| GET | `/api/sessions/current` | Autenticado, datos básicos (200) |
| POST | `/api/sessions/logout` | Elimina cookie (200) |
| POST | `/api/events` | Organizer o admin (201) |
| PUT | `/api/events/:id` | Organizer dueño o admin (200) |
| GET | `/api/users` | Solo admin, datos públicos de usuarios (200) |
| GET | `/api/events/:id` | Público, detalle (200) |
| PATCH | `/api/events/:id/status` | Organizer dueño o admin (200) |
| POST | `/api/events/:eid/tickets` | Autenticado, crea inscripción (201) |
| GET | `/api/tickets/my-tickets` | Autenticado, historial propio (200) |
| GET | `/api/events/:eid/tickets` | Organizer dueño del evento o admin (200) |
| PATCH | `/api/tickets/:tid/cancel` | Dueño del ticket o admin (200) |

### Salud y eventos iniciales

```bash
curl http://localhost:8080/api/health
curl http://localhost:8080/api/events
```

`GET /api/health` devuelve `{"status":"ok","message":"Servidor activo"}`.

### Registro seguro

Campos obligatorios: `first_name`, `last_name`, `email` y `password`. La contraseña requiere al menos **8 caracteres** y como máximo **72 bytes UTF-8** (límite de bcrypt). Los nombres se recortan y el email se normaliza con trim y minúsculas. El rol del body se ignora: el registro público siempre crea `user`. Los roles admitidos por el modelo son `user`, `organizer` y `admin`. El email tiene índice único, además de la comprobación previa de duplicados.

```bash
curl -i -X POST http://localhost:8080/api/sessions/register   -H 'Content-Type: application/json'   -d '{"first_name":"Ana","last_name":"Pérez","email":"Ana@Mail.com ","password":"Secreta123"}'
```

Respuesta 201 (el ID lo genera MongoDB):

```json
{"status":"success","payload":{"id":"665f2a000000000000000001","first_name":"Ana","last_name":"Pérez","email":"ana@mail.com","role":"user"}}
```

Campos faltantes: 400 `{"status":"error","message":"Faltan campos obligatorios"}`. Email inválido: 400 con `Email inválido`. Contraseña fuera del rango: 400 con explicación. Duplicado: 409 `{"status":"error","message":"El email ya está registrado"}`. La contraseña se guarda con bcrypt (10 salt rounds) y nunca se devuelve.

### Login, current y logout

```bash
curl -i -c cookies.txt -X POST http://localhost:8080/api/sessions/login   -H 'Content-Type: application/json' -d '{"email":"ana@mail.com","password":"Secreta123"}'
curl -i -b cookies.txt http://localhost:8080/api/sessions/current
curl -i -b cookies.txt -c cookies.txt -X POST http://localhost:8080/api/sessions/logout
curl -i -b cookies.txt http://localhost:8080/api/sessions/current
```

- Login 200: `{"status":"success","message":"Login correcto"}` y cabecera `Set-Cookie` con `currentUser`. JWT contiene solamente `id`, `email`, `role` y las marcas temporales estándar.
- Login 401, tanto email inexistente como contraseña errónea: `{"status":"error","message":"Credenciales inválidas"}`. Campos ausentes: 400.
- Current 200: `{"status":"success","payload":{"id":"665f2a000000000000000001","email":"ana@mail.com","role":"user"}}`.
- Sin cookie, token manipulado o vencido: 401 `{"status":"error","message":"No autenticado"}`.
- Logout 200, sin body requerido: `{"status":"success","message":"Sesión cerrada"}`. El siguiente current sin cookie válida devuelve 401.

Los ID de los ejemplos son ilustrativos: usá los generados al registrar. El archivo `cookies.txt` guarda una sesión; mantenelo fuera del repositorio.

## Roles y permisos

| Acción | user | organizer | admin |
|---|---|---|---|
| Consultar eventos | Sí | Sí | Sí |
| Crear eventos | No | Sí | Sí |
| Modificar/cancelar evento propio | No | Sí | Sí |
| Modificar evento ajeno | No | No | Sí |
| Listar usuarios | No | No | Sí |

`auth` exige una sesión válida (401); `authorize(...roles)` valida permisos (403). La propiedad del evento se valida además en services. Ni `role` del registro ni `organizer` del evento se toman del body como fuente de permisos.

Para probar roles, registrá primero usuarios y luego, con acceso local autorizado a tu propia base, ejecutá:

```bash
npm run user:role -- organizador@example.com organizer
npm run user:role -- administrador@example.com admin
```

Este script administrativo no es una ruta pública. Iniciá sesión con cada usuario y usá su cookie para probar permisos. Un `user` obtiene 403 al crear eventos; un organizer puede crear y modificar los propios; solo admin puede usar `GET /api/users`. Sin cookie, las rutas privadas devuelven 401.

### Crear y modificar eventos

```bash
curl -i -b cookies-organizer.txt -X POST http://localhost:8080/api/events   -H 'Content-Type: application/json'   -d '{"title":"Workshop Backend","description":"Introducción a APIs","category":"workshop","date":"2099-05-01T18:00:00Z","location":"Montevideo","capacity":20,"price":0,"status":"published"}'
curl -i -b cookies-organizer.txt -X PUT http://localhost:8080/api/events/ID_EVENTO   -H 'Content-Type: application/json' -d '{"title":"Workshop actualizado"}'
```

Creación: 201 `{"status":"success","payload":{...}}`; modificación: 200 con el mismo sobre. El payload incluye los campos del evento, `id` y la referencia `organizer` del usuario autenticado. `GET /api/users` devuelve 200 `{"status":"success","payload":[...]}` con usuarios sin password.

Los campos de texto son obligatorios, la fecha debe ser futura, capacity un entero positivo y price un número no negativo. Estados: `draft`, `published`, `cancelled`, `finished`. No se modifican eventos cancelados o finalizados ni se publican eventos pasados. PUT acepta actualizaciones parciales de los campos editables, sin cambiar organizer. Nunca se eliminan eventos físicamente. ID inválido: 400; ID válido inexistente: 404; propietario incorrecto: 403; estado terminal: 409. Los errores siguen `{"status":"error","message":"..."}`; no se exponen detalles internos en errores 500.

## Filtros y estados de eventos

```bash
curl 'http://localhost:8080/api/events?status=published&category=workshop&location=Montevideo&dateFrom=2099-01-01&dateTo=2099-12-31&page=1&limit=5&sort=date'
curl http://localhost:8080/api/events/ID_EVENTO
curl -b cookies-organizer.txt -X PATCH http://localhost:8080/api/events/ID_EVENTO/status   -H 'Content-Type: application/json' -d '{"status":"cancelled"}'
```

Filtros `status`, `category` y `location` usan coincidencia exacta. `dateFrom` y `dateTo` aceptan fechas ISO y delimitan un rango inclusivo; para incluir un día completo indicá la hora final. Sin filtros se listan todos los estados; `?status=published` permite consultar solo publicados. `page` comienza en 1; `limit` va de 1 a 100 (20 por defecto). `sort`: `date`, `-date`, `title`, `-title`, `price`, `-price`.

Listado 200:

```json
{"status":"success","data":[],"page":1,"limit":5,"total":0,"totalPages":0}
```

Detalle y cambio de estado devuelven 200 `{"status":"success","payload":{...}}`. Un rango, estado, paginación u ordenamiento inválido devuelve 400. Cancelar conserva el documento con `status: cancelled`; cualquier modificación posterior devuelve 409.

## Inscripciones, cupos y correo

```bash
curl -i -b cookies.txt -X POST http://localhost:8080/api/events/ID_EVENTO/tickets   -H 'Content-Type: application/json' -d '{"quantity":2}'
curl -i -b cookies.txt http://localhost:8080/api/tickets/my-tickets
curl -i -b cookies-organizer.txt http://localhost:8080/api/events/ID_EVENTO/tickets
curl -i -b cookies.txt -X PATCH http://localhost:8080/api/tickets/ID_TICKET/cancel
```

- Registro: 201 `{"status":"success","payload":{...},"notification":"sent"}`. El ticket contiene referencias `user` y `event`, `status: confirmed`, `quantity`, un `reservationCode` único, `createdAt` y `cancelledAt: null`.
- Mis tickets: 200 `{"status":"success","payload":[...]}`. `event` se completa con populate de `title`, `date` y `location`. Incluye historial cancelado; no contiene datos sensibles de otros usuarios.
- Tickets del evento: 200 con el mismo sobre; solo organizer dueño del evento o admin. Un user común o un organizer ajeno recibe 403.
- Cancelar: 200 con el ticket actualizado a `cancelled` y `cancelledAt`. Conserva el documento. Ticket ajeno: 403; inexistente: 404; ya cancelado: 409.

Se valida que el evento exista (404), esté publicado y tenga fecha futura (409), y que quantity sea un entero positivo (400). Solo una inscripción activa por usuario y evento (409 si se duplica). `pending` y `confirmed` ocupan cupo; `cancelled` no. La disponibilidad se calcula sumando quantity de los tickets activos, no contando documentos. Una cancelación libera lugares y permite volver a inscribirse.

Reservas, cancelaciones y cambios de capacidad se serializan mediante una escritura sobre el evento dentro de una transacción MongoDB. Así se evita sobreventa entre peticiones concurrentes y se rechaza reducir capacity por debajo de los lugares ocupados. Un índice parcial impide duplicados activos. La transacción requiere replica set; no se reemplaza silenciosamente por una secuencia sin garantías.

Configurá SMTP con las variables MAIL indicadas arriba. Nodemailer envía texto plano después de confirmar la transacción. `notification: sent` significa que el servidor SMTP aceptó el mensaje, no garantiza entrega en bandeja. Ante falta de configuración o fallo SMTP, el ticket sigue confirmado y la respuesta informa `notification: failed`; no se anuncia un envío exitoso ni se deshace la reserva. No hay reintentos automáticos en esta etapa. Para comprobar recepción real necesitás tu propio SMTP y una dirección de destino válida; no se incluyen credenciales ni servicios vinculados.

## Pruebas

```bash
npm test
npm run test:contracts
npm run test:api
npm run test:integration
```

`npm test` ejecuta 54 pruebas unitarias: validaciones, errores, autorización, DTO, políticas de repositories y límites de importación entre capas. Las pruebas de arquitectura fallan si un archivo fuera de DAO importa modelos o si services/controllers acceden directamente a DAO o Mongoose.

`npm run test:contracts` ejecuta 11 pruebas del pipeline Express en memoria con mensajes HTTP de Node, sin abrir puertos. `npm run test:api` ejecuta los mismos escenarios con Supertest sobre HTTP local. La selección del transporte solo afecta al cliente de pruebas: no altera el código productivo.

La regresión cubre sesiones, roles, propiedad, filtros, cupos, duplicados, cancelaciones, estados, emails simulados y el flujo completo registro → login → crear evento → inscribirse → consultar mis tickets → cancelar. En ese flujo solo se sustituyen DAO y transporte SMTP: repositories, services, Passport, bcrypt, JWT y DTO son reales. Otras pruebas aíslan repositories para comprobar casos concretos. Se inyectan documentos poblados con campos sensibles para verificar que el DTO los filtre.

**Verificado localmente:** 54 pruebas unitarias y 11 de contratos aprobadas; sintaxis válida. Las dependencias de la etapa anterior se reutilizaron localmente y npm validó el lock en modo offline. HTTP por sockets puede requerir una terminal sin restricciones de escucha; un bloqueo `listen EPERM` del entorno no es una prueba HTTP aprobada.

`test:integration` queda omitida explícitamente sin `TEST_MONGO_URL`. Para ejecutarla, configurá una base propia exclusiva de pruebas:

```bash
TEST_MONGO_URL="URL_DE_TU_BASE_DE_PRUEBAS" npm run test:integration
```

La prueba crea un usuario temporal, comprueba el hash persistido y lo elimina al terminar. No se conecta por defecto a tu base normal. **La persistencia MongoDB real, la concurrencia real y la recepción SMTP no se verificaron**. No se crearon cuentas, bases externas ni servicios de correo como parte de este proyecto.

Para validar la integración completa: registrá usuarios, asigná roles, creá un evento published futuro de capacidad 2, reservá quantity 2, comprobá que otro usuario recibe 409, cancelá y repetí con el segundo usuario. Probá duplicados, quantity inválida, evento pasado/cancelado, cancelación ajena (403), repetida (409), y verificación de permisos del listado. Enviá también reservas simultáneas por el último cupo y comprobá que solo una se confirme. Revisá la recepción del email y que la suma activa nunca supere capacity. Estas comprobaciones requieren tu MongoDB y SMTP configurados.

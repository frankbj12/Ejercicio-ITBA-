# AGENTS.md

## Proyecto: API RESTful Kanban

Este archivo define las reglas globales de desarrollo para el proyecto.  
Todo agente de IA, desarrollador o herramienta automatizada que modifique el repositorio debe respetar estas instrucciones.

El objetivo es desarrollar una **API RESTful para gestionar una estructura Kanban** compuesta por:

- **Board**: tablero.
- **Column**: columna perteneciente a un tablero.
- **Ticket**: ticket perteneciente a una columna y, por transitividad, a un tablero.

La relación conceptual es:

```text
Board
 └── Column
      └── Ticket
```

La API debe utilizar rutas anidadas para representar esta jerarquía y debe aplicar validaciones estrictas sobre las relaciones entre recursos.

---

# 1. Principios generales

Prioridades del proyecto:

1. Cumplir exactamente el contrato de la API.
2. Mantener una arquitectura clara y mantenible.
3. Respetar las reglas de negocio.
4. Utilizar correctamente los códigos de estado HTTP.
5. Evitar duplicación de lógica.
6. Mantener responsabilidades separadas.
7. Probar el comportamiento antes de considerar una funcionalidad terminada.
8. No introducir funcionalidades que no estén especificadas.

La simplicidad debe priorizarse siempre que no entre en conflicto con una regla de la especificación.

---

# 2. Stack tecnológico

El backend debe utilizar:

- Node.js 20+
- Express 4+
- MongoDB
- Mongoose 8+
- JavaScript con módulos ES (`type: "module"`)

El proyecto debe utilizar JSON como formato de intercambio de datos.

No incorporar frameworks, ORMs, librerías o tecnologías adicionales salvo que exista una justificación técnica clara y no contradigan la consigna.

---

# 3. Arquitectura

Utilizar separación estricta de responsabilidades.

La estructura conceptual debe ser:

```text
src/
├── config/
│   └── database.js
│
├── models/
│   ├── Board.js
│   ├── Column.js
│   └── Ticket.js
│
├── controllers/
│   ├── boardController.js
│   ├── columnController.js
│   └── ticketController.js
│
├── middleware/
│   ├── errorHandler.js
│   ├── parentCheck.js
│   └── ...
│
├── routes/
│   ├── boardRoutes.js
│   ├── columnRoutes.js
│   └── ticketRoutes.js
│
├── app.js
└── server.js
```

La estructura puede adaptarse si el proyecto existente utiliza otra organización, pero deben mantenerse las responsabilidades.

## Regla fundamental

### Modelos

Responsables de:

- Esquemas Mongoose.
- Relaciones mediante referencias.
- Validaciones propias del modelo.
- Hooks de Mongoose relacionados con operaciones del modelo.

### Controladores

Responsables de:

- Recibir la petición procesada por las rutas y middlewares.
- Ejecutar la lógica de aplicación.
- Consultar/modificar los modelos.
- Construir las respuestas HTTP.

### Rutas

Responsables de:

- Definir métodos HTTP y endpoints.
- Asociar middlewares.
- Asociar controladores.

Las rutas **NO deben contener lógica de acceso a MongoDB**.

### Middlewares

Responsables de:

- Validaciones reutilizables.
- Verificación de existencia de recursos.
- Verificación de relaciones padre-hijo.
- Manejo transversal de errores u otras responsabilidades claramente reutilizables.

---

# 4. Modelo de datos

Deben existir tres modelos separados:

```text
Board.js
Column.js
Ticket.js
```

Las relaciones deben utilizar referencias `ObjectId` de Mongoose.

Conceptualmente:

```text
Board
 └── columns → Column[]
 
Column
 └── board → Board
 └── tickets → Ticket[]

Ticket
 └── column → Column
```

La implementación concreta puede utilizar referencias desde el hijo al padre, desde el padre al hijo o una combinación justificada, pero debe permitir validar inequívocamente la jerarquía.

No utilizar arrays simples como mecanismo de almacenamiento de grandes cantidades de tickets.

Para relaciones persistentes entre entidades se deben utilizar referencias MongoDB/Mongoose.

---

# 5. Contrato de la API

El contrato de endpoints es la fuente de verdad.

No modificar métodos, rutas o códigos de estado sin una modificación explícita de la especificación.

## Endpoints obligatorios

| Método | Endpoint | Acción | Éxito |
|---|---|---|---|
| POST | `/api/boards` | Crear un tablero | `201 Created` |
| GET | `/api/boards/:boardId` | Obtener un tablero con sus columnas pobladas | `200 OK` |
| POST | `/api/boards/:boardId/columns` | Crear una columna dentro de un tablero | `201 Created` |
| DELETE | `/api/boards/:boardId/columns/:columnId` | Eliminar una columna | `204 No Content` |
| POST | `/api/boards/:boardId/columns/:columnId/tickets` | Crear un ticket dentro de una columna | `201 Created` |
| PATCH | `/api/boards/:boardId/columns/:columnId/tickets/:ticketId` | Actualizar o mover un ticket | `200 OK` |

### Regla de rutas anidadas

Los tickets deben crearse estrictamente dentro del contexto:

```text
/api/boards/:boardId/columns/:columnId/tickets
```

No crear una ruta plana como:

```text
/api/tickets
```

para la creación de tickets.

---

# 6. Verificación de recursos padre

Toda operación sobre un recurso hijo debe validar previamente la existencia del recurso padre correspondiente.

## Crear Column

Antes de ejecutar la creación:

```text
POST /api/boards/:boardId/columns
```

debe verificarse que `boardId` existe.

Si no existe:

```http
404 Not Found
```

La operación debe finalizar inmediatamente.

No permitir que la ausencia del padre termine convirtiéndose en:

```http
500 Internal Server Error
```

ni en un error genérico de Mongoose.

## Crear Ticket

Antes de ejecutar:

```text
POST /api/boards/:boardId/columns/:columnId/tickets
```

debe verificarse:

1. Que el `boardId` exista.
2. Que el `columnId` exista.
3. Que la columna pertenezca al tablero indicado.

Si cualquiera de estas condiciones falla, rechazar la operación.

---

# 7. Aislamiento de rutas

Las rutas anidadas deben representar relaciones reales.

Para una petición:

```text
/api/boards/123/columns/456/tickets
```

no es suficiente comprobar que:

```text
Board 123 existe
Column 456 existe
```

También debe comprobarse:

```text
Column 456 pertenece a Board 123
```

Si la columna existe pero pertenece a otro tablero:

```http
400 Bad Request
```

o:

```http
404 Not Found
```

según la implementación elegida.

La respuesta debe ser consistente en todo el proyecto.

---

# 8. Validación de ObjectId

Los parámetros identificadores deben validarse antes de realizar consultas que puedan provocar errores de casteo.

## ID con formato válido pero inexistente

Ejemplo:

```text
507f1f77bcf86cd799439011
```

Si tiene formato válido de MongoDB pero no existe:

```http
404 Not Found
```

## ID con formato inválido

Ejemplo:

```text
123
```

Debe responder:

```http
400 Bad Request
```

o utilizar un manejo explícito y equivalente del error de casteo.

Nunca permitir que un `CastError` termine como un `500` no controlado.

---

# 9. Validación de payloads

Los datos recibidos por el cliente deben validarse.

Si el payload no cumple los requisitos del recurso:

```http
400 Bad Request
```

Ejemplo:

```json
{
  "description": "Ticket sin título"
}
```

si `title` es obligatorio.

Los errores de validación deben ser claros y consistentes.

---

# 10. Formato de errores

Los errores de la API deben utilizar respuestas JSON consistentes.

Formato base:

```json
{
  "error": "Mensaje descriptivo del error"
}
```

No devolver HTML.

No exponer stack traces, detalles internos de MongoDB ni información sensible en producción.

Los errores inesperados deben ser gestionados por un middleware global.

---

# 11. Manejo global de errores

Debe existir un middleware global de errores.

Responsabilidades:

- Capturar errores no gestionados.
- Transformar errores conocidos en respuestas HTTP apropiadas.
- Evitar respuestas inconsistentes.
- Evitar que errores internos sean expuestos innecesariamente.

Prioridad de clasificación:

```text
ValidationError → 400
CastError → 400
Recurso inexistente → 404
Relación padre-hijo inválida → 400/404
Error inesperado → 500
```

No utilizar `500` como respuesta genérica para errores que puedan identificarse correctamente.

---

# 12. Borrado en cascada

El proyecto requiere comportamiento de borrado en cascada.

Cuando se elimina un tablero, sus recursos dependientes deben eliminarse de acuerdo con la relación definida.

Conceptualmente:

```text
DELETE Board
    ↓
Columns
    ↓
Tickets
```

Los hooks de Mongoose necesarios para garantizar este comportamiento deben ejecutarse correctamente.

No utilizar una estrategia de borrado que evite los hooks necesarios.

En particular:

> No utilizar `findByIdAndDelete` sin analizar previamente si dicha operación impide ejecutar los hooks necesarios para el borrado en cascada.

El mecanismo de cascada debe quedar implementado de forma explícita y verificable.

---

# 13. PATCH de Tickets

El endpoint:

```text
PATCH /api/boards/:boardId/columns/:columnId/tickets/:ticketId
```

permite actualizar el contenido del ticket y/o moverlo.

Toda actualización debe:

1. Validar `boardId`.
2. Validar `columnId`.
3. Validar `ticketId`.
4. Verificar existencia de los recursos.
5. Verificar las relaciones padre-hijo.
6. Actualizar únicamente los campos permitidos.
7. Mantener la integridad de las referencias.

---

# 14. Idempotencia

Las operaciones de actualización deben ser idempotentes cuando el contrato de la operación lo permita.

Si el cliente envía dos veces la misma petición debido a un fallo de red:

```text
PATCH request
PATCH same request
```

el estado final de la base de datos debe ser equivalente al estado producido por una única ejecución.

No:

- duplicar tickets;
- duplicar referencias;
- generar efectos secundarios acumulativos;
- corromper el orden de los recursos.

Antes de implementar una actualización, el agente debe analizar explícitamente sus posibles efectos repetidos.

---

# 15. Negative Boundaries

Estas reglas son obligatorias.

El agente **NO DEBE**:

- Crear rutas planas para tickets cuando la operación deba realizarse mediante rutas anidadas.
- Mezclar consultas de MongoDB directamente dentro de los archivos de rutas.
- Colocar toda la lógica del backend en `server.js`.
- Devolver `500` cuando el `boardId` no existe.
- Devolver `500` ante un `CastError` controlable.
- Crear una columna sin verificar previamente que el tablero existe.
- Crear un ticket sin verificar previamente que la columna existe.
- Permitir acceder a una columna de un tablero diferente mediante una ruta manipulada.
- Ignorar la relación `Board → Column → Ticket`.
- Usar arrays simples como sustituto de referencias persistentes para grandes cantidades de tickets.
- Eliminar recursos mediante una estrategia que evite los hooks necesarios para el borrado en cascada.
- Exponer stack traces al cliente.
- Inventar endpoints no definidos en la especificación.
- Cambiar códigos HTTP establecidos por el contrato sin justificación.
- Implementar autenticación obligatoria en esta etapa.
- Generar todo el backend en una única modificación sin validar cada fase.
- Considerar una funcionalidad terminada sin probar los casos exitosos y los casos de error.

---

# 16. Desarrollo basado en especificaciones (SDD)

El desarrollo debe realizarse de forma incremental.

No solicitar ni ejecutar una implementación completa del proyecto en una única etapa.

La especificación debe ser la fuente de verdad antes que las decisiones particulares del agente.

## Fase 0 — Contrato y pruebas

Antes de implementar lógica de negocio:

1. Revisar los endpoints.
2. Revisar los códigos HTTP.
3. Identificar reglas de validación.
4. Identificar relaciones entre recursos.
5. Definir casos positivos.
6. Definir casos negativos.
7. Preparar una colección de pruebas para Thunder Client/Postman.

La colección debe permitir verificar el contrato independientemente de la implementación.

---

## Fase 1 — Datos

Implementar solamente:

- `Board.js`
- `Column.js`
- `Ticket.js`
- Referencias entre modelos.
- Validaciones de modelos.
- Hooks necesarios para cascada.

No implementar todavía controladores complejos.

Validar los esquemas antes de continuar.

---

## Fase 2 — Middleware

Implementar:

- Validación de ObjectId.
- Verificación de existencia del recurso padre.
- Verificación de relaciones padre-hijo.
- Manejo de errores reutilizable.

Validar especialmente:

```text
board inexistente
column inexistente
ticket inexistente
column perteneciente a otro board
IDs inválidos
```

---

## Fase 3 — Controladores

Implementar los controladores respetando la separación de responsabilidades.

Orden recomendado:

1. Crear Board.
2. Obtener Board.
3. Crear Column.
4. Eliminar Column.
5. Crear Ticket.
6. Actualizar/Mover Ticket.

Cada controlador debe reutilizar los modelos y middlewares existentes.

No duplicar validaciones que ya correspondan a middleware.

---

## Fase 4 — Rutas

Conectar:

```text
Routes
   ↓
Middleware
   ↓
Controller
   ↓
Model
   ↓
MongoDB
```

Las rutas deben permanecer delgadas.

---

## Fase 5 — Manejo de errores

Implementar y verificar el middleware global.

Probar como mínimo:

- Payload inválido.
- ObjectId inválido.
- Recurso inexistente.
- Relación padre-hijo inválida.
- Error inesperado.

---

## Fase 6 — Integración

Verificar la API completa mediante Thunder Client, Postman u otra herramienta equivalente.

Las pruebas deben cubrir tanto:

```text
Happy path
```

como:

```text
Failure path
```

---

# 17. Estrategia de testing

Cada endpoint debe probarse al menos en:

### Caso exitoso

La operación debe producir exactamente el código HTTP esperado y una respuesta coherente.

### Recurso inexistente

Verificar:

```http
404 Not Found
```

cuando corresponda.

### ID inválido

Verificar:

```http
400 Bad Request
```

### Payload inválido

Verificar:

```http
400 Bad Request
```

### Relación inválida

Verificar que no sea posible acceder a un recurso hijo mediante un padre incorrecto.

### Repetición de PATCH

Enviar la misma actualización más de una vez y verificar que el estado final permanezca consistente.

---

# 18. Criterios de aceptación

Una funcionalidad no se considera terminada hasta cumplir:

- [ ] Endpoint implementado.
- [ ] Código HTTP correcto.
- [ ] Validación de parámetros.
- [ ] Validación del payload.
- [ ] Verificación de existencia de recursos.
- [ ] Verificación de relaciones padre-hijo.
- [ ] Manejo de errores.
- [ ] Prueba exitosa.
- [ ] Prueba negativa.
- [ ] No se introdujeron rutas o comportamientos no especificados.
- [ ] La arquitectura mantiene separación de responsabilidades.

---

# 19. README y documentación

El repositorio debe contener un `README.md` completo.

Debe documentar como mínimo:

- Objetivo del proyecto.
- Stack tecnológico.
- Requisitos.
- Instalación.
- Variables de entorno.
- Configuración de MongoDB.
- Ejecución local.
- Estructura del proyecto.
- Endpoints.
- Ejemplos de requests.
- Ejemplos de respuestas.
- Manejo de errores.
- Instrucciones para ejecutar las pruebas.

Debe existir:

```text
.env.example
```

Nunca subir credenciales reales al repositorio.

---

# 20. Variables de entorno

Las credenciales y configuraciones dependientes del entorno deben utilizar variables de entorno.

Ejemplo conceptual:

```env
PORT=4000
MONGO_URI=mongodb://localhost:27017/kanban
NODE_ENV=development
```

El archivo `.env` real no debe versionarse.

Debe versionarse:

```text
.env.example
```

---

# 21. Git y Conventional Commits

Los commits deben seguir Conventional Commits.

Ejemplos:

```text
feat(models): add kanban mongoose schemas
feat(middleware): add parent resource validation
feat(controllers): implement board creation
feat(routes): add nested ticket routes
test(api): add ticket validation cases
fix(errors): handle invalid object ids
docs(readme): document api endpoints
```

Evitar commits genéricos como:

```text
update
changes
final
cosas
fix
```

Los commits deben representar unidades funcionales pequeñas y revisables.

---

# 22. Regla de cambios

Antes de modificar código existente:

1. Inspeccionar la estructura actual.
2. Identificar dependencias.
3. Revisar los modelos relacionados.
4. Revisar las rutas existentes.
5. Revisar las pruebas afectadas.
6. Realizar el cambio mínimo necesario.
7. Ejecutar las pruebas correspondientes.

No sobrescribir archivos completos innecesariamente.

No eliminar código funcional sin comprobar primero sus dependencias.

---

# 23. Regla de incertidumbre

Si la especificación no define un comportamiento:

**NO inventarlo silenciosamente.**

El agente debe:

1. Identificar la ambigüedad.
2. Explicar qué parte de la especificación no está definida.
3. Proponer la alternativa mínima.
4. Esperar confirmación si la decisión modifica el contrato de la API.

Esto es especialmente importante para:

- nuevos endpoints;
- campos obligatorios;
- estructura exacta de los documentos;
- reglas de ordenamiento;
- comportamiento no especificado del PATCH;
- códigos HTTP no definidos.

---

# 24. Inconsistencias de la especificación

La especificación establece como objetivo un CRUD completo y exige borrado en cascada al eliminar un tablero, pero la tabla de endpoints proporcionada no incluye explícitamente un:

```text
DELETE /api/boards/:boardId
```

Por lo tanto:

- No inventar automáticamente ese endpoint.
- No modificar el contrato por iniciativa propia.
- Señalar esta inconsistencia antes de implementarla.
- Si se confirma que debe existir, incorporarlo explícitamente al contrato y a las pruebas.

La tabla de endpoints debe considerarse la fuente de verdad mientras esta ambigüedad no sea resuelta.

---

# 25. Despliegue

El despliegue del backend es deseable y será considerado un valor agregado.

La aplicación desplegada debe:

- Utilizar variables de entorno.
- No exponer credenciales.
- Conectarse a una base MongoDB accesible desde el entorno de ejecución.
- Mantener las mismas reglas del contrato que la versión local.

El comportamiento local y desplegado debe ser equivalente.

---

# 26. Regla para agentes de IA

Antes de escribir código, el agente debe:

1. Leer este `AGENTS.md`.
2. Inspeccionar el repositorio.
3. Identificar el estado actual de la implementación.
4. Comparar el código existente con esta especificación.
5. Indicar qué fase está trabajando.
6. Realizar solamente los cambios correspondientes a esa fase.
7. Verificar el resultado.
8. Informar qué se implementó y qué pruebas se ejecutaron.

No asumir que "funciona" significa que cumple la especificación.

La implementación debe evaluarse contra:

```text
Contrato
   +
Reglas de negocio
   +
Negative Boundaries
   +
Pruebas
   +
Arquitectura
```

---

# 27. Definition of Done

El proyecto se considera terminado cuando:

- [ ] La API respeta el contrato de endpoints.
- [ ] Board, Column y Ticket poseen modelos separados.
- [ ] Las relaciones utilizan referencias Mongoose adecuadas.
- [ ] Las rutas están separadas de los controladores.
- [ ] Los controladores están separados de los modelos.
- [ ] Los middlewares reutilizables están implementados.
- [ ] Se valida la existencia de los padres.
- [ ] Se valida el aislamiento de rutas.
- [ ] Se controlan ObjectIds inválidos.
- [ ] Se controlan recursos inexistentes.
- [ ] Se validan payloads.
- [ ] Los errores utilizan respuestas JSON consistentes.
- [ ] Existe manejo global de errores.
- [ ] El borrado en cascada funciona correctamente donde corresponde.
- [ ] El PATCH es idempotente.
- [ ] Las pruebas cubren casos positivos y negativos.
- [ ] Existe colección de pruebas.
- [ ] Existe `.env.example`.
- [ ] Existe README completo.
- [ ] Los commits utilizan Conventional Commits.
- [ ] No existen credenciales reales en el repositorio.
- [ ] El proyecto puede ejecutarse desde una instalación limpia.
- [ ] Cualquier ambigüedad de la especificación fue identificada y resuelta explícitamente.
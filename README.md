# API RESTful Kanban

API RESTful desarrollada en Node.js y Express para gestionar la jerarquía y el flujo de trabajo de un tablero Kanban (`Board -> Column -> Ticket`) con persistencia en MongoDB y Mongoose.

Diseñada siguiendo **Specification-Driven Development (SDD)** y las directivas de [`agents.md`](./agents.md).

---

## Índice

1. [Objetivo del Proyecto](#objetivo-del-proyecto)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Estructura del Proyecto](#estructura-del-proyecto)
4. [Requisitos Previos](#requisitos-previos)
5. [Instalación y Configuración](#instalación-y-configuración)
6. [Variables de Entorno](#variables-de-entorno)
7. [Ejecución](#ejecución)
8. [Contrato de Endpoints](#contrato-de-endpoints)
9. [Ejemplos de Solicitudes y Respuestas](#ejemplos-de-solicitudes-y-respuestas)
10. [Manejo de Errores y Códigos HTTP](#manejo-de-errores-y-códigos-http)
11. [Reglas Clave de Negocio](#reglas-clave-de-negocio)
12. [Ejecución de Pruebas](#ejecución-de-pruebas)
13. [Colección Thunder Client / Postman](#colección-thunder-client--postman)

---

## Objetivo del Proyecto

Gestionar una estructura Kanban jerárquica con rutas anidadas estrictas:

```text
Board
 └── Column
      └── Ticket
```

- Cada **Tablero (Board)** contiene columnas.
- Cada **Columna (Column)** pertenece a un tablero y contiene tickets.
- Cada **Ticket** pertenece a una columna y, transitivamente, al tablero contenedor.
- Aplicación de borrado en cascada (`Column -> Tickets` y `Board -> Columns -> Tickets`).
- Validación estricta de aislamiento de rutas (no se puede acceder a una columna o ticket a través de un tablero erróneo).
- Actualizaciones idempotentes en el endpoint `PATCH`.

---

## Stack Tecnológico

- **Entorno de ejecución**: Node.js 20+ (Módulos ES nativos, `"type": "module"`).
- **Framework Web**: Express 4.x.
- **Base de Datos**: MongoDB con Mongoose 8.x.
- **Configuración**: `dotenv`.
- **Testing**: `vitest` + `mongodb-memory-server` + `supertest`.

---

## Estructura del Proyecto

```text
Kanban/
├── src/
│   ├── config/
│   │   └── database.js           # Conexión a MongoDB
│   ├── controllers/
│   │   ├── boardController.js    # Lógica de tableros
│   │   ├── columnController.js   # Lógica de columnas
│   │   └── ticketController.js   # Lógica de tickets (PATCH idempotente)
│   ├── middleware/
│   │   ├── errorHandler.js       # Manejo global y consistente de errores JSON
│   │   ├── parentCheck.js        # Verificación de padres y aislamiento de rutas
│   │   └── validateObjectId.js   # Validación de formato ObjectId de MongoDB
│   ├── models/
│   │   ├── Board.js              # Modelo Board + hooks de cascada
│   │   ├── Column.js             # Modelo Column + hooks de cascada
│   │   └── Ticket.js             # Modelo Ticket
│   ├── routes/
│   │   ├── boardRoutes.js        # Rutas /api/boards
│   │   ├── columnRoutes.js       # Rutas anidadas /:boardId/columns
│   │   └── ticketRoutes.js       # Rutas anidadas /:columnId/tickets
│   ├── app.js                    # Configuración de Express y middlewares
│   └── server.js                 # Inicialización y arranque del servidor HTTP
├── tests/
│   ├── setup.js                  # Inicializador de MongoDB en memoria para pruebas
│   ├── models.test.js            # Pruebas unitarias de esquemas y cascada
│   ├── middleware.test.js        # Pruebas de validación y aislamiento
│   ├── integration.test.js       # Pruebas de integración E2E de la API
│   └── kanban-thunder-collection.json # Colección exportada para Thunder Client / Postman
├── .env.example                  # Plantilla de variables de entorno
├── .gitignore                    # Reglas de exclusión para Git
├── agents.md                     # Especificación estricta del proyecto
├── package.json
└── README.md
```

---

## Requisitos Previos

- **Node.js** >= 20.0.0
- **npm** >= 9.0.0
- Instancia local de **MongoDB** o URI de **MongoDB Atlas** (para la ejecución del servidor local; las pruebas automáticas no requieren MongoDB instalado ya que usan `mongodb-memory-server`).

---

## Instalación y Configuración

1. Clonar el repositorio y navegar a la carpeta:
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd Kanban
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Configurar variables de entorno:
   Copiar `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```

---

## Variables de Entorno

El archivo `.env` admite las siguientes variables:

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `PORT` | Puerto donde escuchará el servidor HTTP | `4000` |
| `MONGO_URI` | Cadena de conexión de MongoDB | `mongodb://localhost:27017/kanban` |
| `NODE_ENV` | Entorno de ejecución (`development`, `production`, `test`) | `development` |

---

## Ejecución

### Modo Desarrollo (con recarga automática):
```bash
npm run dev
```

### Modo Producción:
```bash
npm start
```

El servidor estará escuchando en `http://localhost:4000`.

---

## Contrato de Endpoints

| Método | Endpoint | Descripción | Código Éxito |
|---|---|---|---|
| `POST` | `/api/boards` | Crear un tablero | `201 Created` |
| `GET` | `/api/boards/:boardId` | Obtener un tablero con sus columnas y tickets poblados | `200 OK` |
| `DELETE` | `/api/boards/:boardId` | Eliminar un tablero (y sus columnas y tickets en cascada) | `204 No Content` |
| `POST` | `/api/boards/:boardId/columns` | Crear una columna dentro de un tablero | `201 Created` |
| `DELETE` | `/api/boards/:boardId/columns/:columnId` | Eliminar una columna (y sus tickets en cascada) | `204 No Content` |
| `POST` | `/api/boards/:boardId/columns/:columnId/tickets` | Crear un ticket dentro de una columna | `201 Created` |
| `PATCH` | `/api/boards/:boardId/columns/:columnId/tickets/:ticketId` | Actualizar contenido y/o mover un ticket (idempotente) | `200 OK` |
| `DELETE` | `/api/boards/:boardId/columns/:columnId/tickets/:ticketId` | Eliminar un ticket individual | `204 No Content` |

---

## Ejemplos de Solicitudes y Respuestas

### 1. Crear Tablero
`POST /api/boards`

**Body:**
```json
{
  "title": "Tablero Sprint 1"
}
```

**Respuesta (201 Created):**
```json
{
  "_id": "67a3f1234567890abcdef001",
  "title": "Tablero Sprint 1",
  "createdAt": "2026-10-05T22:00:00.000Z",
  "updatedAt": "2026-10-05T22:00:00.000Z"
}
```

---

### 2. Crear Columna
`POST /api/boards/67a3f1234567890abcdef001/columns`

**Body:**
```json
{
  "title": "Por Hacer"
}
```

**Respuesta (201 Created):**
```json
{
  "_id": "67a3f1234567890abcdef002",
  "title": "Por Hacer",
  "board": "67a3f1234567890abcdef001",
  "createdAt": "2026-10-05T22:01:00.000Z",
  "updatedAt": "2026-10-05T22:01:00.000Z"
}
```

---

### 3. Crear Ticket
`POST /api/boards/67a3f1234567890abcdef001/columns/67a3f1234567890abcdef002/tickets`

**Body:**
```json
{
  "title": "Configurar Linter",
  "description": "Configurar ESLint y Prettier"
}
```

**Respuesta (201 Created):**
```json
{
  "_id": "67a3f1234567890abcdef003",
  "title": "Configurar Linter",
  "description": "Configurar ESLint y Prettier",
  "column": "67a3f1234567890abcdef002",
  "createdAt": "2026-10-05T22:02:00.000Z",
  "updatedAt": "2026-10-05T22:02:00.000Z"
}
```

---

### 4. Obtener Tablero con Columnas y Tickets Poblados
`GET /api/boards/67a3f1234567890abcdef001`

**Respuesta (200 OK):**
```json
{
  "_id": "67a3f1234567890abcdef001",
  "title": "Tablero Sprint 1",
  "createdAt": "2026-10-05T22:00:00.000Z",
  "updatedAt": "2026-10-05T22:00:00.000Z",
  "columns": [
    {
      "_id": "67a3f1234567890abcdef002",
      "title": "Por Hacer",
      "board": "67a3f1234567890abcdef001",
      "createdAt": "2026-10-05T22:01:00.000Z",
      "updatedAt": "2026-10-05T22:01:00.000Z",
      "tickets": [
        {
          "_id": "67a3f1234567890abcdef003",
          "title": "Configurar Linter",
          "description": "Configurar ESLint y Prettier",
          "column": "67a3f1234567890abcdef002",
          "createdAt": "2026-10-05T22:02:00.000Z",
          "updatedAt": "2026-10-05T22:02:00.000Z"
        }
      ]
    }
  ]
}
```

---

### 5. Actualizar o Mover un Ticket (PATCH Idempotente)
`PATCH /api/boards/67a3f1234567890abcdef001/columns/67a3f1234567890abcdef002/tickets/67a3f1234567890abcdef003`

**Body (actualizar título y mover a otra columna del mismo tablero):**
```json
{
  "title": "Configurar Linter - Finalizado",
  "columnId": "67a3f1234567890abcdef009"
}
```

**Respuesta (200 OK):**
```json
{
  "_id": "67a3f1234567890abcdef003",
  "title": "Configurar Linter - Finalizado",
  "description": "Configurar ESLint y Prettier",
  "column": "67a3f1234567890abcdef009",
  "createdAt": "2026-10-05T22:02:00.000Z",
  "updatedAt": "2026-10-05T22:05:00.000Z"
}
```

---

### 6. Eliminar Columna (Borrado en Cascada)
`DELETE /api/boards/67a3f1234567890abcdef001/columns/67a3f1234567890abcdef002`

**Respuesta (204 No Content)**: Elimina la columna y automáticamente todos los tickets pertenecientes a ella mediante hooks de Mongoose.

---

## Manejo de Errores y Códigos HTTP

Todas las respuestas de error retornan estrictamente un formato JSON unificado:

```json
{
  "error": "Descripción del error"
}
```

### Códigos utilizados:
- `400 Bad Request`:
  - Parámetros con formato inválido de ObjectId (evitando que `CastError` se convierta en 500).
  - Cuerpos de petición con formato JSON malformado.
  - Validación de campos requeridos fallida (`title` ausente o vacío).
  - Envío de campos no permitidos en `PATCH`.
- `404 Not Found`:
  - Tablero, columna o ticket inexistente.
  - Violación de aislamiento de ruta (la columna no pertenece al tablero, o el ticket no pertenece a la columna).
  - Intento de mover un ticket a una columna que pertenece a otro tablero.
  - Ruta no definida en la API.
- `500 Internal Server Error`:
  - Error no controlado, sin exponer stack traces ni detalles internos al cliente.

---

## Reglas Clave de Negocio

1. **Rutas estrictamente anidadas**: Los tickets solo pueden crearse y gestionarse en el contexto `/api/boards/:boardId/columns/:columnId/tickets`.
2. **Aislamiento de recursos**: Si se consulta `/api/boards/A/columns/B/tickets/C` pero la columna `B` pertenece al tablero `X`, el servidor responde `404 Not Found`.
3. **Borrado en cascada**: Al invocar `deleteOne()` sobre una columna o un tablero, los hooks `pre('deleteOne')` de Mongoose eliminan recursivamente las entidades dependientes.
4. **Idempotencia**: El endpoint `PATCH` no genera efectos secundarios acumulativos si se invoca múltiples veces con la misma carga útil.

---

## Ejecución de Pruebas

El proyecto cuenta con una suite completa de **50 pruebas automatizadas** que validan modelos, middlewares, reglas de negocio y endpoints:

```bash
npm test
```

Para ejecutar pruebas en modo continuo (watch):
```bash
npm run test:watch
```

---

## Colección Thunder Client / Postman

El repositorio incluye una colección lista para importar en [`tests/kanban-thunder-collection.json`](./tests/kanban-thunder-collection.json) con todas las solicitudes organizadas en carpetas:
- **1. Boards**
- **2. Columns**
- **3. Tickets**
- **4. Negative Boundaries & Edge Cases**

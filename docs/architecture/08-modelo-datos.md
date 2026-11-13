# 8. Modelo de datos (ER desde `schema.prisma`)

Generado a partir de `api/prisma/schema.prisma` (PostgreSQL en Supabase, migraciones en `api/prisma/migrations`). Solo se muestran las columnas que sirven para explicar el dominio; las marcas de tiempo `createdAt` y `updatedAt` se omiten.

```mermaid
erDiagram
  users ||--o{ items : "posee (ownerId)"
  users ||--o{ wants : "desea (userId)"
  items |o--o{ wants : "want de un objeto (itemId)"
  users ||--o{ swap_routes : "inicia (initiatorId)"
  swap_routes ||--|{ swap_route_steps : "tiene 2 a 4 pasos"
  users ||--o{ swap_route_steps : "participa (userId)"
  items ||--o{ swap_route_steps : "entrega (givesItemId)"
  items ||--o{ swap_route_steps : "recibe (receivesItemId)"
  users ||--o{ notifications : "recibe (userId)"
  swap_routes |o--o{ notifications : "sobre (routeId)"

  users {
    uuid id PK
    string email UK
    string passwordHash "nunca sale en DTOs"
    string name
    string municipalityCode "DANE 5 digitos"
    float rating
    int tradesCompleted
    float co2SavedKg
  }
  items {
    uuid id PK
    uuid ownerId FK
    string name
    string category
    enum condition "NEW..POOR"
    float estimatedValue "COP entero por convencion"
    enum status "AVAILABLE PENDING_SWAP SWAPPED ARCHIVED"
    string_array images "URLs de Supabase Storage"
    float_array embedding
    string municipalityCode
  }
  wants {
    uuid id PK
    uuid userId FK
    uuid itemId FK "nullable"
    string queryText
    string category
    float_array embedding
  }
  swap_routes {
    uuid id PK
    string code UK "SW-XXXX"
    uuid initiatorId FK
    string objectiveText
    float matchScore "55 a 99"
    enum status "SUGGESTED ACTIVE CONFIRMED COMPLETED CANCELLED EXPIRED"
    string aiExplanation
    datetime expiresAt "creacion + 48 h"
  }
  swap_route_steps {
    uuid id PK
    uuid routeId FK
    int stepOrder "unico por ruta"
    uuid userId FK
    uuid givesItemId FK
    uuid receivesItemId FK
    enum acceptance "PENDING ACCEPTED DECLINED"
    boolean deliveryConfirmed
  }
  notifications {
    uuid id PK
    uuid userId FK
    uuid routeId FK "nullable"
    string type "ROUTE_PROPOSAL ROUTE_CONFIRMED ..."
    boolean read
  }
```

## Notas de diseño
- **El ciclo se guarda como pasos ordenados.** `swap_route_steps` tiene `@@unique([routeId, stepOrder])`. El paso *i* entrega `givesItemId` al dueño del paso *i+1* y recibe `receivesItemId` del paso *i−1*.
- **Borrado protegido.** `givesItem` y `receivesItem` usan `onDelete: Restrict`: no se puede borrar un objeto que forma parte de una ruta. Usuarios, pasos y notificaciones usan `Cascade`.
- **Ubicación sin GPS.** Solo se guardan `departmentCode` y `municipalityCode` (DANE), nunca coordenadas.
- **Dinero.** `estimatedValue` es `Float` en la base de datos, pero el dominio lo trata como pesos enteros (ver [ADR-0002](adr/0002-cop-como-entero.md)).
- Índices: `items(ownerId)`, `items(municipalityCode)`, `items(departmentCode)`, `wants(userId)`, `wants(itemId)` y los FK de `swap_route_steps`.

# 6. Secuencia: consenso de una propuesta

Una propuesta (`SwapRoute`) solo se confirma cuando **todas** las personas del anillo aceptan. Basta un rechazo para cancelarla. Cada respuesta corre dentro de un `prisma.$transaction` que primero bloquea la fila de la ruta (`lockRouteRow`). Así, si los dos últimos participantes aceptan al mismo tiempo, sus respuestas se procesan una tras otra y ninguno deja de ver la aceptación del otro.

Ejemplo con el seed: Alex propone el anillo **Mochila Totto → Zapatillas Nike → Parlante JBL**. Alex y Mateo ya aceptaron y falta Diego.

```mermaid
sequenceDiagram
  autonumber
  actor Alex as Alex (iniciador)
  actor Diego as Diego (participante)
  participant App as APK (RouteDetailScreen)
  participant PC as ProposalsController
  participant RS as RoutesService
  participant DB as PostgreSQL

  Alex->>PC: POST /proposals (pasos del ciclo)
  PC->>RS: proposeRoute(initiatorId, dto)
  RS->>DB: BEGIN, crear SwapRoute ACTIVE, expiresAt = ahora + 48 h
  RS->>DB: crear pasos (paso de Alex en ACCEPTED, el resto en PENDING)
  RS->>DB: items AVAILABLE a PENDING_SWAP (updateMany condicional)
  RS->>DB: notificación ROUTE_PROPOSAL a cada participante, COMMIT
  Note over RS,DB: Si el conteo del bloqueo no coincide, otra propuesta tomó un objeto: 409 y ROLLBACK

  Diego->>App: abre la notificación y toca "Aceptar"
  App->>PC: POST /proposals/:id/respond {decision: ACCEPTED}
  PC->>RS: respondToRoute(userId, routeId, dto)
  RS->>DB: BEGIN, lockRouteRow (bloqueo de escritura de la fila)
  RS->>DB: leer la ruta con sus pasos
  alt expiresAt vencido
    RS->>DB: ruta EXPIRED, items AVAILABLE, COMMIT
    RS-->>App: 409 la propuesta expiró
  else decision = REJECTED
    RS->>DB: paso DECLINED, ruta CANCELLED, items AVAILABLE
    RS->>DB: notificación ROUTE_CANCELLED al resto, COMMIT
  else decision = ACCEPTED y todos aceptaron
    RS->>DB: paso ACCEPTED, ruta CONFIRMED
    RS->>DB: notificación ROUTE_CONFIRMED a todos, COMMIT
  else decision = ACCEPTED y aún falta alguien
    RS->>DB: paso ACCEPTED, COMMIT (la ruta sigue ACTIVE)
  end
  RS-->>App: SwapRouteDto actualizado

  Note over Alex,DB: Después de la entrega física
  Alex->>PC: POST /proposals/:id/complete
  PC->>RS: completeRoute(userId, routeId)
  RS->>DB: solo si está CONFIRMED: deliveryConfirmed, ruta COMPLETED, items SWAPPED, suma tradesCompleted y co2SavedKg
```

## Estados

```mermaid
stateDiagram-v2
  [*] --> ACTIVE: proposeRoute
  ACTIVE --> CONFIRMED: el último participante acepta
  ACTIVE --> CANCELLED: un participante rechaza o el iniciador cancela
  ACTIVE --> EXPIRED: pasan 48 h sin consenso
  CONFIRMED --> COMPLETED: todas las entregas confirmadas
  CANCELLED --> [*]
  EXPIRED --> [*]
  COMPLETED --> [*]
```

| Estado de la ruta | Estado de los objetos | Quién lo provoca | Código |
|---|---|---|---|
| `ACTIVE` | `PENDING_SWAP` | `proposeRoute` | `api/src/modules/routes/routes.service.ts` |
| `CONFIRMED` | `PENDING_SWAP` | `respondToRoute`, cuando todos aceptaron | ídem |
| `CANCELLED` | `AVAILABLE` | `respondToRoute` con REJECTED, o `cancelRoute` | ídem |
| `EXPIRED` | `AVAILABLE` | `respondToRoute` o `expireOverdueRoutes` (se revisa de forma perezosa al listar, porque el plan free de Render no permite cron) | ídem |
| `COMPLETED` | `SWAPPED` | `completeRoute` | ídem |

**Cómo dibujarlo a mano:** seis líneas de vida (Alex, Diego, App, Controller, Service y BD) y un bloque `alt` con cuatro ramas. El estado de la ruta va anotado al lado de cada flecha que llega a la BD.

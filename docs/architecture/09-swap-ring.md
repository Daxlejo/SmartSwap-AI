# 9. Anillo de intercambio (`SwapRing`): diseño

**Estado:** propuesta de la Fase 3, Bloque 1. Se implementa después del OK de David.
**Archivos previstos:** `mobile/src/components/SwapRing.tsx` (vista), `mobile/src/utils/swapRing.ts` (geometría, estado y texto accesible, funciones puras y testeadas) y `mobile/src/test/swapRing.test.ts`.

## 1. Qué tiene que lograr
Un trueque circular es difícil de explicar con texto: "Tú entregas la mochila a Camilo, Camilo entrega los libros a Laura y Laura te entrega la bicicleta". El anillo lo muestra de un vistazo: **personas en un círculo, cada una pasándole un objeto a la siguiente, y el círculo se cierra cuando todas dicen que sí.** Es el elemento distintivo de la app, así que toda la apuesta visual va aquí; lo que lo rodea (tarjetas, textos) sigue sobrio.

Para quién: adultos de todas las edades, incluidos adultos mayores. Por eso:
- Nada se entiende solo por color: cada estado tiene además forma (punteado o sólido) e ícono (reloj, chulo, equis).
- Debajo del dibujo hay siempre una lista en texto plano, porque no todos leen un diagrama.
- Los avatares son botones de 48 px y los textos van en HTML (no dentro del SVG), así crecen con el tamaño de fuente del sistema.

## 2. API del componente

```ts
/** Respuesta de una persona a la propuesta. */
export type RingAcceptance = 'pending' | 'accepted' | 'rejected';

/** Lo que una persona entrega a la siguiente del anillo. */
export interface RingItem {
  name: string;
  imageUrl?: string;
  /** Para el ícono de reemplazo cuando no hay foto (ItemImage). */
  category?: string;
}

export interface RingParticipant {
  id: string;
  name: string;
  avatarUrl?: string;
  /** Objeto que esta persona entrega a la siguiente del anillo. */
  gives: RingItem;
  acceptance: RingAcceptance;
}

/**
 * De 2 a 4 personas, en el orden de entrega: participants[i] entrega a
 * participants[(i + 1) % n]. El tipo de tupla impide 0, 1 o 5 personas en compilación.
 */
export type RingParticipants =
  | readonly [RingParticipant, RingParticipant]
  | readonly [RingParticipant, RingParticipant, RingParticipant]
  | readonly [RingParticipant, RingParticipant, RingParticipant, RingParticipant];

export type SwapRingVariant = 'compact' | 'full';

export interface SwapRingProps {
  participants: RingParticipants;
  /** Quien mira: su avatar dice "Tú" y las frases van en segunda persona. */
  currentUserId?: string;
  /** compact: Home y "En curso" de Canjes. full: detalle de ruta y propuesta. Por defecto full. */
  variant?: SwapRingVariant;
  /** La lista en texto debajo del anillo. Por defecto true; solo se apaga donde la misma lista ya está al lado. */
  showList?: boolean;
  /** Al tocar un avatar. Si no se pasa, tocar un avatar resalta lo que esa persona entrega y recibe. */
  onParticipantPress?: (participantId: string) => void;
  className?: string;
}
```

Adaptador desde los datos de la API (en `utils/swapRing.ts`):

```ts
/** null si la ruta no tiene entre 2 y 4 pasos; la pantalla muestra entonces su texto de siempre. */
export function toRingParticipants(steps: readonly NormalizedRouteStep[]): RingParticipants | null;
```

Cada `NormalizedRouteStep` ya trae `user` (quien entrega), `givesItem` y `acceptance` (`PENDING`, `ACCEPTED` o `DECLINED`), ordenados por `stepOrder`. Una búsqueda (ruta de vista previa, sin propuesta) llega con todos en `PENDING`.

Estado del anillo completo (derivado, nunca se pasa como prop para que no se contradiga con las personas):

```ts
export type RingStatus =
  | { kind: 'waiting'; pending: number } // falta alguien y nadie rechazó
  | { kind: 'closed' }                    // todos aceptaron
  | { kind: 'broken'; rejectedBy: string }; // alguien rechazó (gana sobre lo demás)

export function ringStatus(participants: RingParticipants): RingStatus;
```

## 3. Geometría

Todo se calcula en un `viewBox` de **100 × 100** con centro **(50, 50)** y radio de órbita **R = 38**. El tamaño real lo da la variante:

| Variante | Tamaño | Avatar (botón) | Radio del avatar en el viewBox | Insignia del objeto | Disco central |
|---|---|---|---|---|---|
| `full` | 300 × 300 px | 48 px | 8 | 40 px | 132 px |
| `compact` | 240 × 240 px | 48 px | 10 | 36 px | 108 px |

La persona *i* va en el ángulo **θᵢ = −90° + i · 360° / n**: la primera arriba y las demás en el sentido de las agujas del reloj, que en un SVG (y hacia abajo) es el sentido de ángulo creciente. Posición: **(50 + R cos θᵢ, 50 + R sin θᵢ)**. El arco *i* va de la persona *i* a la *i + 1*, y su insignia está en el punto medio, θᵢ + 180° / n.

### n = 2
```
            (50,12) Tú
          ╭────●────╮
          │         │
 Laura ◀──┤  2      ├──▶ bicicleta (88,50)
 guitarra │personas │
 (12,50)  ╰────●────╯
            (50,88) Laura
```
| | Persona 0 | Persona 1 |
|---|---|---|
| Avatar | (50, 12) | (50, 88) |
| Insignia de su objeto | (88, 50), lado derecho | (12, 50), lado izquierdo |

Con dos personas, los dos arcos son medias lunas: la de la derecha baja (0 → 1) y la de la izquierda sube (1 → 0). Así se ve que es un intercambio en las dos direcciones y no una línea.

### n = 3
| | Persona 0 | Persona 1 | Persona 2 |
|---|---|---|---|
| Avatar | (50, 12) | (82.91, 69) | (17.09, 69) |
| Insignia | (82.91, 31) | (50, 88) | (17.09, 31) |

### n = 4
| | Persona 0 | Persona 1 | Persona 2 | Persona 3 |
|---|---|---|---|---|
| Avatar | (50, 12) | (88, 50) | (50, 88) | (12, 50) |
| Insignia | (76.87, 23.13) | (76.87, 76.87) | (23.13, 76.87) | (23.13, 23.13) |

### Arcos
- Cada arco se recorta para no meterse debajo de los avatares: empieza en θᵢ + δ y termina en θᵢ₊₁ − δ, con **δ = 2 · asin((r + 2.5) / (2R))**, donde *r* es el radio del avatar en el viewBox (δ ≈ 15.9° en `full`, 18.9° en `compact`).
- Se dibuja con el comando de arco de SVG: `M x₁ y₁ A 38 38 0 0 1 x₂ y₂` (barrido 1 = sentido horario; ningún arco pasa de 180°, así que el indicador de arco largo siempre es 0).
- La flecha va al final del arco (`marker-end`), apuntando a quien recibe. Hay un marcador por estado para que la flecha tenga el color de su arco.

### Capas
```
<figure>
  ├─ div role="img" aria-label="…narración…"   ← anillo, insignias y disco (decorativos para el lector)
  │    ├─ svg viewBox 0 0 100 100             ← halo, arcos y flechas
  │    ├─ insignias (HTML, posición absoluta en %)  ← foto del objeto o ícono de la categoría
  │    └─ disco central (HTML)                ← "3 personas" y el estado
  ├─ botones de avatar (HTML, posición absoluta en %, 48 × 48 px)
  └─ figcaption > ol                           ← la lista en texto
</figure>
```
Los avatares quedan fuera del `role="img"` porque un elemento con ese rol no puede tener hijos interactivos. Las insignias y el disco van en HTML para que su texto crezca con la fuente del sistema y para reutilizar `Avatar` e `ItemImage`.

## 4. Estados

### Por persona (y su arco, el de lo que entrega)
| Respuesta | Arco | Flecha | Marca en el avatar | Texto de la lista |
|---|---|---|---|---|
| `pending` | punteado, `outline` (gris pizarra) | gris | reloj sobre fondo neutro | "Falta que responda" |
| `accepted` | sólido, `primary` (teal) | teal | chulo blanco sobre teal | "Aceptó" |
| `rejected` | punteado roto, `error` | sin flecha | equis blanca sobre `error` | "Rechazó" |

### Del anillo completo (centro)
| Estado | Disco central | Halo | Frase del centro |
|---|---|---|---|
| `waiting` | `surface-container-lowest` con borde | no | "3 personas" · "Esperando" |
| `closed` | `primary` con texto `on-primary` | sí, anillo mango alrededor de la órbita | "3 personas" · "Cerrado" |
| `broken` | `error-container` | no | "3 personas" · "Rechazado" |

- **Colores:** solo tokens del tema (`rgb(var(--color-primary))`, `--color-outline`, `--color-error`, `--color-secondary-container`), así el anillo funciona en claro y en oscuro sin código aparte. El mango se usa solo en el halo y en el borde de las insignias, nunca como color de texto (falla AA sobre claro).
- **Insignias:** círculo con la foto del objeto (o el ícono de su categoría) y borde mango de 2 px. Son lo que la persona "pasa" por el arco.
- **"Tú":** el avatar de quien mira lleva un anillo teal de 2 px y la etiqueta "Tú" debajo; los demás muestran su primer nombre. Los nombres no se cortan: si no caben, pasan a dos líneas.

## 5. Animación
Solo se animan `transform` y `stroke-dashoffset` (no `opacity`, ni colores, ni tamaños), y todo va dentro de `motion-safe:`. Con `prefers-reduced-motion: reduce` el anillo aparece directamente en su estado final, sin movimiento.

| Momento | Qué se mueve | Cómo |
|---|---|---|
| Arco pendiente | Los puntos del trazo avanzan despacio en el sentido de la entrega | `stroke-dasharray: 3 3`, `stroke-dashoffset` de 0 a −6 en 1,6 s, lineal, infinito |
| Alguien acepta | El arco sólido se "dibuja" de quien entrega a quien recibe | `stroke-dasharray` = largo del arco, `stroke-dashoffset` de largo a 0 en 700 ms, `ease-out` |
| Todos aceptaron | El halo se traza alrededor del anillo, empezando arriba | círculo de radio 46, `stroke-dashoffset` de su perímetro a 0 en 900 ms con 300 ms de espera, y el disco central hace `scale(0.92 → 1)` |
| Tocar un avatar | Se resaltan su arco de salida y el de llegada | `scale(1.06)` en el avatar; los otros arcos no cambian de forma |

El movimiento continuo de los arcos pendientes es la única animación que no responde a una acción: dice "esto todavía está esperando" y se detiene cuando el anillo se cierra.

## 6. Accesibilidad
- `aria-label` del dibujo: narra el ciclo completo en una frase. Ejemplo con n = 3, viendo Alejandra:
  > "Anillo de 3 personas, esperando 1 respuesta. Tú entregas Mochila de senderismo a Camilo. Camilo entrega Colección de libros a Laura. Laura te entrega Bicicleta de montaña."
- Lista debajo (`<ol>`), una línea por persona, en el orden del anillo, con su estado al final: "Tú entregas la mochila a Camilo · Falta que respondas". Va en `text-body`, sin recortes.
- Cada avatar: `<button>` de 48 × 48 px con `aria-label` ("Laura Benavides, aceptó, entrega Bicicleta de montaña") y `aria-pressed` cuando está resaltado. Foco visible con el anillo `focus-visible:ring-primary`.
- Contraste: los arcos (elementos gráficos) cumplen 3:1 contra el fondo en ambos temas: `outline` #5b6678 sobre #f8fafc y #a3b1c6 sobre #0f172a.
- Fuente al 130 %: los textos (disco, nombres, lista) son HTML y crecen; el disco y los nombres tienen ancho reservado para "Rechazado" y para nombres de 10 letras. `npm run audit:ui` lo verifica en las pantallas que usan el anillo.

## 7. Dónde se usa
| Pantalla | Variante | Qué reemplaza |
|---|---|---|
| Home, "Tu ruta en curso" | `compact` | La cadena de miniaturas de la ruta |
| RouteDetail | `full` | La explicación de la ruta en texto (los pasos quedan en la lista del anillo) |
| ProposalConfirm | `full` | El resumen "Entregas / Recibes" como diagrama; el detalle de valores se queda |
| ProposalSent | `full` | La ilustración de confirmación |
| Canjes, pestaña "En curso" | `compact` | La cadena de pasos, con el estado de cada persona |
| Buscando rutas | — | No cambia: la órbita neutra se queda mientras se busca |

## 8. Pruebas previstas (`swapRing.test.ts`)
- Geometría para n = 2, 3 y 4: posiciones de avatares e insignias (tablas de la sección 3), arcos recortados que no se cruzan con los avatares y barrido horario.
- Estados: `ringStatus` da `waiting` con el número de pendientes, `closed` con todos aceptando y `broken` en cuanto alguien rechaza, aunque los demás hayan aceptado.
- Texto accesible: la narración y la lista usan "Tú" y "te entrega" para quien mira, nombran a cada persona y objeto en orden, y cierran el ciclo (la última persona le entrega a la primera).
- `toRingParticipants`: devuelve null con 0, 1 o 5 pasos y mapea `DECLINED` a `rejected`.

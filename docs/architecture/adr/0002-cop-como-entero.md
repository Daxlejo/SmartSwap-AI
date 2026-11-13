# ADR-0002: Dinero en pesos colombianos (COP) como entero

**Estado:** aceptada, con deuda abierta · **Fecha:** noviembre de 2026

## Contexto
SmartSwap solo opera en Colombia. El peso no usa centavos en la práctica, y la valoración de un objeto es una estimación (la hace OpenAI con `POST /ai/estimate-value`) que sirve para comparar paridad entre objetos, no para cobrar.

## Decisión
Todo valor monetario es **COP en pesos enteros**. En la app se formatea solo con `formatCop` (`mobile/src/utils/currency.ts`, `es-CO`, `maximumFractionDigits: 0`, `Math.round`). No se muestra USD en ninguna parte. El seed declara los valores como enteros (`estimatedValue: 900_000`) y un test lo verifica (*"a whole-peso price"* en `api/src/seed/seed-data.spec.ts`).

## Consecuencias
- **A favor:** no hay errores de redondeo visibles, la paridad del motor de ciclos se calcula sobre magnitudes simples y el texto es claro para adultos mayores ("$ 900.000").
- **Deuda honesta:** la columna `items.estimatedValue` es `Float` en `schema.prisma`, y el DTO de Zod (`create-item.dto.ts`) exige `.positive()` pero no `.int()`. Hoy el entero es una **convención** que se respeta en el seed, en la IA y en la UI, pero la API no la impone. Cerrarla requiere `z.number().int()` y una migración a `Int`. No entra en esta entrega para no tocar código en la Fase 6.

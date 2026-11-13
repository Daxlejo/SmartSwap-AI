# ADR-0003: Ciclos de trueque de máximo 4 personas

**Estado:** aceptada · **Fecha:** noviembre de 2026

## Contexto
Un trueque circular solo se cierra si **todas** las personas aceptan (consenso unánime, ver [06-secuencia-consenso](../06-secuencia-consenso.md)) y luego entregan su objeto. Cada persona extra agrega un punto de falla, más coordinación física entre municipios y más tiempo de búsqueda.

## Decisión
El motor busca ciclos simples de **2 a 4 personas**: `MIN_CYCLE_STEPS = 2` y `MAX_CYCLE_STEPS = 4` en `api/src/modules/routes/engine/swap-graph.engine.ts`. El `maxSteps` que pide la app se recorta a ese rango. El puntaje premia los ciclos cortos con la compacidad: 1,0 para k = 2, 0,65 para k = 3 y 0,30 para k = 4.

## Consecuencias
- **A favor:** el DFS tiene profundidad 4, así que el costo está acotado (O(d³) caminos por objeto ofrecido) y responde en milisegundos sin índices de grafo. La propuesta vence a las 48 h, un plazo razonable para coordinar a 4 personas. En la UI, el anillo (`SwapRing`, Fase 3) se puede leer con 4 avatares en una pantalla de 360 px.
- **En contra:** se pierden ciclos de 5 o más personas que existirían en un catálogo grande. Se aceptó porque la probabilidad de que 5 personas acepten y entreguen es baja, y porque el catálogo se filtra por municipio o departamento.
- **Revisar si:** el catálogo crece tanto que la mayoría de las búsquedas devuelven 0 ciclos con k ≤ 4.

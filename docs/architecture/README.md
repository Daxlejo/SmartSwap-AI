# Arquitectura de SmartSwap AI (modelo 4+1)

Las vistas siguen el orden de la clase. Todos los diagramas están en Mermaid, se validan con `mmdc` y tienen pocas cajas para que se puedan dibujar a mano en el tablero.

| # | Vista | Pregunta que responde |
|---|---|---|
| 1 | [Contexto](01-contexto.md) | ¿Qué es SmartSwap y con qué sistemas externos habla? |
| 2 | [Funcional (casos de uso)](02-funcional.md) | ¿Qué hace la persona usuaria? Cubre los 3 flujos de la demo (el "+1") |
| 3 | [Lógica](03-logica.md) | ¿Qué módulos y clases de Nest implementan el negocio? |
| 4 | [Desarrollo](04-desarrollo.md) | ¿Cómo se organiza el código del monorepo? |
| 5 | [Despliegue](05-despliegue.md) | ¿Dónde corre cada pieza? (APK, Render, Supabase, OpenAI) |

## Profundizaciones
- [Secuencia del consenso de una propuesta](06-secuencia-consenso.md)
- [Algoritmo de ciclos de 2 a 4 personas](07-algoritmo-ciclos.md), con pseudocódigo y un ejemplo del seed
- [Modelo de datos (ER desde `schema.prisma`)](08-modelo-datos.md)

## Decisiones (ADR)
- [ADR-0001 Capacitor frente a React Native](adr/0001-capacitor-frente-a-react-native.md)
- [ADR-0002 Dinero en COP como entero](adr/0002-cop-como-entero.md)
- [ADR-0003 Ciclos de máximo 4 personas](adr/0003-ciclos-de-maximo-4.md)

## Validar los diagramas
```bash
npx -y @mermaid-js/mermaid-cli -i docs/architecture/01-contexto.md -o /tmp/01.md
```
En Windows sin Chrome de Puppeteer, se puede pasar `-p pptr.json` con `{"executablePath":"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe","headless":"shell"}`.

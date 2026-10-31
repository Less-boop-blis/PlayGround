# 🐸 Sapo Bros · Aventura Anfibia

Un juego de plataformas 2D con un hombre sapo como protagonista y obstáculos al estilo Mario Bros. Corre, salta, aplasta bichos, rompe bloques, recoge monedas y llega a la bandera del pantano.

Todo el arte, la música y los efectos de sonido se generan de forma procedural: no hay imágenes ni audio externos. Es una web app estática (HTML + Canvas 2D + módulos ES), sin build step.

## 🎮 Cómo jugar

| Acción | Teclado | Táctil |
| --- | --- | --- |
| Moverte | `←` `→` o `A` `D` | Botones ◀ ▶ |
| Saltar (altura variable) | `Espacio`, `Z` o `↑` | Botón **A** |
| Correr | `Shift` | Botón **B** |
| Pausa | `P` o `Esc` | Icono ⏸ |
| Silenciar | `M` | Icono ♪ |

- Mantén el salto pulsado para llegar más alto y suéltalo antes para un salto corto.
- Salta sobre los enemigos para aplastarlos. Los erizos y pinchos no se pueden pisar.
- Golpea los bloques **?** desde abajo para conseguir monedas o el escudo.
- El escudo absorbe un golpe y te protege de un enemigo o de caer a una zona peligrosa.
- Hay dos checkpoints: si pierdes una vida, reapareces en el último alcanzado conservando el tiempo.
- Tienes 3 vidas y 300 segundos. Al llegar a la bandera, el tiempo restante se convierte en puntos extra.
- Tu récord se guarda en `localStorage`.

## 🚀 Ejecutar en local

El proyecto usa módulos ES, así que necesita servirse por HTTP (abrir `index.html` directamente no funciona en la mayoría de navegadores).

```bash
# Opción 1: Python
python3 -m http.server 8080

# Opción 2: Node
npx serve .
```

Después abre <http://localhost:8080>. En el entorno de OMGithub, el proyecto se detecta como HTML estático y se sirve automáticamente con `start.sh`.

## 🕹️ Móvil

La interfaz es responsive. En vertical el juego queda arriba y los controles táctiles fijos abajo; en horizontal los botones se superponen en las esquinas inferiores. Incluye botón de pantalla completa y respeta las áreas seguras de los dispositivos con notch.

## 🧱 Estructura

```
index.html      Estructura de la UI, HUD y overlays
css/style.css   Estilos, layouts responsive y controles táctiles
js/main.js      Arranque, input de teclado/táctil y pantallas
js/game.js      Física, colisiones, enemigos, cámara y renderizado
js/level.js     Diseño del nivel, tiles y entidades
js/art.js       Sprites y tiles dibujados de forma procedural
js/audio.js     Música chiptune y efectos con WebAudio
```

<!-- omgithub:readme:start -->
## 🚀 Build, play, and remix with OMGithub

**Created using [OMGithub.com](https://omgithub.com).**

[![OMGithub](https://img.shields.io/badge/OMGithub-Open%20project-orange?style=for-the-badge)](https://omgithub.com/Less-boop-blis/PlayGround)
[![GitHub](https://img.shields.io/badge/GitHub-Source-181717?logo=github&style=for-the-badge)](https://github.com/Less-boop-blis/PlayGround)

- 🎮 [Open the project](https://omgithub.com/Less-boop-blis/PlayGround).
- ✨ [Remix this project](https://omgithub.com/?remix=Less-boop-blis%2FPlayGround).
- 💻 [Explore the source](https://github.com/Less-boop-blis/PlayGround).
- 🛠️ [Check build runs](https://github.com/Less-boop-blis/PlayGround/actions).
- 🐛 [Report an issue](https://github.com/Less-boop-blis/PlayGround/issues).
- 👤 [Explore the creator's projects](https://omgithub.com/Less-boop-blis).
- 🌍 [Create with OMGithub](https://omgithub.com).
<!-- omgithub:readme:end -->

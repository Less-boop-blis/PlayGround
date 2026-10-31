# PlayGround

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

## 🐸 Sapo Salvaje

Plataformas 2D en HTML5 Canvas protagonizado por un hombre sapo. Cruza tres pantanos, pisa bichos, atrapa luciérnagas con la lengua y llega a la flor de loto.

Todo el juego es autocontenido: arte procedural, música y efectos sintetizados con WebAudio, sin imágenes ni dependencias externas.

### ▶️ Cómo jugar

```bash
npm start
```

Abre <http://localhost:3002>. También puedes servir la carpeta con cualquier servidor estático.

### 🎮 Controles

| Acción | Teclado | Móvil |
| --- | --- | --- |
| Moverse | `←` `→` / `A` `D` | Botones laterales |
| Saltar | `Espacio` / `↑` / `W` / `Z` | Botón de salto |
| Doble salto | Salta otra vez en el aire | Toca salto otra vez |
| Lengua | `X` / `J` / `Shift` | Botón LENGUA |
| Pausa | `P` / `Esc` | Botón de pausa |

En el móvil gira el dispositivo a horizontal. La pantalla de aviso y la pausa automática evitan que pierdas una vida al rotar.

### ✨ Mecánicas

- Tres niveles con temas, enemigos y plataformas móviles propias.
- Salto variable, coyote time, buffer de salto y doble salto.
- Lengua que derrota enemigos y atrae monedas.
- Pisotón, checkpoints, corazones, vidas y cronómetro.
- 50 luciérnagas = vida extra.
- Récord y desbloqueo de niveles guardados en `localStorage`.
- Controles táctiles con áreas seguras para Android e iOS.

### 🗂️ Estructura

- `index.html` — lienzo, HUD, controles táctiles y aviso de rotación.
- `css/style.css` — interfaz responsive, tarjetas y controles.
- `js/audio.js` — música y efectos sintetizados.
- `js/levels.js` — constructor de niveles y los tres pantanos.
- `js/core.js` — física, jugador, enemigos y plataformas.
- `js/render-world.js` / `js/render-actors.js` — dibujo del mundo y actores.
- `js/game.js` — bucle, estados, colisiones e interfaz.

### 🛠️ Depuración

Con `?debug=1` se expone `window.__sapo` para saltar de nivel y probar estados. Con `?touch=1` se fuerzan los controles táctiles.

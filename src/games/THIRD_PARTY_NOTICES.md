# Atribuciones de los juegos integrados

Estos juegos se han portado a componentes React aislados para PideTiétar Play.
Se conserva la referencia a los proyectos originales y sus licencias:

- **Breakout**: [akshatjain02/Breakout](https://github.com/akshatjain02/Breakout), licencia MIT.
- **Tres en raya**: [janpabisiak/tic-tac-toe](https://github.com/janpabisiak/tic-tac-toe), licencia MIT.
- **Times Tables Sprint**: [learnwithgames/times-tables-sprint](https://github.com/learnwithgames/times-tables-sprint), licencia MIT.
- **Flappy Bird**: [pyforgedev/flappy-bird](https://github.com/pyforgedev/flappy-bird), licencia MIT.
- **Asteroids**: [wpwoodjr/asteroids](https://github.com/wpwoodjr/asteroids), licencia MIT.
- **Space Invaders**: [AWManeea/space-invaders](https://github.com/AWManeea/space-invaders), licencia MIT.
- **Classic Puzzle**: [krishealty/puzzle](https://github.com/krishealty/puzzle), licencia MIT.
- **Memory**: [99fk/memory-html](https://github.com/99fk/memory-html), licencia GPL-3.0.

Los doce dibujos de **Classic Puzzle** (`public/assets/games/classic-puzzle/levels/`)
se descargaron de [rawpixel](https://www.rawpixel.com/) a través del buscador de
[Openverse](https://openverse.org/) y son de dominio público (licencia CC0): no
exigen atribución, pero se deja constancia de su origen. Cada imagen se recortó a
1000 × 1000 y, en los dibujos con fondo blanco, se recortó el fondo y se montó
sobre un degradado suave para que las fichas se distingan bien. La portada
`public/assets/games/classic-puzzle/icon.jpg` se compone con el nivel 10 usando
`sharp`.

La integración usa componentes React y estilos propios de PideTiétar; no carga las
hojas de estilo, librerías externas ni recursos remotos de los proyectos originales.

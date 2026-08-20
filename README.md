# Gravity Switch

Puzzle plošinovka: jediná akce, čtyři směry gravitace. Dostan kuličku ze startu do cíle — červená zóna je propast. Méně přepnutí = lepší skóre.

Repo: [ondrejmuzikar/gravity-game](https://github.com/ondrejmuzikar/gravity-game)

## Ovládání

- **Mezerník**, **Enter**, gamepad A, nebo tlačítko **Přepnout gravitaci**
- Cyklus: dolů → nahoru → doleva → doprava
- Tři levely rostoucí obtížnosti, restart a počítadlo přepnutí

## Levely

1. **Probuzení** (par 4) — strop, levá stěna, pravá police
2. **Komora** (par 4) — timing dolů na střední plošinu před propastí
3. **Šachta** (par 8) — okno ve stěně a alcova

## Vývoj

```bash
git clone https://github.com/ondrejmuzikar/gravity-game.git
cd gravity-game
npm install
npm run dev
```

Dev server běží na `http://localhost:8080`.

Produkční build:

```bash
npm run build
npm run preview
```

Čistý React + Canvas, bez herního enginu.

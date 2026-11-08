# NeoBestiary Arène (Arena)

The creatures you invented in **NeoBestiary Studio** fight turn by turn. Pick your creature and an opponent (the computer or a friend on the same PC), and lead the fight move by move until one is knocked out.

*Version française : [README.md](README.md)*

## Setting up a fight

1. Pick the mode: **against the computer** or a **two-player duel** on the same computer.
2. Pick your creature and the opponent among all the Studio creatures that have a battle sheet, and each of their colour variants. The sheet shows its portrait, rarity, type or types, stats, weaknesses and resistances with their multipliers, and its moves. **Random** picks a creature for you.
3. Choose the battle music if you want some, then start.

## During the fight

- Both creatures walk into the arena. Each turn, each one picks an action; **the faster one acts first**.
- **Attack**: each creature has 2 to 4 moves depending on its rarity (keys **1** to **4**). Contact moves rush at the opponent, ranged moves cross the arena, area moves burst around the creature.
- **Guard**: the next hit taken does half damage.
- **Heal**: restores HP, and some heals also cure statuses. **Boost**: raises one or two stats.
- **Escape** goes back to the menu.

## What each move does

Each move follows its Studio technique (204 techniques in all):

- **Status** inflicted with a given chance.
- **Stat stages**: attack, defence, speed and accuracy, from -3 to +3, shown under the HP bar.
- **Accuracy**: a move can miss.
- **Multi-hit moves**.
- **Priority**: for example the flurry, which goes before everything else.
- **Life steal**.
- **Recoil**: it can knock out the user.
- **Critical hits**, more frequent for claws.

## Types

- One creature in two has **two types**; its moves of both elements benefit from its type.
- Damage follows a type chart: from **×4** ("It's super effective!") to **×¼**.
- An **immunity** cancels the move and its status ("It doesn't affect…").
- One hit in 16 is critical.

## The nine statuses

- **Burn**: loses HP every turn and hits less hard.
- **Poison**: loses HP every turn.
- **Bleeding**: loses HP and its defence drops.
- **Freeze**: cannot act until the ice melts.
- **Sleep**: sleeps 1 to 3 turns.
- **Paralysis**: half as fast, and sometimes unable to act.
- **Confusion**: sometimes hits itself.
- **Dazzle**: misses more often.
- **Fear**: loses its action if it has not acted yet.

## NeoMe, No. 0

NeoMe is always at the top of the list, with rarity **???** and the double shadow and light type. It is the only creature with **signature moves**, played full size:

- **Eclipse**: the arena darkens, then Eclipse flares up around it and sweeps the arena.
- **Dawn Gaze**: two beams to the opponent.
- **Headphone Melody**: a wave of notes.
- **Origin Shell**: a dome of shards that heals it.

A creature that received a **custom move** made in the Studio plays it with its own staging: the throw, the path and the impact.

## Record

The Arena counts the wins and losses of every creature and every variant.

## Requirements

- **NeoBestiary Studio** 1.1.0 or later (installed with the Arena). Creatures are read from `Documents\NeoBestiary Studio\creatures` and never modified.
- A creature shows up as soon as it has its battle sheet. For a creature made with an older Studio version, open it in the Studio and click **Rewrite the sheet**: it gets its 2 to 4 moves and its rarity from its prestige.
- No graphics card or Ollama needed: the animations are already made by the Studio.

## Permissions

The Arena has a system part (full access) to read the Studio's creature folder in your Documents. It only writes its record, in its own data, backed up and synced by NeoDex.

## Install

In NeoDex: **NeoStore → Discover → NeoBestiary Arène → Install**.

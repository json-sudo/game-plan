# Game Plan PRD (v2 rebuild)

Status: updated 2026-10-12 with design-system settled decisions from `3-notes.md`. Canonical history lives in `gp-prd-final/PRD.md`; this file is the in-repo authority for the rebuild.

## Open items for Firstmate

Build nothing that depends on these until the captain confirms.

| ID | Item | Notes |
|---|---|---|
| O-14 | New dependencies | `@vitest/coverage-v8` and `fflate` were not named in round 5. Working default: add both. |
| O-17 | Wide midfield roles | Four Wide Midfielder roles have no slot in the twelve formations. Working default: stay hidden until a formation with wide midfield is added. |
| F30 | Redo | Should priority; may be cut. If cut, hide the button (`redo={false}`) and nothing else moves. |

## 3. Non-goals for v1

| Item | Status | Source |
|---|---|---|
| Half-spaces and a five-lane grid | **In v1** (was Later) | Design settled 22 |
| Backend, accounts, cross-device sync | Parked | R4-BE, OI-Q6 |
| Team instructions | Later | R2-Q6 |
| Offline mode | Later | R4-Q10 |
| FM27 roles | Later | CI |
| Ball-side and far-side movement split | v2 | SB-6 |
| Kit colours | Later | R3-Q12 |

## 4. Modes

One pitch, one pitch component, two modes.

### 4.1 Open pitch

- Default for later visits (O-4). Free drag of players and the ball. No roles (R3-Q1).
- Bench visible. Squad sizes 11, 20 and 26, and the keeper toggle.
- Formations from the FM26 list; same list FM mode uses (O-6).
- Matchup apply: attack against defence with separation (OI-Q1, O-15).
- Mode toggle labels: **Open pitch**, **FM mode**.

### 4.2 FM mode

- Same pitch, separate mode (R3-Q1).
- Starting XI only. No bench (R3-Q9).
- Formations from the FM26 list (twelve formations).
- Each player has a role. Guided setup, zone map, transport bar and playback.

**Switching modes.** Entering FM mode keeps current positions; each player without a role gets the FM26 default. Leaving FM mode hides roles but keeps them.

**Mode on a shared link.** A link with roles opens in FM mode. A link without roles opens in Open pitch.

## 5. User flows (selected updates)

### 5.4 Scenario selection

- **Zone map.** Five lanes by three thirds: **15 zones**. Lane names: Left flank, Left half-space, Centre, Right half-space, Right flank. Third names: Defensive third, Middle third, Final third.
- **Untuned zone.** If the table has no entry, the zone shape shows with **"Finish setting up your tactic"**. No arrows are drawn.
- **Open pitch zone map.** Picking a zone or dragging the ball moves the team into the zone shape only; Runs, Final and the transport bar stay in FM mode.

### 5.5 Playback

- **Phases.** Shape is the **zone shape**: my team in a starting position for the chosen zone (lines up or back by third, the block slid towards the ball's lane), carrier on the ball; the opponent holds its formation slots apart from overlap nudges. Runs and Final apply role movement; F13's per-zone defender line shift happens in Runs and Final, not in Shape.
- **Reduced motion.** Every piece move uses a **200 ms ease-out** (`prefers-reduced-motion`). Pieces still travel; they never jump.
- **Motion law.** No piece position changes without a transition, including undo, reset, clear, benching, loading and switching who attacks. Only the piece being dragged follows the pointer directly.

### 5.6 Adjust, save and share

- User-facing copy: the playing surface is the **pitch**, never "board". Saved and shared setups are **tactics**. Never "tune" in the interface.
- **Share** button label: **Share tactic**.
- **Old links.** "This link is from the old Game Plan." / "Old links cannot be opened in this version. Ask for a new link."

## 6. Feature list (updated rows)

| ID | Feature | Priority | Acceptance criteria |
|---|---|---|---|
| F01 | One pitch. Open pitch default for later visits. FM mode toggle | Must | Later visits open Open pitch. First visit opens FM example |
| F15 | Five-lane by three-third zone map (15 zones), attacking team's view | Must | Tapping a zone places the ball. Zone name shown |
| F20 | Untuned zone: zone shape with "Finish setting up your tactic" | Must | Label visible. No arrows |
| F28 | Reduced motion | Must | Every move completes in 200 ms or less |
| F52 | Half-spaces and five lanes | **Must** | Five lanes in zone map from v1 |

## 7. Mobile scope

| Area | Phone behaviour |
|---|---|
| Role picker | **Not shown.** Tapping a token selects it and shows its role |
| First-run step 3 | "Step through with Next, or tap a player to see its role." |
| Dribble direction | Hidden |
| Copy tactic JSON | Hidden |

## Settled design decisions

| ID | Item | Decision |
|---|---|---|
| O-16 | Pair labels | Confirmed. D(C), M(C), ST and AM(C) pairs share one label; wide AM slots take AM(L)/AM(R) from x position. |

## Copy rules (settled)

- Pitch, never board, in all user-facing text.
- Tactics are what people save, load and share.
- Never "tune"; untuned zones say "Finish setting up your tactic".
- Open pitch replaces Sandbox throughout.
- Custom name: 12 characters on the token, full 24 in bench, tooltip and accessible name.
- PNG always exports in the light theme.

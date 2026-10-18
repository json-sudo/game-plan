# Game Plan PRD (v2 rebuild)

Status: updated 2026-10-18 after the direction, positioning, and persistence interviews. This repository copy is the only maintained PRD; the duplicate vault PRD was removed. A fresh replacement spec set is staged separately under `vault/game-plan/specs/v2/`; the legacy specs remain untouched and non-authoritative for v2.

## Open items for Firstmate

Build nothing that depends on these until the captain confirms.

| ID   | Item                | Notes                                                                                                                                         |
| ---- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| O-14 | New dependencies    | `@vitest/coverage-v8` and `fflate` were not named in round 5. Working default: add both.                                                      |
| O-17 | Wide midfield roles | Four Wide Midfielder roles have no slot in the twelve formations. Working default: stay hidden until a formation with wide midfield is added. |
| O-18 | FM positioning     | Carrier eligibility is settled in §5.4. Approve exact role×zone destination/transition tables and the new Overlapping Centre-Back movement behavior before implementing FM position logic. |
| F30  | Redo                | Should priority; may be cut. If cut, hide the button (`redo={false}`) and nothing else moves.                                                 |

## 3. Non-goals for v1

| Item                                  | Status                | Source            |
| ------------------------------------- | --------------------- | ----------------- |
| Half-spaces and a five-lane grid      | **In v1** (was Later) | Design settled 22 |
| Backend, accounts, cross-device sync  | Parked                | R4-BE, OI-Q6      |
| Team instructions                     | Later                 | R2-Q6             |
| Offline mode                          | Later                 | R4-Q10            |
| FM27 roles                            | Later                 | CI                |
| Ball-side and far-side movement split | v2                    | SB-6              |
| Kit colours                           | Later                 | R3-Q12            |

## 4. Modes

One pitch, one pitch component, two modes.

### 4.1 Open pitch

- Default for later visits (O-4). The pitch starts with no players placed and an 11-player squad selected; all 11 are available on the bench. Free drag of players and the ball. No roles (R3-Q1).
- Bench visible. Squad sizes 11, 20 and 26, and the keeper toggle. Changing squad size adds/removes bench players without placing players on the pitch.
- Formations from the FM26 list; same list FM mode uses (O-6). In the matchup component, show two formation choices per side initially and a **More** dropdown for the remaining choices.
- Matchup apply is an optional shortcut to place attack against defence with separation (OI-Q1, O-15). Players can be moved freely after applying it.
- Open pitch has no zone map or role-driven placement. The ball moves independently; dragging it does not select a carrier, change a zone, or move players.
- Clear returns every placed player to the bench and leaves the independently placed ball where it is.
- Reset remains unchanged. In the active mode, restore each team with an applied setup to its selected formation, or restore the matchup when both teams have one applied; return teams without an applied setup to the bench, reset the ball to its default centre, clear the FM scenario, and make the operation undoable. Reset stays disabled until a formation or matchup has been applied.
- Mode toggle labels: **Open pitch**, **FM mode**.

### 4.2 FM mode

- Same pitch, separate mode (R3-Q1).
- Starting XI only. No bench (R3-Q9).
- Formations from the FM26 list (twelve formations).
- Each player has a role. Guided setup, zone map, transport bar and playback.
- The zone map is FM-mode only. Choosing a zone lets the user choose an on-ball player from the explicit role-to-zone matrix in §5.4; do not silently assign the nearest attacker.
- Clear is disabled in FM mode because its player-clearing behavior duplicates Reset there. Reset behavior remains as currently specified.

**Switching modes.** Open pitch and FM mode have distinct position layouts. Entering or leaving a mode does not implicitly copy or reshape positions. Copying FM base positions into Open pitch is an explicit one-way action; reverse copy is not supported. Before copying, show: **“This will replace any pieces currently placed on the Open pitch.”** On confirmation, remove the current Open pitch player layout and place the FM starting XI at its base positions. The independent Open pitch ball stays where it is; any additional squad members remain on the bench. Each FM player without a role gets the FM26 default.

**Mode on a shared link.** A new-format link contains both independent layouts and the mode active when the link was created. Opening it restores that mode and preserves both layouts. Legacy v3 links are unsupported; do not migrate or import them.

## 5. User flows (selected updates)

### 5.4 FM scenario selection

- **Zone map.** Five lanes by three thirds: **15 zones**. Lane names: Left flank, Left half-space, Centre, Right half-space, Right flank. Third names: Defensive third, Middle third, Final third. Lane edges follow real pitch markings: half-spaces sit between the penalty-box edge and the six-yard-box edge (about 15.5 to 27.8 each side); centre spans 27.8 to 48.4.
- **Untuned zone.** If the table has no entry, the zone shape shows with **"Finish setting up your tactic"**. No arrows are drawn.
- Open pitch has no zone selection. Its ball and player positions are freely independent.
- **Carrier choice.** In FM mode, the user chooses the on-ball player from the attacking team's In Possession roles eligible for the selected zone. Changing the zone does not use nearest-player guessing. Player current/base coordinates do not filter the choices. Left/right mirrors swap side-specific player roles and retain central roles. Explicit formation and position-slot gates are included below.

| Ball zone | Eligible carrier roles |
|---|---|
| Defensive · left flank | Full Back; Inside Wing-Back; Wing Back; Inside Full-Back; Overlapping Centre-Back only for the left outermost centre-back in a formation with at least three centre-back positions |
| Defensive · left half-space | Full Back; Inside Full-Back; Half Back; Centre-Back, Advanced Centre-Back, Ball-Playing Centre-Back, and No-Nonsense Centre-Back for the left centre-back; Overlapping Centre-Back only when its formation/slot gate is met |
| Defensive · centre | Half Back; Centre-Back, Advanced Centre-Back, Ball-Playing Centre-Back, and No-Nonsense Centre-Back; Overlapping Centre-Back only when its formation/slot gate is met. Eligibility does not depend on an Inside Full-Back being present. |
| Defensive · right half-space | Mirror of defensive left half-space |
| Defensive · right flank | Mirror of defensive left flank |
| Middle · left flank | Full Back; Wing Back; Wide Central Midfielder; Wide Midfielder; Winger; Inside Forward; Playmaking Winger; Wide Forward; Inside Winger, for the left side |
| Middle · left half-space | Same as middle left flank except Winger and Wide Forward; Channel Midfielder in M(C)/AM(C); Inside Forward; Inside Winger; Playmaking Winger |
| Middle · centre | Central M(C)/AM(C) In Possession roles: Central Midfielder; Midfield Playmaker; Attacking Midfielder; Advanced Playmaker; Free Role; plus False Nine. Exclude Wide Central Midfielder, Channel Midfielder, Second Striker, and DM roles. |
| Middle · right half-space | Mirror of middle left half-space |
| Middle · right flank | Mirror of middle left flank |
| Final · left flank | Winger; Inside Forward; Wide Forward; Inside Winger; Wing Back; Advanced Wing-Back only when assigned to a WB position. Exclude Playmaking Winger. |
| Final · left half-space | Mirror of final right half-space; also include Inside Forward, Inside Winger, and Playmaking Winger |
| Final · centre | All In Possession Striker roles; Second Striker when assigned to AM(C) |
| Final · right half-space | Channel Midfielder in M(C)/AM(C); all In Possession Striker roles; Second Striker; Attacking Midfielder; Advanced Playmaker; Inside Forward; Inside Winger; Playmaking Winger |
| Final · right flank | Mirror of final left flank |

- **Formation and slot gates.** Overlapping Centre-Back is available only in formations with at least three centre-back positions and only to an outermost centre-back. Box-To-Box Midfielder and Box-To-Box Playmaker in DM positions are available only in formations with at least two DM positions. Advanced Wing-Back is eligible at final flank only from a Wing-Back position, not a Full-Back position. The Inside Full-Back condition changes centre-back positioning only; it does not restrict carrier eligibility.

### 5.5 Playback

- **Phases.** Shape, Runs and Final remain FM-mode playback phases. The current engine is a foundation only, not a positioning source of truth. The carrier eligibility matrix and global movement model are recorded below. Exact role×zone preferred regions/transition offsets and the remaining Overlapping Centre-Back/Wide Centre-Back decisions remain follow-up gates.
- **Positioning model (interview decisions).** The selected formation slot is each player's base. Role movement applies after an FM scenario is selected, and both teams respond to the selected ball zone, mirrored by each team's attacking direction and role. Use the existing five lanes and three thirds as preferred-region anchors; define narrower pockets only when needed. As the ball advances between thirds, the whole formation shape advances while maintaining its relative spacing and role offsets. When the ball changes lanes but stays in the same third, both teams shift modestly toward the ball-side lane, with role-specific movements layered on top. Each role's behavior stays the same, but its preferred location changes with the selected ball third; for example, a False Nine drops to different pitch locations in the defensive, middle, and final thirds. On a scenario change, move incrementally from current positions toward the new preferred region. Preserve role priority and formation spacing, allowing modest overlap only when roles intentionally share a line. When the ball is in a team's own half, its striker should generally not be in the opposing penalty area; this is a strong preference, not a hard limit, and role movement may cross halfway when appropriate.
- **Formation-gated roles.** Overlapping Centre-Back is offered only when the formation has at least three centre-back slots and only to an outermost centre-back. Box-To-Box Midfielder and Box-To-Box Playmaker in DM slots are offered only when the formation has at least two DM slots. The Inside Full-Back centre-back positioning interaction applies only to the near-side centre-back when one full-back is Inside Full-Back and the other is not; it does not affect carrier eligibility.
- **Overlapping Centre-Back (partial interview decisions).** This is a new v1 In Possession role, available only to an outermost centre-back in a formation with at least three centre-back slots. With the ball in the defensive third, it starts in the same-side half-space and begins moving toward the flank, while remaining in the defensive third. With the ball in the middle third, it starts in the same-side flank and advances to the attacking edge of the middle third (the boundary with the final third). In the final third, its intended behavior depends on the width interaction below. The captain says it does not have a distinct out-of-possession role; the player uses its separately assigned centre-back defensive role, defaulting to Centre-Back. Confirm that “defensive state” means out of possession before implementing. Far-side behavior is unresolved.
- **Centre-back width interaction (unresolved).** The captain says that when a Winger or Wing Back is present, that player takes the widest position preference and the Overlapping Centre-Back underlaps instead of overlapping. When neither is present, the Overlapping Centre-Back overlaps into the final third. The captain also gave the least-to-most-wide ordering “Winger, Wing Back, Overlapping Centre-Back, Advanced Wing-Back”; this appears to conflict with the underlap rule. Same-side scope and the exact interpretation of this ordering must be confirmed before implementation.
- **Wide Centre-Back (partial interview decisions).** This is intended as a new v1 In Possession role. It follows the Overlapping Centre-Back rules except that it never overlaps; it holds the centre-back line and stays in the wide half-space or flank when the ball is near its side. Its full targets by ball third, far-side behavior, and carrier-picker eligibility remain unresolved. Do not infer them.
- **Goalkeepers.** Out of possession, keepers stay around the goal line/goal area and within the six-yard box, with modest lateral shifts toward the ball and little depth movement. In possession, Standard and No-Nonsense Goalkeepers remain deep; Ball-Playing Goalkeeper may offer a short outlet just beyond the six-yard box.
- **Centre-backs.** Out of possession, standard Centre-Back holds the line, Stopping Centre-Back steps toward the ball, and Covering Centre-Back drops behind. In possession, only Advanced Centre-Back steps into midfield; Ball-Playing Centre-Back remains more restrained off the ball, with slightly more freedom than standard roles.
- **Centre-back spacing.** The pair generally keeps formation spacing and shifts together. With one Inside Full-Back and the opposite full-back not also set to Inside Full-Back, only the adjacent centre-back receives the special Inside Full-Back adjustment and takes the middle lane. The far-side centre-back follows its own role and the general pair-spacing rule; do not apply the special adjustment to it. This mirrors when the Inside Full-Back is on the right.
- **Full-backs (interview decisions).** In possession, an Inside Full-Back stays on the defensive line. With one Inside Full-Back and one other full-back role, that full-back plus the two centre-backs make the three-player base; the other full-back does not join that line. The centre-back shift mirrors when the Inside Full-Back is on the right, provided the other side is not also an Inside Full-Back. With both full-backs set to Inside Full-Back, use a flat back four. A standard Full-Back advances to the midfield line but not the final third.
- **Wing-backs (interview decisions).** Standard and Advanced Wing-Backs stay wide. Standard Wing-Back may also reach the final third depending on the selected ball third; Advanced Wing-Back reaches the final third. Inside Wing-Back moves centrally beside the DM, with the pair of centre-backs spaced around the centre zone. Playmaking Wing-Back tucks into the adjacent half-space.
- **Out-of-possession full-backs (interview decisions).** Standard Full-Back holds the defensive line, Pressing Full-Back may leave it to engage, and Holding Full-Back drops deeper. The earlier “No-Nonsense Full-Back” mention was the captain's mistake; do not add that role.
- **Centre-back and full-back interaction.** Centre-backs generally shift as a pair when full-backs do not create the one-sided Inside Full-Back back-three shape. Advanced Centre-Back's midfield step remains its role-specific exception.
- **Defensive midfield (interview decisions).** In possession, Half-Back drops centrally between the centre-backs to form a back three. Defensive Midfielder and Deep-Lying Playmaker stay in the central DM region; the Deep-Lying Playmaker may shift toward the ball side but does not advance a line. A Box-to-Box Midfielder starting in a DM slot advances approximately to the AM(C) position, behind the striker line. Out of possession, Screening DM stays central ahead of the centre-backs; Dropping DM joins the centre-back line only in the final third; Wide-Covering DM shifts toward the ball-side channel.
- **Central midfield (interview decisions).** In possession, Central Midfielder supports as needed, including moving forward or dropping back. Midfield Playmaker behaves similarly but does not venture too far forward. Out of possession, Pressing Central Midfielder may break the midfield line to press the ball carrier while other midfielders cover the vacated space. Preserve formation spacing unless a role explicitly rotates into another line.
- **Attacking midfield and wide roles (interview decisions).** In possession, Attacking Midfielder seeks central space around the AM line; Advanced Playmaker seeks similar space with more ball-side bias. Out of possession, Attacking Midfielder begins by pressing the centre-back, then retreats toward midfield as the opponent progresses; it must not overlap an existing midfielder in the formation. Tracking attacking-midfield roles also retreat as play progresses, while outlet roles stay high. For wide roles in possession, Winger stays high and wide; Wide Forward starts wide and attacks the box or far post. Out of possession, Tracking wide roles begin pressing high and track back toward the full-back as play progresses; outlet roles stay high and standard wide roles hold the wide midfield line. Attackers mostly preserve their lanes and formation spacing; only role-specific movement changes lines.
- **Strikers (interview decisions).** In possession, Channel Forward can move into channels; Poacher stays central and high. False Nine can drop into midfield when the ball is deep. Deep-Lying Forward drops only as the ball approaches, down toward the AM line if needed, leaving space for runners. Centre Forward combines Channel Forward, Deep-Lying Forward and Poacher behavior as the situation calls for. Out of possession, Tracking Forward starts by pressing the centre-backs and redirects pressure as the opponent progresses. Centre Forward presses centrally then toward the ball side, but does not track back much. There is one Tracking Forward role. Keep striker spacing central unless role-specific channel movement applies; with two strikers, the near-side striker may move toward the ball while the far-side striker stays high.
- **Pass animation.** A pass action animates the ball moving from the current carrier to the chosen teammate. When it arrives, update the selected carrier and FM scenario, then transition players incrementally toward their preferred regions for the new scenario.
- **Dribble animation.** A dribble action animates the carrier and ball moving together in the chosen direction, then recomputes the FM scenario and transitions players incrementally toward the resulting preferred regions.
- **Reduced motion.** Every piece move uses a **200 ms ease-out** (`prefers-reduced-motion`). Pieces still travel; they never jump.
- **Motion law.** No piece position changes without a transition, including undo, reset, clear, benching, loading and switching who attacks. Only the piece being dragged follows the pointer directly.

### 5.6 Adjust, save and share

- User-facing copy: the playing surface is the **pitch**, never "board". Saved and shared setups are **tactics**. Never "tune" in the interface.
- **Share** button label: **Share tactic**.
- **Old links.** "This link is from the old Game Plan." / "Old links cannot be opened in this version. Ask for a new link."

## 6. Feature list (updated rows)

| ID  | Feature                                                             | Priority | Acceptance criteria                                        |
| --- | ------------------------------------------------------------------- | -------- | ---------------------------------------------------------- |
| F01 | One pitch. Open pitch default for later visits. FM mode toggle      | Must     | Later visits open Open pitch. First visit opens FM example |
| F02 | Empty Open pitch with 11-player squad default                       | Must     | Open pitch starts with no placed players and 11 players available on the bench |
| F03 | Open pitch free player and independent ball movement                | Must     | Ball drag changes only ball position; player drag changes only that player |
| F04 | Matchup formation picker                                            | Must     | Two choices per side are initially visible; More exposes the remaining formations |
| F05 | Apply matchup shortcut                                              | Must     | Places both teams with separation; pieces remain freely movable afterward |
| F06 | Clear in Open pitch; disabled in FM mode                             | Must     | Open pitch players return to bench and ball stays in place; FM Clear is disabled |
| F15 | FM-only five-lane by three-third zone map (15 zones)                 | Must     | Tapping a zone places the FM scenario ball; zone name shown; no Open pitch dependency |
| F16 | Explicit zone-eligible carrier selection                             | Must     | User chooses the on-ball role from the eligible options for the selected zone |
| F18 | FM pass action and animation                                          | Must     | Ball visibly travels to selected teammate and carrier updates |
| F19 | FM dribble action and animation                                       | Must     | Carrier and ball visibly move together in selected direction |
| F20 | Untuned zone: zone shape with "Finish setting up your tactic"       | Must     | Label visible. No arrows                                   |
| F21 | Copy FM base positions to Open pitch                                  | Must     | Confirmation warns that currently placed Open pitch pieces will be replaced; then the FM XI is placed at base positions, the ball stays put, and extra squad members remain benched |
| F28 | Reduced motion                                                      | Must     | Every move completes in 200 ms or less                     |
| F52 | Half-spaces and five lanes                                          | **Must** | Five lanes in zone map from v1                             |

## 7. Mobile scope

| Area              | Phone behaviour                                              |
| ----------------- | ------------------------------------------------------------ |
| Role picker       | **Not shown.** Tapping a token selects it and shows its role |
| First-run step 3  | "Step through with Next, or tap a player to see its role."   |
| Dribble direction | Hidden                                                       |
| Copy FM positions | Not available on phone in v1 |

## Settled design decisions

| ID   | Item            | Decision                                                                                                   |
| ---- | --------------- | ---------------------------------------------------------------------------------------------------------- |
| D-3  | FM ball on carrier | Draw the ball above the token for attackers; if a defender ever carries, draw it lower. Open pitch ball is independent. |
| D-7  | Lane edges      | Half-spaces between penalty-box and six-yard-box edges (~15.5–27.8 each side); centre 27.8–48.4.           |
| O-16 | Pair labels     | Confirmed. D(C), M(C), ST and AM(C) pairs share one label; wide AM slots take AM(L)/AM(R) from x position. |

## Copy rules (settled)

- Pitch, never board, in all user-facing text.
- Tactics are what people save, load and share.
- Never "tune"; untuned zones say "Finish setting up your tactic".
- Open pitch replaces Sandbox throughout.
- Custom name: 12 characters on the token, full 24 in bench, tooltip and accessible name.
- PNG always exports in the light theme.

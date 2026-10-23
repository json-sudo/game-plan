# Game Plan PRD (v2 rebuild)

Status: updated 2026-10-22 after the FM setup flow handoff and the direction, positioning, and persistence interviews. This repository copy is the only maintained PRD; the duplicate vault PRD was removed. A fresh replacement spec set is staged separately under `vault/game-plan/specs/v2/`; the legacy specs remain untouched and non-authoritative for v2.

## Open items for Firstmate

Build nothing that depends on these until the captain confirms.

| ID   | Item                | Notes                                                                                                                                                                                                  |
| ---- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| O-14 | New dependencies    | `@vitest/coverage-v8` and `fflate` were not named in round 5. Working default: add both.                                                                                                               |
| O-17 | Wide midfield roles | Four Wide Midfielder roles have no slot in the twelve formations. Working default: stay hidden until a formation with wide midfield is added.                                                          |
| O-18 | FM positioning      | Existing carrier eligibility is recorded in §5.4. Approve exact role×zone destination/transition tables and the remaining Overlapping/Wide Centre-Back behavior before implementing FM position logic. |
| F30  | Redo                | Should priority; may be cut. If cut, hide the button (`redo={false}`) and nothing else moves.                                                                                                          |

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
- Reset remains unchanged in Open pitch (FM mode Reset is in 4.2). Restore each team with an applied setup to its selected formation, or restore the matchup when both teams have one applied; return teams without an applied setup to the bench, reset the ball to its default centre, clear the FM scenario, and make the operation undoable. Reset stays disabled until a formation or matchup has been applied.
- Mode toggle labels: **Open pitch**, **FM mode**.

### 4.2 FM mode

- Same pitch, separate mode (R3-Q1).
- Starting XI only. No bench (R3-Q9).
- Formations from the FM26 list (twelve formations).
- Each player has a role. Guided setup, a zone map and a looping pass visualization with two controls: Restart and Show another visualization.
- The opponent is optional. With no opponent, my team attacks and there is no Who attacks step. Picking an opponent later adds the step, with my team selected.
- The pitch stays empty until a zone is picked. Then each team walks on from its own goal line into its shape, and the visualization starts by itself.
- The user chooses only the zone. Each visualization starts with an eligible role from the role-to-zone matrix in §5.4; the matrix still decides which roles can start one. Do not silently assign the nearest attacker.
- The zone map is FM-mode only.
- Display only. Pieces cannot be dragged, picked up or selected, and a tap opens nothing. Roles change only in the Roles step, where the role picker works on desktop.
- Restart replays the current visualization from its first pass. Show another visualization moves to the zone's next visualization and wraps to the first after the last. Neither is undoable.
- Reset is disabled until a zone is picked and a visualization is running. It then clears the zone and both formations, resets roles to FM26 defaults, keeps team names and returns who attacks to my team. Pieces leave the pitch and FM mode returns to the empty first state. It is one undoable step.
- Clear is disabled in FM mode because its player-clearing behavior duplicates Reset there.

**Switching modes.** Open pitch and FM mode have distinct position layouts. Entering or leaving a mode does not implicitly copy or reshape positions. Copying FM positions into Open pitch is an explicit one-way action; reverse copy is not supported. It is disabled while no zone is set. Before copying, show: **“This will replace any pieces currently placed on the Open pitch.”** On confirmation, remove the current Open pitch player layout and place the FM pieces at the positions they hold in the frame on screen. The independent Open pitch ball stays where it is; any additional squad members remain on the bench. Each FM player without a role gets the FM26 default.

**Mode on a shared link.** A new-format link contains both independent layouts and the mode active when the link was created. Opening it restores that mode and preserves both layouts. The FM layout holds the setup (formations, roles, who attacks), the zone and the sequence index. An FM link opens in FM mode and the visualization starts by itself. Legacy v3 links are unsupported; do not migrate or import them.

## 5. User flows (selected updates)

### 5.4 FM scenario selection

- **Zone map.** Five lanes by three thirds: **15 zones**. Lane names: Left flank, Left half-space, Centre, Right half-space, Right flank. Third names: Defensive third, Middle third, Final third. Lane edges follow real pitch markings: half-spaces sit between the penalty-box edge and the six-yard-box edge (about 15.5 to 27.8 each side); centre spans 27.8 to 48.4.
- **Untuned zone.** If the table has no entry, the zone shape shows with **"Finish setting up your tactic"**. Arrows no longer exist in FM mode.
- Open pitch has no zone selection. Its ball and player positions are freely independent.
- **Visualization starters.** The user never chooses the on-ball player. In FM mode, each zone's visualizations start from the attacking team's In Possession roles eligible for the selected zone, one visualization per starter. Changing the zone does not use nearest-player guessing. Player current/base coordinates do not filter the starters. Left/right mirrors swap side-specific player roles and retain central roles. Explicit formation and position-slot gates are included below.

| Ball zone                    | Eligible carrier roles                                                                                                                                                                                                                   |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Defensive · left flank       | Full Back; Inside Wing-Back; Wing Back; Inside Full-Back; Overlapping Centre-Back and Wide Centre-Back only for the left outermost centre-back in a formation with at least three centre-back positions                                  |
| Defensive · left half-space  | Full Back; Inside Full-Back; Half Back; Centre-Back, Advanced Centre-Back, Ball-Playing Centre-Back, and No-Nonsense Centre-Back for the left centre-back; Overlapping Centre-Back and Wide Centre-Back only when gated                  |
| Defensive · centre           | Half Back; Centre-Back, Advanced Centre-Back, Ball-Playing Centre-Back, and No-Nonsense Centre-Back; Overlapping Centre-Back only when its formation/slot gate is met. Eligibility does not depend on an Inside Full-Back being present. |
| Defensive · right half-space | Mirror of defensive left half-space                                                                                                                                                                                                      |
| Defensive · right flank      | Mirror of defensive left flank                                                                                                                                                                                                           |
| Middle · left flank          | Full Back; Wing Back; Wide Central Midfielder; Wide Midfielder; Winger; Inside Forward; Playmaking Winger; Wide Forward; Inside Winger, for the left side                                                                                |
| Middle · left half-space     | Same as middle left flank except Winger and Wide Forward; Channel Midfielder in M(C)/AM(C); Inside Forward; Inside Winger; Playmaking Winger                                                                                             |
| Middle · centre              | Central M(C)/AM(C) In Possession roles: Central Midfielder; Midfield Playmaker; Attacking Midfielder; Advanced Playmaker; Free Role; plus False Nine. Exclude Wide Central Midfielder, Channel Midfielder, Second Striker, and DM roles. |
| Middle · right half-space    | Mirror of middle left half-space                                                                                                                                                                                                         |
| Middle · right flank         | Mirror of middle left flank                                                                                                                                                                                                              |
| Final · left flank           | Winger; Inside Forward; Wide Forward; Inside Winger; Wing Back; Advanced Wing-Back only when assigned to a WB position. Exclude Playmaking Winger.                                                                                       |
| Final · left half-space      | Mirror of final right half-space; also include Inside Forward, Inside Winger, and Playmaking Winger                                                                                                                                      |
| Final · centre               | All In Possession Striker roles; Second Striker when assigned to AM(C)                                                                                                                                                                   |
| Final · right half-space     | Channel Midfielder in M(C)/AM(C); all In Possession Striker roles; Second Striker; Attacking Midfielder; Advanced Playmaker; Inside Forward; Inside Winger; Playmaking Winger                                                            |
| Final · right flank          | Mirror of final left flank                                                                                                                                                                                                               |

- **Formation and slot gates.** Overlapping Centre-Back and Wide Centre-Back are available only in formations with at least three centre-back positions and only to an outermost centre-back. Box-To-Box Midfielder and Box-To-Box Playmaker in DM positions are available only in formations with at least two DM positions. Advanced Wing-Back is eligible at final flank only from a Wing-Back position, not a Full-Back position. The Inside Full-Back condition changes centre-back positioning only; it does not restrict carrier eligibility.
- **Starter fallbacks for formation gaps.** Three formation-gated rules widen the table for formations that have no slot for a zone's usual starter:
  - Middle centre: any DM-slot player, when the formation has no M(C) or AM(C) slot.
  - Defensive flank: the outermost centre-back on that side, whatever its role, when the formation has no D(L)/D(R)/WB slot on that side.
  - Middle half-space: the same-side DM and AM(C) players, whatever their roles, when the formation has no D(L)/D(R)/WB slot on that side.

### 5.5 Playback

- **Playback.** Playback phases are removed. FM playback is a looping, precomputed pass visualization with no Back, Next, phase dots or progress bar. Its pass chains are generated by the engine on placeholder zone shapes, pending O-18. The carrier eligibility matrix and global movement model are recorded below. Exact role×zone preferred regions/transition offsets and the remaining Overlapping Centre-Back/Wide Centre-Back decisions remain follow-up gates.
- **Positioning model (interview decisions).** The selected formation slot is each player's base. Each FM visualization is a short attacking scenario, not a full-match simulation: the selected attacking team always uses its In Possession roles and the defending team always uses its Out of Possession roles. Both teams respond to the selected ball zone, mirrored by each team's attacking direction and role. Use the existing five lanes and three thirds as preferred-region anchors; define narrower pockets only when needed. As the ball advances between thirds, the whole formation shape advances while maintaining its relative spacing and role offsets. When the ball changes lanes but stays in the same third, both team shapes shift modestly toward the ball-side lane, with role-specific movements layered on top. Each role's behavior stays the same, but its preferred location changes with the selected ball third; for example, a False Nine drops to different pitch locations in the defensive, middle, and final thirds. On a scenario change, move incrementally from current positions toward the new preferred region. Preserve role priority and formation spacing, allowing modest overlap only when roles intentionally share a line. When the ball is in a team's own half, its striker should generally not be in the opposing penalty area; this is a strong preference, not a hard limit, and role movement may cross halfway when appropriate.
- **Formation-gated roles.** Overlapping Centre-Back and Wide Centre-Back are offered only when the formation has at least three centre-back slots and only to an outermost centre-back. Box-To-Box Midfielder and Box-To-Box Playmaker in DM slots are offered only when the formation has at least two DM slots. The Inside Full-Back centre-back positioning interaction applies only to the near-side centre-back when one full-back is Inside Full-Back and the other is not; it does not affect carrier eligibility.
- **Overlapping Centre-Back (interview decisions).** This is a new v1 In Possession role, available only to an outermost centre-back in a formation with at least three centre-back slots. With the ball in the defensive third, it starts in the same-side half-space and begins moving toward the flank, while remaining in the defensive third. With the ball in the middle third, it starts in the same-side flank and advances to the attacking edge of the middle third (the boundary with the final third). In possession on the far side, it keeps modestly overlapping. It has no separate OOP role; the player uses its assigned centre-back defensive role, defaulting to Centre-Back. In the final third, the captain says it overlaps when no Winger or Wing Back is present, and underlaps when one is present.
- **Centre-back and wide-role interaction (partial interview decisions).** The width-order rule applies only to Winger, Wing Back, Overlapping Centre-Back, and Advanced Wing-Back; other roles retain their own behavior, including natural overlap. No formation can use all four at once; at most three are present due to slot availability. Their order from least to most wide is Winger, Wing Back, Overlapping Centre-Back, Advanced Wing-Back. Among applicable roles, the widest targets the final-third wide flank, the second widest targets a half-space, and the third widest goes behind the second within the half-space; with a final-third ball, that deeper player is in the middle third near its attacking edge. Opposite-side players maintain corresponding lines when the ball is on the other side; Winger is highest, then Wing Back, then OCB. In a Wing Back + Winger pair, Winger enters the final-third half-space and Wing Back takes the wide flank. In a Wing Back + Winger + Channel Midfielder case, all may be in the final third; Wing Back is slightly behind the Winger on the flank, Channel Midfielder is in the half-space, and the pieces must not occupy the same pitch position. In a Winger + OCB + Advanced Wing-Back example, Advanced Wing-Back is in the wide flank, Winger is higher in the half-space, and OCB is deeper in the half-space at middle-third depth near the final-third edge. The conditional OCB underlap when a Winger or Wing Back is present still needs a rule for the possible Wing Back + Winger + OCB combination. Also clarify whether “slightly behind horizontally” means depth or lateral offset before implementing that specific interaction.
- **Wide Centre-Back (partial interview decisions).** This is a new v1 In Possession role, available in defensive-third flank and half-space carrier zones when the formation has at least three centre-back slots; the same outermost-CB slot gate as Overlapping Centre-Back applies. It holds the centre-back line, never overlaps, and stays in the wide half-space when the ball is on the far side. When the ball is near its side, it can move to the flank if the ball has progressed to the final third on that side. Its remaining per-third target details are part of the role-position destination table.
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
- **Visualization length.** Defensive and middle thirds: at least 4 passes. Final third: 2 passes, or 1 when the zone is the centre lane.
- **Visualization passes.** The ball travels from carrier to receiver on each pass of the precomputed visualization and ends above the receiver (D-3); the receiver becomes the carrier. No arrows or target rings. The user chooses no targets and no directions. A zone, role, formation, opponent or who-attacks change recomputes the visualization and restarts it.
- **Reduced motion.** Every piece move uses a **200 ms ease-out** (`prefers-reduced-motion`). Pieces still travel; they never jump.
- **Motion law.** No piece position changes without a transition, including undo, reset, clear, benching, loading and switching who attacks. Only the piece being dragged follows the pointer directly.

### 5.6 Adjust, save and share

- User-facing copy: the playing surface is the **pitch**, never "board". Saved and shared setups are **tactics**. Never "tune" in the interface.
- **Share** button label: **Share tactic**. It saves the FM zone and sequence index with the setup.
- **Export PNG** exports the frame on screen, even mid-pass, always in the light theme. It changes no state.
- **Old links.** "This link is from the old Game Plan." / "Old links cannot be opened in this version. Ask for a new link."

## 6. Feature list (updated rows)

| ID  | Feature                                                        | Priority | Acceptance criteria                                                                                                                                                                                                                          |
| --- | -------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F01 | One pitch. Open pitch default for later visits. FM mode toggle | Must     | Later visits open Open pitch. First visit opens FM mode on its empty first state; there is no example page                                                                                                                                   |
| F02 | Empty Open pitch with 11-player squad default                  | Must     | Open pitch starts with no placed players and 11 players available on the bench                                                                                                                                                               |
| F03 | Open pitch free player and independent ball movement           | Must     | Ball drag changes only ball position; player drag changes only that player                                                                                                                                                                   |
| F04 | Matchup formation picker                                       | Must     | Two choices per side are initially visible; More exposes the remaining formations                                                                                                                                                            |
| F05 | Apply matchup shortcut                                         | Must     | Places both teams with separation; pieces remain freely movable afterward                                                                                                                                                                    |
| F06 | Clear in Open pitch; disabled in FM mode                       | Must     | Open pitch players return to bench and ball stays in place; FM Clear is disabled                                                                                                                                                             |
| F15 | FM-only five-lane by three-third zone map (15 zones)           | Must     | Tapping a zone places the FM scenario ball; zone name shown; no Open pitch dependency                                                                                                                                                        |
| F20 | Untuned zone: zone shape with "Finish setting up your tactic"  | Must     | Label visible                                                                                                                                                                                                                                |
| F21 | Copy FM positions to Open pitch                                | Must     | Disabled until a zone is set. Confirmation warns that currently placed Open pitch pieces will be replaced; then the FM pieces are placed where they stand in the frame on screen, the ball stays put, and extra squad members remain benched |
| F28 | Reduced motion                                                 | Must     | Every move completes in 200 ms or less                                                                                                                                                                                                       |
| F52 | Half-spaces and five lanes                                     | **Must** | Five lanes in zone map from v1                                                                                                                                                                                                               |

## 7. Mobile scope

| Area              | Phone behaviour                                                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Role picker       | **Not shown.** Roles are read-only ("Change roles on a desktop."). In FM mode tokens do nothing on any device; role names are in tooltips |
| Copy FM positions | Not available on phone in v1                                                                                                              |

## Settled design decisions

| ID   | Item                       | Decision                                                                                                                |
| ---- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| D-3  | FM ball on carrier         | Draw the ball above the token for attackers; if a defender ever carries, draw it lower. Open pitch ball is independent. |
| D-7  | Lane edges                 | Half-spaces between penalty-box and six-yard-box edges (~15.5–27.8 each side); centre 27.8–48.4.                        |
| D-8  | Show another visualization | Stays beside Restart. It moves to the zone's next visualization and wraps after the last. Playback only; no undo entry. |
| D-9  | Visualization source       | Pass chains are generated by the engine on placeholder zone shapes, pending O-18.                                       |
| D-10 | Copy to Open pitch         | Copies the FM pieces as they stand in the frame on screen, the same frame Export uses. Confirmation text kept.          |
| D-11 | Shared FM links            | Open in FM mode with the setup, zone and sequence index; the visualization starts by itself.                            |
| D-12 | Reset side effects         | Roles return to FM26 defaults; team names stay.                                                                         |
| D-13 | Export mid-pass            | Exports the frame on screen, even mid-pass, in the light theme.                                                         |
| D-14 | Starts with line           | The "Starts with" line above the controls stays.                                                                        |
| O-16 | Pair labels                | Confirmed. D(C), M(C), ST and AM(C) pairs share one label; wide AM slots take AM(L)/AM(R) from x position.              |

## Copy rules (settled)

- Pitch, never board, in all user-facing text.
- Tactics are what people save, load and share.
- Never "tune"; untuned zones say "Finish setting up your tactic".
- Open pitch replaces Sandbox throughout.
- Custom name: 12 characters on the token, full 24 in bench, tooltip and accessible name.
- PNG always exports in the light theme.

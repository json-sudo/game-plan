# FM26 formations (sidebar list)

Status: DRAFT data for the Game Plan rebuild. Companion to `PRD.md` (section 9) and `ARCHITECTURE.md` (section 5).
Date: 2026-10-10

Source: the formation menu in the sidebar of <https://fmsidekick.com/database/formations>. The page was reached through the browser on 2026-10-10 without a challenge.
The sidebar lists 12 formations. The site section API `https://fmsidekick.com/api/formations` returns the same 12 ids and labels (`count: 12`). Slot data comes from `https://fmsidekick.com/api/formations/<id>`, which the formation pages use.

Coordinates are the site units: x runs 0 to 100 across the pitch, y runs 0 to 100 with y = 0 at the goal the team attacks. Nothing here is copied from the in-game picker, which was not available to check.

## 1. The 12 formations

| # | Formation | Site id | Page | Slots |
|---|---|---|---|---|
| 1 | 4-3-3 DM Wide | `4_3_3_dm_wide` | <https://fmsidekick.com/database/formations/4_3_3_dm_wide> | 11 |
| 2 | 4-2-3-1 DM Wide | `4_2_3_1_dm_wide` | <https://fmsidekick.com/database/formations/4_2_3_1_dm_wide> | 11 |
| 3 | 4-4-2 Diamond Narrow | `4_4_2_diamond_narrow` | <https://fmsidekick.com/database/formations/4_4_2_diamond_narrow> | 11 |
| 4 | 4-2-4 DM Wide | `4_2_4_dm_wide` | <https://fmsidekick.com/database/formations/4_2_4_dm_wide> | 11 |
| 5 | 4-2-2-2 DM Wide | `4_2_2_2_dm_wide` | <https://fmsidekick.com/database/formations/4_2_2_2_dm_wide> | 11 |
| 6 | 4-2-2-2 AM Narrow | `4_2_2_2_am_narrow` | <https://fmsidekick.com/database/formations/4_2_2_2_am_narrow> | 11 |
| 7 | 4-3-2-1 DM Narrow | `4_3_2_1_dm_narrow` | <https://fmsidekick.com/database/formations/4_3_2_1_dm_narrow> | 11 |
| 8 | 3-4-3 DM Wide | `3_4_3_dm_wide` | <https://fmsidekick.com/database/formations/3_4_3_dm_wide> | 11 |
| 9 | 3-4-3 DM Narrow | `3_4_3_dm_narrow` | <https://fmsidekick.com/database/formations/3_4_3_dm_narrow> | 11 |
| 10 | 5-2-1-2 DM WB | `5_2_1_2_dm_wb` | <https://fmsidekick.com/database/formations/5_2_1_2_dm_wb> | 11 |
| 11 | 5-1-2-2 DM WB | `5_1_2_2_dm_wb` | <https://fmsidekick.com/database/formations/5_1_2_2_dm_wb> | 11 |
| 12 | 3-2-4-1 | `3_2_4_1` | <https://fmsidekick.com/database/formations/3_2_4_1> | 11 |

## 2. Slot ids, labels and families

Each slot keeps the site code as its **id**. The id is unique inside a formation and keeps the side (L, R, C), so it is the value the engine, saves and share links use. The **label** is what the board shows. The **family** is the label without the side, and roles are matched to slots by family, as the role data prints them (for example `AM(L/R)` matches the family `AM(L)` and `AM(R)`).

| Site id | Family (label) | Note |
|---|---|---|
| `GK` | GK |  |
| `DL` | D(L) | Full-back, left |
| `DCL` | D(C) | Centre-back pair or trio. All three show D(C) |
| `DC` | D(C) | Centre-back |
| `DCR` | D(C) | Centre-back pair or trio. All three show D(C) |
| `DR` | D(R) | Full-back, right |
| `WBL` | WB(L) | Wing-back, left |
| `WBR` | WB(R) | Wing-back, right |
| `DM` | DM | Single defensive midfielder |
| `DML` | DM | Defensive midfielder pair. Both show DM |
| `DMR` | DM | Defensive midfielder pair. Both show DM |
| `DMCL` | DM | Defensive midfielder pair. Both show DM |
| `DMCR` | DM | Defensive midfielder pair. Both show DM |
| `MCL` | M(C) | Central midfielder pair. Both show M(C) |
| `MCR` | M(C) | Central midfielder pair. Both show M(C) |
| `AML` | AM(L), AM(C) or AM(R), from x (section 4) | Wide attacking midfielder, left |
| `AMC` | AM(L), AM(C) or AM(R), from x (section 4) | Single attacking midfielder |
| `AMCL` | AM(L), AM(C) or AM(R), from x (section 4) | Side from x, see section 4 |
| `AMCR` | AM(L), AM(C) or AM(R), from x (section 4) | Side from x, see section 4 |
| `AMR` | AM(L), AM(C) or AM(R), from x (section 4) | Wide attacking midfielder, right |
| `STL` | ST | Striker pair. Both show ST |
| `ST` | ST | Single striker |
| `STR` | ST | Striker pair. Both show ST |

## 3. Slots per formation

Coordinates are site units, as the API returns them. Family is the label family from section 2.

### 1. 4-3-3 DM Wide (`4_3_3_dm_wide`)

| Slot id | Family | x | y |
|---|---|---|---|
| `GK` | GK | 50 | 90 |
| `DCR` | D(C) | 62.5 | 75 |
| `DCL` | D(C) | 37.5 | 75 |
| `DR` | D(R) | 85 | 71.5 |
| `DL` | D(L) | 15 | 71.5 |
| `DM` | DM | 50 | 57.5 |
| `MCR` | M(C) | 62.5 | 45 |
| `MCL` | M(C) | 37.5 | 45 |
| `AMCR` | AM(R) | 80 | 32.5 |
| `AMCL` | AM(L) | 20 | 32.5 |
| `ST` | ST | 50 | 20 |

### 2. 4-2-3-1 DM Wide (`4_2_3_1_dm_wide`)

| Slot id | Family | x | y |
|---|---|---|---|
| `GK` | GK | 50 | 90 |
| `DL` | D(L) | 15 | 71.5 |
| `DCL` | D(C) | 37.5 | 75 |
| `DCR` | D(C) | 62.5 | 75 |
| `DR` | D(R) | 85 | 71.5 |
| `DML` | DM | 37.5 | 60 |
| `DMR` | DM | 62.5 | 60 |
| `AML` | AM(L) | 15 | 30 |
| `AMC` | AM(C) | 50 | 32.5 |
| `AMR` | AM(R) | 85 | 30 |
| `ST` | ST | 50 | 20 |

### 3. 4-4-2 Diamond Narrow (`4_4_2_diamond_narrow`)

| Slot id | Family | x | y |
|---|---|---|---|
| `GK` | GK | 50 | 90 |
| `DL` | D(L) | 15 | 71.5 |
| `DCL` | D(C) | 37.5 | 75 |
| `DCR` | D(C) | 62.5 | 75 |
| `DR` | D(R) | 85 | 71.5 |
| `DM` | DM | 50 | 57.5 |
| `MCL` | M(C) | 37.5 | 45 |
| `MCR` | M(C) | 62.5 | 45 |
| `AMC` | AM(C) | 50 | 32.5 |
| `STL` | ST | 37.5 | 20 |
| `STR` | ST | 62.5 | 20 |

### 4. 4-2-4 DM Wide (`4_2_4_dm_wide`)

| Slot id | Family | x | y |
|---|---|---|---|
| `GK` | GK | 50 | 90 |
| `DL` | D(L) | 15 | 71.5 |
| `DCL` | D(C) | 37.5 | 75 |
| `DCR` | D(C) | 62.5 | 75 |
| `DR` | D(R) | 85 | 71.5 |
| `DML` | DM | 37.5 | 57.5 |
| `DMR` | DM | 62.5 | 57.5 |
| `AML` | AM(L) | 10 | 35 |
| `STL` | ST | 37.5 | 20 |
| `STR` | ST | 62.5 | 20 |
| `AMR` | AM(R) | 90 | 35 |

### 5. 4-2-2-2 DM Wide (`4_2_2_2_dm_wide`)

| Slot id | Family | x | y |
|---|---|---|---|
| `GK` | GK | 50 | 90 |
| `DCL` | D(C) | 37.5 | 77.5 |
| `DCR` | D(C) | 62.5 | 77.5 |
| `DL` | D(L) | 15 | 74 |
| `DR` | D(R) | 85 | 74 |
| `DML` | DM | 37.5 | 60 |
| `DMR` | DM | 62.5 | 60 |
| `AML` | AM(L) | 15 | 40 |
| `AMR` | AM(R) | 85 | 40 |
| `STL` | ST | 37.5 | 22.5 |
| `STR` | ST | 62.5 | 22.5 |

### 6. 4-2-2-2 AM Narrow (`4_2_2_2_am_narrow`)

| Slot id | Family | x | y |
|---|---|---|---|
| `GK` | GK | 50 | 90 |
| `DCR` | D(C) | 62.5 | 75 |
| `DCL` | D(C) | 37.5 | 75 |
| `DR` | D(R) | 85 | 75 |
| `DL` | D(L) | 15 | 75 |
| `DMCR` | DM | 62.5 | 60 |
| `DMCL` | DM | 37.5 | 60 |
| `AMCR` | AM(R) | 75 | 35 |
| `AMCL` | AM(L) | 25 | 35 |
| `STR` | ST | 62.5 | 20 |
| `STL` | ST | 37.5 | 20 |

### 7. 4-3-2-1 DM Narrow (`4_3_2_1_dm_narrow`)

| Slot id | Family | x | y |
|---|---|---|---|
| `GK` | GK | 50 | 90 |
| `DCR` | D(C) | 62.5 | 75 |
| `DCL` | D(C) | 37.5 | 75 |
| `DR` | D(R) | 85 | 71.5 |
| `DL` | D(L) | 15 | 71.5 |
| `DM` | DM | 50 | 57.5 |
| `MCR` | M(C) | 62.5 | 45 |
| `MCL` | M(C) | 37.5 | 45 |
| `AMCR` | AM(R) | 75 | 32.5 |
| `AMCL` | AM(L) | 25 | 32.5 |
| `ST` | ST | 50 | 20 |

### 8. 3-4-3 DM Wide (`3_4_3_dm_wide`)

| Slot id | Family | x | y |
|---|---|---|---|
| `GK` | GK | 50 | 90 |
| `DCL` | D(C) | 25 | 75 |
| `DC` | D(C) | 50 | 75 |
| `DCR` | D(C) | 75 | 75 |
| `WBL` | WB(L) | 15 | 65.25 |
| `WBR` | WB(R) | 85 | 65.25 |
| `DMCL` | DM | 37.5 | 57.5 |
| `DMCR` | DM | 62.5 | 57.5 |
| `AMCR` | AM(R) | 85 | 32.5 |
| `AMCL` | AM(L) | 15 | 32.5 |
| `ST` | ST | 50 | 20 |

### 9. 3-4-3 DM Narrow (`3_4_3_dm_narrow`)

| Slot id | Family | x | y |
|---|---|---|---|
| `GK` | GK | 50 | 90 |
| `DCL` | D(C) | 25 | 75 |
| `DC` | D(C) | 50 | 75 |
| `DCR` | D(C) | 75 | 75 |
| `WBL` | WB(L) | 15 | 65.25 |
| `WBR` | WB(R) | 85 | 65.25 |
| `DMCL` | DM | 37.5 | 57.5 |
| `DMCR` | DM | 62.5 | 57.5 |
| `AMCR` | AM(C) | 62.5 | 32.5 |
| `AMCL` | AM(C) | 37.5 | 32.5 |
| `ST` | ST | 50 | 20 |

### 10. 5-2-1-2 DM WB (`5_2_1_2_dm_wb`)

| Slot id | Family | x | y |
|---|---|---|---|
| `GK` | GK | 50 | 90 |
| `DCL` | D(C) | 25 | 75 |
| `DC` | D(C) | 50 | 75 |
| `DCR` | D(C) | 75 | 75 |
| `WBL` | WB(L) | 15 | 65.25 |
| `WBR` | WB(R) | 85 | 65.25 |
| `DMCL` | DM | 37.5 | 57.5 |
| `DMCR` | DM | 62.5 | 57.5 |
| `AMC` | AM(C) | 50 | 32.5 |
| `STL` | ST | 37.5 | 20 |
| `STR` | ST | 62.5 | 20 |

### 11. 5-1-2-2 DM WB (`5_1_2_2_dm_wb`)

| Slot id | Family | x | y |
|---|---|---|---|
| `GK` | GK | 50 | 90 |
| `DCL` | D(C) | 25 | 75 |
| `DC` | D(C) | 50 | 75 |
| `DCR` | D(C) | 75 | 75 |
| `WBL` | WB(L) | 15 | 65.25 |
| `WBR` | WB(R) | 85 | 65.25 |
| `DM` | DM | 50 | 57.5 |
| `MCR` | M(C) | 62.5 | 45 |
| `MCL` | M(C) | 37.5 | 45 |
| `STL` | ST | 37.5 | 20 |
| `STR` | ST | 62.5 | 20 |

### 12. 3-2-4-1 (`3_2_4_1`)

| Slot id | Family | x | y |
|---|---|---|---|
| `GK` | GK | 50 | 90 |
| `DCL` | D(C) | 25 | 72.5 |
| `DC` | D(C) | 50 | 72.5 |
| `DCR` | D(C) | 75 | 72.5 |
| `DMCL` | DM | 37.5 | 57.5 |
| `DMCR` | DM | 62.5 | 57.5 |
| `AML` | AM(L) | 15 | 27.5 |
| `AMCL` | AM(C) | 37.5 | 32.5 |
| `AMCR` | AM(C) | 62.5 | 32.5 |
| `AMR` | AM(R) | 85 | 27.5 |
| `ST` | ST | 50 | 20 |

## 4. Checks and known gaps

1. **Wide attacking midfield side comes from x.** The site codes `AMCL` and `AMCR` are used for wide and central positions. In 4-3-3 DM Wide they sit at x 20 and 80, and in 3-4-3 DM Wide at x 15 and 85. Labelling them `AM(C)` would stop the Winger and Wide Forward roles from ever reaching the first-run example. The rule used here: x below 35 is AM(L), x above 65 is AM(R), otherwise AM(C). `AML` and `AMR` always fall on the wide side under this rule. The rule is a worker choice, and O-16 in `PRD.md` asks the captain to confirm it.
2. **No M(L) or M(R) slot in the 12 formations.** Four Wide Midfielder roles (`wide_midfielder_ip`, `wide_midfielder_oop`, `tracking_wide_midfielder_oop`, `wide_outlet_wide_midfielder_oop`) have no slot to sit in. See `PRD.md` section 12, O-17.
3. **Pairs share a label.** Each pair (DM, D(C), M(C), ST, and AM(C) when two sit in the centre) shows one label. This extends the O-13 answer ("DM for both") to the other pairs. O-16 asks the captain to confirm the extension.
4. **Labels are not checked against the in-game picker.** The site codes are the only source here. The spike listed these labels as unverified (spike item U4, `PRD.md` section 12, O-16).
5. **Ids and labels differ.** `4_3_3_dm_wide` is the id and `4-3-3 DM Wide` is the label. Storage and share links use the id, and the board shows the label.
6. **Two defensive midfielders in 8 of 12 formations.** Each such formation shows DM twice on the board, so the board needs a non-label cue to tell them apart (`ARCHITECTURE.md` section 5.4).


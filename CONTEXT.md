# Slammer Stats

A personal tool for tracking statistics for a youth soccer team. Single owner (a parent) records and reviews stats live from the sideline; runs entirely on-device with no backend or account system.

## Language

**Team**:
A persistent club/roster identity (e.g. "Lightning FC") that a player can belong to across multiple seasons. A player may move to a different Team after a season ends.

**Season**:
A bounded stretch of time (e.g. one year or one league session) during which a Team plays a set of Games. Each Season belongs to exactly one Team and has its own Roster.

**Roster**:
The set of Players registered to a Team for one specific Season. Rosters are scoped to a Season, not to a Team, so a Player's status (which team, which season) is always accurate as of the season played — even if the Team's membership changes in later seasons.

**Player**:
An individual who appears on a Season's Roster. A Player's stats are always recorded in the context of a specific Game within a specific Season.

**Game**:
A single match played by a Team during a Season, against an opponent, on a date, with a final score.

**Stat Line**:
The set of statistics recorded for one Player in one Game: goals, assists, shots, duels won, duels lost, saves, yellow cards, red cards, dribbles, and minutes played. The first nine are tallied by tapping during the Game; minutes played is computed automatically from the Game Clock and the Player's in/out toggles. Every field is available on every Stat Line regardless of the position the Player played — e.g. saves is simply left at zero for outfield players, with no separate "goalkeeper" flag gating it.
_Avoid_: Performance, box score

**Shot**:
An attempt on goal by a Player, tallied independently on the Stat Line. Recording a Goal automatically also increments Shots for that attempt; Shot remains separately tappable for attempts that don't score.
_Avoid_: Attempt

**Score**:
The live running tally of goals for and against, kept on the Game itself and updated in real time as goals happen. It is tracked independently of the goals recorded on individual Stat Lines — attributing a goal to a specific Player is a separate, optional action from updating the Score, so the two are not guaranteed to reconcile perfectly.

**Game Clock**:
A countdown timer for one half of a Game, with a length entered fresh each Game (halves are always equal length within a Game, but length varies game to game). Continues counting up past 0:00 as stoppage time until manually ended; a manual "Start Second Half" action begins the next countdown. Used together with per-Player in/out toggles to compute minutes played.

**Duel**:
A contested 1v1 for the ball (tackle, aerial/header, 50/50 ball) — excludes dribbling past a defender, which is tracked separately as a Dribble. Tracked as a single won/lost tally per Player per Game, not broken out by duel type.
_Avoid_: Challenge

**Dribble**:
A Player successfully taking the ball past a defender, tracked as its own tally per Player per Game. Deliberately independent of Duels Won even though a dribble is also a contested 1v1 for the ball — the two tallies are never combined.
_Avoid_: Beat a defender

**Yellow Card**:
A caution recorded against a Player, requiring a confirmation step before being tallied — a mis-tap here is costlier than a routine counter, unlike the rest of the Stat Line. A second Yellow Card for the same Player in the same Game automatically converts to a Red Card.
_Avoid_: Booking, caution (as a standalone term)

**Red Card**:
An ejection recorded against a Player, requiring a confirmation step before being tallied, that immediately subs the Player off the field for the rest of the Game — whether it was issued directly or is the result of a second Yellow Card. Once subbed off this way, the Player cannot be subbed back on for the remainder of the Game.
_Avoid_: Ejection, sending-off

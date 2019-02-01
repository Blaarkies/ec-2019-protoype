import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material';
import * as SimplexNoise from 'simplex-noise';
import { EndGameDialogComponent } from 'src/app/compression-crash-course/compression-showcase/page-data-and-information/end-game-dialog/end-game-dialog.component';

/**
 * Returns an array of integers in range [0..count]
 * @param count
 * @returns {number[]}
 */
function intRange(count): number[] {
  return [...Array(count).keys()];
}

function euclideanDistance(a, b): number {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

/**
 * Returns a flat array of array, where propertyGetter determines the inner property to be pulled out
 * @param {any[]} array
 * @param {Function} propertyGetter
 * @returns {T[]}
 */
function flatMap<T>(array: any[], propertyGetter: Function = x => x): T[] {
  return array.reduce((acc, x) => acc.concat(propertyGetter(x)), []);
}

enum SurfaceTypeEnum {
  AIR = 'air',
  SOIL = 'soil',
  WATER = 'water',
  LEAF = 'leaf',
  BIO = 'bio',
  SPACE = 'space',
  ASTEROID = 'asteroid',
  ROCK = 'rock',
}

enum EffectsEnum {
  HOT = 'hot',
  COLD = 'cold',
  OIL = 'oil'
}

enum ActionsEnum {
  MOVE = 'move',
  HEAT = 'heat',
  FREEZE = 'freeze',
  SPILL_OIL = 'spill_oil',
  DIG = 'dig',
  SHOOT = 'shoot'
}

class ActiveEffect {
  placedByPLayer: Worm;
  type: EffectsEnum;
  value: number;
  timeLeft: number;
}

class NearCells {
  above: GridsCell;
  below: GridsCell;
  left: GridsCell;
  right: GridsCell;

  constructor(nearCells: NearCells = <NearCells>{}) {
    this.above = nearCells.above;
    this.below = nearCells.below;
    this.left = nearCells.left;
    this.right = nearCells.right;
  }

  /**
   * Returns an array of existing neighbouring cells in cardinal directions
   * @returns {GridsCell[]}
   */
  cardinalList() {
    return [this.above, this.below, this.left, this.right].filter(gc => gc !== undefined);
  }
}

class ImageProcessingInfo {
  srcValue: number;
  cookedValue: number;
  flag: number;
}

class GridsCell {
  x: number;
  y: number;
  surfaceType: SurfaceTypeEnum;
  activeEffect: ActiveEffect;
  occupier: Worm;
  isActionable: boolean;
  isAttackable: boolean;
  nearCells: NearCells = <NearCells>{};
  ipInfo: ImageProcessingInfo = <ImageProcessingInfo>{}; // Image Processing Info, used ONLY during map generation

  // Deprecated
  cellAboveMe: GridsCell;
  cellBelowMe: GridsCell;
}

class GridsRow {
  columns: GridsCell[];
}

class Worm {
  id: number;
  name: string;
  hitPoints = 100;
  resources = 1000;
  score = 0;
  x: number;
  y: number;
  activeEffect: ActiveEffect;
  weapon = new BasicGun();
}

class BasicGun {
  damage = 20;
  range = 20;
}

class MapConfig {
  xMax = 31;
  yMax = 15;
  seed: number = Math.round(Math.random() * 10e15);
  playersCount = 2;
  roundsMax = 400;
  round = 0;
  private altitude = 0.3; // Height of map completely filled

  /**
   * Returns the inverse of altitude, which is the intended Y value for altitude
   * @returns {number}
   */
  getAltitude() {
    return this.yMax * (1 - this.altitude);
  }
}

@Component({
  selector: 'app-page-data-and-information',
  templateUrl: './page-data-and-information.component.html',
  styleUrls: ['./stylings.scss']
})
export class PageDataAndInformationComponent implements OnInit {

  public rows: GridsRow[];
  public allCellsRef: GridsCell[];
  public players: Worm[];
  public mapConfig = new MapConfig();
  public playerOnTurn: Worm;

  public surfaceTypeEnum = SurfaceTypeEnum;
  public effectsEnum = EffectsEnum;
  public actionsEnum = ActionsEnum;

  private simplex: SimplexNoise;
  private loading: boolean;

  constructor(private dialog: MatDialog) {
    this.simplex = new SimplexNoise(this.mapConfig.seed.toString());
  }

  ngOnInit() {
    this.setupNewGame();
  }

  public doPlayerAction(cell: GridsCell, action: ActionsEnum) {
    switch (action) {

      case ActionsEnum.DIG:
        cell.surfaceType = SurfaceTypeEnum.AIR;

      case ActionsEnum.MOVE:
        this.rows[this.playerOnTurn.y].columns[this.playerOnTurn.x].occupier = undefined;
        this.setPlayerAsOccupier(this.playerOnTurn, cell);
        break;

      case ActionsEnum.HEAT:
        cell.activeEffect = <ActiveEffect>{
          placedByPLayer: this.playerOnTurn,
          type: EffectsEnum.HOT,
          value: 20,
          timeLeft: 1,
        };
        break;

      case ActionsEnum.FREEZE:
        cell.activeEffect = <ActiveEffect>{
          placedByPLayer: this.playerOnTurn,
          type: EffectsEnum.COLD,
          value: 10,
          timeLeft: 2,
        };
        break;

      case ActionsEnum.SPILL_OIL:
        cell.activeEffect = <ActiveEffect>{
          placedByPLayer: this.playerOnTurn,
          type: EffectsEnum.OIL,
          value: 0,
          timeLeft: 4,
        };
        break;

      case ActionsEnum.SHOOT:
        cell.occupier.hitPoints -= this.playerOnTurn.weapon.damage;
        break;

    }

    this.processRound();

  }

  public setMapMode(event) {
    this.loading = true;
    setTimeout(() => {
      this.setupNewGame(event.value === 'space');
      this.loading = false;
    }, 0);
  }

  private updatePlayerEffectValues(player) {
    if (player.activeEffect.timeLeft > 0) {
      player.activeEffect.timeLeft--;
    } else {
      player.activeEffect = undefined;
    }
  }

  private updateActiveEffect(effect: ActiveEffect) {
    if (effect.timeLeft > 0) {
      effect.timeLeft--;
      return effect;
    } else {
      return undefined;
    }
  }

  private endGameState(message: string) {
    // https://github.com/angular/material2/issues/5268
    // TODO: work-around for expression change on dialog factory
    setTimeout(() => {
      this.dialog.open(EndGameDialogComponent, {
        data: {
          players: this.players,
          message: message
        }
      })
        .afterClosed()
        .subscribe();
    });
  }

  private processRound() {
    this.mapConfig.round++;
    this.applyEffectResultsToPlayers();

    const playersAlive = this.players.filter(p => p.hitPoints > 0);
    if (playersAlive.length === 0) {
      this.endGameState('Draw!');
      return;
    } else if (playersAlive.length === 1) {
      this.endGameState('The last survivor has emerged');
      return;
    }
    this.applyCellEffectsToPlayers();

    this.allCellsRef.filter(cell => cell.activeEffect)
      .forEach(cell => cell.activeEffect = this.updateActiveEffect(cell.activeEffect));

    this.allCellsRef.forEach(cell => {
      cell.isAttackable = false;
      cell.isActionable = false;
    });
    this.playerOnTurn = this.players.find(p => p.id === this.playerOnTurn.id % this.mapConfig.playersCount + 1);

    this.markAdjacentCellsAsActionable();
    this.markPlayersInRangeAsActionable();
  }

  private markPlayersInRangeAsActionable() {
    const activeWeapon = this.playerOnTurn.weapon;
    this.players.filter(p => p !== this.playerOnTurn)
      .forEach(
        p => {
          if (euclideanDistance(this.playerOnTurn, p) <= activeWeapon.range) {
            this.rows[p.y].columns[p.x].isAttackable = true;
          }
        }
      );
  }

  private markAdjacentCellsAsActionable() {
    const maskArray = [...Array(3)
      .keys()]
      .map(i => i - 1)
      .reduce((sum, c, i, a) => {
        sum.push(...a.map(j => ({x: c, y: j})));
        return sum;
      }, []);

    const p = this.playerOnTurn;
    maskArray.forEach(pos => {
      const affectedY = p.y + pos.y;
      const affectedX = (p.x + pos.x + this.rows[0].columns.length) % this.rows[0].columns.length;
      if (!this.rows[affectedY] || !this.rows[affectedY].columns[affectedX]) {
        return;
      }
      const cellToEnable = this.rows[affectedY].columns[affectedX];
      if (cellToEnable.occupier
        || (cellToEnable.surfaceType === SurfaceTypeEnum.AIR && cellToEnable.cellBelowMe.surfaceType === SurfaceTypeEnum.AIR)
        || (cellToEnable.surfaceType === SurfaceTypeEnum.AIR && p.activeEffect && p.activeEffect.type === EffectsEnum.OIL)) {
        return;
      }
      cellToEnable.isActionable = true;
    });
  }

  private applyCellEffectsToPlayers() {
    this.allCellsRef
      .filter(cell => cell.cellAboveMe && cell.cellAboveMe.occupier && cell.activeEffect)
      .forEach(cell => {
        switch (cell.activeEffect.type) {
          case EffectsEnum.HOT:
            cell.cellAboveMe.occupier.activeEffect = <ActiveEffect>{
              placedByPLayer: cell.activeEffect.placedByPLayer,
              type: EffectsEnum.HOT,
              value: 20,
              timeLeft: 1
            };
            break;

          case EffectsEnum.COLD:
            cell.cellAboveMe.occupier.activeEffect = <ActiveEffect>{
              placedByPLayer: cell.activeEffect.placedByPLayer,
              type: EffectsEnum.COLD,
              value: 10,
              timeLeft: 2
            };
            break;

          case EffectsEnum.OIL:
            cell.cellAboveMe.occupier.activeEffect = <ActiveEffect>{
              placedByPLayer: cell.activeEffect.placedByPLayer,
              type: EffectsEnum.OIL,
              value: 0,
              timeLeft: 4
            };
            break;
        }
      });
  }

  private applyEffectResultsToPlayers() {
    this.players
      .filter(p => p.activeEffect)
      .forEach(p => {
        switch (p.activeEffect.type) {
          case EffectsEnum.HOT:
            p.activeEffect.placedByPLayer.score += p.activeEffect.value;
            p.hitPoints -= p.activeEffect.value;
            p.activeEffect.value = 0;
            this.updatePlayerEffectValues(p);
            break;

          case EffectsEnum.COLD:
            p.activeEffect.placedByPLayer.score += p.activeEffect.value;
            p.hitPoints -= p.activeEffect.value;
            p.activeEffect.value = 0;
            this.updatePlayerEffectValues(p);
            break;

          case EffectsEnum.OIL:
            this.updatePlayerEffectValues(p);
            break;
        }
      });
  }

  private generatePlayers() {
    this.players = [...Array(this.mapConfig.playersCount)
      .keys()]
      .map(i => {
        const player = new Worm();
        player.id = i + 1;
        player.name = String.fromCharCode(i + 65);

        return player;
      });

    // Set starting locations for players as far away from other players as possible
    this.players
      .forEach(player => { // TODO: check overlapping player positions
        const validSpawnPoint = this.allCellsRef.filter(
          cell => cell.surfaceType === SurfaceTypeEnum.AIR || cell.surfaceType === SurfaceTypeEnum.SPACE)
          .map(cell => {
            const playerDistances = this.players
              .filter(p => p.x !== undefined && p.y !== undefined)
              .map(p => euclideanDistance(cell, p));

            const minDistance = playerDistances.sort((a, b) => a - b)[0];
            return {cell, minDistance};
          })
          .sort((a, b) => b.minDistance - a.minDistance)[0];

        if (validSpawnPoint) {
          this.setPlayerAsOccupier(player, validSpawnPoint.cell);
        } else {
          throw new Error(`Could not find a spawn location for player ${player.id}, ${player.name}`);
        }
      });

    // Random player is selected to start the match
    this.playerOnTurn = this.players[Math.floor(Math.random() * this.players.length)];
  }

  private setPlayerAsOccupier(player, cell) {
    player.x = cell.x;
    player.y = cell.y;
    cell.occupier = player;
  }

  private setupNewGame(isSpace = false) {
    // Make a template. Modify this to make the real map
    const {template, flatTemplate} = this.generateMapTemplate();

    if (isSpace) {
      this.makeSpaceMap(flatTemplate);
    } else {
      this.makeEarthMap(flatTemplate);
    }

    // Convert map into HTML friendly version
    this.allCellsRef = flatMap<GridsCell>(template);
    this.rows = intRange(this.mapConfig.yMax + 1)
      .map(y => (<GridsRow>{
        columns: intRange(this.mapConfig.xMax + 1)
          .map(x => template[x][y]),
      }));

    this.generatePlayers();

    this.mapConfig.round = 0;
    this.processRound();
  }

  private makeEarthMap(flatTemplate) {
    // Light the pixels that border 2 regions, leaving clear regions on screen
    flatTemplate.forEach(gc => gc.ipInfo.cookedValue = (gc.ipInfo.srcValue > 0.33 && gc.ipInfo.srcValue < 0.66) ? 1 : 0);

    // "MS Paint" fill these regions, by only clicking below "mapConfig.getAltitude()"
    flatTemplate.forEach((gc, i) => {
      if (gc.y > this.mapConfig.getAltitude()
        && gc.ipInfo.flag === undefined
        && gc.ipInfo.cookedValue === 0) {

        gc.ipInfo.flag = i;
        intRange(flatTemplate.length).forEach(() => { // Loop once for every pixel in map - TODO: Optimize
          // Constrain dilation against those pixel borders on screen
          flatTemplate.filter(needFlagCell =>
            needFlagCell.ipInfo.cookedValue === 0
            && needFlagCell.ipInfo.flag === undefined
            && needFlagCell.nearCells
              .cardinalList()
              .some(preFlagged => preFlagged.ipInfo.flag > 0))
            .forEach(needFlagCell => needFlagCell.ipInfo.flag = i);
        });
      }
    });
    // Consolidate all flags into single value types
    flatTemplate.forEach(gc => gc.ipInfo.cookedValue = (gc.ipInfo.flag > 0) ? 1 : 0);

    // Morphological Dilation
    flatTemplate.filter(gc => gc.ipInfo.cookedValue === 0 && gc.nearCells.cardinalList().some(nc => nc.ipInfo.cookedValue === 1))
      .forEach(gc => gc.ipInfo.cookedValue = 1);

    // Morphological Erosion
    flatTemplate.filter(gc => gc.ipInfo.cookedValue === 1 && gc.nearCells.cardinalList().some(nc => nc.ipInfo.cookedValue === 0))
      .forEach(gc => gc.ipInfo.cookedValue = 0);

    // Paint cells with SurfaceTypes
    flatTemplate.forEach(gc => {
      if (gc.ipInfo.cookedValue < 1) {
        gc.surfaceType = SurfaceTypeEnum.AIR;
      } else {
        // Get region data that is similar to landscape. This makes grass "follow" the hills
        const zoom = 0.2;
        const terrainValue = this.simplex.noise2D(gc.x * zoom, gc.y * zoom) * 0.5 + 0.5;

        const soilAmount = 0.55;
        if (terrainValue < soilAmount
          // OR, "neighbour cells" and their "neighbours cells", all are NOT air squares. 2 level deep grass
          || (gc.nearCells.cardinalList().every(nc => nc.nearCells.cardinalList()
            .every(innerCell => innerCell.surfaceType !== SurfaceTypeEnum.AIR)))) {
          gc.surfaceType = SurfaceTypeEnum.SOIL;
        } else if (terrainValue < soilAmount + 0.1) {
          gc.surfaceType = SurfaceTypeEnum.BIO;
        } else {
          gc.surfaceType = SurfaceTypeEnum.LEAF;
        }
      }

      if (gc.y > this.mapConfig.yMax * 0.8) {
        // Add Bed rock, but on different data that does NOT follow the landscape (.noise3D instead of 2D)
        const zoom = 0.2;
        const terrainValue = this.simplex.noise3D(gc.x * zoom, gc.y * zoom, 0) * 0.5 + 0.5;
        gc.surfaceType = (terrainValue < 0.3) ? SurfaceTypeEnum.ROCK : gc.surfaceType;
      }

    });
  }

  private makeSpaceMap(flatTemplate) {
    const amountOfSoil = 0.45;
    flatTemplate.forEach(gc => {
      if (gc.ipInfo.srcValue < amountOfSoil) {
        gc.surfaceType = SurfaceTypeEnum.ASTEROID;
      } else {
        gc.surfaceType = SurfaceTypeEnum.SPACE;
      }
    });
  }

  private generateMapTemplate() {
    // Make a map sized array of arrays. Arranged as a[x][y]. On screen, Y "ascends" DOWNWARDS
    const template = intRange(this.mapConfig.xMax + 1)
      .map(i => <GridsCell[]>intRange(this.mapConfig.yMax + 1)
        .map(j => <GridsCell>({
          x: i,
          y: j,
          nearCells: new NearCells(),
          ipInfo: new ImageProcessingInfo(),
        })));


    const flatTemplate = flatMap<GridsCell>(template);
    // Setup neighbour cells for every cell, and landscape template data
    flatTemplate.forEach(gc => {
      gc.nearCells.above = template[gc.x][gc.y - 1];
      gc.nearCells.below = template[gc.x][gc.y + 1];
      gc.nearCells.left = (template[gc.x - 1] || [])[gc.y];
      gc.nearCells.right = (template[gc.x + 1] || [])[gc.y];

      const zoom = 0.2;
      gc.ipInfo.srcValue = this.simplex.noise2D(gc.x * zoom, gc.y * zoom) * 0.5 + 0.5;

      // Deprecated
      gc.cellAboveMe = <GridsCell>{};
      gc.cellBelowMe = <GridsCell>{};
    });
    return {template, flatTemplate};
  }


}


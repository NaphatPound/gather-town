import Phaser from "phaser";
import ObjectManager from "./objects/ObjectManager";
import RemotePlayerManager from "./RemotePlayerManager";
import BallEntity from "./BallEntity";
import { networkService, type PlayerData } from "../../core/network/NetworkService";
import { generateSpriteSheet, ANIM_CONFIG } from "./SpriteSheetGenerator";
import { mobileInput } from "./mobileInput";

const TILE_SIZE = 32;
const MAP_WIDTH = 40;
const MAP_HEIGHT = 15;
const PLAYER_SPEED = 160;
const SPRINT_SPEED = 280;

export default class MainScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private avatarDataURL: string = "";
  private avatarConfig!: { body: string; outfit: string; hair: string; accessory: string };
  private playerName: string = "Guest";
  private groundLayer!: Phaser.Tilemaps.TilemapLayer;
  private objectManager!: ObjectManager;
  private remotePlayerManager!: RemotePlayerManager;
  private ball!: BallEntity;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private shiftKey!: Phaser.Input.Keyboard.Key;
  private facingX = 0;
  private facingY = 1; // default facing down
  private charge = 0;
  private isCharging = false;
  private chargeBar!: Phaser.GameObjects.Graphics;
  private playerState: "idle" | "walk" | "run" | "kick" = "idle";

  // Bound handlers for cleanup
  private onPlayersExisting = (players: PlayerData[]) => {
    console.log(`[MainScene] players:existing received. Count: ${players.length}, my id: ${networkService.id}`);
    for (const p of players) {
      console.log(`[MainScene]  - player id=${p.id}, name=${p.name}, skip=${p.id === networkService.id}`);
      if (p.id !== networkService.id) {
        this.remotePlayerManager.addPlayer(p.id, p.name, p.avatar, p.x, p.y);
      }
    }
  };
  private onPlayerJoined = (p: PlayerData) => {
    console.log(`[MainScene] player:joined id=${p.id}, name=${p.name}`);
    this.remotePlayerManager.addPlayer(p.id, p.name, p.avatar, p.x, p.y);
  };
  private onPlayerMoved = (data: { id: string; x: number; y: number }) => {
    this.remotePlayerManager.movePlayer(data.id, data.x, data.y);
  };
  private onPlayerLeft = (data: { id: string }) => {
    this.remotePlayerManager.removePlayer(data.id);
  };

  constructor(avatarDataURL: string, avatarConfig: { body: string; outfit: string; hair: string; accessory: string }, playerName: string) {
    super({ key: "MainScene" });
    this.avatarDataURL = avatarDataURL;
    this.avatarConfig = avatarConfig;
    this.playerName = playerName;
  }

  preload() {
    // Generate tileset programmatically
    this.generateTileset();
  }

  private generateTileset() {
    // Create grass tile
    const grassCanvas = document.createElement("canvas");
    grassCanvas.width = TILE_SIZE;
    grassCanvas.height = TILE_SIZE;
    const gCtx = grassCanvas.getContext("2d")!;
    gCtx.fillStyle = "#4a7c59";
    gCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    // Grass detail
    gCtx.fillStyle = "#5a8c69";
    for (let i = 0; i < 8; i++) {
      const x = Math.floor(Math.random() * 30);
      const y = Math.floor(Math.random() * 30);
      gCtx.fillRect(x, y, 2, 2);
    }
    this.textures.addCanvas("tile-grass", grassCanvas);

    // Create path tile
    const pathCanvas = document.createElement("canvas");
    pathCanvas.width = TILE_SIZE;
    pathCanvas.height = TILE_SIZE;
    const pCtx = pathCanvas.getContext("2d")!;
    pCtx.fillStyle = "#c2a66b";
    pCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    pCtx.fillStyle = "#b8995e";
    for (let i = 0; i < 5; i++) {
      const x = Math.floor(Math.random() * 28);
      const y = Math.floor(Math.random() * 28);
      pCtx.fillRect(x, y, 3, 2);
    }
    this.textures.addCanvas("tile-path", pathCanvas);

    // Create wall tile
    const wallCanvas = document.createElement("canvas");
    wallCanvas.width = TILE_SIZE;
    wallCanvas.height = TILE_SIZE;
    const wCtx = wallCanvas.getContext("2d")!;
    wCtx.fillStyle = "#5a5a6e";
    wCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    wCtx.fillStyle = "#4a4a5e";
    wCtx.fillRect(1, 1, TILE_SIZE - 2, TILE_SIZE - 2);
    wCtx.fillStyle = "#6a6a7e";
    wCtx.fillRect(2, 2, TILE_SIZE - 4, 2);
    this.textures.addCanvas("tile-wall", wallCanvas);

    // Create floor tile
    const floorCanvas = document.createElement("canvas");
    floorCanvas.width = TILE_SIZE;
    floorCanvas.height = TILE_SIZE;
    const fCtx = floorCanvas.getContext("2d")!;
    fCtx.fillStyle = "#8B7355";
    fCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    fCtx.strokeStyle = "#7a6245";
    fCtx.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
    this.textures.addCanvas("tile-floor", floorCanvas);

    // Create field grass tile (darker green for football field)
    const fieldCanvas = document.createElement("canvas");
    fieldCanvas.width = TILE_SIZE;
    fieldCanvas.height = TILE_SIZE;
    const fiCtx = fieldCanvas.getContext("2d")!;
    fiCtx.fillStyle = "#2d6e3f";
    fiCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    fiCtx.fillStyle = "#358249";
    for (let i = 0; i < 6; i++) {
      const x = Math.floor(Math.random() * 30);
      const y = Math.floor(Math.random() * 30);
      fiCtx.fillRect(x, y, 2, 2);
    }
    this.textures.addCanvas("tile-fieldgrass", fieldCanvas);

    // Create goal-left tile (net pattern, blue tint)
    const goalLCanvas = document.createElement("canvas");
    goalLCanvas.width = TILE_SIZE;
    goalLCanvas.height = TILE_SIZE;
    const glCtx = goalLCanvas.getContext("2d")!;
    glCtx.fillStyle = "#2d6e3f";
    glCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    glCtx.strokeStyle = "#ffffffaa";
    glCtx.lineWidth = 1;
    for (let i = 0; i < TILE_SIZE; i += 6) {
      glCtx.beginPath(); glCtx.moveTo(i, 0); glCtx.lineTo(i, TILE_SIZE); glCtx.stroke();
      glCtx.beginPath(); glCtx.moveTo(0, i); glCtx.lineTo(TILE_SIZE, i); glCtx.stroke();
    }
    glCtx.fillStyle = "#4488ff33";
    glCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    this.textures.addCanvas("tile-goal-left", goalLCanvas);

    // Create goal-right tile (net pattern, red tint)
    const goalRCanvas = document.createElement("canvas");
    goalRCanvas.width = TILE_SIZE;
    goalRCanvas.height = TILE_SIZE;
    const grCtx = goalRCanvas.getContext("2d")!;
    grCtx.fillStyle = "#2d6e3f";
    grCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    grCtx.strokeStyle = "#ffffffaa";
    grCtx.lineWidth = 1;
    for (let i = 0; i < TILE_SIZE; i += 6) {
      grCtx.beginPath(); grCtx.moveTo(i, 0); grCtx.lineTo(i, TILE_SIZE); grCtx.stroke();
      grCtx.beginPath(); grCtx.moveTo(0, i); grCtx.lineTo(TILE_SIZE, i); grCtx.stroke();
    }
    grCtx.fillStyle = "#ff444433";
    grCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    this.textures.addCanvas("tile-goal-right", goalRCanvas);
  }

  create() {
    // Build simple map
    this.buildMap();

    // Create player sprite
    const startX = 17 * TILE_SIZE + TILE_SIZE / 2;
    const startY = 7 * TILE_SIZE + TILE_SIZE / 2;

    // Create fallback texture first
    const graphics = this.add.graphics();
    graphics.fillStyle(0x3498db);
    graphics.fillRect(0, 0, 32, 32);
    graphics.generateTexture("player-fallback", 32, 32);
    graphics.destroy();

    this.player = this.add.sprite(startX, startY, "player-fallback");
    this.player.setDepth(10);

    // Generate sprite sheet from avatar and set up animations
    this.loadSpriteSheet();

    // Set up camera (zoom 2x for better visibility of pixel art)
    this.cameras.main.setZoom(2);
    this.cameras.main.setBounds(
      0,
      0,
      MAP_WIDTH * TILE_SIZE,
      MAP_HEIGHT * TILE_SIZE
    );
    // Snap camera to player instantly, then enable smooth follow
    this.cameras.main.centerOn(this.player.x, this.player.y);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Handle window resize so the camera viewport stays in sync
    this.scale.on("resize", (gameSize: Phaser.Structs.Size) => {
      this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
    });

    // Set up input without global capture so HTML inputs work
    this.cursors = {
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP, false),
      down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN, false),
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT, false),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT, false),
      space: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE, false),
      shift: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT, false),
    } as Phaser.Types.Input.Keyboard.CursorKeys;

    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W, false),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A, false),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S, false),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D, false),
    };

    // Spacebar for charged kick
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE, false);
    // Shift for sprint
    this.shiftKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT, false);

    // Charge bar graphic (hidden initially)
    this.chargeBar = this.add.graphics();
    this.chargeBar.setDepth(12);

    // Add player name label
    const nameText = this.add.text(startX, startY - 20, this.playerName, {
      fontSize: "7px",
      color: "#ffffff",
      backgroundColor: "#00000088",
      padding: { x: 2, y: 1 },
    });
    nameText.setOrigin(0.5);
    nameText.setDepth(11);

    // Make name follow player
    this.events.on("update", () => {
      nameText.setPosition(this.player.x, this.player.y - 20);
    });

    // Initialize interactive objects
    this.objectManager = new ObjectManager(this);
    this.objectManager.init().then(() => {
      // Stamp solid object tiles into mapData for collision
      const mapData = this.data.get("mapData") as number[][];
      for (const tile of this.objectManager.getSolidTiles()) {
        if (tile.y >= 0 && tile.y < MAP_HEIGHT && tile.x >= 0 && tile.x < MAP_WIDTH) {
          mapData[tile.y][tile.x] = 2;
        }
      }
    });

    // Kickable ball
    this.ball = new BallEntity(this, 30, 7);

    // --- Multiplayer ---
    this.remotePlayerManager = new RemotePlayerManager(this);

    networkService.on("players:existing", this.onPlayersExisting);
    networkService.on("player:joined", this.onPlayerJoined);
    networkService.on("player:moved", this.onPlayerMoved);
    networkService.on("player:left", this.onPlayerLeft);

    networkService.joinGame(this.avatarConfig, this.playerName, startX, startY);

    // Cleanup on scene shutdown
    this.events.on("shutdown", () => {
      networkService.off("players:existing", this.onPlayersExisting);
      networkService.off("player:joined", this.onPlayerJoined);
      networkService.off("player:moved", this.onPlayerMoved);
      networkService.off("player:left", this.onPlayerLeft);
      this.remotePlayerManager.destroyAll();
      this.ball.destroy();
    });
  }

  private buildMap() {
    // Map layout: 0=grass, 1=path, 2=wall, 3=floor, 4=goal_left, 5=goal_right
    const TOWN_W = 20;
    const mapData: number[][] = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
      const row: number[] = [];
      for (let x = 0; x < MAP_WIDTH; x++) {
        // ── TOWN area (x=0-19) ──
        if (x < TOWN_W) {
          // Town walls — right wall (x=19) open at y=6-8
          if (x === 0 || y === 0 || y === MAP_HEIGHT - 1) {
            row.push(2);
          } else if (x === TOWN_W - 1) {
            if (y >= 6 && y <= 8) {
              row.push(1); // opening to field
            } else {
              row.push(2);
            }
          }
          // Building in top-right (door at x=16, y=5)
          else if (x >= 14 && x <= 18 && y >= 2 && y <= 5) {
            if (
              (x === 14 || x === 18 || y === 2 || y === 5) &&
              !(x === 16 && y === 5)
            ) {
              row.push(2);
            } else {
              row.push(3);
            }
          }
          // Paths
          else if (
            y === 7 ||
            (x === 10 && y >= 3 && y <= 12) ||
            (x === 16 && y === 6)
          ) {
            row.push(1);
          } else {
            row.push(0);
          }
        }
        // ── FIELD area (x=20-39) ──
        else {
          // Top and bottom walls
          if (y === 0 || y === MAP_HEIGHT - 1) {
            row.push(2);
          }
          // Left goal zone (x=20)
          else if (x === 20) {
            if (y >= 5 && y <= 9) {
              row.push(4); // goal_left
            } else if (y === 4 || y === 10) {
              row.push(2); // goal post
            } else {
              row.push(2); // side wall
            }
          }
          // Right goal zone (x=39)
          else if (x === 39) {
            if (y >= 5 && y <= 9) {
              row.push(5); // goal_right
            } else if (y === 4 || y === 10) {
              row.push(2); // goal post
            } else {
              row.push(2); // side wall
            }
          }
          // Field interior
          else {
            row.push(0); // field grass (rendered differently below)
          }
        }
      }
      mapData.push(row);
    }

    const tileTextures: Record<number, string> = {
      0: "tile-grass",
      1: "tile-path",
      2: "tile-wall",
      3: "tile-floor",
      4: "tile-goal-left",
      5: "tile-goal-right",
    };

    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        // Use field grass texture for interior field tiles
        let tileKey = tileTextures[mapData[y][x]];
        if (mapData[y][x] === 0 && x >= TOWN_W) {
          tileKey = "tile-fieldgrass";
        }
        this.add
          .image(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, tileKey)
          .setDepth(0);
      }
    }

    // ── Draw field line markings ──
    this.drawFieldLines(TOWN_W);

    // Store collision data
    this.data.set("mapData", mapData);
  }

  private drawFieldLines(fieldStartX: number) {
    const gfx = this.add.graphics();
    gfx.setDepth(1);
    gfx.lineStyle(2, 0xffffff, 0.7);

    const fLeft = fieldStartX * TILE_SIZE;
    const fRight = MAP_WIDTH * TILE_SIZE;
    const fTop = 1 * TILE_SIZE;       // y=1 (below top wall)
    const fBottom = (MAP_HEIGHT - 1) * TILE_SIZE; // y=14 (above bottom wall)
    const fieldW = fRight - fLeft;
    const fieldH = fBottom - fTop;
    const midX = fLeft + fieldW / 2;
    const midY = fTop + fieldH / 2;

    // Outer boundary
    gfx.strokeRect(fLeft + TILE_SIZE, fTop, fieldW - 2 * TILE_SIZE, fieldH);

    // Center line
    gfx.beginPath();
    gfx.moveTo(midX, fTop);
    gfx.lineTo(midX, fBottom);
    gfx.strokePath();

    // Center circle
    gfx.strokeCircle(midX, midY, TILE_SIZE * 2.5);

    // Center dot
    gfx.fillStyle(0xffffff, 0.7);
    gfx.fillCircle(midX, midY, 3);

    // Left penalty area
    gfx.strokeRect(fLeft + TILE_SIZE, midY - 3 * TILE_SIZE, 3 * TILE_SIZE, 6 * TILE_SIZE);

    // Right penalty area
    gfx.strokeRect(fRight - 4 * TILE_SIZE, midY - 3 * TILE_SIZE, 3 * TILE_SIZE, 6 * TILE_SIZE);

    // Goal area boxes (smaller, inside penalty)
    gfx.strokeRect(fLeft + TILE_SIZE, midY - 1.5 * TILE_SIZE, 1.5 * TILE_SIZE, 3 * TILE_SIZE);
    gfx.strokeRect(fRight - 2.5 * TILE_SIZE, midY - 1.5 * TILE_SIZE, 1.5 * TILE_SIZE, 3 * TILE_SIZE);
  }

  private async loadSpriteSheet() {
    try {
      const sheetCanvas = await generateSpriteSheet(this.avatarConfig);

      // Convert canvas to base64 image
      const base64 = sheetCanvas.toDataURL("image/png");

      if (this.textures.exists("player-sheet")) {
        this.textures.remove("player-sheet");
      }

      const img = new Image();
      img.onload = () => {
        if (!this.sys || !this.sys.game || !this.textures || !this.anims) return;

        // Add the image directly as a simple texture
        const tex = this.textures.addImage("player-sheet", img);

        if (tex) {
          // Manually define frames: sprite sheet is a single row of 12 frames (384×32)
          for (let i = 0; i < 12; i++) {
            tex.add(i.toString(), 0, i * 32, 0, 32, 32);
          }
        }

        const animKeys = ["player-idle", "player-walk", "player-run", "player-kick"] as const;
        const configs = [ANIM_CONFIG.idle, ANIM_CONFIG.walk, ANIM_CONFIG.run, ANIM_CONFIG.kick];

        for (let i = 0; i < animKeys.length; i++) {
          if (this.anims.exists(animKeys[i])) this.anims.remove(animKeys[i]);

          const frameStart = configs[i].start;
          const frameEnd = configs[i].end;
          const frames = [];
          for (let f = frameStart; f <= frameEnd; f++) {
            frames.push({ key: "player-sheet", frame: f.toString() });
          }

          this.anims.create({
            key: animKeys[i],
            frames: frames,
            frameRate: configs[i].frameRate,
            repeat: configs[i].repeat,
          });
        }

        if (this.player && this.player.active) {
          this.player.setTexture("player-sheet");
          this.player.setSize(32, 32);
          this.player.setDisplaySize(32, 32);
          this.player.play("player-idle");

          this.player.on("animationcomplete-player-kick", () => {
            this.playerState = "idle";
          });
        }
      };
      img.onerror = (e) => {
        console.error("MainScene Image base64 failed to load", e);
      }
      img.src = base64;
    } catch (e) {
      // Fallback: keep the blue square if sprite sheet generation fails
      console.warn("Sprite sheet generation failed, using fallback", e);
    }
  }

  update() {
    if (!this.player) return;

    let vx = 0;
    let vy = 0;
    const speed = (this.shiftKey.isDown || mobileInput.sprint) ? SPRINT_SPEED : PLAYER_SPEED;

    // Don't capture WASD and space if user is typing in an input or textarea
    const activeElement = document.activeElement;
    const isTyping =
      activeElement &&
      (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA");

    if (!isTyping) {
      if (this.cursors.left.isDown || this.wasd.A.isDown) vx = -speed;
      else if (this.cursors.right.isDown || this.wasd.D.isDown) vx = speed;

      if (this.cursors.up.isDown || this.wasd.W.isDown) vy = -speed;
      else if (this.cursors.down.isDown || this.wasd.S.isDown) vy = speed;

      // Analog joystick overrides keyboard when active
      if (mobileInput.active) {
        vx = mobileInput.dirX * speed;
        vy = mobileInput.dirY * speed;
      }
    }

    // Track facing direction (only update when moving)
    if (vx !== 0 || vy !== 0) {
      const len = Math.sqrt(vx * vx + vy * vy);
      this.facingX = vx / len;
      this.facingY = vy / len;
    }

    const isMoving = vx !== 0 || vy !== 0;

    // Normalize diagonal movement
    if (vx !== 0 && vy !== 0) {
      vx *= 0.707;
      vy *= 0.707;
    }

    const dt = this.game.loop.delta / 1000;

    // ── Charge kick logic ──
    if ((this.spaceKey.isDown || mobileInput.shoot) && !isTyping) {
      if (!this.isCharging) {
        this.isCharging = true;
        this.charge = 0;
      }
      // Charge rate: fast when still (1.2/s), slow when moving (0.35/s)
      const chargeRate = isMoving ? 0.35 : 1.2;
      this.charge = Math.min(1, this.charge + chargeRate * dt);
    } else if (this.isCharging) {
      // Spacebar released → perform charged kick
      this.isCharging = false;
      if (this.ball) {
        this.ball.chargedKick(this.facingX, this.facingY, this.charge, this.player.x, this.player.y);
      }
      this.charge = 0;
      // Play kick animation (one-shot)
      if (this.playerState !== "kick") {
        this.playerState = "kick";
        this.player.play("player-kick");
      }
    }

    // Draw charge bar
    this.chargeBar.clear();
    if (this.isCharging && this.charge > 0) {
      const barW = 24;
      const barH = 4;
      const bx = this.player.x - barW / 2;
      const by = this.player.y + 18;

      // Background
      this.chargeBar.fillStyle(0x000000, 0.6);
      this.chargeBar.fillRect(bx - 1, by - 1, barW + 2, barH + 2);

      // Fill — yellow → orange → red
      const r = Math.min(255, Math.floor(255));
      const g = Math.max(0, Math.floor(255 * (1 - this.charge)));
      const color = (r << 16) | (g << 8) | 0;
      this.chargeBar.fillStyle(color, 1);
      this.chargeBar.fillRect(bx, by, barW * this.charge, barH);
    }

    // ── Animation state ──
    if (this.playerState !== "kick") {
      let newState: "idle" | "walk" | "run" = "idle";
      if (isMoving) {
        newState = (this.shiftKey.isDown || mobileInput.sprint) ? "run" : "walk";
      }
      if (newState !== this.playerState) {
        this.playerState = newState;
        this.player.play("player-" + newState);
      }
    }

    // Flip sprite based on horizontal facing
    if (vx < 0) this.player.setFlipX(true);
    else if (vx > 0) this.player.setFlipX(false);

    const newX = this.player.x + vx * dt;
    const newY = this.player.y + vy * dt;

    // Simple collision with walls
    const mapData = this.data.get("mapData") as number[][];
    const tileX = Math.floor(newX / TILE_SIZE);
    const tileY = Math.floor(newY / TILE_SIZE);

    if (
      tileX >= 0 &&
      tileX < MAP_WIDTH &&
      tileY >= 0 &&
      tileY < MAP_HEIGHT &&
      mapData[tileY][tileX] !== 2
    ) {
      this.player.x = newX;
      this.player.y = newY;
    }

    // Update object proximity detection
    if (this.objectManager) {
      this.objectManager.update(this.player.x, this.player.y);
    }

    // Update ball physics
    if (this.ball) {
      this.ball.update(dt, this.player.x, this.player.y);
    }

    // Send position to server + interpolate remote players
    networkService.sendMove(this.player.x, this.player.y);
    this.remotePlayerManager.update();
  }
}

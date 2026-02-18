import Phaser from "phaser";
import ObjectManager from "./objects/ObjectManager";
import RemotePlayerManager from "./RemotePlayerManager";
import { networkService, type PlayerData } from "../../core/network/NetworkService";

const TILE_SIZE = 32;
const MAP_WIDTH = 20;
const MAP_HEIGHT = 15;
const PLAYER_SPEED = 160;

export default class MainScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private avatarDataURL: string = "";
  private playerName: string = "Guest";
  private groundLayer!: Phaser.Tilemaps.TilemapLayer;
  private objectManager!: ObjectManager;
  private remotePlayerManager!: RemotePlayerManager;

  // Bound handlers for cleanup
  private onPlayersExisting = (players: PlayerData[]) => {
    for (const p of players) {
      if (p.id !== networkService.id) {
        this.remotePlayerManager.addPlayer(p.id, p.name, p.avatar, p.x, p.y);
      }
    }
  };
  private onPlayerJoined = (p: PlayerData) => {
    this.remotePlayerManager.addPlayer(p.id, p.name, p.avatar, p.x, p.y);
  };
  private onPlayerMoved = (data: { id: string; x: number; y: number }) => {
    this.remotePlayerManager.movePlayer(data.id, data.x, data.y);
  };
  private onPlayerLeft = (data: { id: string }) => {
    this.remotePlayerManager.removePlayer(data.id);
  };

  constructor(avatarDataURL: string, playerName: string) {
    super({ key: "MainScene" });
    this.avatarDataURL = avatarDataURL;
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
  }

  create() {
    // Build simple map
    this.buildMap();

    // Create player sprite
    const startX = 10 * TILE_SIZE + TILE_SIZE / 2;
    const startY = 7 * TILE_SIZE + TILE_SIZE / 2;

    // Create fallback texture first
    const graphics = this.add.graphics();
    graphics.fillStyle(0x3498db);
    graphics.fillRect(0, 0, 32, 32);
    graphics.generateTexture("player-fallback", 32, 32);
    graphics.destroy();

    this.player = this.add.sprite(startX, startY, "player-fallback");

    // Load avatar from data URL and swap texture when ready
    if (this.avatarDataURL) {
      const img = new Image();
      img.onload = () => {
        const avatarCanvas = document.createElement("canvas");
        avatarCanvas.width = img.width;
        avatarCanvas.height = img.height;
        const ctx = avatarCanvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        if (this.textures.exists("player-avatar")) {
          this.textures.remove("player-avatar");
        }
        this.textures.addCanvas("player-avatar", avatarCanvas);
        this.player.setTexture("player-avatar");
        this.player.setScale(TILE_SIZE / img.width);
      };
      img.src = this.avatarDataURL;
    }

    this.player.setDepth(10);

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

    // Set up input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

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

    // --- Multiplayer ---
    this.remotePlayerManager = new RemotePlayerManager(this);

    networkService.on("players:existing", this.onPlayersExisting);
    networkService.on("player:joined", this.onPlayerJoined);
    networkService.on("player:moved", this.onPlayerMoved);
    networkService.on("player:left", this.onPlayerLeft);

    networkService.joinGame(this.avatarDataURL, this.playerName, startX, startY);

    // Cleanup on scene shutdown
    this.events.on("shutdown", () => {
      networkService.off("players:existing", this.onPlayersExisting);
      networkService.off("player:joined", this.onPlayerJoined);
      networkService.off("player:moved", this.onPlayerMoved);
      networkService.off("player:left", this.onPlayerLeft);
      this.remotePlayerManager.destroyAll();
    });
  }

  private buildMap() {
    // Simple map layout: 0=grass, 1=path, 2=wall, 3=floor
    const mapData: number[][] = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
      const row: number[] = [];
      for (let x = 0; x < MAP_WIDTH; x++) {
        // Walls around the edge
        if (x === 0 || x === MAP_WIDTH - 1 || y === 0 || y === MAP_HEIGHT - 1) {
          row.push(2);
        }
        // Building in top-right (door at x=16, y=5)
        else if (x >= 14 && x <= 18 && y >= 2 && y <= 5) {
          if (
            (x === 14 || x === 18 || y === 2 || y === 5) &&
            !(x === 16 && y === 5) // door gap
          ) {
            row.push(2); // walls
          } else {
            row.push(3); // floor
          }
        }
        // Path through middle + branch to building door
        else if (
          y === 7 ||
          (x === 10 && y >= 3 && y <= 12) ||
          (x === 16 && y === 6)
        ) {
          row.push(1);
        }
        // Grass everywhere else
        else {
          row.push(0);
        }
      }
      mapData.push(row);
    }

    const tileTextures = ["tile-grass", "tile-path", "tile-wall", "tile-floor"];
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tileKey = tileTextures[mapData[y][x]];
        this.add
          .image(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, tileKey)
          .setDepth(0);
      }
    }

    // Store collision data
    this.data.set("mapData", mapData);
  }

  update() {
    if (!this.player) return;

    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown || this.wasd.A.isDown) vx = -PLAYER_SPEED;
    else if (this.cursors.right.isDown || this.wasd.D.isDown) vx = PLAYER_SPEED;

    if (this.cursors.up.isDown || this.wasd.W.isDown) vy = -PLAYER_SPEED;
    else if (this.cursors.down.isDown || this.wasd.S.isDown) vy = PLAYER_SPEED;

    // Normalize diagonal movement
    if (vx !== 0 && vy !== 0) {
      vx *= 0.707;
      vy *= 0.707;
    }

    const dt = this.game.loop.delta / 1000;
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

    // Send position to server + interpolate remote players
    networkService.sendMove(this.player.x, this.player.y);
    this.remotePlayerManager.update();
  }
}

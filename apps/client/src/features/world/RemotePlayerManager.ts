import Phaser from "phaser";

const TILE_SIZE = 32;
const LERP_FACTOR = 0.15;

interface RemotePlayer {
  sprite: Phaser.GameObjects.Sprite;
  nameLabel: Phaser.GameObjects.Text;
  targetX: number;
  targetY: number;
}

export default class RemotePlayerManager {
  private scene: Phaser.Scene;
  private players = new Map<string, RemotePlayer>();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  addPlayer(id: string, name: string, avatarDataURL: string, x: number, y: number) {
    if (this.players.has(id)) return;

    // Create a fallback texture for this remote player
    const fallbackKey = `remote-fallback-${id}`;
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0xe74c3c);
    graphics.fillRect(0, 0, 32, 32);
    graphics.generateTexture(fallbackKey, 32, 32);
    graphics.destroy();

    const sprite = this.scene.add.sprite(x, y, fallbackKey);
    sprite.setDepth(10);

    // Load the actual avatar texture
    if (avatarDataURL) {
      const texKey = `remote-avatar-${id}`;
      const img = new Image();
      img.onload = () => {
        // Player may have left before image loaded
        if (!this.players.has(id)) return;
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        if (this.scene.textures.exists(texKey)) {
          this.scene.textures.remove(texKey);
        }
        this.scene.textures.addCanvas(texKey, canvas);
        sprite.setTexture(texKey);
        sprite.setScale(TILE_SIZE / img.width);
      };
      img.src = avatarDataURL;
    }

    const nameLabel = this.scene.add.text(x, y - 20, name, {
      fontSize: "7px",
      color: "#ffffff",
      backgroundColor: "#00000088",
      padding: { x: 2, y: 1 },
    });
    nameLabel.setOrigin(0.5);
    nameLabel.setDepth(11);

    this.players.set(id, { sprite, nameLabel, targetX: x, targetY: y });
  }

  movePlayer(id: string, x: number, y: number) {
    const rp = this.players.get(id);
    if (!rp) return;
    rp.targetX = x;
    rp.targetY = y;
  }

  removePlayer(id: string) {
    const rp = this.players.get(id);
    if (!rp) return;

    rp.sprite.destroy();
    rp.nameLabel.destroy();

    // Clean up textures
    const fallbackKey = `remote-fallback-${id}`;
    const avatarKey = `remote-avatar-${id}`;
    if (this.scene.textures.exists(fallbackKey)) {
      this.scene.textures.remove(fallbackKey);
    }
    if (this.scene.textures.exists(avatarKey)) {
      this.scene.textures.remove(avatarKey);
    }

    this.players.delete(id);
  }

  update() {
    for (const rp of this.players.values()) {
      rp.sprite.x += (rp.targetX - rp.sprite.x) * LERP_FACTOR;
      rp.sprite.y += (rp.targetY - rp.sprite.y) * LERP_FACTOR;
      rp.nameLabel.setPosition(rp.sprite.x, rp.sprite.y - 20);
    }
  }

  destroyAll() {
    for (const id of this.players.keys()) {
      this.removePlayer(id);
    }
  }
}

import Phaser from "phaser";
import { generateSpriteSheet, ANIM_CONFIG } from "./SpriteSheetGenerator";

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

  addPlayer(id: string, name: string, avatarConfig: { body: string; outfit: string; hair: string; accessory: string }, x: number, y: number) {
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

    // Load the actual avatar texture through spritesheet generation
    if (avatarConfig) {
      const texKey = `remote-avatar-${id}`;

      generateSpriteSheet(avatarConfig).then((canvas) => {
        if (!this.scene || !this.scene.sys || !this.scene.sys.game || !this.scene.textures || !this.players.has(id)) {
          console.warn("RemotePlayerManager: scene or game missing when sprite sheet loaded");
          return;
        }

        try {
          // Convert canvas to base64
          const base64 = canvas.toDataURL("image/png");

          if (this.scene.textures.exists(texKey)) {
            this.scene.textures.remove(texKey);
          }

          const img = new Image();
          img.onload = () => {
            if (!this.scene || !this.scene.sys || !this.scene.anims || !this.players.has(id)) return;

            // Add the image directly as a simple texture
            const tex = this.scene.textures.addImage(texKey, img);

            if (tex) {
              // Manually define frames: sprite sheet is a single row of 12 frames (384×32)
              for (let i = 0; i < 12; i++) {
                tex.add(i.toString(), 0, i * 32, 0, 32, 32);
              }
            }

            // Create remote player animations
            const animKeys = [`${id}-idle`, `${id}-walk`, `${id}-run`] as const;
            const configs = [ANIM_CONFIG.idle, ANIM_CONFIG.walk, ANIM_CONFIG.run];

            for (let i = 0; i < animKeys.length; i++) {
              if (this.scene.anims.exists(animKeys[i])) this.scene.anims.remove(animKeys[i]);

              const frameStart = configs[i].start;
              const frameEnd = configs[i].end;
              const frames = [];
              for (let f = frameStart; f <= frameEnd; f++) {
                frames.push({ key: texKey, frame: f.toString() });
              }

              this.scene.anims.create({
                key: animKeys[i],
                frames: frames,
                frameRate: configs[i].frameRate,
                repeat: configs[i].repeat,
              });
            }

            const p = this.players.get(id);
            if (p && p.sprite && p.sprite.active) {
              p.sprite.setTexture(texKey);
              p.sprite.setSize(32, 32);
              p.sprite.setDisplaySize(32, 32);
              p.sprite.play(`${id}-idle`);
            }
          };
          img.onerror = (e) => {
            console.error("RemotePlayerManager Image base64 failed to load", e);
          };
          img.src = base64;
        } catch (e) {
          console.warn("Failed to generate remote avatar texture", e);
        }
      }).catch((e) => {
        console.warn("Failed to generate remote sprite sheet", e);
      });
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
    for (const [id, rp] of this.players.entries()) {
      const dx = rp.targetX - rp.sprite.x;
      const dy = rp.targetY - rp.sprite.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      rp.sprite.x += dx * LERP_FACTOR;
      rp.sprite.y += dy * LERP_FACTOR;
      rp.nameLabel.setPosition(rp.sprite.x, rp.sprite.y - 20);

      // Handle animations
      if (dist > 1) {
        // Walk or run based on distance
        const animKey = dist > 5 ? `${id}-run` : `${id}-walk`;
        if (rp.sprite.anims && rp.sprite.anims.currentAnim?.key !== animKey && this.scene.anims.exists(animKey)) {
          rp.sprite.play(animKey, true);
        }

        // Flip sprite based on movement direction
        if (dx < 0) {
          rp.sprite.setFlipX(true);
        } else if (dx > 0) {
          rp.sprite.setFlipX(false);
        }
      } else {
        const animKey = `${id}-idle`;
        if (rp.sprite.anims && rp.sprite.anims.currentAnim?.key !== animKey && this.scene.anims.exists(animKey)) {
          rp.sprite.play(animKey, true);
        }
      }

      // Update Spatial Audio source position
      import("../../core/network/WebRTCManager").then(({ webrtcManager }) => {
        webrtcManager.updateRemotePlayerPosition(id, rp.sprite.x, rp.sprite.y);
      });
    }
  }

  destroyAll() {
    for (const id of this.players.keys()) {
      this.removePlayer(id);
    }
  }
}

import Phaser from "phaser";
import { networkService } from "../../core/network/NetworkService";

const TILE_SIZE = 32;
const MAP_WIDTH = 40;
const MAP_HEIGHT = 15;

const FRICTION = 0.97;
const MIN_SPEED = 5;
const KICK_SPEED = 320;
const KICK_DISTANCE = 20;
const CHARGED_KICK_DISTANCE = 40;
const CHARGED_KICK_MIN = 380;
const CHARGED_KICK_MAX = 750;
const BOUNCE_DAMPING = 0.75;
const BALL_SIZE = 16;

const CENTER_TILE_X = 30;
const CENTER_TILE_Y = 7;
const GOAL_COOLDOWN_MS = 1000;

export default class BallEntity {
  private sprite: Phaser.GameObjects.Sprite;
  private scene: Phaser.Scene;
  private vx = 0;
  private vy = 0;
  private goalCooldown = false;

  constructor(scene: Phaser.Scene, tileX: number, tileY: number) {
    this.scene = scene;

    // Generate pixel-art ball texture
    const gfx = scene.add.graphics();
    // Outer circle (dark border)
    gfx.fillStyle(0xcc3333);
    gfx.fillRect(4, 0, 8, 1);
    gfx.fillRect(2, 1, 12, 1);
    gfx.fillRect(1, 2, 14, 2);
    gfx.fillRect(0, 4, 16, 8);
    gfx.fillRect(1, 12, 14, 2);
    gfx.fillRect(2, 14, 12, 1);
    gfx.fillRect(4, 15, 8, 1);
    // Inner highlight
    gfx.fillStyle(0xff5555);
    gfx.fillRect(5, 2, 6, 1);
    gfx.fillRect(3, 3, 8, 2);
    gfx.fillRect(2, 5, 9, 3);
    gfx.fillRect(3, 8, 7, 2);
    // White shine
    gfx.fillStyle(0xffaaaa);
    gfx.fillRect(5, 3, 3, 2);
    gfx.fillRect(4, 5, 2, 2);

    gfx.generateTexture("ball", BALL_SIZE, BALL_SIZE);
    gfx.destroy();

    const px = tileX * TILE_SIZE + TILE_SIZE / 2;
    const py = tileY * TILE_SIZE + TILE_SIZE / 2;
    this.sprite = scene.add.sprite(px, py, "ball");
    this.sprite.setDepth(8);
  }

  private resetToCenter() {
    this.sprite.x = CENTER_TILE_X * TILE_SIZE + TILE_SIZE / 2;
    this.sprite.y = CENTER_TILE_Y * TILE_SIZE + TILE_SIZE / 2;
    this.vx = 0;
    this.vy = 0;
  }

  chargedKick(dirX: number, dirY: number, charge: number, playerX: number, playerY: number) {
    const dx = this.sprite.x - playerX;
    const dy = this.sprite.y - playerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > CHARGED_KICK_DISTANCE) return; // too far from ball

    const speed = CHARGED_KICK_MIN + (CHARGED_KICK_MAX - CHARGED_KICK_MIN) * charge;
    this.vx = dirX * speed;
    this.vy = dirY * speed;
  }

  update(dt: number, playerX: number, playerY: number) {
    // Kick detection
    const dx = this.sprite.x - playerX;
    const dy = this.sprite.y - playerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < KICK_DISTANCE && dist > 0) {
      const nx = dx / dist;
      const ny = dy / dist;
      this.vx = nx * KICK_SPEED;
      this.vy = ny * KICK_SPEED;
    }

    // Apply velocity
    this.sprite.x += this.vx * dt;
    this.sprite.y += this.vy * dt;

    // Wall bounce & goal detection
    const mapData = this.scene.data.get("mapData") as number[][];
    if (mapData) {
      const tileX = Math.floor(this.sprite.x / TILE_SIZE);
      const tileY = Math.floor(this.sprite.y / TILE_SIZE);

      // Goal detection (before wall collision)
      if (
        !this.goalCooldown &&
        tileX >= 0 && tileX < MAP_WIDTH &&
        tileY >= 0 && tileY < MAP_HEIGHT
      ) {
        const tileType = mapData[tileY][tileX];
        if (tileType === 4) {
          // Ball entered left goal → right team scores
          networkService.sendGoal("right");
          this.goalCooldown = true;
          this.resetToCenter();
          setTimeout(() => { this.goalCooldown = false; }, GOAL_COOLDOWN_MS);
          return;
        } else if (tileType === 5) {
          // Ball entered right goal → left team scores
          networkService.sendGoal("left");
          this.goalCooldown = true;
          this.resetToCenter();
          setTimeout(() => { this.goalCooldown = false; }, GOAL_COOLDOWN_MS);
          return;
        }
      }

      if (
        tileX < 0 || tileX >= MAP_WIDTH ||
        tileY < 0 || tileY >= MAP_HEIGHT ||
        mapData[tileY][tileX] === 2
      ) {
        // Revert position
        this.sprite.x -= this.vx * dt;
        this.sprite.y -= this.vy * dt;

        // Determine which axis to bounce
        const nextTX = Math.floor((this.sprite.x + this.vx * dt) / TILE_SIZE);
        const nextTY = Math.floor((this.sprite.y + this.vy * dt) / TILE_SIZE);
        const curTX = Math.floor(this.sprite.x / TILE_SIZE);
        const curTY = Math.floor(this.sprite.y / TILE_SIZE);

        const wallX =
          nextTX < 0 || nextTX >= MAP_WIDTH ||
          (nextTX !== curTX && mapData[curTY]?.[nextTX] === 2);
        const wallY =
          nextTY < 0 || nextTY >= MAP_HEIGHT ||
          (nextTY !== curTY && mapData[nextTY]?.[curTX] === 2);

        if (wallX) this.vx = -this.vx * BOUNCE_DAMPING;
        if (wallY) this.vy = -this.vy * BOUNCE_DAMPING;
        if (!wallX && !wallY) {
          // Corner hit — reverse both
          this.vx = -this.vx * BOUNCE_DAMPING;
          this.vy = -this.vy * BOUNCE_DAMPING;
        }
      }
    }

    // Friction
    this.vx *= FRICTION;
    this.vy *= FRICTION;

    // Stop when slow enough
    if (Math.abs(this.vx) < MIN_SPEED && Math.abs(this.vy) < MIN_SPEED) {
      this.vx = 0;
      this.vy = 0;
    }
  }

  destroy() {
    this.sprite.destroy();
  }
}

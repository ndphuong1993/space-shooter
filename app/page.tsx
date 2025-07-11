"use client"

import { useEffect, useRef } from "react"

export default function SpaceShooterGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<any>(null)

  useEffect(() => {
    if (canvasRef.current) {
      // Initialize the game
      gameRef.current = new SpaceShooter(canvasRef.current)
      gameRef.current.init()
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy()
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="border border-gray-600 max-w-full h-auto"
          style={{ imageRendering: "pixelated" }}
        />

        {/* Mobile Controls */}
        <div className="md:hidden absolute bottom-4 left-0 right-0 flex justify-between px-8">
          <div className="flex gap-4">
            <button
              id="leftBtn"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg touch-manipulation select-none"
              style={{ userSelect: "none" }}
            >
              ←
            </button>
            <button
              id="rightBtn"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg touch-manipulation select-none"
              style={{ userSelect: "none" }}
            >
              →
            </button>
          </div>
          <button
            id="shootBtn"
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-8 rounded-lg touch-manipulation select-none"
            style={{ userSelect: "none" }}
          >
            FIRE
          </button>
        </div>
      </div>
    </div>
  )
}

// Game Classes and Logic
class SpaceShooter {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  gameState: "menu" | "playing" | "gameOver"
  player: Player
  enemies: Enemy[]
  bullets: Bullet[]
  enemyBullets: Bullet[]
  particles: Particle[]
  score: number
  lives: number
  wave: number
  enemySpawnTimer: number
  enemySpawnDelay: number
  keys: { [key: string]: boolean }
  touchControls: { left: boolean; right: boolean; shoot: boolean }
  lastTime: number
  animationId: number | null
  highScore: number
  sounds: { [key: string]: AudioContext | null }
  audioContext: AudioContext | null

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext("2d")!
    this.gameState = "menu"
    this.player = new Player(canvas.width / 2, canvas.height - 50)
    this.enemies = []
    this.bullets = []
    this.enemyBullets = []
    this.particles = []
    this.score = 0
    this.lives = 3
    this.wave = 1
    this.enemySpawnTimer = 0
    this.enemySpawnDelay = 60
    this.keys = {}
    this.touchControls = { left: false, right: false, shoot: false }
    this.lastTime = 0
    this.animationId = null
    this.highScore = Number.parseInt(localStorage.getItem("spaceShooterHighScore") || "0")
    this.sounds = {}
    this.audioContext = null
  }

  init() {
    this.setupEventListeners()
    this.setupAudio()
    this.gameLoop(0)
  }

  setupAudio() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    } catch (e) {
      console.log("Audio not supported")
    }
  }

  playSound(frequency: number, duration: number, type: OscillatorType = "square") {
    if (!this.audioContext) return

    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)

    oscillator.frequency.value = frequency
    oscillator.type = type

    gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration)

    oscillator.start(this.audioContext.currentTime)
    oscillator.stop(this.audioContext.currentTime + duration)
  }

  setupEventListeners() {
    // Keyboard controls
    window.addEventListener("keydown", (e) => {
      this.keys[e.code] = true
      if (e.code === "Space") {
        e.preventDefault()
        if (this.gameState === "menu" || this.gameState === "gameOver") {
          this.startGame()
        }
      }
    })

    window.addEventListener("keyup", (e) => {
      this.keys[e.code] = false
    })

    // Touch controls
    const leftBtn = document.getElementById("leftBtn")
    const rightBtn = document.getElementById("rightBtn")
    const shootBtn = document.getElementById("shootBtn")

    if (leftBtn) {
      leftBtn.addEventListener("touchstart", (e) => {
        e.preventDefault()
        this.touchControls.left = true
      })
      leftBtn.addEventListener("touchend", (e) => {
        e.preventDefault()
        this.touchControls.left = false
      })
    }

    if (rightBtn) {
      rightBtn.addEventListener("touchstart", (e) => {
        e.preventDefault()
        this.touchControls.right = true
      })
      rightBtn.addEventListener("touchend", (e) => {
        e.preventDefault()
        this.touchControls.right = false
      })
    }

    if (shootBtn) {
      shootBtn.addEventListener("touchstart", (e) => {
        e.preventDefault()
        this.touchControls.shoot = true
        if (this.gameState === "menu" || this.gameState === "gameOver") {
          this.startGame()
        }
      })
      shootBtn.addEventListener("touchend", (e) => {
        e.preventDefault()
        this.touchControls.shoot = false
      })
    }

    // Canvas click for menu
    this.canvas.addEventListener("click", () => {
      if (this.gameState === "menu" || this.gameState === "gameOver") {
        this.startGame()
      }
    })
  }

  startGame() {
    this.gameState = "playing"
    this.score = 0
    this.lives = 3
    this.wave = 1
    this.player = new Player(this.canvas.width / 2, this.canvas.height - 50)
    this.enemies = []
    this.bullets = []
    this.enemyBullets = []
    this.particles = []
    this.enemySpawnTimer = 0
    this.enemySpawnDelay = 60
  }

  update(deltaTime: number) {
    if (this.gameState !== "playing") return

    // Update player
    this.player.update(this.keys, this.touchControls, this.canvas.width)

    // Player shooting
    if ((this.keys["Space"] || this.touchControls.shoot) && this.player.canShoot()) {
      this.bullets.push(new Bullet(this.player.x, this.player.y - 10, -8, "#00ff00"))
      this.player.lastShot = Date.now()
      this.playSound(800, 0.1)
    }

    // Spawn enemies
    this.enemySpawnTimer++
    if (this.enemySpawnTimer >= this.enemySpawnDelay) {
      this.spawnEnemy()
      this.enemySpawnTimer = 0
      // Increase difficulty
      if (this.enemySpawnDelay > 20) {
        this.enemySpawnDelay -= 0.5
      }
    }

    // Update enemies
    this.enemies.forEach((enemy, index) => {
      enemy.update()

      // Enemy shooting
      if (Math.random() < 0.005) {
        this.enemyBullets.push(new Bullet(enemy.x, enemy.y + 10, 4, "#ff0000"))
      }

      // Remove enemies that are off screen
      if (enemy.y > this.canvas.height) {
        this.enemies.splice(index, 1)
      }
    })

    // Update bullets
    this.bullets.forEach((bullet, index) => {
      bullet.update()
      if (bullet.y < 0) {
        this.bullets.splice(index, 1)
      }
    })

    this.enemyBullets.forEach((bullet, index) => {
      bullet.update()
      if (bullet.y > this.canvas.height) {
        this.enemyBullets.splice(index, 1)
      }
    })

    // Update particles
    this.particles.forEach((particle, index) => {
      particle.update()
      if (particle.life <= 0) {
        this.particles.splice(index, 1)
      }
    })

    // Collision detection
    this.checkCollisions()

    // Check game over
    if (this.lives <= 0) {
      this.gameOver()
    }
  }

  spawnEnemy() {
    const x = Math.random() * (this.canvas.width - 40) + 20
    const speed = 1 + Math.random() * 2 + this.wave * 0.2
    this.enemies.push(new Enemy(x, -30, speed))
  }

  checkCollisions() {
    // Player bullets vs enemies
    this.bullets.forEach((bullet, bulletIndex) => {
      this.enemies.forEach((enemy, enemyIndex) => {
        if (this.isColliding(bullet, enemy)) {
          // Create explosion particles
          this.createExplosion(enemy.x, enemy.y)

          // Remove bullet and enemy
          this.bullets.splice(bulletIndex, 1)
          this.enemies.splice(enemyIndex, 1)

          // Increase score
          this.score += 10
          this.playSound(300, 0.2)
        }
      })
    })

    // Enemy bullets vs player
    this.enemyBullets.forEach((bullet, bulletIndex) => {
      if (this.isColliding(bullet, this.player)) {
        this.enemyBullets.splice(bulletIndex, 1)
        this.lives--
        this.createExplosion(this.player.x, this.player.y)
        this.playSound(150, 0.5)
      }
    })

    // Enemies vs player
    this.enemies.forEach((enemy, enemyIndex) => {
      if (this.isColliding(enemy, this.player)) {
        this.enemies.splice(enemyIndex, 1)
        this.lives--
        this.createExplosion(this.player.x, this.player.y)
        this.playSound(150, 0.5)
      }
    })
  }

  isColliding(obj1: any, obj2: any): boolean {
    return (
      obj1.x < obj2.x + obj2.width &&
      obj1.x + obj1.width > obj2.x &&
      obj1.y < obj2.y + obj2.height &&
      obj1.y + obj1.height > obj2.y
    )
  }

  createExplosion(x: number, y: number) {
    for (let i = 0; i < 8; i++) {
      this.particles.push(new Particle(x, y))
    }
  }

  gameOver() {
    this.gameState = "gameOver"
    if (this.score > this.highScore) {
      this.highScore = this.score
      localStorage.setItem("spaceShooterHighScore", this.highScore.toString())
    }
  }

  render() {
    // Clear canvas
    this.ctx.fillStyle = "#000011"
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // Draw stars background
    this.drawStars()

    if (this.gameState === "menu") {
      this.drawMenu()
    } else if (this.gameState === "playing") {
      this.drawGame()
    } else if (this.gameState === "gameOver") {
      this.drawGameOver()
    }
  }

  drawStars() {
    this.ctx.fillStyle = "#ffffff"
    for (let i = 0; i < 50; i++) {
      const x = (i * 37) % this.canvas.width
      const y = (i * 23 + Date.now() * 0.01) % this.canvas.height
      this.ctx.fillRect(x, y, 1, 1)
    }
  }

  drawMenu() {
    this.ctx.fillStyle = "#00ff00"
    this.ctx.font = "48px monospace"
    this.ctx.textAlign = "center"
    this.ctx.fillText("GALAXY SHOOTER", this.canvas.width / 2, 200)

    this.ctx.fillStyle = "#ffffff"
    this.ctx.font = "24px monospace"
    this.ctx.fillText("Click or Press SPACE to Start", this.canvas.width / 2, 300)
    this.ctx.fillText(`High Score: ${this.highScore}`, this.canvas.width / 2, 350)

    this.ctx.font = "16px monospace"
    this.ctx.fillText("Use A/D or Arrow Keys to Move", this.canvas.width / 2, 400)
    this.ctx.fillText("Press SPACE to Shoot", this.canvas.width / 2, 420)
  }

  drawGame() {
    // Draw player
    this.player.draw(this.ctx)

    // Draw enemies
    this.enemies.forEach((enemy) => enemy.draw(this.ctx))

    // Draw bullets
    this.bullets.forEach((bullet) => bullet.draw(this.ctx))
    this.enemyBullets.forEach((bullet) => bullet.draw(this.ctx))

    // Draw particles
    this.particles.forEach((particle) => particle.draw(this.ctx))

    // Draw HUD
    this.drawHUD()
  }

  drawHUD() {
    this.ctx.fillStyle = "#ffffff"
    this.ctx.font = "20px monospace"
    this.ctx.textAlign = "left"
    this.ctx.fillText(`Score: ${this.score}`, 20, 30)
    this.ctx.fillText(`Lives: ${this.lives}`, 20, 60)
    this.ctx.fillText(`Wave: ${this.wave}`, 20, 90)
  }

  drawGameOver() {
    this.ctx.fillStyle = "#ff0000"
    this.ctx.font = "48px monospace"
    this.ctx.textAlign = "center"
    this.ctx.fillText("GAME OVER", this.canvas.width / 2, 200)

    this.ctx.fillStyle = "#ffffff"
    this.ctx.font = "24px monospace"
    this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, 280)
    this.ctx.fillText(`High Score: ${this.highScore}`, this.canvas.width / 2, 320)
    this.ctx.fillText("Click or Press SPACE to Restart", this.canvas.width / 2, 380)
  }

  gameLoop(currentTime: number) {
    const deltaTime = currentTime - this.lastTime
    this.lastTime = currentTime

    this.update(deltaTime)
    this.render()

    this.animationId = requestAnimationFrame((time) => this.gameLoop(time))
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }
  }
}

class Player {
  x: number
  y: number
  width: number
  height: number
  speed: number
  lastShot: number
  shootDelay: number

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
    this.width = 30
    this.height = 30
    this.speed = 5
    this.lastShot = 0
    this.shootDelay = 200
  }

  update(
    keys: { [key: string]: boolean },
    touch: { left: boolean; right: boolean; shoot: boolean },
    canvasWidth: number,
  ) {
    // Movement
    if (keys["KeyA"] || keys["ArrowLeft"] || touch.left) {
      this.x -= this.speed
    }
    if (keys["KeyD"] || keys["ArrowRight"] || touch.right) {
      this.x += this.speed
    }

    // Keep player in bounds
    this.x = Math.max(0, Math.min(canvasWidth - this.width, this.x))
  }

  canShoot(): boolean {
    return Date.now() - this.lastShot > this.shootDelay
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Draw player ship
    ctx.fillStyle = "#00ff00"
    ctx.fillRect(this.x, this.y, this.width, this.height)

    // Draw ship details
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(this.x + 5, this.y + 5, 20, 5)
    ctx.fillRect(this.x + 12, this.y, 6, 10)
  }
}

class Enemy {
  x: number
  y: number
  width: number
  height: number
  speed: number

  constructor(x: number, y: number, speed: number) {
    this.x = x
    this.y = y
    this.width = 25
    this.height = 25
    this.speed = speed
  }

  update() {
    this.y += this.speed
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Draw enemy ship
    ctx.fillStyle = "#ff0000"
    ctx.fillRect(this.x, this.y, this.width, this.height)

    // Draw enemy details
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(this.x + 5, this.y + 15, 15, 5)
    ctx.fillRect(this.x + 9, this.y + 20, 7, 5)
  }
}

class Bullet {
  x: number
  y: number
  width: number
  height: number
  speed: number
  color: string

  constructor(x: number, y: number, speed: number, color: string) {
    this.x = x
    this.y = y
    this.width = 4
    this.height = 10
    this.speed = speed
    this.color = color
  }

  update() {
    this.y += this.speed
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.color
    ctx.fillRect(this.x, this.y, this.width, this.height)
  }
}

class Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
    this.vx = (Math.random() - 0.5) * 8
    this.vy = (Math.random() - 0.5) * 8
    this.life = 30
    this.maxLife = 30
  }

  update() {
    this.x += this.vx
    this.y += this.vy
    this.life--
  }

  draw(ctx: CanvasRenderingContext2D) {
    const alpha = this.life / this.maxLife
    ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`
    ctx.fillRect(this.x, this.y, 3, 3)
  }
}

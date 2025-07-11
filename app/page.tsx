"use client"

import { useEffect, useRef, useState } from "react"

export default function SpaceShooterGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<any>(null)
  const [specialAbilityUsed, setSpecialAbilityUsed] = useState(false)

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
          width={1000}
          height={750}
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
          <div className="flex gap-4">
            <button
              id="specialBtn"
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-lg touch-manipulation select-none"
              style={{ userSelect: "none" }}
            >
              SPECIAL
            </button>
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
    </div>
  )
}

// Enhanced Game Classes and Logic
class SpaceShooter {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  gameState:
    | "mainMenu"
    | "playing"
    | "levelComplete"
    | "gameOver"
    | "paused"
    | "levelSelect"
    | "powerUpMenu"
    | "settingsMenu"
  player: Player
  enemies: Enemy[]
  bullets: Bullet[]
  enemyBullets: Bullet[]
  particles: Particle[]
  powerUps: PowerUp[]
  goldObjects: Gold[] // New: Gold objects
  explosions: Explosion[]
  level: Level
  currentLevel: number
  score: number
  lives: number
  enemySpawnTimer: number
  keys: { [key: string]: boolean }
  touchControls: { left: boolean; right: boolean; shoot: boolean; special: boolean }
  lastTime: number
  animationId: number | null
  highScore: number
  audioContext: AudioContext | null
  backgroundMusic: HTMLAudioElement | null // New: Background music
  musicVolume: number // New: Music volume setting
  sfxVolume: number // New: SFX volume setting
  backgroundOffset: number
  levelTransitionTimer: number
  gameTime: number
  canUseSpecialAbility: boolean
  usingSpecialAbility: boolean
  lastReachedLevel: number

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext("2d")!
    this.gameState = "mainMenu" // Start at main menu
    this.player = new Player(canvas.width / 2, canvas.height - 100)
    this.enemies = []
    this.bullets = []
    this.enemyBullets = []
    this.particles = []
    this.powerUps = []
    this.goldObjects = [] // Initialize gold objects array
    this.explosions = []
    this.currentLevel = 1
    this.level = new Level(this.currentLevel)
    this.score = 0
    this.lives = 3
    this.enemySpawnTimer = 0
    this.keys = {}
    this.touchControls = { left: false, right: false, shoot: false, special: false }
    this.lastTime = 0
    this.animationId = null
    this.highScore = Number.parseInt(localStorage.getItem("spaceShooterHighScore") || "0")
    this.lastReachedLevel = Number.parseInt(localStorage.getItem("spaceShooterLastLevel") || "1")
    this.audioContext = null
    this.backgroundMusic = null
    this.musicVolume = Number.parseFloat(localStorage.getItem("musicVolume") || "0.5")
    this.sfxVolume = Number.parseFloat(localStorage.getItem("sfxVolume") || "0.5")
    this.backgroundOffset = 0
    this.levelTransitionTimer = 0
    this.gameTime = 0
    this.canUseSpecialAbility = false
    this.usingSpecialAbility = false
  }

  async init() {
    this.setupEventListeners()
    this.setupAudio()
    this.loadBackgroundMusic()
    this.gameLoop(0)
  }

  setupAudio() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    } catch (e) {
      console.log("Audio not supported")
    }
  }

  loadBackgroundMusic() {
    try {
      // Revert to direct assignment of the static path
      this.backgroundMusic = new Audio("/public/audio/background-music.mp3")
      this.backgroundMusic.loop = true
      this.backgroundMusic.volume = this.musicVolume
      this.backgroundMusic.autoplay = false

      this.backgroundMusic.addEventListener("error", (e) => {
        console.error("Audio loading error event:", e)
        if (this.backgroundMusic && this.backgroundMusic.error) {
          console.error("Audio MediaError code:", this.backgroundMusic.error.code)
          console.error("Audio MediaError message:", this.backgroundMusic.error.message)
        } else {
          console.error("Audio MediaError object is null or undefined on error event.")
        }
      })

      this.backgroundMusic.addEventListener("canplaythrough", () => {
        console.log("Background music is ready to play.")
      })
    } catch (error) {
      console.error("Error loading background music:", error)
    }
  }

  playMusic() {
    if (!this.backgroundMusic) {
      console.warn("Background music object is null, cannot play.")
      return
    }

    // If already playing, do nothing
    if (!this.backgroundMusic.paused) {
      return
    }

    // Attempt to play
    const attemptPlay = () => {
      this.backgroundMusic!.play()
        .then(() => {
          console.log("Background music started successfully.")
        })
        .catch((e) => {
          console.error("Error attempting to play music:", e)
          if (e instanceof DOMException) {
            console.error("DOMException name:", e.name)
            console.error("DOMException message:", e.message)
            // Common autoplay error names: NotAllowedError, AbortError
            if (e.name === "NotAllowedError") {
              console.warn("Autoplay was prevented. User interaction might be needed.")
            } else if (e.name === "AbortError") {
              console.warn("Audio playback was aborted, possibly due to a previous play() call or element state.")
            }
          }
        })
    }

    // If music is already ready, try to play immediately
    if (this.backgroundMusic.readyState >= 3) {
      // HAVE_ENOUGH_DATA
      attemptPlay()
    } else {
      // Otherwise, wait for it to be ready
      console.log("Background music not ready yet, waiting for 'canplaythrough' event.")
      const playOnReady = () => {
        console.log("canplaythrough event fired. Attempting to play music.")
        attemptPlay()
        this.backgroundMusic?.removeEventListener("canplaythrough", playOnReady)
      }
      this.backgroundMusic.addEventListener("canplaythrough", playOnReady)
    }
  }

  pauseMusic() {
    if (this.backgroundMusic && !this.backgroundMusic.paused) {
      this.backgroundMusic.pause()
    }
  }

  setMusicVolume(volume: number) {
    this.musicVolume = Math.max(0, Math.min(1, volume))
    if (this.backgroundMusic) {
      this.backgroundMusic.volume = this.musicVolume
    }
    localStorage.setItem("musicVolume", this.musicVolume.toString())
  }

  setSfxVolume(volume: number) {
    this.sfxVolume = Math.max(0, Math.min(1, volume))
    localStorage.setItem("sfxVolume", this.sfxVolume.toString())
  }

  playSound(frequency: number, duration: number, type: OscillatorType = "square", volume = 0.1) {
    if (!this.audioContext) return

    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)

    oscillator.frequency.value = frequency
    oscillator.type = type

    gainNode.gain.setValueAtTime(volume * this.sfxVolume, this.audioContext.currentTime) // Apply SFX volume
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
        if (this.gameState === "menu" || this.gameState === "gameOver" || this.gameState === "levelComplete") {
          // Handled by specific menu clicks now
        }
      }
      if (e.code === "KeyP" && this.gameState === "playing") {
        this.gameState = "paused"
        this.pauseMusic()
      } else if (e.code === "KeyP" && this.gameState === "paused") {
        this.gameState = "playing"
        this.playMusic()
      }
      if (e.code === "Escape" && this.gameState !== "mainMenu") {
        this.gameState = "mainMenu" // Go back to main menu
        this.pauseMusic()
      }
    })

    window.addEventListener("keyup", (e) => {
      this.keys[e.code] = false
    })

    // Touch controls
    const leftBtn = document.getElementById("leftBtn")
    const rightBtn = document.getElementById("rightBtn")
    const shootBtn = document.getElementById("shootBtn")
    const specialBtn = document.getElementById("specialBtn")

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
        // Auto-fire, so this button is just for touch feedback
      })
      shootBtn.addEventListener("touchend", (e) => {
        e.preventDefault()
        this.touchControls.shoot = false
      })
    }

    if (specialBtn) {
      specialBtn.addEventListener("touchstart", (e) => {
        e.preventDefault()
        this.touchControls.special = true
        this.canUseSpecialAbility = true
      })
      specialBtn.addEventListener("touchend", (e) => {
        e.preventDefault()
        this.touchControls.special = false
        this.canUseSpecialAbility = false
      })
    }

    // Canvas click for menu interactions
    this.canvas.addEventListener("click", (e) => {
      const rect = this.canvas.getBoundingClientRect()
      const scaleX = this.canvas.width / rect.width
      const scaleY = this.canvas.height / rect.height
      const x = (e.clientX - rect.left) * scaleX
      const y = (e.clientY - rect.top) * scaleY

      if (this.gameState === "mainMenu") {
        // Start Game button
        if (x > this.canvas.width / 2 - 100 && x < this.canvas.width / 2 + 100 && y > 300 && y < 350) {
          this.gameState = "levelSelect"
        }
        // Power Up button
        if (x > this.canvas.width / 2 - 100 && x < this.canvas.width / 2 + 100 && y > 360 && y < 410) {
          this.gameState = "powerUpMenu"
        }
        // Settings button
        if (x > this.canvas.width / 2 - 100 && x < this.canvas.width / 2 + 100 && y > 420 && y < 470) {
          this.gameState = "settingsMenu"
        }
      } else if (this.gameState === "levelSelect") {
        // Back button
        if (x > 20 && x < 120 && y > 20 && y < 70) {
          this.gameState = "mainMenu"
        }
        // Level buttons
        for (let i = 1; i <= this.lastReachedLevel; i++) {
          const btnX = this.canvas.width / 2 - 100
          const btnY = 220 + i * 60
          if (x > btnX && x < btnX + 200 && y > btnY && y < btnY + 40) {
            this.startGame(i)
            break
          }
        }
      } else if (this.gameState === "powerUpMenu") {
        // Back button
        if (x > 20 && x < 120 && y > 20 && y < 70) {
          this.gameState = "mainMenu"
        }
        // Upgrade buttons
        const upgradeTypes = ["damage", "defense", "health"]
        upgradeTypes.forEach((type, index) => {
          const cardX = this.canvas.width / 2 - 350 / 2
          const cardY = 220 + index * 150
          const buttonWidth = 150
          const buttonHeight = 40
          const buttonX = cardX + 350 - buttonWidth - 20
          const buttonY = cardY + 120 - buttonHeight - 10

          if (x > buttonX && x < buttonX + buttonWidth && y > buttonY && y < buttonY + buttonHeight) {
            if (type === "damage") this.player.upgradeDamage()
            else if (type === "defense") this.player.upgradeDefense()
            else if (type === "health") this.player.upgradeHealth()
          }
        })
      } else if (this.gameState === "settingsMenu") {
        // Back button
        if (x > 20 && x < 120 && y > 20 && y < 70) {
          this.gameState = "mainMenu"
        }

        // Music Volume buttons
        const musicPlusX = this.canvas.width / 2 + 100
        const musicMinusX = this.canvas.width / 2 - 100
        const musicY = 300
        if (this.isClickInButton(x, y, musicMinusX, musicY, 40, 40)) {
          this.setMusicVolume(this.musicVolume - 0.1)
        } else if (this.isClickInButton(x, y, musicPlusX, musicY, 40, 40)) {
          this.setMusicVolume(this.musicVolume + 0.1)
        }

        // SFX Volume buttons
        const sfxPlusX = this.canvas.width / 2 + 100
        const sfxMinusX = this.canvas.width / 2 - 100
        const sfxY = 400
        if (this.isClickInButton(x, y, sfxMinusX, sfxY, 40, 40)) {
          this.setSfxVolume(this.sfxVolume - 0.1)
        } else if (this.isClickInButton(x, y, sfxPlusX, sfxY, 40, 40)) {
          this.setSfxVolume(this.sfxVolume + 0.1)
        }
      } else if (this.gameState === "levelComplete") {
        // Next Level button
        if (x > this.canvas.width / 2 - 150 && x < this.canvas.width / 2 - 50 && y > 400 && y < 450) {
          this.startGame(this.currentLevel + 1)
        }
        // Main Menu button
        if (x > this.canvas.width / 2 + 50 && x < this.canvas.width / 2 + 150 && y > 400 && y < 450) {
          this.gameState = "mainMenu"
          this.pauseMusic()
        }
      } else if (this.gameState === "gameOver") {
        // Restart button (same as "Start Game" from main menu)
        if (x > this.canvas.width / 2 - 100 && x < this.canvas.width / 2 + 100 && y > 480 && y < 530) {
          this.startGame(1)
        }
      }
    })
  }

  isClickInButton(clickX: number, clickY: number, btnX: number, btnY: number, btnWidth: number, btnHeight: number) {
    return (
      clickX > btnX - btnWidth / 2 &&
      clickX < btnX + btnWidth / 2 &&
      clickY > btnY - btnHeight / 2 &&
      clickY < btnY + btnHeight / 2
    )
  }

  startGame(level: number) {
    this.currentLevel = level
    this.level = new Level(this.currentLevel)
    this.score = 0
    this.lives = 3
    this.player = new Player(
      this.canvas.width / 2,
      this.canvas.height - 100,
      this.player.gold,
      this.player.damageLevel,
      this.player.defenseLevel,
      this.player.healthLevel,
    ) // Preserve player upgrades
    this.gameState = "playing"
    this.enemies = []
    this.bullets = []
    this.enemyBullets = []
    this.particles = []
    this.powerUps = []
    this.goldObjects = []
    this.explosions = []
    this.enemySpawnTimer = 0
    this.backgroundOffset = 0
    this.gameTime = 0
    this.playMusic()
  }

  update(deltaTime: number) {
    if (
      this.gameState === "paused" ||
      this.gameState === "mainMenu" ||
      this.gameState === "levelSelect" ||
      this.gameState === "powerUpMenu" ||
      this.gameState === "settingsMenu"
    )
      return
    if (this.gameState !== "playing") return

    this.gameTime += deltaTime
    this.backgroundOffset += 1

    // Update level
    this.level.update(this.gameTime)

    // Update player
    this.player.update(this.keys, this.touchControls, this.canvas.width)

    // Player auto-shooting
    if (this.player.canShoot()) {
      this.player.shoot(this.bullets)
      this.playSound(800, 0.1, "square", 0.05)
    }

    // Special ability
    const canActivateSpecial =
      (this.keys["KeyX"] || this.touchControls.special || this.canUseSpecialAbility) && this.player.canUseSpecial()

    let specialUsedThisFrame = false

    if (canActivateSpecial) {
      if (!this.usingSpecialAbility) {
        this.player.useSpecialAbility(this.bullets, this.enemies, this.particles)
        this.playSound(1200, 0.3, "sine", 0.08)
        this.usingSpecialAbility = true
        specialUsedThisFrame = true
      }
    } else {
      this.usingSpecialAbility = false
    }

    // Spawn enemies based on level
    this.enemySpawnTimer++
    if (this.enemySpawnTimer >= this.level.enemySpawnDelay) {
      if (this.level.enemiesRemaining > 0) {
        this.spawnEnemy()
        this.enemySpawnTimer = 0
      }
    }

    // Spawn power-ups
    if (Math.random() < this.level.powerUpSpawnRate) {
      this.spawnPowerUp()
    }

    // Update enemies
    this.enemies.forEach((enemy, index) => {
      enemy.update(this.player, this.gameTime)

      // Enemy shooting
      if (enemy.canShoot() && Math.random() < enemy.shootChance) {
        enemy.shoot(this.enemyBullets)
      }

      // Remove enemies that are off screen
      if (enemy.y > this.canvas.height + 100) {
        this.enemies.splice(index, 1)
      }
    })

    // Update bullets
    this.bullets.forEach((bullet, index) => {
      bullet.update()
      if (bullet.y < -20 || bullet.x < -20 || bullet.x > this.canvas.width + 20) {
        this.bullets.splice(index, 1)
      }
    })

    this.enemyBullets.forEach((bullet, index) => {
      bullet.update()
      if (bullet.y > this.canvas.height + 20) {
        this.enemyBullets.splice(index, 1)
      }
    })

    // Update power-ups
    this.powerUps.forEach((powerUp, index) => {
      powerUp.update()
      if (powerUp.y > this.canvas.height) {
        this.powerUps.splice(index, 1)
      }
    })

    // Update gold objects
    this.goldObjects.forEach((gold, index) => {
      gold.update()
      if (gold.y > this.canvas.height) {
        this.goldObjects.splice(index, 1)
      }
    })

    // Update particles and explosions
    this.particles.forEach((particle, index) => {
      particle.update()
      if (particle.life <= 0) {
        this.particles.splice(index, 1)
      }
    })

    this.explosions.forEach((explosion, index) => {
      explosion.update()
      if (explosion.life <= 0) {
        this.explosions.splice(index, 1)
      }
    })

    // Update player abilities
    this.player.updateAbilities()

    // Collision detection
    this.checkCollisions()

    // Check level completion
    if (this.level.enemiesRemaining <= 0 && this.enemies.length === 0) {
      this.completeLevel()
    }

    // Check game over
    if (this.lives <= 0) {
      this.gameOver()
    }
  }

  spawnEnemy() {
    const enemyType = this.level.getRandomEnemyType()
    const spawnPattern = this.level.getSpawnPattern()

    if (spawnPattern === "formation") {
      // Spawn enemies in formation
      for (let i = 0; i < 3; i++) {
        const x = (this.canvas.width / 4) * (i + 1)
        this.enemies.push(new Enemy(x, -50 - i * 30, enemyType, this.currentLevel))
      }
      this.level.enemiesRemaining -= 3
    } else {
      // Single enemy spawn
      const x = Math.random() * (this.canvas.width - 60) + 30
      this.enemies.push(new Enemy(x, -50, enemyType, this.currentLevel))
      this.level.enemiesRemaining--
    }
  }

  spawnPowerUp() {
    const x = Math.random() * (this.canvas.width - 40) + 20
    const types = ["rapidFire", "spread", "laser", "shield", "health", "bomb", "multiShot", "piercing"]
    const weights = [20, 15, 10, 15, 10, 8, 12, 10]

    let randomNum = Math.random() * 100
    let selectedType = "rapidFire"

    for (let i = 0; i < weights.length; i++) {
      if (randomNum < weights[i]) {
        selectedType = types[i]
        break
      }
      randomNum -= weights[i]
    }

    this.powerUps.push(new PowerUp(x, -30, selectedType))
  }

  spawnGold(x: number, y: number, value: number) {
    this.goldObjects.push(new Gold(x, y, value))
  }

  checkCollisions() {
    // Player bullets vs enemies
    this.bullets.forEach((bullet, bulletIndex) => {
      this.enemies.forEach((enemy, enemyIndex) => {
        if (this.isColliding(bullet, enemy)) {
          // Damage enemy
          enemy.takeDamage(bullet.damage)

          // Create hit effect
          this.createHitEffect(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2)

          // Remove bullet unless it's piercing
          if (bullet.type !== "piercing") {
            this.bullets.splice(bulletIndex, 1)
          }

          // Check if enemy is destroyed
          if (enemy.health <= 0) {
            this.createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.type)
            this.enemies.splice(enemyIndex, 1)

            // Add score
            this.score += enemy.scoreValue
            this.playSound(enemy.type === "boss" ? 150 : 300, enemy.type === "boss" ? 0.5 : 0.2)

            // Chance to drop power-up or gold
            if (Math.random() < 0.15) {
              this.spawnPowerUp()
            } else if (Math.random() < 0.3) {
              // Higher chance for gold
              this.spawnGold(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.scoreValue / 2)
            }
          }
        }
      })
    })

    // Enemy bullets vs player
    this.enemyBullets.forEach((bullet, bulletIndex) => {
      if (this.isColliding(bullet, this.player)) {
        if (!this.player.hasShield) {
          this.enemyBullets.splice(bulletIndex, 1)
          this.lives--
          this.createExplosion(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, "player")
          this.playSound(150, 0.5)
          this.player.takeDamage()
        } else {
          this.enemyBullets.splice(bulletIndex, 1)
          this.player.shieldHits++
          this.createHitEffect(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2)
          this.playSound(600, 0.1)
        }
      }
    })

    // Enemies vs player
    this.enemies.forEach((enemy, enemyIndex) => {
      if (this.isColliding(enemy, this.player)) {
        if (!this.player.hasShield) {
          this.enemies.splice(enemyIndex, 1)
          this.lives--
          this.createExplosion(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, "player")
          this.playSound(150, 0.5)
          this.player.takeDamage()
        } else {
          enemy.takeDamage(50)
          this.player.shieldHits += 2
          this.createHitEffect(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2)
          this.playSound(600, 0.2)

          if (enemy.health <= 0) {
            this.enemies.splice(enemyIndex, 1)
            this.createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.type)
            this.score += enemy.scoreValue
          }
        }
      }
    })

    // Power-ups vs player
    this.powerUps.forEach((powerUp, powerUpIndex) => {
      if (this.isColliding(powerUp, this.player)) {
        this.powerUps.splice(powerUpIndex, 1)
        this.player.collectPowerUp(powerUp.type)
        this.playSound(1000, 0.3, "sine")

        if (powerUp.type === "health") {
          this.lives = Math.min(this.lives + 1, 5)
        }

        // Visual feedback
        this.createPowerUpEffect(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2)
      }
    })

    // Gold objects vs player (auto-collect nearby)
    this.goldObjects.forEach((gold, goldIndex) => {
      const distance = Math.sqrt(
        Math.pow(gold.x + gold.width / 2 - (this.player.x + this.player.width / 2), 2) +
          Math.pow(gold.y + gold.height / 2 - (this.player.y + this.player.height / 2), 2),
      )
      const collectRadius = this.player.width * 1.5 // Player's collection radius

      if (distance < collectRadius) {
        this.player.addGold(gold.value)
        this.goldObjects.splice(goldIndex, 1)
        this.playSound(1500, 0.05, "triangle", 0.03) // Gold collection sound
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

  createExplosion(x: number, y: number, type: string) {
    this.explosions.push(new Explosion(x, y, type))

    const particleCount = type === "boss" ? 20 : type === "player" ? 15 : 10
    for (let i = 0; i < particleCount; i++) {
      this.particles.push(new Particle(x, y, "explosion"))
    }
  }

  createHitEffect(x: number, y: number) {
    for (let i = 0; i < 6; i++) {
      this.particles.push(new Particle(x, y, "hit"))
    }
  }

  createPowerUpEffect(x: number, y: number) {
    for (let i = 0; i < 12; i++) {
      this.particles.push(new Particle(x, y, "powerup"))
    }
  }

  completeLevel() {
    this.gameState = "levelComplete"
    this.levelTransitionTimer = 180 // 3 seconds at 60fps
    this.playSound(800, 1, "sine", 0.1)
    if (this.currentLevel >= this.lastReachedLevel) {
      this.lastReachedLevel = this.currentLevel + 1
      localStorage.setItem("spaceShooterLastLevel", this.lastReachedLevel.toString())
    }
    this.pauseMusic()
  }

  gameOver() {
    this.gameState = "gameOver"
    if (this.score > this.highScore) {
      this.highScore = this.score
      localStorage.setItem("spaceShooterHighScore", this.highScore.toString())
    }
    this.pauseMusic()
  }

  render() {
    // Clear canvas with gradient background
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height)
    gradient.addColorStop(0, "#000022")
    gradient.addColorStop(0.5, "#000044")
    gradient.addColorStop(1, "#000011")
    this.ctx.fillStyle = gradient
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // Draw animated background
    this.drawAnimatedBackground()

    if (this.gameState === "mainMenu") {
      this.drawMainMenu()
    } else if (this.gameState === "levelSelect") {
      this.drawLevelSelect()
    } else if (this.gameState === "powerUpMenu") {
      this.drawPowerUpMenu()
    } else if (this.gameState === "settingsMenu") {
      this.drawSettingsMenu()
    } else if (this.gameState === "playing") {
      this.drawGame()
    } else if (this.gameState === "levelComplete") {
      this.drawGame()
      this.drawLevelComplete()
    } else if (this.gameState === "paused") {
      this.drawGame()
      this.drawPaused()
    } else if (this.gameState === "gameOver") {
      this.drawGameOver()
    }
  }

  drawAnimatedBackground() {
    // Draw moving stars with different layers
    for (let layer = 0; layer < 3; layer++) {
      const speed = (layer + 1) * 0.5
      const size = layer + 1
      const alpha = 0.3 + layer * 0.2

      this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`

      for (let i = 0; i < 30; i++) {
        const x = (i * 47 + layer * 23) % this.canvas.width
        const y = (i * 31 + this.backgroundOffset * speed + layer * 100) % (this.canvas.height + 50)
        this.ctx.fillRect(x, y, size, size)
      }
    }

    // Draw nebula clouds
    this.ctx.fillStyle = "rgba(64, 0, 128, 0.1)"
    for (let i = 0; i < 3; i++) {
      const x = ((i * 200 + this.backgroundOffset * 0.3) % (this.canvas.width + 150)) - 75
      const y = (i * 150) % this.canvas.height
      this.ctx.beginPath()
      this.ctx.arc(x, y, 80 + Math.sin(this.backgroundOffset * 0.01 + i) * 30, 0, Math.PI * 2)
      this.ctx.fill()
    }

    // Draw level-specific background elements
    this.level.drawBackground(this.ctx, this.canvas.width, this.canvas.height, this.backgroundOffset)
  }

  drawMainMenu() {
    // Title with glow effect
    this.ctx.shadowColor = "#00ff00"
    this.ctx.shadowBlur = 20
    this.ctx.fillStyle = "#00ff00"
    this.ctx.font = "bold 56px monospace"
    this.ctx.textAlign = "center"
    this.ctx.fillText("GALAXY DEFENDER", this.canvas.width / 2, 150)
    this.ctx.shadowBlur = 0

    // Subtitle
    this.ctx.fillStyle = "#ffffff"
    this.ctx.font = "24px monospace"
    this.ctx.fillText("Elite Space Combat", this.canvas.width / 2, 200)

    // Menu Buttons
    this.drawButton(this.canvas.width / 2, 325, 200, 50, "Start Game", "#00cc00")
    this.drawButton(this.canvas.width / 2, 385, 200, 50, "Power Up", "#0088cc")
    this.drawButton(this.canvas.width / 2, 445, 200, 50, "Settings", "#cc8800")

    this.ctx.fillStyle = "#ffffff"
    this.ctx.font = "20px monospace"
    this.ctx.fillText(`High Score: ${this.highScore}`, this.canvas.width / 2, 550)
    this.ctx.fillText(`Last Level: ${this.lastReachedLevel}`, this.canvas.width / 2, 580)
  }

  drawLevelSelect() {
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)"
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    this.ctx.fillStyle = "#00ffff"
    this.ctx.font = "bold 48px monospace"
    this.ctx.textAlign = "center"
    this.ctx.fillText("SELECT LEVEL", this.canvas.width / 2, 100)

    // Back button
    this.drawButton(70, 45, 100, 50, "Back", "#cc0000")

    for (let i = 1; i <= this.lastReachedLevel; i++) {
      const buttonText = `Level ${i}`
      const buttonColor = i <= this.lastReachedLevel ? "#00cc00" : "#555555"
      this.drawButton(this.canvas.width / 2, 220 + i * 60, 200, 40, buttonText, buttonColor)
    }
  }

  drawPowerUpMenu() {
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)"
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    this.ctx.fillStyle = "#00ffff"
    this.ctx.font = "bold 48px monospace"
    this.ctx.textAlign = "center"
    this.ctx.fillText("POWER UP STORE", this.canvas.width / 2, 100)

    // Back button
    this.drawButton(70, 45, 100, 50, "Back", "#cc0000")

    this.ctx.fillStyle = "#ffff00"
    this.ctx.font = "bold 28px monospace"
    this.ctx.textAlign = "left"
    this.ctx.fillText(`Gold: ${this.player.gold}`, this.canvas.width / 2 - 100, 180)

    // Upgrade sections
    this.drawUpgradeCard(
      "Damage",
      this.player.damageLevel,
      this.player.maxDamageLevel,
      this.player.upgradeCosts.damage,
      "Increases bullet damage",
      (level) => `x${(1 + level * 0.5).toFixed(1)}`,
      0,
    )
    this.drawUpgradeCard(
      "Defense",
      this.player.defenseLevel,
      this.player.maxDefenseLevel,
      this.player.upgradeCosts.defense,
      "Increases shield durability",
      (level) => `${[8, 10, 12, 15][level]} hits`,
      1,
    )
    this.drawUpgradeCard(
      "Health",
      this.player.healthLevel,
      this.player.maxHealthLevel,
      this.player.upgradeCosts.health,
      "Increases max health",
      (level) => `${[100, 120, 150, 200][level]} HP`,
      2,
    )
  }

  drawUpgradeCard(
    name: string,
    currentLevel: number,
    maxLevel: number,
    costs: number[],
    description: string,
    effectText: (level: number) => string,
    index: number,
  ) {
    const cardWidth = 350
    const cardHeight = 120
    const cardX = this.canvas.width / 2 - cardWidth / 2
    const cardY = 220 + index * 150
    const borderRadius = 10

    // Card background
    this.ctx.fillStyle = "rgba(20, 20, 50, 0.8)"
    this.roundRect(this.ctx, cardX, cardY, cardWidth, cardHeight, borderRadius)
    this.ctx.fill()

    // Card border
    this.ctx.strokeStyle = "#00ffff"
    this.ctx.lineWidth = 2
    this.roundRect(this.ctx, cardX, cardY, cardWidth, cardHeight, borderRadius)
    this.ctx.stroke()

    // Title
    this.ctx.fillStyle = "#ffffff"
    this.ctx.font = "bold 24px monospace"
    this.ctx.textAlign = "left"
    this.ctx.fillText(name, cardX + 20, cardY + 30)

    // Level and Description
    this.ctx.font = "16px monospace"
    this.ctx.fillStyle = "#cccccc"
    this.ctx.fillText(`Level: ${currentLevel} / ${maxLevel}`, cardX + 20, cardY + 55)
    this.ctx.fillText(description, cardX + 20, cardY + 75)

    // Current Effect
    this.ctx.fillStyle = "#00ff00"
    this.ctx.fillText(`Current: ${effectText(currentLevel)}`, cardX + 20, cardY + 95)

    // Upgrade Button
    const buttonWidth = 150
    const buttonHeight = 40
    const buttonX = cardX + cardWidth - buttonWidth - 20
    const buttonY = cardY + cardHeight - buttonHeight - 10

    if (currentLevel < maxLevel) {
      const cost = costs[currentLevel]
      const canAfford = this.player.gold >= cost
      const buttonColor = canAfford ? "#00cc00" : "#555555"
      this.drawButton(
        buttonX + buttonWidth / 2,
        buttonY + buttonHeight / 2,
        buttonWidth,
        buttonHeight,
        `Upgrade (${cost}G)`,
        buttonColor,
        !canAfford,
        18, // Smaller font size for button text
      )
    } else {
      this.ctx.fillStyle = "#00ff00"
      this.ctx.font = "bold 20px monospace"
      this.ctx.textAlign = "right"
      this.ctx.fillText("MAX LEVEL", cardX + cardWidth - 20, cardY + cardHeight - 25)
    }
  }

  roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + width - radius, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    ctx.lineTo(x + width, y + height - radius)
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    ctx.lineTo(x + radius, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
  }

  drawSettingsMenu() {
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)"
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    this.ctx.fillStyle = "#00ffff"
    this.ctx.font = "bold 48px monospace"
    this.ctx.textAlign = "center"
    this.ctx.fillText("SETTINGS", this.canvas.width / 2, 100)

    // Back button
    this.drawButton(70, 45, 100, 50, "Back", "#cc0000")

    // Music Volume
    this.ctx.fillStyle = "#ffffff"
    this.ctx.font = "28px monospace"
    this.ctx.textAlign = "left"
    this.ctx.fillText("Music Volume:", this.canvas.width / 2 - 200, 300)
    this.ctx.fillText(`${Math.round(this.musicVolume * 100)}%`, this.canvas.width / 2 + 20, 300)
    this.drawButton(this.canvas.width / 2 - 100, 300, 40, 40, "-", "#cc0000", false, 24)
    this.drawButton(this.canvas.width / 2 + 100, 300, 40, 40, "+", "#00cc00", false, 24)

    // SFX Volume
    this.ctx.fillStyle = "#ffffff"
    this.ctx.fillText("SFX Volume:", this.canvas.width / 2 - 200, 400)
    this.ctx.fillText(`${Math.round(this.sfxVolume * 100)}%`, this.canvas.width / 2 + 20, 400)
    this.drawButton(this.canvas.width / 2 - 100, 400, 40, 40, "-", "#cc0000", false, 24)
    this.drawButton(this.canvas.width / 2 + 100, 400, 40, 40, "+", "#00cc00", false, 24)
  }

  drawButton(
    centerX: number,
    centerY: number,
    width: number,
    height: number,
    text: string,
    color: string,
    disabled = false,
    fontSize = 24, // Added fontSize parameter
  ) {
    const x = centerX - width / 2
    const y = centerY - height / 2
    const borderRadius = 8

    this.ctx.fillStyle = disabled ? "#333333" : color
    this.roundRect(this.ctx, x, y, width, height, borderRadius)
    this.ctx.fill()

    this.ctx.strokeStyle = "#ffffff"
    this.ctx.lineWidth = 2
    this.roundRect(this.ctx, x, y, width, height, borderRadius)
    this.ctx.stroke()

    this.ctx.fillStyle = "#ffffff"
    this.ctx.font = `bold ${fontSize}px monospace` // Use fontSize
    this.ctx.textAlign = "center"
    this.ctx.textBaseline = "middle"
    this.ctx.fillText(text, centerX, centerY)
  }

  drawGame() {
    // Draw explosions first (behind everything)
    this.explosions.forEach((explosion) => explosion.draw(this.ctx))

    // Draw player
    this.player.draw(this.ctx)

    // Draw enemies
    this.enemies.forEach((enemy) => enemy.draw(this.ctx))

    // Draw bullets
    this.bullets.forEach((bullet) => bullet.draw(this.ctx))
    this.enemyBullets.forEach((bullet) => bullet.draw(this.ctx))

    // Draw power-ups
    this.powerUps.forEach((powerUp) => powerUp.draw(this.ctx))

    // Draw gold objects
    this.goldObjects.forEach((gold) => gold.draw(this.ctx))

    // Draw particles (on top)
    this.particles.forEach((particle) => particle.draw(this.ctx))

    // Draw HUD
    this.drawHUD()
  }

  drawHUD() {
    // HUD Background
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
    this.ctx.fillRect(0, 0, this.canvas.width, 80)

    // Main stats
    this.ctx.fillStyle = "#ffffff"
    this.ctx.font = "bold 20px monospace"
    this.ctx.textAlign = "left"
    this.ctx.fillText(`Score: ${this.score}`, 20, 30)
    this.ctx.fillText(`Level: ${this.currentLevel}`, 20, 55)
    this.ctx.fillText(`Gold: ${this.player.gold}`, 20, 75) // Display gold

    // Lives with heart icons
    this.ctx.fillText("Lives:", 250, 30)
    for (let i = 0; i < this.lives; i++) {
      this.ctx.fillStyle = "#ff0000"
      this.ctx.fillText("♥", 320 + i * 25, 30)
    }

    // Level progress
    this.ctx.fillStyle = "#ffffff"
    this.ctx.fillText(`Enemies: ${this.level.enemiesRemaining}`, 250, 55)

    // Special ability cooldown
    const specialCooldown = this.player.getSpecialCooldownPercent()
    this.ctx.fillText("Special:", 500, 30)

    // Cooldown bar
    const barWidth = 100
    const barHeight = 12
    this.ctx.fillStyle = "#333333"
    this.ctx.fillRect(580, 20, barWidth, barHeight)
    this.ctx.fillStyle = specialCooldown >= 1 ? "#00ff00" : "#ffff00"
    this.ctx.fillRect(580, 20, barWidth * Math.min(specialCooldown, 1), barHeight)

    // Power-up status
    if (this.player.activePowerUps.length > 0) {
      this.ctx.fillStyle = "#ffff00"
      this.ctx.font = "16px monospace"
      this.ctx.textAlign = "right"

      this.player.activePowerUps.forEach((powerUp, index) => {
        const timeLeft = Math.max(0, (powerUp.duration - (Date.now() - powerUp.startTime)) / powerUp.duration)
        this.ctx.fillText(
          `${powerUp.type.toUpperCase()}: ${Math.ceil((timeLeft * powerUp.duration) / 1000)}s`,
          this.canvas.width - 20,
          30 + index * 20,
        )
      })
    }

    // Level info
    this.ctx.fillStyle = "#00ffff"
    this.ctx.font = "16px monospace"
    this.ctx.textAlign = "center"
    this.ctx.fillText(this.level.name, this.canvas.width / 2, 25)
    this.ctx.fillText(this.level.description, this.canvas.width / 2, 45)
  }

  drawLevelComplete() {
    // Semi-transparent overlay
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)"
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    this.ctx.shadowColor = "#00ff00"
    this.ctx.shadowBlur = 15
    this.ctx.fillStyle = "#00ff00"
    this.ctx.font = "bold 48px monospace"
    this.ctx.textAlign = "center"
    this.ctx.fillText("LEVEL COMPLETE!", this.canvas.width / 2, 300)
    this.ctx.shadowBlur = 0

    this.ctx.fillStyle = "#ffffff"
    this.ctx.font = "24px monospace"
    this.ctx.fillText(`Level ${this.currentLevel} Cleared!`, this.canvas.width / 2, 350)

    // New buttons for choice
    this.drawButton(this.canvas.width / 2 - 100, 425, 180, 50, "Next Level", "#00cc00")
    this.drawButton(this.canvas.width / 2 + 100, 425, 180, 50, "Main Menu", "#0088cc")
  }

  drawPaused() {
    // Semi-transparent overlay
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    this.ctx.fillStyle = "#ffffff"
    this.ctx.font = "bold 48px monospace"
    this.ctx.textAlign = "center"
    this.ctx.fillText("PAUSED", this.canvas.width / 2, 350)

    this.ctx.font = "20px monospace"
    this.ctx.fillText("Press P to Resume", this.canvas.width / 2, 400)
  }

  drawGameOver() {
    // Draw final background
    this.drawAnimatedBackground()

    // Semi-transparent overlay
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)"
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    this.ctx.shadowColor = "#ff0000"
    this.ctx.shadowBlur = 20
    this.ctx.fillStyle = "#ff0000"
    this.ctx.font = "bold 56px monospace"
    this.ctx.textAlign = "center"
    this.ctx.fillText("GAME OVER", this.canvas.width / 2, 250)
    this.ctx.shadowBlur = 0

    this.ctx.fillStyle = "#ffffff"
    this.ctx.font = "28px monospace"
    this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, 320)
    this.ctx.fillText(`Level Reached: ${this.currentLevel}`, this.canvas.width / 2, 360)
    this.ctx.fillText(`High Score: ${this.highScore}`, this.canvas.width / 2, 400)

    if (this.score === this.highScore && this.score > 0) {
      this.ctx.fillStyle = "#ffff00"
      this.ctx.fillText("NEW HIGH SCORE!", this.canvas.width / 2, 440)
    }

    this.drawButton(this.canvas.width / 2, 505, 200, 50, "Restart", "#00cc00")
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
    this.pauseMusic()
    // Remove the URL.revokeObjectURL call as it's no longer needed with direct src assignment
    // if (this.backgroundMusic && this.backgroundMusic.src.startsWith("blob:")) {
    //   URL.revokeObjectURL(this.backgroundMusic.src)
    //   console.log("Revoked blob URL for background music.")
    // }
  }
}

class Level {
  number: number
  name: string
  description: string
  enemiesTotal: number
  enemiesRemaining: number
  enemySpawnDelay: number
  powerUpSpawnRate: number
  enemyTypes: string[]
  backgroundColor: string
  specialFeatures: string[]

  constructor(levelNumber: number) {
    this.number = levelNumber
    this.setupLevel(levelNumber)
  }

  setupLevel(levelNumber: number) {
    const levels = [
      {
        name: "Asteroid Field",
        description: "Basic enemy patrol",
        enemies: 15,
        spawnDelay: 120,
        powerUpRate: 0.002,
        types: ["scout", "fighter"],
        bg: "#001122",
        features: ["asteroids"],
      },
      {
        name: "Enemy Outpost",
        description: "Increased resistance",
        enemies: 25,
        spawnDelay: 105,
        powerUpRate: 0.003,
        types: ["scout", "fighter", "bomber"],
        bg: "#220011",
        features: ["formations"],
      },
      {
        name: "Deep Space",
        description: "Advanced enemy ships",
        enemies: 30,
        spawnDelay: 90,
        powerUpRate: 0.003,
        types: ["fighter", "bomber", "interceptor"],
        bg: "#001133",
        features: ["nebula", "formations"],
      },
      {
        name: "Battle Cruiser",
        description: "Heavy enemy presence",
        enemies: 40,
        spawnDelay: 75,
        powerUpRate: 0.004,
        types: ["bomber", "interceptor", "destroyer"],
        bg: "#330011",
        features: ["boss", "formations"],
      },
      {
        name: "Enemy Stronghold",
        description: "Elite enemy forces",
        enemies: 50,
        spawnDelay: 68,
        powerUpRate: 0.004,
        types: ["interceptor", "destroyer", "dreadnought"],
        bg: "#001144",
        features: ["boss", "elite", "formations"],
      },
    ]

    const levelIndex = Math.min(levelNumber - 1, levels.length - 1)
    const levelData = levels[levelIndex]

    // Scale difficulty for levels beyond predefined ones
    const difficultyMultiplier = Math.max(1, levelNumber - levels.length + 1)

    this.name = levelData.name
    this.description = levelData.description
    this.enemiesTotal = levelData.enemies + (difficultyMultiplier - 1) * 10
    this.enemiesRemaining = this.enemiesTotal
    this.enemySpawnDelay = Math.max(20, levelData.spawnDelay - (difficultyMultiplier - 1) * 5)
    this.powerUpSpawnRate = levelData.powerUpRate
    this.enemyTypes = levelData.types
    this.backgroundColor = levelData.bg
    this.specialFeatures = levelData.features
  }

  update(gameTime: number) {
    // Level-specific updates can go here
  }

  getRandomEnemyType(): string {
    return this.enemyTypes[Math.floor(Math.random() * this.enemyTypes.length)]
  }

  getSpawnPattern(): string {
    if (this.specialFeatures.includes("formations") && Math.random() < 0.3) {
      return "formation"
    }
    return "single"
  }

  drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number, offset: number) {
    // Level-specific background elements
    // Commented out to remove grey boxes
    /*
    if (this.specialFeatures.includes("asteroids")) {
      ctx.fillStyle = "#444444"
      for (let i = 0; i < 5; i++) {
        const x = ((i * 180 + offset * 0.5) % (width + 100)) - 50
        const y = (i * 120) % height
        const size = 20 + (i % 3) * 10
        ctx.fillRect(x, y, size, size)
      }
    }
    */

    if (this.specialFeatures.includes("nebula")) {
      ctx.fillStyle = "rgba(128, 0, 255, 0.15)"
      for (let i = 0; i < 3; i++) {
        const x = ((i * 250 + offset * 0.2) % (width + 200)) - 100
        const y = (i * 200) % height
        ctx.beginPath()
        ctx.arc(x, y, 100 + Math.sin(offset * 0.01 + i) * 40, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
}

class Player {
  x: number
  y: number
  width: number
  height: number
  speed: number
  acceleration: number
  maxSpeed: number
  currentVelocity: number
  friction: number
  lastShot: number
  shootDelay: number
  activePowerUps: any[]
  hasShield: boolean
  shieldHits: number
  maxShieldHits: number
  specialAbility: string
  specialCooldown: number
  specialLastUsed: number
  health: number
  maxHealth: number
  invulnerable: boolean
  invulnerableTime: number
  thrusterIntensity: number // Added for visual feedback
  gold: number // New: Player's gold count
  damageLevel: number // New: Upgrade level for damage
  defenseLevel: number // New: Upgrade level for defense (shield)
  healthLevel: number // New: Upgrade level for health
  maxDamageLevel: number
  maxDefenseLevel: number
  maxHealthLevel: number
  upgradeCosts: { damage: number[]; defense: number[]; health: number[] }

  constructor(
    x: number,
    y: number,
    initialGold = 0,
    initialDamageLevel = 0,
    initialDefenseLevel = 0,
    initialHealthLevel = 0,
  ) {
    this.x = x
    this.y = y
    this.width = 40
    this.height = 50
    this.speed = 2.5
    this.acceleration = 0.15
    this.maxSpeed = 2.5
    this.currentVelocity = 0
    this.friction = 0.85
    this.lastShot = 0
    this.shootDelay = 150
    this.activePowerUps = []
    this.hasShield = false
    this.shieldHits = 0
    this.maxShieldHits = 8
    this.specialAbility = "laser_burst"
    this.specialCooldown = 5000 // 5 seconds
    this.specialLastUsed = 0
    this.health = 100
    this.maxHealth = 100
    this.invulnerable = false
    this.invulnerableTime = 0
    this.thrusterIntensity = 0

    // Gold and Upgrades
    this.gold = Number.parseInt(localStorage.getItem("playerGold") || initialGold.toString())
    this.damageLevel = Number.parseInt(localStorage.getItem("playerDamageLevel") || initialDamageLevel.toString())
    this.defenseLevel = Number.parseInt(localStorage.getItem("playerDefenseLevel") || initialDefenseLevel.toString())
    this.healthLevel = Number.parseInt(localStorage.getItem("playerHealthLevel") || initialHealthLevel.toString())

    this.maxDamageLevel = 3
    this.maxDefenseLevel = 3
    this.maxHealthLevel = 3

    this.upgradeCosts = {
      damage: [50, 150, 300], // Costs for level 1, 2, 3
      defense: [75, 200, 400],
      health: [100, 250, 500],
    }

    this.applyUpgrades() // Apply initial upgrades from loaded data
  }

  applyUpgrades() {
    // Apply damage upgrade
    const damageMultipliers = [1, 1.2, 1.5, 2] // Base, L1, L2, L3
    this.shootDelay = 150 / damageMultipliers[this.damageLevel]

    // Apply defense upgrade
    const defenseShieldHits = [8, 10, 12, 15] // Base, L1, L2, L3
    this.maxShieldHits = defenseShieldHits[this.defenseLevel]

    // Apply health upgrade
    const healthValues = [100, 120, 150, 200] // Base, L1, L2, L3
    this.maxHealth = healthValues[this.healthLevel]
    this.health = Math.min(this.health, this.maxHealth) // Cap current health at new max
  }

  upgradeDamage() {
    if (this.damageLevel < this.maxDamageLevel) {
      const cost = this.upgradeCosts.damage[this.damageLevel]
      if (this.gold >= cost) {
        this.gold -= cost
        this.damageLevel++
        this.applyUpgrades()
        this.savePlayerStats()
        return true
      }
    }
    return false
  }

  upgradeDefense() {
    if (this.defenseLevel < this.maxDefenseLevel) {
      const cost = this.upgradeCosts.defense[this.defenseLevel]
      if (this.gold >= cost) {
        this.gold -= cost
        this.defenseLevel++
        this.applyUpgrades()
        this.savePlayerStats()
        return true
      }
    }
    return false
  }

  upgradeHealth() {
    if (this.healthLevel < this.maxHealthLevel) {
      const cost = this.upgradeCosts.health[this.healthLevel]
      if (this.gold >= cost) {
        this.gold -= cost
        this.healthLevel++
        this.applyUpgrades()
        this.savePlayerStats()
        return true
      }
    }
    return false
  }

  savePlayerStats() {
    localStorage.setItem("playerGold", this.gold.toString())
    localStorage.setItem("playerDamageLevel", this.damageLevel.toString())
    localStorage.setItem("playerDefenseLevel", this.defenseLevel.toString())
    localStorage.setItem("playerHealthLevel", this.healthLevel.toString())
  }

  addGold(amount: number) {
    this.gold += amount
    this.savePlayerStats()
  }

  update(
    keys: { [key: string]: boolean },
    touch: { left: boolean; right: boolean; shoot: boolean; special: boolean },
    canvasWidth: number,
  ) {
    // Enhanced movement with acceleration
    let targetVelocity = 0
    let isMoving = false

    if (keys["KeyA"] || keys["ArrowLeft"] || touch.left) {
      targetVelocity = -this.maxSpeed
      isMoving = true
    }
    if (keys["KeyD"] || keys["ArrowRight"] || touch.right) {
      targetVelocity = this.maxSpeed
      isMoving = true
    }

    // Apply acceleration/deceleration
    if (isMoving) {
      this.currentVelocity += (targetVelocity - this.currentVelocity) * this.acceleration
    } else {
      this.currentVelocity *= this.friction
    }

    // Apply movement
    this.x += this.currentVelocity

    // Update thruster intensity based on movement
    this.thrusterIntensity = Math.abs(this.currentVelocity) / this.maxSpeed

    // Keep player in bounds
    this.x = Math.max(0, Math.min(canvasWidth - this.width, this.x))

    // Update invulnerability
    if (this.invulnerable) {
      this.invulnerableTime--
      if (this.invulnerableTime <= 0) {
        this.invulnerable = false
      }
    }
  }

  canShoot(): boolean {
    let currentDelay = this.shootDelay
    const rapidFirePowerUp = this.activePowerUps.find((p) => p.type === "rapidFire")
    if (rapidFirePowerUp) {
      currentDelay = 80
    }
    return Date.now() - this.lastShot > currentDelay
  }

  shoot(bullets: Bullet[]) {
    const spreadPowerUp = this.activePowerUps.find((p) => p.type === "spread")
    const multiShotPowerUp = this.activePowerUps.find((p) => p.type === "multiShot")
    const laserPowerUp = this.activePowerUps.find((p) => p.type === "laser")
    const piercingPowerUp = this.activePowerUps.find((p) => p.type === "piercing")

    const baseDamage = 1 + this.damageLevel * 0.5 // Damage scales with level

    if (laserPowerUp) {
      bullets.push(new Bullet(this.x + this.width / 2 - 2, this.y - 10, -12, "#ff00ff", "laser", 0, baseDamage * 3))
    } else if (spreadPowerUp) {
      bullets.push(new Bullet(this.x + this.width / 2 - 2, this.y - 10, -10, "#00ff00", "normal", 0, baseDamage))
      bullets.push(new Bullet(this.x + this.width / 2 - 2, this.y - 10, -9, "#00ff00", "normal", -2, baseDamage))
      bullets.push(new Bullet(this.x + this.width / 2 - 2, this.y - 10, -9, "#00ff00", "normal", 2, baseDamage))
    } else if (multiShotPowerUp) {
      bullets.push(new Bullet(this.x + 5, this.y - 10, -10, "#00ff00", "normal", 0, baseDamage))
      bullets.push(new Bullet(this.x + this.width / 2 - 2, this.y - 10, -10, "#00ff00", "normal", 0, baseDamage))
      bullets.push(new Bullet(this.x + this.width - 9, this.y - 10, -10, "#00ff00", "normal", 0, baseDamage))
    } else {
      const bulletType = piercingPowerUp ? "piercing" : "normal"
      const bulletColor = piercingPowerUp ? "#ffff00" : "#00ff00"
      bullets.push(new Bullet(this.x + this.width / 2 - 2, this.y - 10, -10, bulletColor, bulletType, 0, baseDamage))
    }

    this.lastShot = Date.now()
  }

  canUseSpecial(): boolean {
    return Date.now() - this.specialLastUsed > this.specialCooldown
  }

  useSpecialAbility(bullets: Bullet[], enemies: Enemy[], particles: Particle[]) {
    if (!this.canUseSpecial()) return

    switch (this.specialAbility) {
      case "laser_burst":
        // Fire a powerful laser burst
        for (let i = -2; i <= 2; i++) {
          bullets.push(new Bullet(this.x + this.width / 2 - 2 + i * 8, this.y - 10, -15, "#ff0000", "laser", 0, 5))
        }
        break

      case "emp_blast":
        // Damage all enemies on screen
        enemies.forEach((enemy) => {
          enemy.takeDamage(20)
          particles.push(new Particle(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, "emp"))
        })
        break
    }

    this.specialLastUsed = Date.now()
  }

  getSpecialCooldownPercent(): number {
    return Math.min(1, (Date.now() - this.specialLastUsed) / this.specialCooldown)
  }

  collectPowerUp(type: string) {
    // Remove existing power-up of same type
    this.activePowerUps = this.activePowerUps.filter((p) => p.type !== type)

    // Add new power-up
    const duration = type === "shield" ? 15000 : 12000 // 15s for shield, 12s for others
    this.activePowerUps.push({
      type: type,
      startTime: Date.now(),
      duration: duration,
    })

    if (type === "shield") {
      this.hasShield = true
      this.shieldHits = 0
    }
  }

  updateAbilities() {
    // Update power-ups
    this.activePowerUps = this.activePowerUps.filter((powerUp) => {
      const elapsed = Date.now() - powerUp.startTime
      if (elapsed > powerUp.duration) {
        if (powerUp.type === "shield") {
          this.hasShield = false
        }
        return false
      }
      return true
    })

    // Check shield durability
    if (this.hasShield && this.shieldHits >= this.maxShieldHits) {
      this.hasShield = false
      this.activePowerUps = this.activePowerUps.filter((p) => p.type !== "shield")
    }
  }

  takeDamage() {
    this.invulnerable = true
    this.invulnerableTime = 120 // 2 seconds at 60fps
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Draw shield effect
    if (this.hasShield) {
      const shieldAlpha = 0.3 + Math.sin(Date.now() * 0.01) * 0.2
      ctx.strokeStyle = `rgba(0, 255, 255, ${shieldAlpha})`
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 35, 0, Math.PI * 2)
      ctx.stroke()

      // Shield strength indicator
      const shieldStrength = 1 - this.shieldHits / this.maxShieldHits
      ctx.strokeStyle = `rgba(0, 255, 255, ${shieldStrength * 0.5})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 30, 0, Math.PI * 2 * shieldStrength)
      ctx.stroke()
    }

    // Invulnerability flashing
    if (this.invulnerable && Math.floor(this.invulnerableTime / 10) % 2 === 0) {
      return // Skip drawing to create flashing effect
    }

    // Main ship body
    const rapidFirePowerUp = this.activePowerUps.find((p) => p.type === "rapidFire")
    const laserPowerUp = this.activePowerUps.find((p) => p.type === "laser")

    let shipColor = "#00ff00"
    if (laserPowerUp) shipColor = "#ff00ff"
    else if (rapidFirePowerUp) shipColor = "#ffff00"

    // Ship hull
    ctx.fillStyle = shipColor
    ctx.fillRect(this.x + 8, this.y + 10, 24, 35)

    // Ship nose
    ctx.beginPath()
    ctx.moveTo(this.x + this.width / 2, this.y)
    ctx.lineTo(this.x + 8, this.y + 15)
    ctx.lineTo(this.x + 32, this.y + 15)
    ctx.closePath()
    ctx.fill()

    // Wings
    ctx.fillStyle = "#888888"
    ctx.fillRect(this.x, this.y + 20, 8, 20)
    ctx.fillRect(this.x + 32, this.y + 20, 8, 20)

    // Engine exhausts
    ctx.fillStyle = "#0088ff"
    ctx.fillRect(this.x + 12, this.y + 45, 6, 8)
    ctx.fillRect(this.x + 22, this.y + 45, 6, 8)

    // Cockpit
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(this.x + 16, this.y + 15, 8, 12)

    // Weapon systems
    ctx.fillStyle = "#ff4444"
    ctx.fillRect(this.x + 6, this.y + 25, 4, 8)
    ctx.fillRect(this.x + 30, this.y + 25, 4, 8)

    // Power-up indicators
    if (this.activePowerUps.length > 0) {
      ctx.fillStyle = "#ffff00"
      ctx.font = "10px monospace"
      ctx.textAlign = "center"

      this.activePowerUps.forEach((powerUp, index) => {
        const symbol = this.getPowerUpSymbol(powerUp.type)
        ctx.fillText(symbol, this.x + this.width / 2 + (index - 1) * 12, this.y - 5)
      })
    }
  }

  getPowerUpSymbol(type: string): string {
    const symbols = {
      rapidFire: "R",
      spread: "S",
      laser: "L",
      multiShot: "M",
      piercing: "P",
      shield: "◊",
      bomb: "B",
    }
    return symbols[type as keyof typeof symbols] || "?"
  }
}

class Enemy {
  x: number
  y: number
  width: number
  height: number
  speed: number
  type: string
  health: number
  maxHealth: number
  scoreValue: number
  movePattern: number
  shootTimer: number
  shootChance: number
  color: string
  lastShot: number
  shootDelay: number

  constructor(x: number, y: number, type: string, level: number) {
    this.x = x
    this.y = y
    this.type = type
    this.movePattern = 0
    this.shootTimer = 0
    this.lastShot = 0
    this.setupEnemyType(type, level)
  }

  setupEnemyType(type: string, level: number) {
    const difficultyMultiplier = 1 + (level - 1) * 0.2

    switch (type) {
      case "scout":
        this.width = 25
        this.height = 25
        this.speed = (2 + level * 0.1) * difficultyMultiplier
        this.health = 1
        this.scoreValue = 10
        this.shootChance = 0.005
        this.color = "#ff4444"
        this.shootDelay = 2000
        break
      case "fighter":
        this.width = 30
        this.height = 30
        this.speed = (1.5 + level * 0.1) * difficultyMultiplier
        this.health = 2
        this.scoreValue = 20
        this.shootChance = 0.008
        this.color = "#ff8800"
        this.shootDelay = 1500
        break
      case "bomber":
        this.width = 35
        this.height = 35
        this.speed = (1 + level * 0.08) * difficultyMultiplier
        this.health = 3
        this.scoreValue = 30
        this.shootChance = 0.012
        this.color = "#8800ff"
        this.shootDelay = 1200
        break
      case "interceptor":
        this.width = 28
        this.height = 32
        this.speed = (2.5 + level * 0.15) * difficultyMultiplier
        this.health = 2
        this.scoreValue = 25
        this.shootChance = 0.01
        this.color = "#ff00ff"
        this.shootDelay = 1000
        break
      case "destroyer":
        this.width = 45
        this.height = 40
        this.speed = (0.8 + level * 0.05) * difficultyMultiplier
        this.health = 5
        this.scoreValue = 50
        this.shootChance = 0.015
        this.color = "#666666"
        this.shootDelay = 800
        break
      case "dreadnought":
        this.width = 60
        this.height = 50
        this.speed = (0.5 + level * 0.03) * difficultyMultiplier
        this.health = 8
        this.scoreValue = 80
        this.shootChance = 0.02
        this.color = "#444444"
        this.shootDelay = 600
        break
      default:
        this.width = 25
        this.height = 25
        this.speed = 1
        this.health = 1
        this.scoreValue = 10
        this.shootChance = 0.005
        this.color = "#ff0000"
        this.shootDelay = 2000
    }

    this.maxHealth = this.health
  }

  update(player: Player, gameTime: number) {
    this.movePattern++

    switch (this.type) {
      case "scout":
        this.y += this.speed
        break
      case "fighter":
        this.y += this.speed
        this.x += Math.sin(this.movePattern * 0.05) * 1
        break
      case "bomber":
        this.y += this.speed
        break
      case "interceptor":
        this.y += this.speed
        this.x += Math.sin(this.movePattern * 0.1) * 2
        break
      case "destroyer":
        this.y += this.speed
        this.x += Math.sin(this.movePattern * 0.03) * 0.5
        break
      case "dreadnought":
        this.y += this.speed
        if (this.y > 100) {
          this.x += Math.sin(this.movePattern * 0.02) * 1
        }
        break
    }

    this.shootTimer++
  }

  canShoot(): boolean {
    return Date.now() - this.lastShot > this.shootDelay
  }

  shoot(bullets: Bullet[]) {
    if (!this.canShoot()) return

    switch (this.type) {
      case "scout":
        bullets.push(new Bullet(this.x + this.width / 2 - 2, this.y + this.height, 4, "#ff0000", "normal"))
        break
      case "fighter":
        bullets.push(new Bullet(this.x + this.width / 2 - 2, this.y + this.height, 5, "#ff4444", "normal"))
        break
      case "bomber":
        // Triple shot
        bullets.push(new Bullet(this.x + this.width / 2 - 2, this.y + this.height, 4, "#ff0000", "normal"))
        bullets.push(new Bullet(this.x + this.width / 2 - 2, this.y + this.height, 4, "#ff0000", "normal", -1))
        bullets.push(new Bullet(this.x + this.width / 2 - 2, this.y + this.height, 4, "#ff0000", "normal", 1))
        break
      case "interceptor":
        bullets.push(new Bullet(this.x + this.width / 2 - 2, this.y + this.height, 6, "#ff00ff", "normal"))
        break
      case "destroyer":
        // Dual cannons
        bullets.push(new Bullet(this.x + 10, this.y + this.height, 5, "#ff4444", "normal"))
        bullets.push(new Bullet(this.x + this.width - 14, this.y + this.height, 5, "#ff4444", "normal"))
        break
      case "dreadnought":
        // Multiple weapon systems
        for (let i = 0; i < 5; i++) {
          bullets.push(new Bullet(this.x + (i * this.width) / 4 + 5, this.y + this.height, 4 + i, "#ff0000", "normal"))
        }
        break
    }

    this.lastShot = Date.now()
  }

  takeDamage(damage: number) {
    this.health -= damage
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Health bar for stronger enemies
    if (this.maxHealth > 1) {
      const healthPercent = this.health / this.maxHealth
      ctx.fillStyle = "#333333"
      ctx.fillRect(this.x, this.y - 8, this.width, 4)
      ctx.fillStyle = healthPercent > 0.6 ? "#00ff00" : healthPercent > 0.3 ? "#ffff00" : "#ff0000"
      ctx.fillRect(this.x, this.y - 8, this.width * healthPercent, 4)
    }

    // Main ship body
    ctx.fillStyle = this.color
    this.drawShipDesign(ctx)
  }

  drawShipDesign(ctx: CanvasRenderingContext2D) {
    switch (this.type) {
      case "scout":
        // Simple triangular scout
        ctx.beginPath()
        ctx.moveTo(this.x + this.width / 2, this.y + this.height)
        ctx.lineTo(this.x, this.y)
        ctx.lineTo(this.x + this.width, this.y)
        ctx.closePath()
        ctx.fill()

        // Engine
        ctx.fillStyle = "#0088ff"
        ctx.fillRect(this.x + this.width / 2 - 2, this.y - 5, 4, 8)
        break

      case "fighter":
        // Fighter design
        ctx.fillRect(this.x + 8, this.y, 14, this.height)

        // Wings
        ctx.fillStyle = "#666666"
        ctx.fillRect(this.x, this.y + 8, 8, 12)
        ctx.fillRect(this.x + 22, this.y + 8, 8, 12)

        // Nose
        ctx.fillStyle = this.color
        ctx.beginPath()
        ctx.moveTo(this.x + this.width / 2, this.y + this.height)
        ctx.lineTo(this.x + 8, this.y + this.height - 8)
        ctx.lineTo(this.x + 22, this.y + this.height - 8)
        ctx.closePath()
        ctx.fill()

        // Weapons
        ctx.fillStyle = "#ff4444"
        ctx.fillRect(this.x + 4, this.y + 15, 3, 8)
        ctx.fillRect(this.x + 23, this.y + 15, 3, 8)
        break

      case "bomber":
        // Heavy bomber design
        ctx.fillRect(this.x + 5, this.y, 25, this.height)

        // Bomb bay
        ctx.fillStyle = "#333333"
        ctx.fillRect(this.x + 10, this.y + 15, 15, 8)

        // Engines
        ctx.fillStyle = "#0088ff"
        ctx.fillRect(this.x + 2, this.y + 25, 6, 8)
        ctx.fillRect(this.x + 27, this.y + 25, 6, 8)

        // Weapons
        ctx.fillStyle = "#ff4444"
        ctx.fillRect(this.x + 8, this.y + 30, 4, 6)
        ctx.fillRect(this.x + 23, this.y + 30, 4, 6)
        break

      case "interceptor":
        // Fast interceptor design
        ctx.beginPath()
        ctx.moveTo(this.x + this.width / 2, this.y + this.height)
        ctx.lineTo(this.x + 4, this.y + 8)
        ctx.lineTo(this.x + this.width - 4, this.y + 8)
        ctx.closePath()
        ctx.fill()

        // Side pods
        ctx.fillStyle = "#666666"
        ctx.fillRect(this.x, this.y + 10, 6, 15)
        ctx.fillRect(this.x + 22, this.y + 10, 6, 15)

        // Engine trail
        ctx.fillStyle = "#ff00ff"
        ctx.fillRect(this.x + this.width / 2 - 1, this.y - 8, 2, 12)
        break

      case "destroyer":
        // Destroyer warship
        ctx.fillRect(this.x + 8, this.y, 29, this.height)

        // Command tower
        ctx.fillStyle = "#888888"
        ctx.fillRect(this.x + 18, this.y + 5, 9, 15)

        // Main guns
        ctx.fillStyle = "#444444"
        ctx.fillRect(this.x + 5, this.y + 20, 8, 12)
        ctx.fillRect(this.x + 32, this.y + 20, 8, 12)

        // Secondary weapons
        ctx.fillStyle = "#ff4444"
        ctx.fillRect(this.x + 15, this.y + 32, 4, 8)
        ctx.fillRect(this.x + 26, this.y + 32, 4, 8)

        // Engines
        ctx.fillStyle = "#0088ff"
        ctx.fillRect(this.x + 12, this.y - 5, 6, 8)
        ctx.fillRect(this.x + 27, this.y - 5, 6, 8)
        break

      case "dreadnought":
        // Massive dreadnought
        ctx.fillRect(this.x + 10, this.y, 40, this.height)

        // Multiple weapon turrets
        ctx.fillStyle = "#333333"
        ctx.fillRect(this.x + 5, this.y + 10, 12, 12)
        ctx.fillRect(this.x + 43, this.y + 10, 12, 12)
        ctx.fillRect(this.x + 24, this.y + 5, 12, 12)

        // Heavy armor plating
        ctx.fillStyle = "#555555"
        ctx.fillRect(this.x + 8, this.y + 25, 44, 8)

        // Main cannon
        ctx.fillStyle = "#222222"
        ctx.fillRect(this.x + 26, this.y + 35, 8, 15)

        // Engine array
        ctx.fillStyle = "#0088ff"
        for (let i = 0; i < 4; i++) {
          ctx.fillRect(this.x + 15 + i * 8, this.y - 6, 4, 10)
        }
        break
    }
  }
}

class Bullet {
  x: number
  y: number
  width: number
  height: number
  speed: number
  color: string
  type: string
  damage: number
  vx: number
  trail: { x: number; y: number }[]

  constructor(x: number, y: number, speed: number, color: string, type = "normal", vx = 0, damage = 1) {
    this.x = x
    this.y = y
    this.width = type === "laser" ? 6 : 4
    this.height = type === "laser" ? 15 : 10
    this.speed = speed
    this.color = color
    this.type = type
    this.damage = damage
    this.vx = vx
    this.trail = []
  }

  update() {
    // Store trail positions
    this.trail.push({ x: this.x, y: this.y })
    if (this.trail.length > 5) {
      this.trail.shift()
    }

    this.y += this.speed
    this.x += this.vx
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Draw trail effect
    if (this.trail.length > 1) {
      ctx.strokeStyle = this.color
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.3
      ctx.beginPath()
      ctx.moveTo(this.trail[0].x + this.width / 2, this.trail[0].y + this.height / 2)
      for (let i = 1; i < this.trail.length; i++) {
        ctx.lineTo(this.trail[i].x + this.width / 2, this.trail[i].y + this.height / 2)
      }
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    // Draw bullet with glow effect
    if (this.type === "laser") {
      ctx.shadowColor = this.color
      ctx.shadowBlur = 8
    }

    ctx.fillStyle = this.color
    if (this.type === "piercing") {
      // Draw piercing bullet with special design
      ctx.fillRect(this.x, this.y, this.width, this.height)
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(this.x + 1, this.y + 2, this.width - 2, this.height - 4)
    } else {
      ctx.fillRect(this.x, this.y, this.width, this.height)
    }

    ctx.shadowBlur = 0
  }
}

class PowerUp {
  x: number
  y: number
  width: number
  height: number
  speed: number
  type: string
  rotation: number
  color: string
  pulsePhase: number

  constructor(x: number, y: number, type: string) {
    this.x = x
    this.y = y
    this.width = 25
    this.height = 25
    this.speed = 2
    this.type = type
    this.rotation = 0
    this.pulsePhase = 0
    this.setupPowerUpType(type)
  }

  setupPowerUpType(type: string) {
    switch (type) {
      case "rapidFire":
        this.color = "#ffff00"
        break
      case "spread":
        this.color = "#ff00ff"
        break
      case "laser":
        this.color = "#ff0080"
        break
      case "shield":
        this.color = "#00ffff"
        break
      case "health":
        this.color = "#00ff00"
        break
      case "bomb":
        this.color = "#ff8800"
        break
      case "multiShot":
        this.color = "#8800ff"
        break
      case "piercing":
        this.color = "#ffff80"
        break
      default:
        this.color = "#ffffff"
    }
  }

  update() {
    this.y += this.speed
    this.rotation += 0.1
    this.pulsePhase += 0.15
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save()
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2)
    ctx.rotate(this.rotation)

    // Pulsing glow effect
    const pulseAlpha = 0.5 + Math.sin(this.pulsePhase) * 0.3
    ctx.shadowColor = this.color
    ctx.shadowBlur = 15
    ctx.globalAlpha = pulseAlpha

    // Draw power-up container
    ctx.fillStyle = this.color
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height)

    // Draw inner design
    ctx.fillStyle = "#000000"
    ctx.fillRect(-this.width / 2 + 3, -this.height / 2 + 3, this.width - 6, this.height - 6)

    // Draw power-up symbol
    ctx.fillStyle = this.color
    ctx.font = "bold 14px monospace"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"

    const symbols = {
      rapidFire: "R",
      spread: "S",
      laser: "L",
      shield: "◊",
      health: "+",
      bomb: "B",
      multiShot: "M",
      piercing: "P",
    }

    ctx.fillText(symbols[this.type as keyof typeof symbols] || "?", 0, 0)

    ctx.restore()
  }
}

class Gold {
  x: number
  y: number
  width: number
  height: number
  speed: number
  value: number
  rotation: number
  pulsePhase: number

  constructor(x: number, y: number, value: number) {
    this.x = x
    this.y = y
    this.width = 25 // Increased size
    this.height = 25 // Increased size
    this.speed = 1.5
    this.value = Math.max(1, Math.floor(value)) // Ensure value is at least 1
    this.rotation = 0
    this.pulsePhase = 0
  }

  update() {
    this.y += this.speed
    this.rotation += 0.08 // Slightly faster rotation
    this.pulsePhase += 0.15 // Slightly faster pulse
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save()
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2)
    ctx.rotate(this.rotation)

    // Pulsing glow effect
    const pulseAlpha = 0.6 + Math.sin(this.pulsePhase) * 0.4 // More pronounced pulse
    ctx.shadowColor = "#ffff00"
    ctx.shadowBlur = 15 // Increased blur
    ctx.globalAlpha = pulseAlpha

    // Draw gold coin shape
    ctx.fillStyle = "#ffd700" // Gold color
    ctx.beginPath()
    ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2)
    ctx.fill()

    // Inner detail with a slight offset for depth
    ctx.fillStyle = "#ccaa00"
    ctx.beginPath()
    ctx.arc(0, 0, (this.width / 2) * 0.7, 0, Math.PI * 2)
    ctx.fill()

    // Gold symbol with stronger contrast
    ctx.fillStyle = "#444400" // Darker color for contrast
    ctx.font = "bold 16px monospace" // Larger font
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText("G", 0, 0)

    ctx.restore()
  }
}

class Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
  type: string

  constructor(x: number, y: number, type = "explosion") {
    this.x = x
    this.y = y
    this.type = type
    this.setupParticle(type)
  }

  setupParticle(type: string) {
    switch (type) {
      case "explosion":
        this.vx = (Math.random() - 0.5) * 10
        this.vy = (Math.random() - 0.5) * 10
        this.life = 40
        this.maxLife = 40
        this.color = Math.random() > 0.5 ? "#ff8800" : "#ffff00"
        this.size = Math.random() * 5 + 3
        break
      case "hit":
        this.vx = (Math.random() - 0.5) * 6
        this.vy = (Math.random() - 0.5) * 6
        this.life = 20
        this.maxLife = 20
        this.color = "#ffffff"
        this.size = 3
        break
      case "powerup":
        this.vx = (Math.random() - 0.5) * 4
        this.vy = (Math.random() - 0.5) * 4
        this.life = 30
        this.maxLife = 30
        this.color = "#ffff00"
        this.size = 2
        break
      case "emp":
        this.vx = (Math.random() - 0.5) * 8
        this.vy = (Math.random() - 0.5) * 8
        this.life = 25
        this.maxLife = 25
        this.color = "#00ffff"
        this.size = 4
        break
    }
  }

  update() {
    this.x += this.vx
    this.y += this.vy
    this.life--
    this.vx *= 0.98
    this.vy *= 0.98
  }

  draw(ctx: CanvasRenderingContext2D) {
    const alpha = this.life / this.maxLife
    const currentSize = this.size * alpha

    ctx.globalAlpha = alpha
    ctx.fillStyle = this.color

    if (this.type === "explosion") {
      ctx.shadowColor = this.color
      ctx.shadowBlur = 5
    }

    ctx.fillRect(this.x - currentSize / 2, this.y - currentSize / 2, currentSize, currentSize)

    ctx.shadowBlur = 0
    ctx.globalAlpha = 1
  }
}

class Explosion {
  x: number
  y: number
  life: number
  maxLife: number
  type: string
  radius: number
  maxRadius: number

  constructor(x: number, y: number, type: string) {
    this.x = x
    this.y = y
    this.type = type
    this.life = type === "boss" ? 60 : type === "player" ? 45 : 30
    this.maxLife = this.life
    this.radius = 0
    this.maxRadius = type === "boss" ? 80 : type === "player" ? 60 : 40
  }

  update() {
    this.life--
    const progress = 1 - this.life / this.maxLife
    this.radius = this.maxRadius * Math.sin(progress * Math.PI)
  }

  draw(ctx: CanvasRenderingContext2D) {
    const alpha = this.life / this.maxLife

    // Outer explosion ring
    ctx.globalAlpha = alpha * 0.6
    ctx.strokeStyle = this.type === "boss" ? "#ff4444" : this.type === "player" ? "#00ff00" : "#ff8800"
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
    ctx.stroke()

    // Inner explosion core
    ctx.globalAlpha = alpha * 0.8
    ctx.fillStyle = this.type === "boss" ? "#ffff00" : this.type === "player" ? "#ffffff" : "#ffff00"
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius * 0.5, 0, Math.PI * 2)
    ctx.fill()

    ctx.globalAlpha = 1
  }
}

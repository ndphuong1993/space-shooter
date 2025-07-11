"use client"

// Enhanced Enemy Designs

class EnhancedEnemy {
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
  engineParticles: any[]
  damageFlash: number

  constructor(x: number, y: number, type: string, level: number) {
    this.x = x
    this.y = y
    this.type = type
    this.movePattern = 0
    this.shootTimer = 0
    this.lastShot = 0
    this.engineParticles = []
    this.damageFlash = 0
    this.setupEnemyType(type, level)
  }

  setupEnemyType(type: string, level: number) {
    const difficultyMultiplier = 1 + (level - 1) * 0.15 // Reduced from 0.2

    switch (type) {
      case "scout":
        this.width = 28
        this.height = 28
        this.speed = (1.5 + level * 0.08) * difficultyMultiplier // Reduced speed
        this.health = 1
        this.scoreValue = 10
        this.shootChance = 0.004 // Reduced from 0.005
        this.color = "#ff4444"
        this.shootDelay = 2500 // Increased from 2000
        break
      case "fighter":
        this.width = 32
        this.height = 32
        this.speed = (1.2 + level * 0.08) * difficultyMultiplier // Reduced speed
        this.health = 2
        this.scoreValue = 20
        this.shootChance = 0.006 // Reduced from 0.008
        this.color = "#ff8800"
        this.shootDelay = 2000 // Increased from 1500
        break
      case "bomber":
        this.width = 38
        this.height = 38
        this.speed = (0.8 + level * 0.06) * difficultyMultiplier // Reduced speed
        this.health = 3
        this.scoreValue = 30
        this.shootChance = 0.008 // Reduced from 0.012
        this.color = "#8800ff"
        this.shootDelay = 1800 // Increased from 1200
        break
      case "interceptor":
        this.width = 30
        this.height = 34
        this.speed = (2.0 + level * 0.12) * difficultyMultiplier // Reduced speed
        this.health = 2
        this.scoreValue = 25
        this.shootChance = 0.007 // Reduced from 0.01
        this.color = "#ff00ff"
        this.shootDelay = 1500 // Increased from 1000
        break
      case "destroyer":
        this.width = 48
        this.height = 42
        this.speed = (0.6 + level * 0.04) * difficultyMultiplier // Reduced speed
        this.health = 5
        this.scoreValue = 50
        this.shootChance = 0.01 // Reduced from 0.015
        this.color = "#666666"
        this.shootDelay = 1200 // Increased from 800
        break
      case "dreadnought":
        this.width = 65
        this.height = 55
        this.speed = (0.4 + level * 0.02) * difficultyMultiplier // Reduced speed
        this.health = 8
        this.scoreValue = 80
        this.shootChance = 0.012 // Reduced from 0.02
        this.color = "#444444"
        this.shootDelay = 1000 // Increased from 600
        break
      default:
        this.width = 28
        this.height = 28
        this.speed = 1
        this.health = 1
        this.scoreValue = 10
        this.shootChance = 0.004
        this.color = "#ff0000"
        this.shootDelay = 2500
    }

    this.maxHealth = this.health
  }

  update(player: any, gameTime: number) {
    this.movePattern++

    // Reduced movement patterns for slower gameplay
    switch (this.type) {
      case "scout":
        this.y += this.speed
        break
      case "fighter":
        this.y += this.speed
        this.x += Math.sin(this.movePattern * 0.03) * 0.8 // Reduced from 0.05 and 1
        break
      case "bomber":
        this.y += this.speed
        break
      case "interceptor":
        this.y += this.speed
        this.x += Math.sin(this.movePattern * 0.08) * 1.5 // Reduced from 0.1 and 2
        break
      case "destroyer":
        this.y += this.speed
        this.x += Math.sin(this.movePattern * 0.02) * 0.3 // Reduced from 0.03 and 0.5
        break
      case "dreadnought":
        this.y += this.speed
        if (this.y > 100) {
          this.x += Math.sin(this.movePattern * 0.015) * 0.8 // Reduced from 0.02 and 1
        }
        break
    }

    // Update engine particles
    this.updateEngineParticles()

    // Update damage flash
    if (this.damageFlash > 0) {
      this.damageFlash--
    }

    this.shootTimer++
  }

  updateEngineParticles() {
    // Add engine particles for larger ships
    if ((this.type === "destroyer" || this.type === "dreadnought") && Math.random() < 0.6) {
      this.engineParticles.push({
        x: this.x + this.width / 2 + (Math.random() - 0.5) * this.width * 0.8,
        y: this.y - 5,
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 2 - 1,
        life: Math.random() * 10 + 5,
        maxLife: 15,
        size: Math.random() * 2 + 1,
        color: "#ff4400",
      })
    }

    // Update existing particles
    this.engineParticles.forEach((particle, index) => {
      particle.x += particle.vx
      particle.y += particle.vy
      particle.life--
      if (particle.life <= 0) {
        this.engineParticles.splice(index, 1)
      }
    })
  }

  takeDamage(damage: number) {
    this.health -= damage
    this.damageFlash = 10 // Flash for 10 frames
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Draw engine particles first
    this.engineParticles.forEach((particle) => {
      const alpha = particle.life / particle.maxLife
      ctx.globalAlpha = alpha
      ctx.fillStyle = particle.color
      ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size)
    })
    ctx.globalAlpha = 1

    // Enhanced health bar for stronger enemies
    if (this.maxHealth > 1) {
      const healthPercent = this.health / this.maxHealth

      // Health bar background
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
      ctx.fillRect(this.x - 2, this.y - 12, this.width + 4, 6)

      // Health bar
      ctx.fillStyle = "#333333"
      ctx.fillRect(this.x, this.y - 10, this.width, 4)

      const healthColor = healthPercent > 0.6 ? "#00ff00" : healthPercent > 0.3 ? "#ffff00" : "#ff0000"
      ctx.fillStyle = healthColor
      ctx.fillRect(this.x, this.y - 10, this.width * healthPercent, 4)

      // Health bar border
      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 1
      ctx.strokeRect(this.x, this.y - 10, this.width, 4)
    }

    // Damage flash effect
    if (this.damageFlash > 0) {
      ctx.shadowColor = "#ffffff"
      ctx.shadowBlur = 8
    }

    // Draw enhanced ship design
    this.drawEnhancedShipDesign(ctx)

    ctx.shadowBlur = 0
  }

  drawEnhancedShipDesign(ctx: CanvasRenderingContext2D) {
    switch (this.type) {
      case "scout":
        this.drawScout(ctx)
        break
      case "fighter":
        this.drawFighter(ctx)
        break
      case "bomber":
        this.drawBomber(ctx)
        break
      case "interceptor":
        this.drawInterceptor(ctx)
        break
      case "destroyer":
        this.drawDestroyer(ctx)
        break
      case "dreadnought":
        this.drawDreadnought(ctx)
        break
    }
  }

  drawScout(ctx: CanvasRenderingContext2D) {
    // Enhanced scout design
    const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height)
    gradient.addColorStop(0, this.color)
    gradient.addColorStop(1, "#aa0000")

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.moveTo(this.x + this.width / 2, this.y + this.height)
    ctx.lineTo(this.x + 2, this.y + 4)
    ctx.lineTo(this.x + this.width - 2, this.y + 4)
    ctx.closePath()
    ctx.fill()

    // Cockpit
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(this.x + this.width / 2 - 3, this.y + 8, 6, 8)

    // Engine glow
    ctx.shadowColor = "#0088ff"
    ctx.shadowBlur = 6
    ctx.fillStyle = "#0088ff"
    ctx.fillRect(this.x + this.width / 2 - 2, this.y - 6, 4, 10)
    ctx.shadowBlur = 0
  }

  drawFighter(ctx: CanvasRenderingContext2D) {
    // Main hull
    const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height)
    gradient.addColorStop(0, this.color)
    gradient.addColorStop(1, "#aa4400")

    ctx.fillStyle = gradient
    ctx.fillRect(this.x + 8, this.y + 2, 16, this.height - 4)

    // Wings with detail
    ctx.fillStyle = "#666666"
    ctx.fillRect(this.x, this.y + 10, 8, 14)
    ctx.fillRect(this.x + 24, this.y + 10, 8, 14)

    // Wing tips
    ctx.fillStyle = "#888888"
    ctx.fillRect(this.x - 2, this.y + 14, 6, 6)
    ctx.fillRect(this.x + 28, this.y + 14, 6, 6)

    // Nose section
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.moveTo(this.x + this.width / 2, this.y + this.height)
    ctx.lineTo(this.x + 8, this.y + this.height - 8)
    ctx.lineTo(this.x + 24, this.y + this.height - 8)
    ctx.closePath()
    ctx.fill()

    // Weapons
    ctx.fillStyle = "#ff4444"
    ctx.fillRect(this.x + 4, this.y + 18, 4, 8)
    ctx.fillRect(this.x + 24, this.y + 18, 4, 8)

    // Cockpit
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(this.x + 12, this.y + 8, 8, 10)
  }

  drawBomber(ctx: CanvasRenderingContext2D) {
    // Heavy bomber hull
    const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height)
    gradient.addColorStop(0, this.color)
    gradient.addColorStop(1, "#440088")

    ctx.fillStyle = gradient
    ctx.fillRect(this.x + 6, this.y + 2, 26, this.height - 4)

    // Bomb bay doors
    ctx.fillStyle = "#333333"
    ctx.fillRect(this.x + 12, this.y + 18, 14, 10)

    // Engine pods
    ctx.fillStyle = "#555555"
    ctx.fillRect(this.x + 2, this.y + 28, 8, 8)
    ctx.fillRect(this.x + 28, this.y + 28, 8, 8)

    // Engine glow
    ctx.shadowColor = "#0088ff"
    ctx.shadowBlur = 4
    ctx.fillStyle = "#0088ff"
    ctx.fillRect(this.x + 4, this.y - 4, 4, 8)
    ctx.fillRect(this.x + 30, this.y - 4, 4, 8)
    ctx.shadowBlur = 0

    // Weapon turrets
    ctx.fillStyle = "#ff4444"
    ctx.fillRect(this.x + 10, this.y + 32, 6, 6)
    ctx.fillRect(this.x + 22, this.y + 32, 6, 6)
  }

  drawInterceptor(ctx: CanvasRenderingContext2D) {
    // Sleek interceptor design
    const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height)
    gradient.addColorStop(0, this.color)
    gradient.addColorStop(1, "#aa00aa")

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.moveTo(this.x + this.width / 2, this.y + this.height)
    ctx.lineTo(this.x + 4, this.y + 10)
    ctx.lineTo(this.x + this.width - 4, this.y + 10)
    ctx.closePath()
    ctx.fill()

    // Side weapon pods
    ctx.fillStyle = "#666666"
    ctx.fillRect(this.x, this.y + 12, 8, 16)
    ctx.fillRect(this.x + 22, this.y + 12, 8, 16)

    // Weapon barrels
    ctx.fillStyle = "#ff4444"
    ctx.fillRect(this.x + 2, this.y + 24, 4, 6)
    ctx.fillRect(this.x + 24, this.y + 24, 4, 6)

    // Engine trail effect
    ctx.shadowColor = this.color
    ctx.shadowBlur = 8
    ctx.fillStyle = this.color
    ctx.fillRect(this.x + this.width / 2 - 1, this.y - 10, 2, 15)
    ctx.shadowBlur = 0

    // Cockpit
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(this.x + 12, this.y + 15, 6, 8)
  }

  drawDestroyer(ctx: CanvasRenderingContext2D) {
    // Main destroyer hull
    const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height)
    gradient.addColorStop(0, "#888888")
    gradient.addColorStop(0.5, this.color)
    gradient.addColorStop(1, "#333333")

    ctx.fillStyle = gradient
    ctx.fillRect(this.x + 10, this.y + 2, 28, this.height - 4)

    // Command bridge
    ctx.fillStyle = "#aaaaaa"
    ctx.fillRect(this.x + 20, this.y + 6, 8, 12)

    // Main gun turrets
    ctx.fillStyle = "#444444"
    ctx.fillRect(this.x + 6, this.y + 22, 10, 10)
    ctx.fillRect(this.x + 32, this.y + 22, 10, 10)

    // Gun barrels
    ctx.fillStyle = "#222222"
    ctx.fillRect(this.x + 8, this.y + 32, 6, 10)
    ctx.fillRect(this.x + 34, this.y + 32, 6, 10)

    // Secondary weapons
    ctx.fillStyle = "#ff4444"
    ctx.fillRect(this.x + 16, this.y + 34, 4, 8)
    ctx.fillRect(this.x + 28, this.y + 34, 4, 8)

    // Engine array
    ctx.shadowColor = "#0088ff"
    ctx.shadowBlur = 6
    ctx.fillStyle = "#0088ff"
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(this.x + 14 + i * 6, this.y - 6, 4, 10)
    }
    ctx.shadowBlur = 0

    // Hull plating details
    ctx.strokeStyle = "#555555"
    ctx.lineWidth = 1
    ctx.strokeRect(this.x + 12, this.y + 8, 24, 20)
  }

  drawDreadnought(ctx: CanvasRenderingContext2D) {
    // Massive dreadnought hull
    const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height)
    gradient.addColorStop(0, "#666666")
    gradient.addColorStop(0.3, this.color)
    gradient.addColorStop(1, "#222222")

    ctx.fillStyle = gradient
    ctx.fillRect(this.x + 12, this.y + 2, 41, this.height - 4)

    // Multiple weapon turrets
    ctx.fillStyle = "#333333"
    ctx.fillRect(this.x + 6, this.y + 12, 14, 14)
    ctx.fillRect(this.x + 45, this.y + 12, 14, 14)
    ctx.fillRect(this.x + 26, this.y + 6, 13, 13)

    // Heavy armor sections
    ctx.fillStyle = "#555555"
    ctx.fillRect(this.x + 10, this.y + 28, 45, 10)

    // Main cannon
    ctx.fillStyle = "#222222"
    ctx.fillRect(this.x + 28, this.y + 38, 9, 17)

    // Multiple engine exhausts
    ctx.shadowColor = "#0088ff"
    ctx.shadowBlur = 8
    ctx.fillStyle = "#0088ff"
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(this.x + 16 + i * 7, this.y - 8, 5, 12)
    }
    ctx.shadowBlur = 0

    // Command structure
    ctx.fillStyle = "#777777"
    ctx.fillRect(this.x + 24, this.y + 18, 17, 8)

    // Weapon barrels
    ctx.fillStyle = "#111111"
    ctx.fillRect(this.x + 8, this.y + 26, 8, 12)
    ctx.fillRect(this.x + 49, this.y + 26, 8, 12)

    // Hull detailing
    ctx.strokeStyle = "#666666"
    ctx.lineWidth = 1
    ctx.strokeRect(this.x + 14, this.y + 10, 37, 25)
    ctx.strokeRect(this.x + 18, this.y + 15, 29, 15)
  }

  // ... (keep other methods the same)
}

export { EnhancedEnemy }

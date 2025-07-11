"use client"

// Enhanced Visual Components and Effects

class EnhancedPlayer {
  x: number
  y: number
  width: number
  height: number
  speed: number
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
  engineParticles: EngineParticle[]
  thrusterIntensity: number

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
    this.width = 45
    this.height = 60
    this.speed = 3.5 // Reduced from 6 to 3.5
    this.lastShot = 0
    this.shootDelay = 200 // Increased from 150
    this.activePowerUps = []
    this.hasShield = false
    this.shieldHits = 0
    this.maxShieldHits = 8
    this.specialAbility = "laser_burst"
    this.specialCooldown = 5000
    this.specialLastUsed = 0
    this.health = 100
    this.maxHealth = 100
    this.invulnerable = false
    this.invulnerableTime = 0
    this.engineParticles = []
    this.thrusterIntensity = 0
  }

  update(
    keys: { [key: string]: boolean },
    touch: { left: boolean; right: boolean; shoot: boolean; special: boolean },
    canvasWidth: number,
  ) {
    // Reduced movement sensitivity
    let currentSpeed = this.speed
    const rapidFirePowerUp = this.activePowerUps.find((p) => p.type === "rapidFire")
    if (rapidFirePowerUp) {
      currentSpeed *= 1.2 // Reduced from 1.3
    }

    let isMoving = false
    if (keys["KeyA"] || keys["ArrowLeft"] || touch.left) {
      this.x -= currentSpeed
      isMoving = true
    }
    if (keys["KeyD"] || keys["ArrowRight"] || touch.right) {
      this.x += currentSpeed
      isMoving = true
    }

    // Update thruster intensity based on movement
    this.thrusterIntensity = isMoving ? 1.0 : 0.3

    // Keep player in bounds
    this.x = Math.max(0, Math.min(canvasWidth - this.width, this.x))

    // Update engine particles
    this.updateEngineParticles()

    // Update invulnerability
    if (this.invulnerable) {
      this.invulnerableTime--
      if (this.invulnerableTime <= 0) {
        this.invulnerable = false
      }
    }
  }

  updateEngineParticles() {
    // Add new engine particles
    if (Math.random() < 0.8) {
      this.engineParticles.push(
        new EngineParticle(
          this.x + this.width / 2 - 8 + Math.random() * 16,
          this.y + this.height - 5,
          this.thrusterIntensity,
        ),
      )
    }

    // Update existing particles
    this.engineParticles.forEach((particle, index) => {
      particle.update()
      if (particle.life <= 0) {
        this.engineParticles.splice(index, 1)
      }
    })
  }

  shoot(bullets: any[]) {
    const spreadPowerUp = this.activePowerUps.find((p) => p.type === "spread")
    const multiShotPowerUp = this.activePowerUps.find((p) => p.type === "multiShot")
    const laserPowerUp = this.activePowerUps.find((p) => p.type === "laser")
    const piercingPowerUp = this.activePowerUps.find((p) => p.type === "piercing")

    if (laserPowerUp) {
      bullets.push(new EnhancedBullet(this.x + this.width / 2 - 3, this.y - 15, -8, "#ff00ff", "laser", 0, 3))
    } else if (spreadPowerUp) {
      bullets.push(new EnhancedBullet(this.x + this.width / 2 - 2, this.y - 15, -7, "#00ff00", "normal"))
      bullets.push(new EnhancedBullet(this.x + this.width / 2 - 2, this.y - 15, -6, "#00ff00", "normal", -1.5))
      bullets.push(new EnhancedBullet(this.x + this.width / 2 - 2, this.y - 15, -6, "#00ff00", "normal", 1.5))
    } else if (multiShotPowerUp) {
      bullets.push(new EnhancedBullet(this.x + 8, this.y - 15, -7, "#00ff00", "normal"))
      bullets.push(new EnhancedBullet(this.x + this.width / 2 - 2, this.y - 15, -7, "#00ff00", "normal"))
      bullets.push(new EnhancedBullet(this.x + this.width - 12, this.y - 15, -7, "#00ff00", "normal"))
    } else {
      const bulletType = piercingPowerUp ? "piercing" : "normal"
      const bulletColor = piercingPowerUp ? "#ffff00" : "#00ff00"
      bullets.push(new EnhancedBullet(this.x + this.width / 2 - 2, this.y - 15, -7, bulletColor, bulletType))
    }

    this.lastShot = Date.now()
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Draw engine particles first (behind ship)
    this.engineParticles.forEach((particle) => particle.draw(ctx))

    // Draw shield effect with enhanced visuals
    if (this.hasShield) {
      const time = Date.now() * 0.005
      const shieldAlpha = 0.4 + Math.sin(time) * 0.2
      const shieldStrength = 1 - this.shieldHits / this.maxShieldHits

      // Outer shield ring
      ctx.strokeStyle = `rgba(0, 255, 255, ${shieldAlpha})`
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 40, 0, Math.PI * 2)
      ctx.stroke()

      // Inner shield energy
      ctx.strokeStyle = `rgba(100, 255, 255, ${shieldStrength * 0.6})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 35, 0, Math.PI * 2 * shieldStrength)
      ctx.stroke()

      // Shield hexagon pattern
      this.drawShieldHexagons(ctx, shieldAlpha * shieldStrength)
    }

    // Invulnerability flashing
    if (this.invulnerable && Math.floor(this.invulnerableTime / 8) % 2 === 0) {
      return
    }

    // Enhanced ship design
    this.drawEnhancedShip(ctx)
  }

  drawShieldHexagons(ctx: CanvasRenderingContext2D, alpha: number) {
    ctx.strokeStyle = `rgba(0, 255, 255, ${alpha * 0.3})`
    ctx.lineWidth = 1

    const centerX = this.x + this.width / 2
    const centerY = this.y + this.height / 2
    const hexSize = 8

    for (let angle = 0; angle < 360; angle += 60) {
      const hexX = centerX + Math.cos((angle * Math.PI) / 180) * 30
      const hexY = centerY + Math.sin((angle * Math.PI) / 180) * 30

      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const x = hexX + Math.cos((i * Math.PI) / 3) * hexSize
        const y = hexY + Math.sin((i * Math.PI) / 3) * hexSize
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.stroke()
    }
  }

  drawEnhancedShip(ctx: CanvasRenderingContext2D) {
    const rapidFirePowerUp = this.activePowerUps.find((p) => p.type === "rapidFire")
    const laserPowerUp = this.activePowerUps.find((p) => p.type === "laser")

    // Base ship color with power-up modifications
    let shipColor = "#00aa00"
    let accentColor = "#00ff00"

    if (laserPowerUp) {
      shipColor = "#aa0088"
      accentColor = "#ff00ff"
    } else if (rapidFirePowerUp) {
      shipColor = "#aaaa00"
      accentColor = "#ffff00"
    }

    // Main hull with gradient effect
    const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height)
    gradient.addColorStop(0, accentColor)
    gradient.addColorStop(0.3, shipColor)
    gradient.addColorStop(1, "#003300")

    ctx.fillStyle = gradient
    ctx.fillRect(this.x + 10, this.y + 15, 25, 40)

    // Ship nose (pointed front)
    ctx.fillStyle = accentColor
    ctx.beginPath()
    ctx.moveTo(this.x + this.width / 2, this.y)
    ctx.lineTo(this.x + 8, this.y + 20)
    ctx.lineTo(this.x + 37, this.y + 20)
    ctx.closePath()
    ctx.fill()

    // Side wings with detail
    ctx.fillStyle = "#666666"
    ctx.fillRect(this.x, this.y + 25, 10, 20)
    ctx.fillRect(this.x + 35, this.y + 25, 10, 20)

    // Wing tips
    ctx.fillStyle = "#888888"
    ctx.fillRect(this.x - 2, this.y + 30, 6, 10)
    ctx.fillRect(this.x + 41, this.y + 30, 6, 10)

    // Cockpit with reflection
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(this.x + 18, this.y + 18, 9, 15)
    ctx.fillStyle = "rgba(200, 200, 255, 0.7)"
    ctx.fillRect(this.x + 19, this.y + 19, 7, 6)

    // Engine exhausts with glow
    ctx.shadowColor = "#0088ff"
    ctx.shadowBlur = 8
    ctx.fillStyle = "#0088ff"
    ctx.fillRect(this.x + 14, this.y + 50, 7, 12)
    ctx.fillRect(this.x + 24, this.y + 50, 7, 12)
    ctx.shadowBlur = 0

    // Weapon systems
    ctx.fillStyle = "#ff4444"
    ctx.fillRect(this.x + 6, this.y + 28, 5, 10)
    ctx.fillRect(this.x + 34, this.y + 28, 5, 10)

    // Hull details and paneling
    ctx.strokeStyle = "#004400"
    ctx.lineWidth = 1
    ctx.strokeRect(this.x + 12, this.y + 20, 21, 25)
    ctx.strokeRect(this.x + 15, this.y + 25, 15, 15)

    // Power-up indicators with enhanced visuals
    if (this.activePowerUps.length > 0) {
      ctx.font = "bold 12px monospace"
      ctx.textAlign = "center"
      ctx.shadowColor = "#ffff00"
      ctx.shadowBlur = 4

      this.activePowerUps.forEach((powerUp, index) => {
        const symbol = this.getPowerUpSymbol(powerUp.type)
        const x = this.x + this.width / 2 + (index - 1) * 15
        const y = this.y - 8

        ctx.fillStyle = "#ffff00"
        ctx.fillText(symbol, x, y)
      })
      ctx.shadowBlur = 0
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

  // ... (keep other methods the same)
}

class EnhancedBullet {
  x: number
  y: number
  width: number
  height: number
  speed: number
  color: string
  type: string
  damage: number
  vx: number
  trail: { x: number; y: number; alpha: number }[]
  glowIntensity: number
  rotation: number

  constructor(x: number, y: number, speed: number, color: string, type = "normal", vx = 0, damage = 1) {
    this.x = x
    this.y = y
    this.width = type === "laser" ? 8 : 5
    this.height = type === "laser" ? 20 : 12
    this.speed = speed
    this.color = color
    this.type = type
    this.damage = damage
    this.vx = vx
    this.trail = []
    this.glowIntensity = 1
    this.rotation = 0
  }

  update() {
    // Enhanced trail system
    this.trail.push({
      x: this.x + this.width / 2,
      y: this.y + this.height / 2,
      alpha: 1,
    })

    if (this.trail.length > 8) {
      this.trail.shift()
    }

    // Update trail alpha
    this.trail.forEach((point, index) => {
      point.alpha = ((index + 1) / this.trail.length) * 0.8
    })

    this.y += this.speed
    this.x += this.vx
    this.rotation += 0.2
    this.glowIntensity = 0.8 + Math.sin(Date.now() * 0.01) * 0.2
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Enhanced trail effect
    if (this.trail.length > 1) {
      const trailGradient = ctx.createLinearGradient(
        this.trail[0].x,
        this.trail[0].y,
        this.trail[this.trail.length - 1].x,
        this.trail[this.trail.length - 1].y,
      )
      trailGradient.addColorStop(0, `${this.color}00`)
      trailGradient.addColorStop(1, this.color)

      ctx.strokeStyle = trailGradient
      ctx.lineWidth = this.type === "laser" ? 4 : 3
      ctx.lineCap = "round"

      ctx.beginPath()
      ctx.moveTo(this.trail[0].x, this.trail[0].y)
      for (let i = 1; i < this.trail.length; i++) {
        ctx.globalAlpha = this.trail[i].alpha
        ctx.lineTo(this.trail[i].x, this.trail[i].y)
      }
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    // Enhanced bullet rendering with glow
    ctx.shadowColor = this.color
    ctx.shadowBlur = this.type === "laser" ? 15 : 10
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0

    if (this.type === "laser") {
      // Laser bullet with core and outer glow
      ctx.fillStyle = this.color
      ctx.fillRect(this.x, this.y, this.width, this.height)

      ctx.fillStyle = "#ffffff"
      ctx.fillRect(this.x + 2, this.y + 2, this.width - 4, this.height - 4)

      ctx.fillStyle = this.color
      ctx.fillRect(this.x + 3, this.y + 4, this.width - 6, this.height - 8)
    } else if (this.type === "piercing") {
      // Piercing bullet with rotating design
      ctx.save()
      ctx.translate(this.x + this.width / 2, this.y + this.height / 2)
      ctx.rotate(this.rotation)

      ctx.fillStyle = this.color
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height)

      ctx.fillStyle = "#ffffff"
      ctx.fillRect(-this.width / 2 + 1, -this.height / 2 + 2, this.width - 2, this.height - 4)

      // Piercing tip
      ctx.fillStyle = "#ffff00"
      ctx.beginPath()
      ctx.moveTo(0, -this.height / 2)
      ctx.lineTo(-2, -this.height / 2 + 4)
      ctx.lineTo(2, -this.height / 2 + 4)
      ctx.closePath()
      ctx.fill()

      ctx.restore()
    } else {
      // Standard bullet with enhanced design
      const bulletGradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height)
      bulletGradient.addColorStop(0, "#ffffff")
      bulletGradient.addColorStop(0.3, this.color)
      bulletGradient.addColorStop(1, this.color + "88")

      ctx.fillStyle = bulletGradient
      ctx.fillRect(this.x, this.y, this.width, this.height)

      // Bullet tip
      ctx.fillStyle = "#ffffff"
      ctx.beginPath()
      ctx.moveTo(this.x + this.width / 2, this.y)
      ctx.lineTo(this.x, this.y + 4)
      ctx.lineTo(this.x + this.width, this.y + 4)
      ctx.closePath()
      ctx.fill()
    }

    ctx.shadowBlur = 0
  }
}

class EnhancedExplosion {
  x: number
  y: number
  life: number
  maxLife: number
  type: string
  radius: number
  maxRadius: number
  shockwaveRadius: number
  particles: ExplosionParticle[]
  rings: ExplosionRing[]

  constructor(x: number, y: number, type: string) {
    this.x = x
    this.y = y
    this.type = type
    this.life = type === "boss" ? 90 : type === "player" ? 75 : 45
    this.maxLife = this.life
    this.radius = 0
    this.maxRadius = type === "boss" ? 100 : type === "player" ? 80 : 50
    this.shockwaveRadius = 0
    this.particles = []
    this.rings = []

    // Create explosion particles
    const particleCount = type === "boss" ? 25 : type === "player" ? 20 : 15
    for (let i = 0; i < particleCount; i++) {
      this.particles.push(new ExplosionParticle(x, y, type))
    }

    // Create explosion rings
    const ringCount = type === "boss" ? 4 : type === "player" ? 3 : 2
    for (let i = 0; i < ringCount; i++) {
      this.rings.push(new ExplosionRing(x, y, i * 10, type))
    }
  }

  update() {
    this.life--
    const progress = 1 - this.life / this.maxLife

    // Main explosion radius
    this.radius = this.maxRadius * Math.sin(progress * Math.PI) * 0.8

    // Shockwave effect
    this.shockwaveRadius = this.maxRadius * progress * 1.5

    // Update particles
    this.particles.forEach((particle, index) => {
      particle.update()
      if (particle.life <= 0) {
        this.particles.splice(index, 1)
      }
    })

    // Update rings
    this.rings.forEach((ring, index) => {
      ring.update()
      if (ring.life <= 0) {
        this.rings.splice(index, 1)
      }
    })
  }

  draw(ctx: CanvasRenderingContext2D) {
    const alpha = this.life / this.maxLife
    const progress = 1 - alpha

    // Draw shockwave
    if (progress < 0.3) {
      ctx.globalAlpha = ((0.3 - progress) / 0.3) * 0.4
      ctx.strokeStyle = this.type === "boss" ? "#ff4444" : this.type === "player" ? "#00ff00" : "#ff8800"
      ctx.lineWidth = 6
      ctx.beginPath()
      ctx.arc(this.x, this.y, this.shockwaveRadius, 0, Math.PI * 2)
      ctx.stroke()
    }

    // Draw explosion rings
    this.rings.forEach((ring) => ring.draw(ctx))

    // Draw main explosion core
    ctx.globalAlpha = alpha * 0.9

    // Outer explosion
    const outerGradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius)
    outerGradient.addColorStop(0, this.type === "boss" ? "#ffff00" : this.type === "player" ? "#ffffff" : "#ffaa00")
    outerGradient.addColorStop(0.4, this.type === "boss" ? "#ff4444" : this.type === "player" ? "#00ff00" : "#ff4400")
    outerGradient.addColorStop(1, "transparent")

    ctx.fillStyle = outerGradient
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
    ctx.fill()

    // Inner core
    ctx.globalAlpha = alpha * 1.2
    const coreGradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 0.4)
    coreGradient.addColorStop(0, "#ffffff")
    coreGradient.addColorStop(1, this.type === "boss" ? "#ffff00" : this.type === "player" ? "#00ffff" : "#ffff00")

    ctx.fillStyle = coreGradient
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius * 0.4, 0, Math.PI * 2)
    ctx.fill()

    // Draw explosion particles
    this.particles.forEach((particle) => particle.draw(ctx))

    ctx.globalAlpha = 1
  }
}

class ExplosionParticle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  rotation: number
  rotationSpeed: number

  constructor(x: number, y: number, type: string) {
    const angle = Math.random() * Math.PI * 2
    const speed = Math.random() * 8 + 4

    this.x = x
    this.y = y
    this.vx = Math.cos(angle) * speed
    this.vy = Math.sin(angle) * speed
    this.life = Math.random() * 30 + 20
    this.maxLife = this.life
    this.size = Math.random() * 6 + 3
    this.rotation = 0
    this.rotationSpeed = (Math.random() - 0.5) * 0.3

    const colors =
      type === "boss"
        ? ["#ff4444", "#ffaa00", "#ffff00", "#ffffff"]
        : type === "player"
          ? ["#00ff00", "#00ffff", "#ffffff", "#88ff88"]
          : ["#ff8800", "#ffaa00", "#ffff00", "#ffffff"]

    this.color = colors[Math.floor(Math.random() * colors.length)]
  }

  update() {
    this.x += this.vx
    this.y += this.vy
    this.vx *= 0.95
    this.vy *= 0.95
    this.life--
    this.rotation += this.rotationSpeed
  }

  draw(ctx: CanvasRenderingContext2D) {
    const alpha = this.life / this.maxLife
    const currentSize = this.size * alpha

    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.rotation)
    ctx.globalAlpha = alpha

    ctx.shadowColor = this.color
    ctx.shadowBlur = 8
    ctx.fillStyle = this.color
    ctx.fillRect(-currentSize / 2, -currentSize / 2, currentSize, currentSize)

    ctx.restore()
  }
}

class ExplosionRing {
  x: number
  y: number
  radius: number
  maxRadius: number
  life: number
  maxLife: number
  delay: number
  color: string
  lineWidth: number

  constructor(x: number, y: number, delay: number, type: string) {
    this.x = x
    this.y = y
    this.radius = 0
    this.maxRadius = type === "boss" ? 80 + delay : type === "player" ? 60 + delay : 40 + delay
    this.life = 40
    this.maxLife = 40
    this.delay = delay
    this.lineWidth = type === "boss" ? 4 : 3

    this.color = type === "boss" ? "#ff4444" : type === "player" ? "#00ff00" : "#ff8800"
  }

  update() {
    if (this.delay > 0) {
      this.delay--
      return
    }

    this.life--
    const progress = 1 - this.life / this.maxLife
    this.radius = this.maxRadius * progress
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.delay > 0 || this.life <= 0) return

    const alpha = this.life / this.maxLife
    ctx.globalAlpha = alpha * 0.8
    ctx.strokeStyle = this.color
    ctx.lineWidth = this.lineWidth
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
    ctx.stroke()
  }
}

class EngineParticle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  intensity: number

  constructor(x: number, y: number, intensity: number) {
    this.x = x
    this.y = y
    this.vx = (Math.random() - 0.5) * 2
    this.vy = Math.random() * 3 + 2
    this.life = Math.random() * 15 + 10
    this.maxLife = this.life
    this.size = Math.random() * 3 + 1
    this.intensity = intensity

    const colors = ["#0088ff", "#00aaff", "#00ccff", "#ffffff"]
    this.color = colors[Math.floor(Math.random() * colors.length)]
  }

  update() {
    this.x += this.vx
    this.y += this.vy
    this.life--
    this.vx *= 0.98
    this.vy *= 0.98
  }

  draw(ctx: CanvasRenderingContext2D) {
    const alpha = (this.life / this.maxLife) * this.intensity
    const currentSize = this.size * alpha

    ctx.globalAlpha = alpha
    ctx.shadowColor = this.color
    ctx.shadowBlur = 4
    ctx.fillStyle = this.color
    ctx.fillRect(this.x - currentSize / 2, this.y - currentSize / 2, currentSize, currentSize)
    ctx.shadowBlur = 0
  }
}

// Placeholder for Bullet class declaration
class Bullet {
  // Bullet class implementation
}

export { EnhancedPlayer, EnhancedBullet, EnhancedExplosion, EngineParticle }

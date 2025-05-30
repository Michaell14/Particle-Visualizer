import { useEffect, useRef, useState } from 'react';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    hue: number;
    saturation: number;
    brightness: number;
}

const AudioVisualizer: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number>(0);
    const particlesRef = useRef<Particle[]>([]);
    const [particleCount, setParticleCount] = useState(100);
    const [lineWidth, setLineWidth] = useState(2);
    const [particleColor, setParticleColor] = useState('#ffffff');
    const [effects, setEffects] = useState({
        colorMode: 'solid', // 'solid', 'rainbow'
        particleShape: 'circle', // 'circle', 'square', 'triangle'
        lineStyle: 'solid', // 'solid', 'dashed', 'gradient'
        trailLength: 0.1, // 0-1
        particleSize: 2, // 1-10
        connectionDistance: 200, // 50-500
        glowEffect: false,
        glowIntensity: 0.5, // 0-1
    });

    const draw = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        // Clear canvas with trail effect based on trailLength
        ctx.fillStyle = `rgba(0, 0, 0, ${1 - effects.trailLength})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const particles = particlesRef.current;
        if (!particles.length) return;

        // Update and draw particles
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            
            // Maintain constant base movement
            const baseSpeed = 1;
            const angle = Math.atan2(p.vy, p.vx);
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            
            // Normalize velocity to maintain constant speed
            if (speed < baseSpeed) {
                p.vx = Math.cos(angle) * baseSpeed;
                p.vy = Math.sin(angle) * baseSpeed;
            }
            
            // Update position
            p.x += p.vx;
            p.y += p.vy;

            // Bounce off walls with energy preservation
            if (p.x < 0) {
                p.x = 0;
                p.vx = Math.abs(p.vx);
            } else if (p.x > canvas.width) {
                p.x = canvas.width;
                p.vx = -Math.abs(p.vx);
            }
            if (p.y < 0) {
                p.y = 0;
                p.vy = Math.abs(p.vy);
            } else if (p.y > canvas.height) {
                p.y = canvas.height;
                p.vy = -Math.abs(p.vy);
            }

            // Draw particle
            drawParticle(ctx, p);

            // Draw lines to nearby particles
            for (let j = i + 1; j < particles.length; j++) {
                const p2 = particles[j];
                const dx = p.x - p2.x;
                const dy = p.y - p2.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Only draw lines if particles are within connection distance
                if (distance < effects.connectionDistance) {
                    // Calculate opacity based on distance (fade out as distance increases)
                    const opacity = 0.2 * (1 - (distance / effects.connectionDistance));
                    drawLine(ctx, p, p2, distance, opacity);
                }
            }
        }

        // Request next frame
        animationFrameRef.current = requestAnimationFrame(draw);
    };

    // Initialize canvas and start animation
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Set canvas size to window size
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // Initialize particles
        particlesRef.current = Array.from({ length: particleCount }, createParticle);
        
        // Start animation
        animationFrameRef.current = requestAnimationFrame(draw);

        // Cleanup
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [particleCount, effects.connectionDistance, effects.lineStyle, effects.trailLength, effects.particleShape, effects.glowEffect, effects.glowIntensity, lineWidth]);

    // Update particles when effects change
    useEffect(() => {
        particlesRef.current.forEach(particle => {
            // Update particle size when effect changes
            particle.size = effects.particleSize;
            
            // Reset color when switching modes
            if (effects.colorMode === 'rainbow') {
                // Give each particle a different starting hue for more variety
                particle.hue = Math.random() * 360;
                particle.saturation = 100;
                particle.brightness = 50;
            } else if (effects.colorMode === 'solid') {
                // Convert hex to HSL for consistent color handling
                const r = parseInt(particleColor.slice(1, 3), 16) / 255;
                const g = parseInt(particleColor.slice(3, 5), 16) / 255;
                const b = parseInt(particleColor.slice(5, 7), 16) / 255;
                
                const max = Math.max(r, g, b);
                const min = Math.min(r, g, b);
                const l = (max + min) / 2;
                
                let h = 0;
                let s = 0;
                
                if (max !== min) {
                    const d = max - min;
                    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                    
                    switch (max) {
                        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                        case g: h = (b - r) / d + 2; break;
                        case b: h = (r - g) / d + 4; break;
                    }
                    h *= 60;
                }
                
                particle.hue = h;
                particle.saturation = s * 100;
                particle.brightness = l * 100;
            }
        });
    }, [effects.colorMode, effects.particleSize, effects.lineStyle, particleColor]);

    const createParticle = (): Particle => {
        return {
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            size: effects.particleSize,
            hue: Math.random() * 360,
            saturation: 100,
            brightness: 100
        };
    };

    const getParticleColor = (particle: Particle) => {
        switch (effects.colorMode) {
            case 'rainbow':
                // Update hue based on time
                particle.hue = (particle.hue + 1) % 360;
                return `hsl(${particle.hue}, 100%, 50%)`;
            case 'solid':
            default:
                return `hsl(${particle.hue}, ${particle.saturation}%, ${particle.brightness}%)`;
        }
    };

    const drawParticle = (ctx: CanvasRenderingContext2D, particle: Particle) => {
        const color = getParticleColor(particle);
        ctx.fillStyle = color;
        
        if (effects.glowEffect) {
            ctx.shadowColor = color;
            ctx.shadowBlur = effects.glowIntensity * 20;
        }

        const size = particle.size;
        ctx.beginPath();
        switch (effects.particleShape) {
            case 'square':
                ctx.rect(particle.x - size, particle.y - size, size * 2, size * 2);
                break;
            case 'triangle':
                ctx.moveTo(particle.x, particle.y - size);
                ctx.lineTo(particle.x + size, particle.y + size);
                ctx.lineTo(particle.x - size, particle.y + size);
                break;
            case 'circle':
            default:
                ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
        }
        ctx.fill();

        // Reset shadow after drawing
        if (effects.glowEffect) {
            ctx.shadowBlur = 0;
        }
    };

    const drawLine = (ctx: CanvasRenderingContext2D, p1: Particle, p2: Particle, distance: number, opacity: number) => {
        // Only set line style if it's different from the current one
        if (effects.lineStyle === 'dashed') {
            ctx.setLineDash([5, 5]);
        } else {
            ctx.setLineDash([]);
        }

        ctx.lineWidth = lineWidth;

        if (effects.lineStyle === 'gradient') {
            const gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
            const color1 = getParticleColor(p1);
            const color2 = getParticleColor(p2);
            gradient.addColorStop(0, color1);
            gradient.addColorStop(1, color2);
            ctx.strokeStyle = gradient;
        } else {
            ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
        }

        // Draw the line
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
    };

    return (
        <div className="audio-visualizer">
            <canvas
                ref={canvasRef}
                width={window.innerWidth}
                height={window.innerHeight}
                style={{ 
                    position: 'fixed', 
                    top: 0, 
                    left: 0, 
                    zIndex: 1,
                    background: 'black'
                }}
            />
            <div className="controls-panel">
                <div className="controls-header">
                    <h3>Particle Visualizer Controls</h3>
                </div>
                <div className="controls">
                    <div className="control-group">
                        <h4>Basic Controls</h4>
                        <div>
                            <label>
                                Particle Count:
                                <input
                                    type="range"
                                    min="50"
                                    max="200"
                                    value={particleCount}
                                    onChange={(e) => setParticleCount(Number(e.target.value))}
                                />
                            </label>
                        </div>
                        <div>
                            <label>
                                Line Width:
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    value={lineWidth}
                                    onChange={(e) => setLineWidth(Number(e.target.value))}
                                />
                            </label>
                        </div>
                        <div>
                            <label>
                                Particle Color:
                                <input
                                    type="color"
                                    value={particleColor}
                                    onChange={(e) => {
                                        setParticleColor(e.target.value);
                                        setEffects(prev => ({ ...prev, colorMode: 'solid' }));
                                    }}
                                />
                            </label>
                        </div>
                    </div>

                    <div className="control-group">
                        <h4>Visual Effects</h4>
                        <div>
                            <label>
                                Color Mode:
                                <select
                                    value={effects.colorMode}
                                    onChange={(e) => {
                                        const newMode = e.target.value;
                                        setEffects(prev => ({ ...prev, colorMode: newMode }));
                                        
                                        // Update particle colors when switching to solid mode
                                        if (newMode === 'solid') {
                                            particlesRef.current.forEach(particle => {
                                                // Convert hex to HSL for consistent color handling
                                                const r = parseInt(particleColor.slice(1, 3), 16) / 255;
                                                const g = parseInt(particleColor.slice(3, 5), 16) / 255;
                                                const b = parseInt(particleColor.slice(5, 7), 16) / 255;
                                                
                                                const max = Math.max(r, g, b);
                                                const min = Math.min(r, g, b);
                                                const l = (max + min) / 2;
                                                
                                                let h = 0;
                                                let s = 0;
                                                
                                                if (max !== min) {
                                                    const d = max - min;
                                                    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                                                    
                                                    switch (max) {
                                                        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                                                        case g: h = (b - r) / d + 2; break;
                                                        case b: h = (r - g) / d + 4; break;
                                                    }
                                                    h *= 60;
                                                }
                                                
                                                particle.hue = h;
                                                particle.saturation = s * 100;
                                                particle.brightness = l * 100;
                                            });
                                        }
                                    }}
                                    style={{ backgroundColor: '#333', color: 'white' }}
                                >
                                    <option value="solid">Solid</option>
                                    <option value="rainbow">Rainbow</option>
                                </select>
                            </label>
                        </div>
                        <div>
                            <label>
                                Particle Shape:
                                <select
                                    value={effects.particleShape}
                                    onChange={(e) => setEffects(prev => ({ ...prev, particleShape: e.target.value }))}
                                    style={{ backgroundColor: '#333', color: 'white' }}
                                >
                                    <option value="circle">Circle</option>
                                    <option value="square">Square</option>
                                    <option value="triangle">Triangle</option>
                                </select>
                            </label>
                        </div>
                        <div>
                            <label>
                                Line Style:
                                <select
                                    value={effects.lineStyle}
                                    onChange={(e) => setEffects(prev => ({ ...prev, lineStyle: e.target.value }))}
                                    style={{ backgroundColor: '#333', color: 'white' }}
                                >
                                    <option value="solid">Solid</option>
                                    <option value="dashed">Dashed</option>
                                    <option value="gradient">Gradient</option>
                                </select>
                            </label>
                        </div>
                    </div>

                    <div className="control-group">
                        <h4>Advanced Effects</h4>
                        <div>
                            <label>
                                Trail Length:
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={effects.trailLength}
                                    onChange={(e) => setEffects(prev => ({ ...prev, trailLength: Number(e.target.value) }))}
                                />
                            </label>
                        </div>
                        <div>
                            <label>
                                Particle Size:
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    value={effects.particleSize}
                                    onChange={(e) => setEffects(prev => ({ ...prev, particleSize: Number(e.target.value) }))}
                                />
                            </label>
                        </div>
                        <div>
                            <label>
                                Connection Distance:
                                <input
                                    type="range"
                                    min="50"
                                    max="320"
                                    value={effects.connectionDistance}
                                    onChange={(e) => setEffects(prev => ({ ...prev, connectionDistance: Number(e.target.value) }))}
                                />
                            </label>
                        </div>
                    </div>

                    <div className="control-group">
                        <h4>Effects</h4>
                        <div>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={effects.glowEffect}
                                    onChange={(e) => setEffects(prev => ({ ...prev, glowEffect: e.target.checked }))}
                                />
                                Glow Effect
                            </label>
                        </div>
                        {effects.glowEffect && (
                            <div>
                                <label>
                                    Glow Intensity:
                                    <input
                                        type="range"
                                        min="0"
                                        max="5"
                                        step="0.1"
                                        value={effects.glowIntensity}
                                        onChange={(e) => setEffects(prev => ({ ...prev, glowIntensity: Number(e.target.value) }))}
                                    />
                                </label>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AudioVisualizer; 
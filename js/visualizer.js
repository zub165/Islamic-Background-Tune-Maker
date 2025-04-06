/**
 * Islamic Music Visualizer
 * Uses p5.js to create beautiful visualizations for the generated music
 */

class MusicVisualizer {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.width = 0;
        this.height = 0;
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.isActive = false;
        this.instruments = new Map();
        this.noteEvents = [];
        this.animationFrame = null;
        this.colorPalette = {
            background: 'rgba(32, 41, 64, 0.2)',
            waveform: 'rgba(73, 138, 220, 0.8)',
            dots: 'rgba(255, 255, 255, 0.8)',
            text: '#FFF',
            noteCircles: 'rgba(127, 189, 255, 0.5)'
        };
    }

    init(audioContext) {
        // Set up the canvas
        this.canvas = document.getElementById('visualizer');
        if (!this.canvas) {
            console.warn('Visualizer canvas element not found');
            return false;
        }

        this.ctx = this.canvas.getContext('2d');
        this.resize();

        // Set up audio analyzer
        this.audioContext = audioContext;
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        this.analyser.connect(this.audioContext.destination);
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

        // Handle window resize
        window.addEventListener('resize', () => this.resize());

        // Start animation
        this.animate();
        return true;
    }

    resize() {
        if (!this.canvas) return;
        this.width = this.canvas.clientWidth;
        this.height = this.canvas.clientHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    setActive(active) {
        this.isActive = active;
    }

    addInstrument(name, color) {
        this.instruments.set(name, {
            color: color,
            lastEventTime: 0
        });
    }

    clearInstruments() {
        this.instruments.clear();
    }

    addNoteEvent(note, time, instrument) {
        if (!this.instruments.has(instrument)) return;
        
        const instrumentData = this.instruments.get(instrument);
        instrumentData.lastEventTime = time;

        this.noteEvents.push({
            note: note,
            time: time,
            instrument: instrument,
            x: Math.random() * this.width,
            y: Math.random() * this.height,
            size: Math.random() * 30 + 20,
            opacity: 1.0,
            color: instrumentData.color || this.colorPalette.noteCircles
        });

        // Limit the number of events
        if (this.noteEvents.length > 30) {
            this.noteEvents.shift();
        }
    }

    animate() {
        this.animationFrame = requestAnimationFrame(() => this.animate());
        this.draw();
    }

    draw() {
        if (!this.ctx || !this.canvas) return;
        
        // Clear the canvas
        this.ctx.fillStyle = this.colorPalette.background;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw a frame
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(10, 10, this.width - 20, this.height - 20);

        // Draw Islamic-inspired pattern in the background
        this.drawPattern();

        // If active, draw audio waveform
        if (this.isActive && this.analyser) {
            this.analyser.getByteTimeDomainData(this.dataArray);
            this.drawWaveform();
        }

        // Draw note events
        this.drawNoteEvents();

        // Draw status text
        this.drawStatusText();
    }

    drawPattern() {
        // Draw a simplified Islamic star pattern background
        this.ctx.save();
        this.ctx.globalAlpha = 0.07;
        
        const tileSize = 100;
        const numTilesX = Math.ceil(this.width / tileSize);
        const numTilesY = Math.ceil(this.height / tileSize);
        
        for (let x = 0; x < numTilesX; x++) {
            for (let y = 0; y < numTilesY; y++) {
                const centerX = x * tileSize + tileSize / 2;
                const centerY = y * tileSize + tileSize / 2;
                this.drawStar(centerX, centerY, 8, tileSize / 3, tileSize / 6);
            }
        }
        
        this.ctx.restore();
    }
    
    drawStar(cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        let step = Math.PI / spikes;
        
        this.ctx.beginPath();
        this.ctx.moveTo(cx, cy - outerRadius);
        
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            this.ctx.lineTo(x, y);
            rot += step;
            
            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            this.ctx.lineTo(x, y);
            rot += step;
        }
        
        this.ctx.lineTo(cx, cy - outerRadius);
        this.ctx.closePath();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.stroke();
    }

    drawWaveform() {
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = this.colorPalette.waveform;
        this.ctx.beginPath();
        
        const sliceWidth = this.width / this.dataArray.length;
        let x = 0;
        
        for (let i = 0; i < this.dataArray.length; i++) {
            const v = this.dataArray[i] / 128.0;
            const y = v * this.height / 2;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
            
            x += sliceWidth;
        }
        
        this.ctx.lineTo(this.width, this.height / 2);
        this.ctx.stroke();
    }

    drawNoteEvents() {
        const currentTime = this.audioContext ? this.audioContext.currentTime : performance.now() / 1000;
        const newEvents = [];
        
        for (const event of this.noteEvents) {
            const age = currentTime - event.time;
            
            // Keep events for 3 seconds
            if (age < 3) {
                // Fade out over time
                event.opacity = Math.max(0, 1 - (age / 3));
                
                // Draw the note circle
                this.ctx.beginPath();
                this.ctx.arc(event.x, event.y, event.size, 0, Math.PI * 2);
                this.ctx.fillStyle = event.color || this.colorPalette.noteCircles;
                this.ctx.globalAlpha = event.opacity;
                this.ctx.fill();
                this.ctx.globalAlpha = 1;
                
                newEvents.push(event);
            }
        }
        
        this.noteEvents = newEvents;
    }

    drawStatusText() {
        if (!this.isActive) {
            this.ctx.fillStyle = this.colorPalette.text;
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Music Visualization Paused', this.width / 2, this.height / 2);
        }
    }

    setColorPalette(paletteName) {
        const palettes = {
            islamic: {
                background: 'rgba(32, 41, 64, 0.2)',
                waveform: 'rgba(73, 138, 220, 0.8)',
                dots: 'rgba(255, 255, 255, 0.8)',
                text: '#FFF',
                noteCircles: 'rgba(127, 189, 255, 0.5)'
            },
            night: {
                background: 'rgba(15, 25, 55, 0.3)',
                waveform: 'rgba(100, 220, 255, 0.7)',
                dots: 'rgba(200, 230, 255, 0.9)',
                text: '#d0e6ff',
                noteCircles: 'rgba(150, 215, 255, 0.6)'
            },
            desert: {
                background: 'rgba(60, 45, 30, 0.2)',
                waveform: 'rgba(220, 150, 80, 0.7)',
                dots: 'rgba(255, 200, 120, 0.8)',
                text: '#fff2e0',
                noteCircles: 'rgba(230, 180, 100, 0.5)'
            }
        };
        
        this.colorPalette = palettes[paletteName] || palettes.islamic;
    }
}

// Create global visualizer instance
window.MUSIC_VISUALIZER = new MusicVisualizer(); 
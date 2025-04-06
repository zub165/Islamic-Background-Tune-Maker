/**
 * Waveform Visualization using wavesurfer.js
 * Shows real-time waveform of the current audio with interactive controls
 */

class WaveformVisualizer {
    constructor() {
        this.wavesurfer = null;
        this.container = null;
        this.isInitialized = false;
        this.audioElement = null;
        this.isReady = false;
    }

    /**
     * Initialize the wavesurfer visualization
     * @param {string} containerId - The ID of the container element
     */
    init(containerId = 'visualizer-container') {
        if (!window.WaveSurfer) {
            console.error('WaveSurfer.js is not loaded');
            // Create a basic visualization fallback
            this.createFallbackVisualization(containerId);
            return;
        }

        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container element with ID ${containerId} not found`);
            return;
        }

        // Create a progress element inside the container
        const progressContainer = document.createElement('div');
        progressContainer.id = 'waveform-progress';
        progressContainer.style.width = '100%';
        progressContainer.style.height = '100%';
        progressContainer.style.display = 'flex';
        progressContainer.style.flexDirection = 'column';
        progressContainer.style.justifyContent = 'center';
        progressContainer.style.alignItems = 'center';
        
        // Clear the container
        this.container.innerHTML = '';
        this.container.appendChild(progressContainer);

        try {
            // Create wavesurfer instance with initial loader message
            // Version 6.x configuration
            this.wavesurfer = WaveSurfer.create({
                container: progressContainer,
                waveColor: '#217b77',
                progressColor: '#e6af4b',
                responsive: true,
                cursorColor: '#e6af4b',
                cursorWidth: 2,
                barWidth: 2,
                barGap: 1,
                height: 100,
                normalize: true,
                pixelRatio: window.devicePixelRatio,
                plugins: [
                    WaveSurfer.cursor.create({
                        showTime: true,
                        opacity: 1,
                        customShowTimeStyle: {
                            'background-color': '#217b77',
                            color: '#fff',
                            padding: '2px 5px',
                            'font-size': '10px',
                            'border-radius': '3px'
                        }
                    })
                ]
            });

            // Events
            this.wavesurfer.on('ready', () => {
                console.log('Wavesurfer is ready');
                this.isReady = true;
                
                // Show any visualization controls
                const visControls = document.getElementById('waveform-controls');
                if (visControls) {
                    visControls.style.display = 'block';
                }
            });

            this.wavesurfer.on('play', () => {
                updatePlayPauseButton(true);
            });

            this.wavesurfer.on('pause', () => {
                updatePlayPauseButton(false);
            });

            this.wavesurfer.on('error', (err) => {
                console.error('Wavesurfer error:', err);
                
                // Show error in container
                this.container.innerHTML = `
                    <div style="color: red; padding: 20px; text-align: center;">
                        Error loading audio visualization. ${err}
                    </div>
                `;
            });
        } catch (e) {
            console.error('Error initializing WaveSurfer:', e);
            this.createFallbackVisualization(containerId);
            return;
        }

        // Set loading text while we wait for audio
        this.setLoadingState('No audio loaded yet. Generate music to visualize waveform.');
        
        this.isInitialized = true;
        this.setupEventListeners();
        
        return this;
    }
    
    /**
     * Set up UI event listeners
     */
    setupEventListeners() {
        // Play/pause on click
        this.container.addEventListener('click', (event) => {
            // Prevent clicking on loading messages from toggling playback
            if (!this.isReady || event.target.tagName === 'DIV' && event.target.id !== 'waveform-progress') {
                return;
            }
            
            this.togglePlayPause();
        });
        
        // Link to transport controls
        const playPauseBtn = document.getElementById('play-pause-btn');
        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', () => {
                if (this.isReady) {
                    this.togglePlayPause();
                }
            });
        }
        
        const stopBtn = document.getElementById('stop-btn');
        if (stopBtn) {
            stopBtn.addEventListener('click', () => {
                if (this.isReady) {
                    this.stop();
                }
            });
        }
    }
    
    /**
     * Load and visualize an audio blob
     * @param {Blob} audioBlob - Audio blob to visualize
     */
    loadAudioBlob(audioBlob) {
        if (!this.isInitialized) {
            this.init();
        }
        
        if (!this.wavesurfer) {
            console.error('Wavesurfer not initialized');
            return;
        }
        
        this.setLoadingState('Loading audio waveform...');
        
        // Load the audio blob
        this.wavesurfer.loadBlob(audioBlob);
    }
    
    /**
     * Load and visualize audio from an element
     * @param {HTMLAudioElement} audioElement - Audio element to visualize
     */
    loadAudioElement(audioElement) {
        if (!this.isInitialized) {
            this.init();
        }
        
        if (!this.wavesurfer) {
            console.error('Wavesurfer not initialized');
            return;
        }
        
        this.audioElement = audioElement;
        this.setLoadingState('Loading audio waveform...');
        
        // Load audio from media element
        this.wavesurfer.load(audioElement.src);
        
        // Synchronize with the audio element
        this.syncWithAudioElement();
    }
    
    /**
     * Keep wavesurfer in sync with the audio element 
     */
    syncWithAudioElement() {
        if (!this.audioElement || !this.wavesurfer) return;
        
        const syncAudio = () => {
            // Check if audio element is playing but wavesurfer is not
            if (!this.audioElement.paused && !this.wavesurfer.isPlaying()) {
                this.wavesurfer.play();
            }
            
            // Check if audio element is paused but wavesurfer is playing
            if (this.audioElement.paused && this.wavesurfer.isPlaying()) {
                this.wavesurfer.pause();
            }
            
            // Sync current time (allow small difference to avoid jitter)
            const timeDiff = Math.abs(this.audioElement.currentTime - this.wavesurfer.getCurrentTime());
            if (timeDiff > 0.5) {
                this.wavesurfer.setCurrentTime(this.audioElement.currentTime);
            }
        };
        
        // Sync periodically
        setInterval(syncAudio, 1000);
        
        // Sync on events
        this.audioElement.addEventListener('play', () => this.wavesurfer.play());
        this.audioElement.addEventListener('pause', () => this.wavesurfer.pause());
        this.audioElement.addEventListener('seeked', () => {
            this.wavesurfer.setCurrentTime(this.audioElement.currentTime);
        });
        
        // Sync wavesurfer to audio element
        this.wavesurfer.on('seek', (progress) => {
            const newTime = progress * this.audioElement.duration;
            if (Math.abs(this.audioElement.currentTime - newTime) > 0.5) {
                this.audioElement.currentTime = newTime;
            }
        });
    }
    
    /**
     * Load visualizer from a file URL
     * @param {string} url - URL to load audio from 
     */
    loadUrl(url) {
        if (!this.isInitialized) {
            this.init();
        }
        
        if (!this.wavesurfer) {
            console.error('Wavesurfer not initialized');
            return;
        }
        
        this.setLoadingState('Loading audio waveform...');
        
        // Load the URL
        this.wavesurfer.load(url);
    }
    
    /**
     * Set the loading state with a message
     * @param {string} message - Message to display while loading 
     */
    setLoadingState(message) {
        this.isReady = false;
        
        if (!this.wavesurfer || !this.container) return;
        
        // If wavesurfer is still loading, we'll just update the container
        const loadingEl = document.createElement('div');
        loadingEl.className = 'waveform-loading';
        loadingEl.style.position = 'absolute';
        loadingEl.style.top = '0';
        loadingEl.style.left = '0';
        loadingEl.style.width = '100%';
        loadingEl.style.height = '100%';
        loadingEl.style.display = 'flex';
        loadingEl.style.alignItems = 'center';
        loadingEl.style.justifyContent = 'center';
        loadingEl.style.backgroundColor = 'rgba(0,0,0,0.1)';
        loadingEl.style.zIndex = '5';
        loadingEl.style.borderRadius = 'var(--border-radius)';
        loadingEl.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <div style="margin-bottom: 10px;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 24px; color: var(--primary-color);"></i>
                </div>
                <div>${message}</div>
            </div>
        `;
        
        // Remove any existing loading elements
        const existingLoadingEl = this.container.querySelector('.waveform-loading');
        if (existingLoadingEl) {
            this.container.removeChild(existingLoadingEl);
        }
        
        // Add the loading element
        this.container.appendChild(loadingEl);
    }
    
    /**
     * Play or pause audio playback
     */
    togglePlayPause() {
        if (!this.wavesurfer || !this.isReady) return;
        
        this.wavesurfer.playPause();
    }
    
    /**
     * Stop audio playback and reset position
     */
    stop() {
        if (!this.wavesurfer || !this.isReady) return;
        
        this.wavesurfer.stop();
    }
    
    /**
     * Clean up resources when done
     */
    destroy() {
        if (this.wavesurfer) {
            this.wavesurfer.destroy();
        }
        
        this.wavesurfer = null;
        this.isInitialized = false;
        this.isReady = false;
    }
    
    /**
     * Change zoom level
     * @param {number} zoomLevel - Zoom level (1-50)
     */
    zoom(zoomLevel) {
        if (!this.wavesurfer || !this.isReady) return;
        
        // Normalize zoom level
        const normalizedZoom = Math.max(1, Math.min(50, zoomLevel));
        this.wavesurfer.zoom(normalizedZoom);
    }

    /**
     * Create a simple canvas-based fallback visualization
     */
    createFallbackVisualization(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '';
        
        // Create a canvas element
        const canvas = document.createElement('canvas');
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        container.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Add message
        ctx.fillStyle = '#217b77';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Waveform visualization not available', canvas.width/2, canvas.height/2);
        ctx.font = '14px Arial';
        ctx.fillText('Using basic visualization instead', canvas.width/2, canvas.height/2 + 30);
        
        // Draw some decorative lines
        ctx.strokeStyle = '#e6af4b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        // Draw a simple sine wave
        const amplitude = 30;
        const frequency = 0.02;
        ctx.moveTo(0, canvas.height/2);
        
        for (let x = 0; x < canvas.width; x++) {
            const y = canvas.height/2 + amplitude * Math.sin(x * frequency);
            ctx.lineTo(x, y);
        }
        
        ctx.stroke();
        
        this.isInitialized = true;
        this.isReady = true;
    }
}

// Create global instance
const WAVEFORM_VISUALIZER = new WaveformVisualizer(); 
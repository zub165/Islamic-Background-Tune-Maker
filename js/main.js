/**
 * Islamic Ambience Generator - Main Application Script
 * Coordinates music generation, UI interactions, and visualization
 */

import { SAMPLE_URLS, SAMPLE_METADATA, checkSamplesLoaded } from './samples.js';
import Instruments from './instruments.js';

// Global variables
let isPlaying = false;
let isPaused = false;
let recorder = null;
let playerBuffer = null;
let musicSequence = null;
let generatedDuration = 60;
let currentTransportTime = 0;

// Global audio context
let audioContext = null;
let instruments = null;
let visualizer = null;
let arrangementInProgress = false;
let currentArrangement = null;

// Initialize application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Load required libraries dynamically
    loadWaveSurfer().then(() => {
        console.log('WaveSurfer loaded successfully');
        // Initialize waveform visualizer
        if (window.WAVEFORM_VISUALIZER) {
            WAVEFORM_VISUALIZER.init();
        }
    }).catch(err => {
        console.error('Failed to load WaveSurfer:', err);
    });
    
    // Initialize UI
    initUI();
    
    // Setup event listeners
    setupEventListeners();
});

/**
 * Initialize UI elements and default states
 */
function initUI() {
    // Update sliders with initial values
    updateSliderValueDisplay('tempo-control', 'tempo-value', ' BPM');
    updateSliderValueDisplay('reverb-control', 'reverb-value', '%', 100);
    updateSliderValueDisplay('delay-control', 'delay-value', '%', 100);
    updateSliderValueDisplay('master-volume', 'volume-value', '%', 100);
    
    // Initialize the audio system when user first interacts with the page
    // (This is required by browsers for audio playback)
    const handleFirstInteraction = async () => {
        try {
            await initAudioSystem();
            
            // Once initialized, remove all event listeners
            document.removeEventListener('click', handleFirstInteraction);
            document.removeEventListener('keydown', handleFirstInteraction);
            document.removeEventListener('touchstart', handleFirstInteraction);
            
            console.log("Audio context initialized via user interaction");
        } catch (err) {
            console.error("Failed to initialize audio context:", err);
        }
    };
    
    // Add multiple event listeners for better chances of capturing user interaction
    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);
    document.addEventListener('touchstart', handleFirstInteraction);
    
    // Update status
    updateAudioStatus("Click anywhere to initialize audio system.");
}

/**
 * Initialize the audio system
 */
async function initAudioSystem() {
    try {
        console.log('Initializing audio system...');
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log('Audio context created:', audioContext.state);
        
        // Create our modules
        instruments = new Instruments(audioContext);
        console.log('Instruments module created');
        
        // Initialize the visualizer
        if (window.MUSIC_VISUALIZER) {
            MUSIC_VISUALIZER.init(audioContext);
            console.log('Music visualizer initialized');
        } else {
            console.warn('Music visualizer not available');
        }
        
        // Preload samples with detailed logging
        console.log('Starting sample preload...');
        try {
            await instruments.preloadSamples();
            console.log('Samples preloaded successfully');
        } catch (preloadError) {
            console.error('Error preloading samples:', preloadError);
            throw preloadError;
        }
        
        // Set up UI with default values
        setupUI();
        console.log('UI setup complete');
        
        document.getElementById('status').textContent = 'Audio system initialized. Ready to generate music.';
        return true;
    } catch (error) {
        console.error('Error initializing audio system:', error);
        document.getElementById('status').textContent = 'Error initializing audio. Please try refreshing the page.';
        return false;
    }
}

/**
 * Set up all event listeners for controls
 */
function setupEventListeners() {
    // Generate button
    document.getElementById('generate-btn').addEventListener('click', generateMusic);
    
    // Play/Pause button
    document.getElementById('play-pause-btn').addEventListener('click', togglePlayPause);
    
    // Stop button
    document.getElementById('stop-btn').addEventListener('click', stopMusic);
    
    // Export button
    document.getElementById('export-btn').addEventListener('click', exportGeneratedAudio);
    
    // Instrument mode selection
    document.getElementById('instrument-mode').addEventListener('change', function() {
        if (ISLAMIC_INSTRUMENTS) {
            ISLAMIC_INSTRUMENTS.setMode(this.value);
            
            // Update status message
            const modeName = this.value === 'synthesized' ? 'Synthesized' : 'Sampled (Realistic)';
            updateAudioStatus(`Switched to ${modeName} instrument mode. Click "Generate Music" to create.`);
        }
    });
    
    // Master volume control
    document.getElementById('master-volume').addEventListener('input', function() {
        const volume = parseFloat(this.value);
        updateSliderValueDisplay('master-volume', 'volume-value', '%', 100);
        ISLAMIC_INSTRUMENTS.setMasterVolume(volume);
    });
    
    // Effects controls
    document.getElementById('reverb-control').addEventListener('input', updateEffects);
    document.getElementById('delay-control').addEventListener('input', updateEffects);
    
    // Instrument volume controls
    const instrumentVolumeSliders = document.querySelectorAll('.instrument-volume');
    instrumentVolumeSliders.forEach(slider => {
        slider.addEventListener('input', updateInstrumentVolumes);
    });
    
    // Preset buttons
    const presetButtons = document.querySelectorAll('.preset-btn');
    presetButtons.forEach(button => {
        button.addEventListener('click', function() {
            applyPreset(this.getAttribute('data-preset'));
        });
    });
    
    // Scale selection
    document.getElementById('scale-selection').addEventListener('change', function() {
        if (MUSIC_VISUALIZER) {
            MUSIC_VISUALIZER.setScale(this.value);
        }
    });
    
    // Waveform zoom control
    const zoomControl = document.getElementById('zoom-control');
    if (zoomControl) {
        zoomControl.addEventListener('input', function() {
            const zoomLevel = parseInt(this.value);
            document.getElementById('zoom-value').textContent = zoomLevel;
            
            if (WAVEFORM_VISUALIZER) {
                WAVEFORM_VISUALIZER.zoom(zoomLevel);
            }
        });
    }
    
    // Visualization style buttons
    const visButtons = document.querySelectorAll('.vis-btn');
    visButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            visButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            // Set visualization style
            if (MUSIC_VISUALIZER) {
                MUSIC_VISUALIZER.setVisualStyle(this.getAttribute('data-style'));
            }
        });
    });
    
    // Window resize event for visualizer
    window.addEventListener('resize', function() {
        if (MUSIC_VISUALIZER) {
            MUSIC_VISUALIZER.resize();
        }
        
        if (WAVEFORM_VISUALIZER && WAVEFORM_VISUALIZER.wavesurfer) {
            WAVEFORM_VISUALIZER.wavesurfer.drawBuffer();
        }
    });
    
    // Audio player event listeners
    const audioElement = document.getElementById('output-audio');
    audioElement.addEventListener('play', function() {
        updatePlayPauseButton(true);
        startProgressUpdate(this);
    });
    
    audioElement.addEventListener('pause', function() {
        updatePlayPauseButton(false);
        stopProgressUpdate();
    });
    
    audioElement.addEventListener('ended', function() {
        // If we're looping, we shouldn't reach here, but just in case
        if (!this.loop) {
            updatePlayPauseButton(false);
            stopProgressUpdate();
        }
    });
    
    // Progress bar updates
    audioElement.addEventListener('timeupdate', function() {
        updateProgressBar(this);
    });
}

/**
 * Update slider value display
 */
function updateSliderValueDisplay(sliderId, valueId, unit = '', multiplier = 1) {
    const slider = document.getElementById(sliderId);
    const valueDisplay = document.getElementById(valueId);
    
    if (slider && valueDisplay) {
        const displayValue = Math.round(parseFloat(slider.value) * multiplier);
        valueDisplay.textContent = displayValue + unit;
    }
}

/**
 * Update effects based on control values
 */
function updateEffects() {
    const reverbControl = document.getElementById('reverb-control');
    const delayControl = document.getElementById('delay-control');
    
    // Update displays
    updateSliderValueDisplay('reverb-control', 'reverb-value', '%', 100);
    updateSliderValueDisplay('delay-control', 'delay-value', '%', 100);
    
    // Apply effect settings
    if (ISLAMIC_INSTRUMENTS) {
        ISLAMIC_INSTRUMENTS.updateEffects({
            reverb: parseFloat(reverbControl.value),
            delay: parseFloat(delayControl.value)
        });
    }
}

/**
 * Update instrument volumes based on sliders
 */
function updateInstrumentVolumes() {
    if (!ISLAMIC_INSTRUMENTS) return;
    
    const volumeSettings = {};
    
    // Collect volume settings for all instruments
    document.querySelectorAll('.instrument-volume').forEach(slider => {
        const instrument = slider.getAttribute('data-instrument');
        volumeSettings[instrument] = parseFloat(slider.value);
    });
    
    // Apply volume settings
    ISLAMIC_INSTRUMENTS.updateVolumes(volumeSettings);
}

/**
 * Toggle play/pause state
 */
function togglePlayPause() {
    if (!Tone.Transport.state === 'started' && !isPlaying) {
        // If nothing is playing, don't do anything
        return;
    }
    
    if (isPaused) {
        resumeMusic();
    } else {
        pauseMusic();
    }
}

function pauseMusic() {
    if (isPlaying) {
        // Store current time position
        currentTransportTime = Tone.Transport.seconds;
        
        // Pause transport
        Tone.Transport.pause();
        
        // Pause audio element if it's playing
        const audioElement = document.getElementById('output-audio');
        if (audioElement && !audioElement.paused) {
            audioElement.pause();
        } else {
            // Update button state manually if not using audio element
            updatePlayPauseButton(false);
        }
        
        // Update visualization
        MUSIC_VISUALIZER.setPlaying(false);
        
        // Update status
        isPaused = true;
        updateAudioStatus("Music paused. Click the play button to resume.");
    }
}

function resumeMusic() {
    if (isPaused) {
        // Resume transport
        Tone.Transport.start();
        
        // Resume audio element if available
        const audioElement = document.getElementById('output-audio');
        if (audioElement && audioElement.src) {
            audioElement.play();
        } else {
            // Update button state manually if not using audio element
            updatePlayPauseButton(true);
        }
        
        // Resume visualization
        MUSIC_VISUALIZER.setPlaying(true);
        
        // Update status
        isPaused = false;
        updateAudioStatus("Music resumed.");
    }
}

/**
 * Update play/pause button icon and state
 */
function updatePlayPauseButton(isPlaying) {
    const playPauseBtn = document.getElementById('play-pause-btn');
    const playPauseIcon = playPauseBtn.querySelector('i');
    
    if (isPlaying) {
        playPauseIcon.className = 'fas fa-pause';
        playPauseBtn.classList.add('playing');
    } else {
        playPauseIcon.className = 'fas fa-play';
        playPauseBtn.classList.remove('playing');
    }
}

/**
 * Update audio status message
 */
function updateAudioStatus(message) {
    const statusElement = document.getElementById('audio-status');
    if (statusElement) {
        statusElement.innerHTML = `<span>${message}</span>`;
    }
}

// Add progress bar update functions
let progressInterval = null;

function startProgressUpdate(audioElement) {
    // Show progress bar
    document.getElementById('playback-progress').style.display = 'block';
    
    // Update total duration
    const totalTime = audioElement.duration;
    document.getElementById('total-time').textContent = formatTime(totalTime);
    
    // Clear any existing interval
    stopProgressUpdate();
    
    // Start interval for smoother updates
    progressInterval = setInterval(() => {
        updateProgressBar(audioElement);
    }, 100);
}

function stopProgressUpdate() {
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
}

function updateProgressBar(audioElement) {
    if (!audioElement) return;
    
    const currentTime = audioElement.currentTime;
    const duration = audioElement.duration;
    
    if (isNaN(duration)) return;
    
    // Update progress fill
    const percentage = (currentTime / duration) * 100;
    document.getElementById('progress-fill').style.width = `${percentage}%`;
    
    // Update time display
    document.getElementById('current-time').textContent = formatTime(currentTime);
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Generate music based on current settings
 */
async function generateMusic() {
    // Stop any currently playing music
    if (isPlaying) {
        stopMusic();
    }
    
    // Disable generate button while processing
    const generateBtn = document.getElementById('generate-btn');
    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';
    
    // Hide progress bar
    document.getElementById('playback-progress').style.display = 'none';
    
    // Update status
    updateAudioStatus("Generating music...");
    
    try {
        // Get settings from UI
        generatedDuration = parseInt(document.getElementById('music-length').value);
        const selectedScale = document.getElementById('scale-selection').value;
        const tempo = parseInt(document.getElementById('tempo-control').value);
        const instrumentMode = document.getElementById('instrument-mode').value;
        
        // Set instrument mode
        ISLAMIC_INSTRUMENTS.setMode(instrumentMode);
        
        // Set transport tempo
        Tone.Transport.bpm.value = tempo;
        
        // Read selected instruments
        const instrumentConfig = {};
        const instrumentCheckboxes = document.querySelectorAll('#instruments-container input[type="checkbox"]');
        
        instrumentCheckboxes.forEach(checkbox => {
            if (checkbox.checked) {
                // Get the instrument name from the value attribute
                const instrument = checkbox.value;
                // Find volume slider using the data-instrument attribute
                const volumeSlider = document.querySelector(`.instrument-volume[data-instrument="${instrument}"]`);
                const volume = volumeSlider ? parseFloat(volumeSlider.value) : 0.7;
                
                console.log(`Adding instrument: ${instrument} with volume ${volume}`);
                
                instrumentConfig[instrument] = { 
                    volume: volume 
                };
            }
        });
        
        // Create instruments based on selection
        const instruments = ISLAMIC_INSTRUMENTS.createInstruments(instrumentConfig);
        
        // Apply master volume
        const masterVolume = parseFloat(document.getElementById('master-volume').value);
        ISLAMIC_INSTRUMENTS.setMasterVolume(masterVolume);
        
        // Apply effects
        updateEffects();
        
        // Start recording
        recorder = new Tone.Recorder();
        ISLAMIC_INSTRUMENTS.masterChannel.connect(recorder);
        recorder.start();
        
        // Set playing state
        isPlaying = true;
        isPaused = false;
        
        // Start transport
        Tone.Transport.start();
        
        // Create music arrangement for synthesized mode
        if (instrumentMode === 'synthesized') {
            // Create a simple analyzer that doesn't cause errors
            const analyzer = new Tone.Analyser({
                type: "waveform",
                size: 1024
            });
            
            // Connect master channel to analyzer
            ISLAMIC_INSTRUMENTS.masterChannel.connect(analyzer);
            
            // Initialize visualizer with analyzer only (not passing scale to avoid errors)
            if (MUSIC_VISUALIZER) {
                MUSIC_VISUALIZER.init();
                MUSIC_VISUALIZER.analyzer = analyzer;
                MUSIC_VISUALIZER.setPlaying(true);
                MUSIC_VISUALIZER.scale = selectedScale;
                
                // Try to create sketch if it doesn't exist
                if (!MUSIC_VISUALIZER.sketchInstance) {
                    MUSIC_VISUALIZER.createSketch();
                }
            }
            
            try {
                await createMusicArrangement(selectedScale, tempo, generatedDuration, instruments);
            } catch (arrangeError) {
                console.error("Error in music arrangement:", arrangeError);
                // Continue execution even if arrangement has an error
            }
        } else {
            // For sampled mode, we just need to set visualizer playing state
            if (MUSIC_VISUALIZER) {
                MUSIC_VISUALIZER.setPlaying(true);
            }
        }
        
        // Update buttons
        document.getElementById('stop-btn').disabled = false;
        document.getElementById('play-pause-btn').disabled = false;
        updatePlayPauseButton(true);
        
        // Update status
        const modeText = instrumentMode === 'synthesized' ? 'generated' : 'sampled';
        updateAudioStatus(`Playing ${generatedDuration} seconds of ${modeText} music in ${selectedScale} scale...`);
        
        // Set timeout to stop recording after the duration
        setTimeout(async () => {
            if (isPlaying) {
                const recording = await recorder.stop();
                displayRecording(recording);
                playerBuffer = recording;
                
                // Keep transport running but release recorder
                recorder = null;
                
                // Update status
                updateAudioStatus("Music generation complete. Use the player controls to listen or export.");
            }
        }, generatedDuration * 1000 + 500); // Add a small buffer to ensure full recording
        
    } catch (error) {
        console.error('Error generating music:', error);
        stopMusic(); // Make sure to stop if there was an error
        updateAudioStatus("Error generating music. Please try again.");
    } finally {
        // Re-enable generate button
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fas fa-magic"></i> Generate Music';
    }
}

/**
 * Create a music arrangement with the given parameters
 */
async function createMusicArrangement(scaleName, tempo, duration, selectedInstruments) {
    try {
        console.log('Creating music arrangement:', { scaleName, tempo, duration, selectedInstruments });
        
        // Ensure audio context is running
        if (audioContext.state !== 'running') {
            console.log('Resuming audio context...');
            await audioContext.resume();
        }
        
        // Check if samples are loaded
        if (!instruments || !instruments.loadedSamples.size) {
            console.error('Instruments not initialized or samples not loaded');
            throw new Error('Audio samples not loaded. Please refresh the page.');
        }
        
        // Start the arrangement
        startArrangement(scaleName, tempo, duration, selectedInstruments);
        
    } catch (error) {
        console.error('Error creating music arrangement:', error);
        document.getElementById('status').textContent = 'Error creating music. Please try again.';
        throw error;
    }
}

// Helper function to schedule Oud patterns
function scheduleOudPattern(oud, scaleData, measures, tempo) {
    if (!oud) return;
    
    const notes = scaleData.notes;
    const pattern = new Tone.Pattern((time, note) => {
        oud.triggerAttackRelease(note, "8n", time);
        MUSIC_VISUALIZER.addNoteEvent(note, time, "oud");
    }, notes, "randomWalk");
    
    pattern.interval = "8n";
    pattern.probability = 0.7; // Don't play every note
    
    // Start and stop the pattern
    pattern.start(0);
    pattern.stop(`+${measures * 4}m`);
}

// Helper function to schedule Ney patterns
function scheduleNeyPattern(ney, scaleData, measures, tempo) {
    if (!ney) return;
    
    // Ney plays longer, more sustained notes
    const notes = scaleData.notes.filter((_, i) => i % 2 === 0); // Every other note for ney
    
    const pattern = new Tone.Pattern((time, note) => {
        ney.triggerAttackRelease(note, "2n", time);
        MUSIC_VISUALIZER.addNoteEvent(note, time, "ney");
    }, notes, "randomOnce");
    
    pattern.interval = "2n."; // Dotted half notes
    pattern.probability = 0.6;
    
    // Start and stop the pattern
    pattern.start("1m"); // Start after 1 measure
    pattern.stop(`+${measures * 4}m`);
}

// Helper function to schedule Qanun patterns
function scheduleQanunPattern(qanun, scaleData, measures, tempo) {
    if (!qanun) return;
    
    // Qanun often plays arpeggios and ornamentations
    const notes = scaleData.notes;
    
    // Play some arpeggios and tremolos
    Tone.Transport.scheduleRepeat((time) => {
        // Random tremolos and fast notes
        const baseNote = notes[Math.floor(Math.random() * notes.length)];
        const numRepeats = Math.floor(Math.random() * 4) + 2;
        
        for(let i = 0; i < numRepeats; i++) {
            qanun.triggerAttackRelease(baseNote, "16n", time + i * 0.1);
            MUSIC_VISUALIZER.addNoteEvent(baseNote, time + i * 0.1, "qanun");
        }
    }, "2m", "0m", `+${measures * 4}m`);
}

// Helper function to schedule Daf patterns
function scheduleDafPattern(daf, measures, tempo) {
    if (!daf) return;
    
    // Create a rhythm pattern for the daf
    const rhythmPatterns = [
        [1, 0, 0, 1, 0, 1, 0, 0], // Common 8-beat pattern
        [1, 0, 1, 0, 1, 0, 1, 0], // Alternating beats
        [1, 1, 0, 1, 0, 0, 1, 0]  // Another traditional pattern
    ];
    
    const selectedPattern = rhythmPatterns[Math.floor(Math.random() * rhythmPatterns.length)];
    
    // Schedule the pattern
    Tone.Transport.scheduleRepeat((time) => {
        const patternIndex = Math.floor((Tone.Transport.seconds * tempo / 60) % selectedPattern.length);
        
        if (selectedPattern[patternIndex]) {
            // Randomly choose between bass hit and regular hit
            const hitType = Math.random() > 0.7 ? "bass" : "regular";
            
            daf.triggerAttackRelease(hitType, "32n", time);
            MUSIC_VISUALIZER.addPercussionEvent(time, "daf");
        }
    }, "8n", "0m", `+${measures * 4}m`);
}

// Helper function to schedule Ambient drone patterns
function scheduleAmbientPattern(ambient, scaleData, measures, tempo) {
    if (!ambient) return;
    
    // Create a drone using the first note of the scale (the tonic)
    const tonic = scaleData.notes[0];
    const fifth = scaleData.notes[4] || scaleData.notes[0]; // Fifth or octave if not available
    
    // Start a continuous drone
    ambient.triggerAttack([tonic, fifth], "0m");
    
    // Stop the drone at the end
    Tone.Transport.schedule((time) => {
        ambient.triggerRelease([tonic, fifth], time);
    }, `+${measures * 4}m - 1m`);
    
    // Add some gentle pulsing
    Tone.Transport.scheduleRepeat((time) => {
        MUSIC_VISUALIZER.addDroneEvent(time, "ambient");
    }, "4n", "0m", `+${measures * 4}m`);
}

// Helper function to schedule Nature sounds
function scheduleNatureSounds(nature, measures, tempo) {
    if (!nature) return;
    
    // Schedule occasional nature sounds
    Tone.Transport.scheduleRepeat((time) => {
        if (Math.random() > 0.6) { // Random chance to trigger sounds
            const sound = Math.random() > 0.5 ? "water" : "wind";
            nature.triggerAttackRelease(sound, "2m", time);
            MUSIC_VISUALIZER.addNatureEvent(time, "nature");
        }
    }, "2m", "0m", `+${measures * 4}m`);
}

/**
 * Stop currently playing music
 */
function stopMusic() {
    // Stop transport
    Tone.Transport.stop();
    Tone.Transport.cancel();
    
    // Stop and dispose recorder if active
    if (recorder) {
        recorder.stop().then(() => {
            recorder = null;
        });
    }
    
    // Stop audio element
    const audioElement = document.getElementById('output-audio');
    if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
    }
    
    // Stop visualization
    MUSIC_VISUALIZER.setPlaying(false);
    
    // Reset play/pause button
    updatePlayPauseButton(false);
    
    // Reset flags
    isPlaying = false;
    isPaused = false;
    currentTransportTime = 0;
    
    // Update status
    updateAudioStatus("Music stopped. Click 'Generate Music' to create new music.");
}

/**
 * Display the recorded audio
 */
function displayRecording(recording) {
    const audioElement = document.getElementById('output-audio');
    const url = URL.createObjectURL(recording);
    audioElement.src = url;
    audioElement.controls = true;
    audioElement.loop = true; // Enable looping for seamless playback
    
    // Set crossfade for smoother looping if supported
    if ('loop' in audioElement && 'loopStart' in audioElement && 'loopEnd' in audioElement) {
        // Most modern browsers support basic looping, but not all support loop start/end
        // Only set these if they're supported
        try {
            // Default loop points (whole file)
            const duration = generatedDuration || 60;
            
            // Create a small crossfade area at the end (last 0.5 seconds)
            const crossfadeTime = 0.5;
            audioElement.loopStart = 0;
            audioElement.loopEnd = duration - crossfadeTime;
            
            console.log(`Set audio loop points: 0s to ${duration - crossfadeTime}s`);
        } catch (e) {
            console.warn('Advanced loop points not supported in this browser');
        }
    }
    
    // Enable export button
    document.getElementById('export-btn').disabled = false;
    
    // Show audio player
    document.getElementById('audio-player-container').style.display = 'block';
    
    // Show progress bar
    document.getElementById('playback-progress').style.display = 'block';
    
    // Set total time when metadata is loaded
    audioElement.addEventListener('loadedmetadata', function() {
        document.getElementById('total-time').textContent = formatTime(audioElement.duration);
    });
    
    // Initialize waveform visualization with this audio
    if (window.WAVEFORM_VISUALIZER) {
        // Use setTimeout to ensure the audio element has fully initialized
        setTimeout(() => {
            WAVEFORM_VISUALIZER.loadAudioElement(audioElement);
        }, 100);
    }
    
    // Update status
    updateAudioStatus("Music generated successfully. Click on the waveform to play/pause or use the controls below.");
}

/**
 * Export the generated audio
 */
function exportGeneratedAudio() {
    if (playerBuffer) {
        // Create the download link
        const url = URL.createObjectURL(playerBuffer);
        const link = document.createElement('a');
        
        // Get selected scale for the filename
        const selectedScale = document.getElementById('scale-selection').value;
        const cleanScaleName = selectedScale.replace(/\s+/g, '_').toLowerCase();
        const instrumentMode = document.getElementById('instrument-mode').value;
        
        // Set the download attributes
        link.href = url;
        link.download = `islamic_ambience_${cleanScaleName}_${instrumentMode}_${Date.now()}.mp3`;
        
        // Trigger the download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Update the status
        updateAudioStatus("Music exported successfully. Check your downloads folder.");
    } else {
        alert('Please generate music before exporting.');
    }
}

/**
 * Apply preset configurations
 */
function applyPreset(presetType) {
    console.log(`Applying preset: ${presetType}`);
    
    // Reset all checkboxes first
    const instrumentCheckboxes = document.querySelectorAll('#instruments-container input[type="checkbox"]');
    instrumentCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Apply preset settings
    switch (presetType) {
        case 'meditation':
            // Meditation preset
            document.getElementById('scale-selection').value = 'Hicaz';
            document.getElementById('tempo-control').value = '60';
            document.getElementById('music-length').value = '180';
            document.getElementById('master-volume').value = '0.6';
            document.getElementById('reverb-control').value = '0.7';
            document.getElementById('delay-control').value = '0.3';
            
            // Select instruments
            document.getElementById('ney-checkbox').checked = true;
            document.getElementById('ambient-checkbox').checked = true;
            document.getElementById('nature-checkbox').checked = true;
            
            // Set instrument volumes
            document.getElementById('ney-volume').value = '0.8';
            document.getElementById('ambient-volume').value = '0.7';
            document.getElementById('nature-volume').value = '0.5';
            break;
            
        case 'relaxation':
            // Relaxation preset
            document.getElementById('scale-selection').value = 'Bayati';
            document.getElementById('tempo-control').value = '70';
            document.getElementById('music-length').value = '120';
            document.getElementById('master-volume').value = '0.65';
            document.getElementById('reverb-control').value = '0.5';
            document.getElementById('delay-control').value = '0.4';
            
            // Select instruments
            document.getElementById('oud-checkbox').checked = true;
            document.getElementById('ney-checkbox').checked = true;
            document.getElementById('ambient-checkbox').checked = true;
            
            // Set instrument volumes
            document.getElementById('oud-volume').value = '0.6';
            document.getElementById('ney-volume').value = '0.7';
            document.getElementById('ambient-volume').value = '0.5';
            break;
            
        case 'uplifting':
            // Uplifting preset
            document.getElementById('scale-selection').value = 'Rast';
            document.getElementById('tempo-control').value = '90';
            document.getElementById('music-length').value = '90';
            document.getElementById('master-volume').value = '0.7';
            document.getElementById('reverb-control').value = '0.3';
            document.getElementById('delay-control').value = '0.2';
            
            // Select instruments
            document.getElementById('oud-checkbox').checked = true;
            document.getElementById('qanun-checkbox').checked = true;
            document.getElementById('daf-checkbox').checked = true;
            
            // Set instrument volumes
            document.getElementById('oud-volume').value = '0.8';
            document.getElementById('qanun-volume').value = '0.7';
            document.getElementById('daf-volume').value = '0.6';
            break;
    }
    
    // Update all slider display values
    updateSliderValueDisplay('master-volume', 'volume-value', '%', 100);
    updateSliderValueDisplay('reverb-control', 'reverb-value', '%', 100);
    updateSliderValueDisplay('delay-control', 'delay-value', '%', 100);
    
    const instrumentVolumeSliders = document.querySelectorAll('.instrument-volume');
    instrumentVolumeSliders.forEach(slider => {
        updateSliderValueDisplay(slider.id, `${slider.dataset.instrument}-volume-value`, '%', 100);
    });
    
    // Update status
    updateAudioStatus(`Applied ${presetType} preset. Click 'Generate Music' to create.`);
}

/**
 * Load WaveSurfer.js dynamically
 */
function loadWaveSurfer() {
    return new Promise((resolve, reject) => {
        // Check if it's already loaded
        if (window.WaveSurfer) {
            resolve();
            return;
        }
        
        let loadError = false;
        
        // Try to load from unpkg first
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/wavesurfer.js@6/dist/wavesurfer.min.js'; // Change to v6 for compatibility
        script.onload = () => {
            // Now load plugins
            const cursorPlugin = document.createElement('script');
            cursorPlugin.src = 'https://unpkg.com/wavesurfer.js@6/dist/plugin/wavesurfer.cursor.min.js';
            cursorPlugin.onload = resolve;
            cursorPlugin.onerror = () => {
                console.warn('Failed to load cursor plugin, continuing without it');
                resolve(); // Resolve anyway to continue without the plugin
            };
            document.head.appendChild(cursorPlugin);
        };
        
        script.onerror = () => {
            loadError = true;
            console.warn('Failed to load WaveSurfer from unpkg, trying cdnjs fallback');
            
            // Try cdnjs as fallback
            const fallbackScript = document.createElement('script');
            fallbackScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/wavesurfer.js/6.6.3/wavesurfer.min.js';
            
            fallbackScript.onload = () => {
                // Now load plugins from cdnjs
                const cursorPlugin = document.createElement('script');
                cursorPlugin.src = 'https://cdnjs.cloudflare.com/ajax/libs/wavesurfer.js/6.6.3/plugin/wavesurfer.cursor.min.js';
                cursorPlugin.onload = resolve;
                cursorPlugin.onerror = () => {
                    console.warn('Failed to load cursor plugin from fallback, continuing without it');
                    resolve(); // Resolve anyway to continue without the plugin
                };
                document.head.appendChild(cursorPlugin);
            };
            
            fallbackScript.onerror = () => {
                console.error('Failed to load WaveSurfer from all sources');
                reject(new Error('Failed to load WaveSurfer.js'));
            };
            
            document.head.appendChild(fallbackScript);
        };
        
        document.head.appendChild(script);
    });
}

// Set up the UI controls and event listeners
function setupUI() {
    const generateButton = document.getElementById('generate-button');
    if (generateButton) {
        generateButton.addEventListener('click', function() {
            if (arrangementInProgress) {
                stopCurrentArrangement();
            } else {
                createMusicArrangement();
            }
        });
    }
    
    // Set up preset buttons
    const presetButtons = document.querySelectorAll('.preset-button');
    presetButtons.forEach(button => {
        button.addEventListener('click', function() {
            const presetType = this.dataset.preset;
            applyPreset(presetType);
        });
    });
    
    // Set up instrument checkboxes
    const instrumentCheckboxes = document.querySelectorAll('input[type="checkbox"][name^="instrument-"]');
    instrumentCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateInstrumentControls);
    });
    
    // Initial update of controls
    updateInstrumentControls();
}

// Update which instrument volume controls are enabled based on checkbox state
function updateInstrumentControls() {
    const instrumentCheckboxes = document.querySelectorAll('input[type="checkbox"][name^="instrument-"]');
    
    instrumentCheckboxes.forEach(checkbox => {
        const instrumentName = checkbox.name.replace('instrument-', '');
        const volumeControl = document.querySelector(`input[name="volume-${instrumentName}"]`);
        
        if (volumeControl) {
            volumeControl.disabled = !checkbox.checked;
        }
    });
}

// Create a music arrangement based on user settings
function createMusicArrangement() {
    if (!audioContext || !instruments) {
        document.getElementById('status').textContent = 'Audio system not initialized. Click anywhere to start.';
        return;
    }
    
    // Get user settings from UI
    const scaleName = document.getElementById('scale').value;
    const tempo = parseInt(document.getElementById('tempo').value);
    const duration = parseInt(document.getElementById('duration').value) * 60; // Convert minutes to seconds
    
    // Get selected instruments and their volumes
    const selectedInstruments = {};
    const instrumentCheckboxes = document.querySelectorAll('input[type="checkbox"][name^="instrument-"]:checked');
    
    instrumentCheckboxes.forEach(checkbox => {
        const instrumentName = checkbox.name.replace('instrument-', '');
        const volumeControl = document.querySelector(`input[name="volume-${instrumentName}"]`);
        const volume = volumeControl ? parseFloat(volumeControl.value) : 0.7;
        
        selectedInstruments[instrumentName] = {
            enabled: true,
            volume: volume
        };
    });
    
    // Start the arrangement
    startArrangement(scaleName, tempo, duration, selectedInstruments);
}

// Start the music arrangement with the given parameters
function startArrangement(scaleName, tempo, duration, selectedInstruments) {
    // Stop any existing arrangement
    stopCurrentArrangement();
    
    // Update UI
    document.getElementById('status').textContent = 'Generating music...';
    document.getElementById('generate-button').textContent = 'Stop';
    arrangementInProgress = true;
    
    // Calculate musical measures based on tempo and duration
    const beatsPerMeasure = 4;
    const secondsPerBeat = 60 / tempo;
    const secondsPerMeasure = secondsPerBeat * beatsPerMeasure;
    const totalMeasures = Math.ceil(duration / secondsPerMeasure);
    
    // Create the actual instrument instances with the specified volumes
    const activeInstruments = {};
    
    // Initialize instruments
    if (selectedInstruments.oud && selectedInstruments.oud.enabled) {
        activeInstruments.oud = instruments.play('oud', 0, null, {
            volume: selectedInstruments.oud.volume,
            loop: true
        });
    }
    
    if (selectedInstruments.ney && selectedInstruments.ney.enabled) {
        activeInstruments.ney = instruments.play('ney', 0, null, {
            volume: selectedInstruments.ney.volume, 
            loop: true
        });
    }
    
    if (selectedInstruments.qanun && selectedInstruments.qanun.enabled) {
        activeInstruments.qanun = instruments.play('qanun', 0, null, {
            volume: selectedInstruments.qanun.volume,
            loop: true
        });
    }
    
    if (selectedInstruments.daf && selectedInstruments.daf.enabled) {
        activeInstruments.daf = instruments.play('daf', 0, null, {
            volume: selectedInstruments.daf.volume,
            loop: true
        });
    }
    
    if (selectedInstruments.ambient && selectedInstruments.ambient.enabled) {
        activeInstruments.ambient = instruments.play('ambient', 0, null, {
            volume: selectedInstruments.ambient.volume,
            loop: true
        });
    }
    
    if (selectedInstruments.nature && selectedInstruments.nature.enabled) {
        activeInstruments.nature = instruments.play('nature', 0, null, {
            volume: selectedInstruments.nature.volume,
            loop: true
        });
    }
    
    // Store the current arrangement for later stopping
    currentArrangement = {
        instruments: activeInstruments,
        startTime: audioContext.currentTime,
        duration: duration
    };
    
    // Schedule automatic stop after the duration
    setTimeout(() => {
        if (arrangementInProgress) {
            stopCurrentArrangement();
        }
    }, duration * 1000);
    
    // Update visualizer if available
    if (window.MUSIC_VISUALIZER) {
        MUSIC_VISUALIZER.setActive(true);
        if (selectedInstruments.oud && selectedInstruments.oud.enabled) {
            MUSIC_VISUALIZER.addInstrument('oud', '#e6935b');
        }
        if (selectedInstruments.ney && selectedInstruments.ney.enabled) {
            MUSIC_VISUALIZER.addInstrument('ney', '#a0c1e6');
        }
        if (selectedInstruments.qanun && selectedInstruments.qanun.enabled) {
            MUSIC_VISUALIZER.addInstrument('qanun', '#e6cc5b');
        }
        if (selectedInstruments.daf && selectedInstruments.daf.enabled) {
            MUSIC_VISUALIZER.addInstrument('daf', '#bd91e6');
        }
    }
    
    // Update UI with playing status
    document.getElementById('status').textContent = 'Playing Islamic ambience...';
}

// Stop the current arrangement
function stopCurrentArrangement() {
    if (!currentArrangement) return;
    
    // Stop all active instruments
    for (const instrumentName in currentArrangement.instruments) {
        if (currentArrangement.instruments[instrumentName]) {
            currentArrangement.instruments[instrumentName].stop();
        }
    }
    
    // Reset state
    currentArrangement = null;
    arrangementInProgress = false;
    
    // Update UI
    document.getElementById('generate-button').textContent = 'Generate Music';
    document.getElementById('status').textContent = 'Ready to generate music.';
    
    // Update visualizer if available
    if (window.MUSIC_VISUALIZER) {
        MUSIC_VISUALIZER.setActive(false);
        MUSIC_VISUALIZER.clearInstruments();
    }
}

// Export public functions
export {
    createMusicArrangement,
    stopCurrentArrangement
}; 
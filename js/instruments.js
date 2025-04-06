/**
 * Islamic Music Instruments
 * Define and implement various instruments commonly used in Islamic music using Tone.js
 */

import { SAMPLE_URLS, SAMPLE_METADATA } from './samples.js';

class Instruments {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.samplePlayers = new Map();
        this.loadedSamples = new Set();
        this.isLoading = false;
    }

    async preloadSamples() {
        if (this.isLoading) {
            console.log('Already loading samples, skipping...');
            return;
        }
        this.isLoading = true;
        
        if (!SAMPLE_URLS || !SAMPLE_METADATA) {
            console.error('Sample URLs or metadata missing');
            this.isLoading = false;
            return;
        }
        
        try {
            console.log('Starting to load samples...');
            // Create a container for all sample players
            this.samplePlayers = new Map();
            
            // Load each instrument sample
            const instruments = Object.keys(SAMPLE_URLS);
            console.log('Instruments to load:', instruments);
            
            for (const instrument of instruments) {
                try {
                    const url = SAMPLE_URLS[instrument];
                    console.log(`Loading ${instrument} from ${url}`);
                    
                    const response = await fetch(url);
                    
                    if (!response.ok) {
                        throw new Error(`Failed to fetch ${url}: ${response.statusText} (${response.status})`);
                    }
                    
                    console.log(`Fetched ${instrument}, decoding audio data...`);
                    const arrayBuffer = await response.arrayBuffer();
                    
                    try {
                        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                        console.log(`Successfully decoded ${instrument} audio data`);
                        
                        // Create a sample player for this instrument
                        this.samplePlayers.set(instrument, {
                            buffer: audioBuffer,
                            isLoaded: true,
                            loop: SAMPLE_METADATA[instrument].loop || false
                        });
                        
                        this.loadedSamples.add(instrument);
                        console.log(`Successfully loaded ${instrument}`);
                    } catch (decodeError) {
                        console.error(`Error decoding audio data for ${instrument}:`, decodeError);
                        throw decodeError;
                    }
                } catch (err) {
                    console.error(`Error loading sample ${instrument}:`, err);
                    throw err; // Re-throw to handle it in the outer catch
                }
            }
            
            const loadedCount = this.loadedSamples.size;
            console.log(`Successfully loaded ${loadedCount}/${instruments.length} samples`);
            
            if (loadedCount === 0) {
                throw new Error('No samples were loaded successfully');
            }
            
            if (loadedCount < instruments.length) {
                console.warn(`Only loaded ${loadedCount}/${instruments.length} samples`);
            }
            
        } catch (error) {
            console.error('Error in preloadSamples:', error);
            // Clear any partially loaded samples
            this.samplePlayers.clear();
            this.loadedSamples.clear();
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    play(instrument, time = 0, duration = null, options = {}) {
        if (!this.samplePlayers.has(instrument)) {
            console.error(`Sample for ${instrument} not loaded`);
            return null;
        }
        
        const player = this.samplePlayers.get(instrument);
        if (!player.buffer) {
            console.error(`Buffer for ${instrument} is null or undefined`);
            return null;
        }
        
        try {
            console.log(`Playing ${instrument} at time ${time}`);
            const source = this.audioContext.createBufferSource();
            source.buffer = player.buffer;
            
            // Set loop if specified in metadata or options
            if (player.loop || options.loop) {
                source.loop = true;
                console.log(`${instrument} set to loop`);
            }
            
            // Create a gain node for volume control
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = options.volume !== undefined ? options.volume : 1.0;
            console.log(`${instrument} volume set to ${gainNode.gain.value}`);
            
            // Connect source -> gain -> destination
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Start playing
            source.start(time);
            console.log(`Started playing ${instrument}`);
            
            // Schedule stop if duration is provided
            if (duration) {
                source.stop(time + duration);
                console.log(`Scheduled ${instrument} to stop after ${duration}s`);
            }
            
            return {
                source,
                gainNode,
                stop: () => {
                    try {
                        source.stop();
                        console.log(`Stopped ${instrument}`);
                    } catch (e) {
                        // Already stopped
                        console.log(`${instrument} was already stopped`);
                    }
                }
            };
        } catch (error) {
            console.error(`Error playing ${instrument}:`, error);
            return null;
        }
    }

    getLoadedSamples() {
        return this.loadedSamples;
    }
}

export default Instruments; 
/**
 * Sample URLs configuration for Islamic Ambience Generator
 * This file contains URLs for all the instrument samples used in the application
 */

// Define local URLs for our audio samples
const SAMPLE_URLS = {
    // Instrument samples
    oud: 'assets/audio/meditative-oud-palestinian-soul-112719.mp3',
    ney: 'assets/audio/flute-melody-315241.mp3',
    qanun: 'assets/audio/turkish-classical-277435.mp3',
    daf: 'assets/audio/impro-binaire-140-78486.mp3',
    
    // Ambient sounds
    ambient: 'assets/audio/ambient-relaxing-music-for-you-15969.mp3',
    nature: 'assets/audio/nature-walk-124997.mp3'
};

// Sample metadata to help with looping and timing
const SAMPLE_METADATA = {
    oud: { duration: 8, bpm: 80, loop: true },
    ney: { duration: 6, bpm: 80, loop: true },
    qanun: { duration: 7, bpm: 80, loop: true },
    daf: { duration: 4, bpm: 80, loop: true },
    ambient: { duration: 30, bpm: null, loop: true },
    nature: { duration: 20, bpm: null, loop: true }
};

// Function to check if all required samples are loaded
function checkSamplesLoaded(loadedSamples) {
    const requiredSamples = Object.keys(SAMPLE_URLS);
    return requiredSamples.every(sample => loadedSamples.has(sample));
}

// Export the variables and functions
export { SAMPLE_URLS, SAMPLE_METADATA, checkSamplesLoaded }; 
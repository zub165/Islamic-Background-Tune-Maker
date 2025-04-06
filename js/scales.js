/**
 * Islamic Music Scales (Maqamat) Definition
 * This file defines the various scales (maqamat) used in Islamic/Arabic music.
 */

// Define the scales with their notes and intervals
const SCALES = {
    // Rast: similar to major scale but with quarter tones
    // Approximating with Western notes: C D E F G A Bb C
    rast: {
        name: "Rast",
        description: "Peaceful and balanced scale, similar to Western major",
        notes: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'Bb4', 'C5', 
                'D5', 'E5', 'F5', 'G5', 'A5', 'Bb5', 'C6'],
        intervals: [2, 2, 1, 2, 2, 1, 2],
        tonic: 'C4',
        character: "peaceful"
    },
    
    // Hijaz: distinctive Middle Eastern scale with augmented 2nd
    // Approximating with Western notes: D Eb F# G A Bb C D
    hijaz: {
        name: "Hijaz",
        description: "Mystical and spiritual scale with distinctive Middle Eastern sound",
        notes: ['D4', 'Eb4', 'F#4', 'G4', 'A4', 'Bb4', 'C5', 'D5',
                'Eb5', 'F#5', 'G5', 'A5', 'Bb5', 'C6', 'D6'],
        intervals: [1, 3, 1, 2, 1, 2, 2],
        tonic: 'D4',
        character: "meditative"
    },
    
    // Saba: melancholic and reflective
    // Approximating with Western notes: D Eb F Gb A Bb C D
    saba: {
        name: "Saba",
        description: "Melancholic and contemplative scale",
        notes: ['D4', 'Eb4', 'F4', 'Gb4', 'A4', 'Bb4', 'C5', 'D5',
                'Eb5', 'F5', 'Gb5', 'A5', 'Bb5', 'C6', 'D6'],
        intervals: [1, 2, 1, 3, 1, 2, 2],
        tonic: 'D4',
        character: "melancholic"
    },
    
    // Nahawand: similar to the natural minor scale
    // Approximating with Western notes: C D Eb F G Ab Bb C
    nahawand: {
        name: "Nahawand",
        description: "Emotional scale similar to Western minor",
        notes: ['C4', 'D4', 'Eb4', 'F4', 'G4', 'Ab4', 'Bb4', 'C5',
                'D5', 'Eb5', 'F5', 'G5', 'Ab5', 'Bb5', 'C6'],
        intervals: [2, 1, 2, 2, 1, 2, 2],
        tonic: 'C4',
        character: "emotional"
    },
    
    // Bayati: traditional scale with quarter tones
    // Approximating with Western notes: D Eb F G A Bb C D
    bayati: {
        name: "Bayati",
        description: "Traditional scale often used in Islamic devotional music",
        notes: ['D4', 'Eb4', 'F4', 'G4', 'A4', 'Bb4', 'C5', 'D5',
                'Eb5', 'F5', 'G5', 'A5', 'Bb5', 'C6', 'D6'],
        intervals: [1, 2, 2, 2, 1, 2, 2],
        tonic: 'D4',
        character: "traditional"
    }
};

// Helper function to get a scale by name
function getScale(scaleName) {
    return SCALES[scaleName] || SCALES.rast; // Default to Rast if scale not found
}

// Helper function to get random notes from a scale
function getRandomNotesFromScale(scaleName, count) {
    const scale = getScale(scaleName);
    const notes = [];
    
    for (let i = 0; i < count; i++) {
        const randomIndex = Math.floor(Math.random() * scale.notes.length);
        notes.push(scale.notes[randomIndex]);
    }
    
    return notes;
}

// Helper function to get a sequence of notes from a scale
function getScaleSequence(scaleName, startIdx, length) {
    const scale = getScale(scaleName);
    const notes = [];
    
    for (let i = 0; i < length; i++) {
        const noteIdx = (startIdx + i) % scale.notes.length;
        notes.push(scale.notes[noteIdx]);
    }
    
    return notes;
}

// Export the functions and data
export {
    SCALES,
    getScale,
    getRandomNotesFromScale,
    getScaleSequence
}; 
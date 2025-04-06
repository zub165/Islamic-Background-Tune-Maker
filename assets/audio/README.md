# Audio Assets for Islamic Ambience Generator

This folder contains the sample audio files used by the Islamic Ambience Generator.

## Required Files

The application expects the following files:

- `oud.mp3` - Oud instrument loop
- `ney.mp3` - Ney flute instrument loop
- `qanun.mp3` - Qanun instrument loop
- `daf.mp3` - Daf percussion instrument loop
- `ambient.mp3` - Ambient background drone sound
- `nature.mp3` - Nature sound effects (birds, water, etc.)

## Technical Requirements

- Files should be mp3 format at 128kbps or higher
- Files should loop seamlessly without audible gaps
- Duration should match what's specified in the SAMPLE_METADATA configuration
- Each file should be under 5MB for optimal loading speed

## Sources

You can create these files from royalty-free audio sources like:

1. [Freesound.org](https://freesound.org/) (requires attribution)
2. [Mixkit.co](https://mixkit.co/) (free sound effects)
3. [SoundBible](https://soundbible.com/) (free sound effects)

## Processing for Seamless Loops

For best results, process your audio files with:

1. Audacity - Use the "Loop" feature to make them seamlessly loop
2. Adobe Audition - Use the "Crossfade Loop" feature
3. Online tools like [Bear Audio Tool](https://www.bear-audio-tool.com/) 
// Don't forget "use strict"; -- it makes error checking slightly better
"use strict";

jQuery(async function($) {
    console.log("Web page loaded, and ready to go!");

    const audioContext = new AudioContext();

    let sample1Buffer = null;
    let sample2Buffer = null;

    async function loadSamples() {
        const response1 = await fetch("sounds/violin-a4.wav");
        const arrayBuffer1 = await response1.arrayBuffer();
        sample1Buffer = await audioContext.decodeAudioData(arrayBuffer1);

        const response2 = await fetch("sounds/rowrowrowyourboat.wav");
        const arrayBuffer2 = await response2.arrayBuffer();
        sample2Buffer = await audioContext.decodeAudioData(arrayBuffer2);

        console.log("Samples loaded!");
    }

    await loadSamples();

    const filterNode = audioContext.createBiquadFilter();
    filterNode.type = "allpass";
    filterNode.frequency.value = 1000;


    // REVERB
    const reverbNode = audioContext.createConvolver();

    // Identity impulse response = no reverb
    function createIdentityImpulseResponse(ac) {
        const length = ac.sampleRate;
        const impulse = ac.createBuffer(2, length, ac.sampleRate);

        impulse.getChannelData(0)[0] = 1.0;
        impulse.getChannelData(1)[0] = 1.0;

        return impulse;
    }

    function createImpulseResponse(ac, duration, decay) {
        const sampleRate = ac.sampleRate;
        const length = Math.floor(sampleRate * duration);

        const impulse = ac.createBuffer(
            2,
            length,
            sampleRate
        );

        for (let channel = 0; channel < 2; channel++) {
            const channelData =
                impulse.getChannelData(channel);

            for (let i = 0; i < length; i++) {
                const time = i / sampleRate;

                channelData[i] =
                    (Math.random() * 2 - 1) *
                    Math.pow(1 - time / duration, decay);
            }
        }

        return impulse;
    }

    reverbNode.buffer =
        createIdentityImpulseResponse(audioContext);


    // ------------------------------------------------------------
    // MASTER GAIN AND AUDIO OUTPUT
    // ------------------------------------------------------------

    const masterGainNode = audioContext.createGain();
    masterGainNode.gain.value = 0.5;

    const analyzer = audioContext.createAnalyser();

    analyzer.fftSize = 2048;

    const dataArray = new Uint8Array(analyzer.frequencyBinCount);

    filterNode.connect(reverbNode);
    reverbNode.connect(masterGainNode);
    masterGainNode.connect(analyzer);
    analyzer.connect(audioContext.destination);


    $("#filterForm").on("change", function() {
        const filterType = $("input[name=filterType]:checked").val();
        console.log(
            "Filter selected:", filterType
        );
        filterNode.type = filterType;
        console.log(
            "Current filter:", filterNode.type
        );
    });
    $("#filterFrequency").on("input", function() {
        const frequency = parseFloat($(this).val());
        filterNode.frequency.value = frequency;
        $("#filterFrequencyValue").text( frequency );
        console.log( "Filter frequency:",
            frequency );
    });


    //Reverb Duration and Decay
    $("#reverbForm").on("change", function() {
        const reverbType = $("input[name=reverb]:checked").val();

        if (reverbType === "on") {
            const duration = parseFloat($("#reverbDuration").val());
            const decay = parseFloat($("#reverbDecay").val());
            reverbNode.buffer = createImpulseResponse( audioContext, duration, decay );
            console.log( "Reverb ON", "Duration:", duration, "Decay:", decay );
        } else {
            reverbNode.buffer = createIdentityImpulseResponse( audioContext );
            console.log("Reverb OFF");
        }
    });
    $("#reverbDuration").on("input", function() {
        const duration = parseFloat($(this).val());
        $("#reverbDurationValue").text(
            duration
        );
        if ($("input[name=reverb]:checked").val() === "on") {
            const decay = parseFloat($("#reverbDecay").val());
            reverbNode.buffer = createImpulseResponse( audioContext, duration, decay );
        }

        console.log(
            "Reverb duration:",
            duration
        );
    });

    $("#reverbDecay").on("input", function() {
        const decay = parseFloat($(this).val());

        $("#reverbDecayValue").text(decay);

        // Only recreate the impulse response if reverb is currently ON.
        if ($("input[name=reverb]:checked").val() === "on") {
            const duration = parseFloat($("#reverbDuration").val());
            reverbNode.buffer = createImpulseResponse(
                audioContext,
                duration,
                decay
            );
        }

        console.log("Reverb decay:", decay);
    });

    // ------------------------------------------------------------
    // ACTIVE NOTES
    // ------------------------------------------------------------

    const activeNotes = {};

    let currentWaveform = "sine";

    // ------------------------------------------------------------
    // VIBRATO
    // ------------------------------------------------------------

    let vibratoEnabled = false;

    const vibratoOscillator = audioContext.createOscillator();
    const vibratoGain = audioContext.createGain();

    vibratoOscillator.type = "sine";
    vibratoOscillator.frequency.value = 10;

    vibratoGain.gain.value = 100;

    vibratoOscillator.connect(vibratoGain);
    vibratoOscillator.start();

    const pulsar = "vibrato";

    // ------------------------------------------------------------
    // PIANO KEYBOARD
    // ------------------------------------------------------------

    function startNote(note) {

        console.log("Starting note:", note);

        if (activeNotes[note]) {
            stopNote(note);
        }

        if (audioContext.state === "suspended") {
            audioContext.resume();
        }

        const frequency = noteToFrequency(note);

        // --------------------------------------------------------
        // SAMPLE 1
        // --------------------------------------------------------

        if (currentWaveform === "sample1") {

            const source =
                audioContext.createBufferSource();

            source.buffer = sample1Buffer;

            source.playbackRate.value =
                frequency / 440.0;

            if (vibratoEnabled) {
                vibratoGain.connect(
                    source.playbackRate
                );
            }

            source.connect(filterNode);
            source.start();

            activeNotes[note] = {
                source: source,
                gain: null,
                envelope: false
            };

            // --------------------------------------------------------
            // SAMPLE 2
            // --------------------------------------------------------

        } else if (currentWaveform === "sample2") {

            const source =
                audioContext.createBufferSource();

            source.buffer = sample2Buffer;

            source.playbackRate.value =
                frequency / 440.0;

            if (vibratoEnabled) {
                vibratoGain.connect(
                    source.playbackRate
                );
            }

            source.connect(filterNode);
            source.start();

            activeNotes[note] = {
                source: source,
                gain: null,
                envelope: false
            };

            // --------------------------------------------------------
            // NORMAL OSCILLATOR
            // --------------------------------------------------------

        } else {

            const oscillator =
                audioContext.createOscillator();

            oscillator.type = currentWaveform;
            oscillator.frequency.value = frequency;

            if (vibratoEnabled) {
                vibratoGain.connect(
                    oscillator.frequency
                );
            }

            // Each oscillator gets its own gain.
            const noteGain =
                audioContext.createGain();

            oscillator.connect(noteGain);
            noteGain.connect(filterNode);

            const currentTime =
                audioContext.currentTime;

            // ----------------------------------------------------
            // ADSR ENABLED
            // ----------------------------------------------------

            if (envelopeEnabled) {

                const values = adsr.getValues();

                const attackDuration =
                    values.attackTime *
                    envelopeDuration;

                const decayDuration =
                    values.decayTime *
                    envelopeDuration;

                noteGain.gain.cancelScheduledValues(
                    currentTime
                );

                // Start at zero.
                noteGain.gain.setValueAtTime(
                    0,
                    currentTime
                );

                // ATTACK
                const attackEnd =
                    currentTime +
                    attackDuration;

                noteGain.gain.linearRampToValueAtTime(
                    values.attackLevel,
                    attackEnd
                );

                // DECAY
                const decayEnd =
                    attackEnd +
                    decayDuration;

                noteGain.gain.linearRampToValueAtTime(
                    values.sustainLevel,
                    decayEnd
                );

            } else {

                // Normal Homework 1 behavior.
                noteGain.gain.value = 1.0;
            }

            oscillator.start();

            activeNotes[note] = {
                source: oscillator,
                gain: noteGain,
                envelope: envelopeEnabled
            };
        }
    }

    function stopNote(note) {

        console.log("Stopping note:", note);

        const activeNote = activeNotes[note];

        if (!activeNote) {
            return;
        }

        const source = activeNote.source;
        const noteGain = activeNote.gain;

        // --------------------------------------------------------
        // ADSR RELEASE
        // --------------------------------------------------------

        if (
            activeNote.envelope &&
            noteGain !== null
        ) {

            const currentTime =
                audioContext.currentTime;

            const values =
                adsr.getValues();

            const releaseDuration =
                values.releaseTime *
                envelopeDuration;

            // Get the current gain before cancelling
            // the existing attack/decay schedule.
            const currentGain =
                noteGain.gain.value;

            noteGain.gain.cancelScheduledValues(
                currentTime
            );

            noteGain.gain.setValueAtTime(
                currentGain,
                currentTime
            );

            noteGain.gain.linearRampToValueAtTime(
                0,
                currentTime + releaseDuration
            );

            // Stop AFTER release finishes.
            source.stop(
                currentTime +
                releaseDuration +
                0.01
            );

        } else {
            source.stop();
        }

        delete activeNotes[note];
    }

    // ------------------------------------------------------------
    // NOTE FREQUENCY
    // ------------------------------------------------------------

    function noteToFrequency(note) {
        const noteName = note.substring(0, note.length - 1);
        const octave = parseInt(note.substring(note.length - 1));

        const noteNumbers = {
            "C": 0,
            "C#": 1,
            "D": 2,
            "D#": 3,
            "E": 4,
            "F": 5,
            "F#": 6,
            "G": 7,
            "G#": 8,
            "A": 9,
            "A#": 10,
            "B": 11
        };

        const midiNumber =
            (octave + 1) * 12 + noteNumbers[noteName];

        return 440 * Math.pow(2, (midiNumber - 69) / 12);
    }

    // ------------------------------------------------------------
    // CREATE THE 3-OCTAVE KEYBOARD
    // ------------------------------------------------------------

    createPianoKeyboard(
        "#keyboard",
        "C3",
        3,
        startNote,
        stopNote
    );



    // ------------------------------------------------------------
    // VISUALIZATION
    // ------------------------------------------------------------

    // Set up the visualization canvas FIRST.
    const canvas = setupCanvas(
        "#visualizer",
        false,
        1000,
        400
    );

    // Default visualization.
    drawTimeDomainData(
        audioContext,
        analyzer,
        canvas,
        dataArray
    );

    // Change visualization when the radio button changes.
    $("#visForm").on("change", function() {

        const visType = $("input[name=vistype]:checked").val();

        // Stop the previous animation.
        cancelAnimationFrame(myReq);

        if (visType === "frequency") {

            drawFrequencyDomainData(
                audioContext,
                analyzer,
                canvas,
                dataArray
            );

        } else if (visType === "time") {

            drawTimeDomainData(
                audioContext,
                analyzer,
                canvas,
                dataArray
            );

        } else {

            console.log("Unknown visualization type: " + visType);
        }
    });

    // ------------------------------------------------------------
    // WAVEFORM CONTROLS
    // ------------------------------------------------------------

    $("#waveformForm").on("change", function() {

        currentWaveform =
            $("input[name=waveform]:checked").val();

        console.log(
            "Waveform changed to:",
            currentWaveform
        );
    });

    // ------------------------------------------------------------
    // MASTER GAIN
    // ------------------------------------------------------------

    $("#masterGain").on("input", function() {

        const gainValue = parseFloat($(this).val());

        masterGainNode.gain.value = gainValue;

        $("#masterGainValue").text(
            gainValue.toFixed(2)
        );

        console.log(
            "Master gain:",
            gainValue
        );
    });

// ------------------------------------------------------------
// VIBRATO CONTROLS
// ------------------------------------------------------------

    $("#vibratoEnabled").on("change", function() {

        vibratoEnabled = $(this).is(":checked");

        console.log(
            "Vibrato:",
            vibratoEnabled ? "ON" : "OFF"
        );
    });

    $("#vibratoFrequency").on("input", function() {

        const frequency = parseFloat($(this).val());

        vibratoOscillator.frequency.value = frequency;

        $("#vibratoFrequencyValue").text(frequency);

        console.log(
            "Vibrato frequency:",
            frequency
        );
    });

    $("#vibratoDepth").on("input", function() {

        const depth = parseFloat($(this).val());

        vibratoGain.gain.value = depth;

        $("#vibratoDepthValue").text(depth);

        console.log(
            "Vibrato depth:",
            depth
        );
    });

    // ------------------------------------------------------------
    // TREMOLO
    // ------------------------------------------------------------

    let tremoloEnabled = false;

    const tremoloOscillator = audioContext.createOscillator();
    const tremoloGain = audioContext.createGain();

    tremoloOscillator.type = "sine";
    tremoloOscillator.frequency.value = 10;

    // Start disabled
    tremoloGain.gain.value = 0;

    tremoloOscillator.connect(tremoloGain);
    tremoloGain.connect(masterGainNode.gain);

    tremoloOscillator.start();

    // ------------------------------------------------------------
    // TREMOLO CONTROLS
    // ------------------------------------------------------------

    $("#tremoloEnabled").on("change", function() {

        tremoloEnabled = $(this).is(":checked");

        const depth =
            parseFloat($("#tremoloDepth").val());

        if (tremoloEnabled) {
            tremoloGain.gain.value = depth / 100;
        } else {
            tremoloGain.gain.value = 0;
        }

        console.log(
            "Tremolo:",
            tremoloEnabled ? "ON" : "OFF"
        );
    });

    $("#tremoloFrequency").on("input", function() {

        const frequency = parseFloat($(this).val());

        tremoloOscillator.frequency.value = frequency;

        $("#tremoloFrequencyValue").text(frequency);

        console.log(
            "Tremolo frequency:",
            frequency
        );
    });

    $("#tremoloDepth").on("input", function() {

        const depth = parseFloat($(this).val());

        if (tremoloEnabled) {
            tremoloGain.gain.value = depth / 100;
        }

        $("#tremoloDepthValue").text(depth);

        console.log(
            "Tremolo depth:",
            depth
        );
    });


    // ------------------------------------------------------------
    // ADSR ENVELOPE
    // ------------------------------------------------------------

    let envelopeEnabled = false;

    let envelopeDuration = 1.0;

    const adsr = createADSRControl(
        "#adsrCanvas",
        function(data) {

            $("#output").text(
                JSON.stringify(data, null, 2)
            );
        }
    );

    // ------------------------------------------------------------
    // ADSR CONTROLS
    // ------------------------------------------------------------

    $("#envelopeEnabled").on("change", function() {

        envelopeEnabled = $(this).is(":checked");

        console.log(
            "Envelope:",
            envelopeEnabled ? "ON" : "OFF"
        );
    });

    $("#envelopeDuration").on("input", function() {

        envelopeDuration =
            parseFloat($(this).val());

        $("#envelopeDurationValue").text(
            envelopeDuration.toFixed(1)
        );

        console.log(
            "Envelope duration:",
            envelopeDuration
        );
    });
    const giraffe = "sampleSynth";
});
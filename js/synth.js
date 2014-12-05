/* Copyright 2013 Chris Lowis

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

$(function () {
  var keyboard = qwertyHancock({id: 'keyboard', startNote: 'A4', octaves: 2});

  $('input').knob();

  var context = new AudioContext();


  var Voice = (function (context) {
    function Voice(options) {
      this.options = options;
      this.voices = [];
    }

    Voice.prototype.start = function() {
      this.vco = new VCO(this.options.vco);
      this.vca = new VCA(this.options.vca);
      this.envelope = new EnvelopeGenerator(this.options.envelope, this.options.vca.gain);
      /* connections */
      this.vco.connect(this.vca);
      this.envelope.connect(this.vca.amplitude);
      this.vca.connect(context.destination);
      this.envelope.trigger()
      /* Keep track of the oscillators used */
      this.voices.push({'env': this.envelope, 'vco': this.vco});
    };

    Voice.prototype.stop = function() {
      this.voices.forEach(function(voice, _) {
        now = context.currentTime;
        voice.vco.oscillator.stop(now + voice.env.releaseTime + 0.2);
        voice.env.gateOff();
      });
    };

    return Voice;
  })(context);

  active_voices = {};

  keyboard.keyDown(function (note, frequency) {
    var options_one = {
      "vco": {
        "osc": $("#osc-osc1").val(),
        "octave": (Math.pow(2, $("#oct-osc1").val())),
        "frequency": frequency
      },
      "vca": {
        "gain": ($('#gain-osc1').val() / 100)
      },
      "envelope": {
        "attack": ($('#attack-osc1').val() / 100),
        "release": ($('#release-osc1').val() / 100)
      } 
    };
    var options_two = {
      "vco": {
        "osc": $("#osc-osc2").val(),
        "octave": (Math.pow(2, $("#oct-osc2").val())),
        "frequency": frequency
      },
      "vca": {
        "gain": ($('#gain-osc2').val() / 100)
      },
      "envelope": {
        "attack": ($('#attack-osc2').val() / 100),
        "release": ($('#release-osc2').val() / 100)
      } 
    };
    var voice_one = new Voice(options_one);
    var voice_two = new Voice(options_two);
    voice_one.start(); voice_two.start();
    active_voices[note] = new Array(voice_one, voice_two);
  });

  keyboard.keyUp(function (note, _) {
    active_voices[note][0].stop();
    active_voices[note][1].stop();
    delete active_voices[note];
  });

  var VCO = (function(context) {
    function VCO(options){
      this.oscillator = context.createOscillator();
      this.setOsc(options.osc);
      this.octave = options.octave;
      this.setFrequency(options.frequency, options.octave);
      this.oscillator.start(0);

      this.input = this.oscillator;
      this.output = this.oscillator;
    };

    VCO.prototype.setFrequency = function(baseFrequency, octave) {
      switch (octave) {
        case 2: frequency = baseFrequency * 4; break;
        case 4: frequency = baseFrequency * 2; break;
        case 16: frequency = baseFrequency / 2; break;
        case 32: frequency = baseFrequency / 4; break;
        case 64: frequency = baseFrequency / 8; break;
        default: frequency = baseFrequency; break;
      }
      this.oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    };

    VCO.prototype.setOsc = function(type) {
      if(type==0)
        this.oscillator.type = 'sine';
      if(type==1)
        this.oscillator.type = 'square';
      if(type==2)
        this.oscillator.type = 'triangle';
      if(type==3)
        this.oscillator.type = 'sawtooth';
    };

    VCO.prototype.connect = function(node) {
      if (node.hasOwnProperty('input')) {
        this.output.connect(node.input);
      } else {
        this.output.connect(node);
      };
    }

    return VCO;
  })(context);

  var VCA = (function(context) {
    function VCA(options) {
      this.gain = context.createGain();
      this.gain.gain.value = 0;
      this.input = this.gain;
      this.output = this.gain;
      this.amplitude = this.gain.gain;
      this.currentGain = options.gain;

      var that = this;
      $(document).on('setGain', function (_, gain) {
        console.log('set gain catch')
        that.setGain(gain);
      });
    };

    VCA.prototype.connect = function(node) {
      if (node.hasOwnProperty('input')) {
        this.output.connect(node.input);
      } else {
        this.output.connect(node);
      };
    }

    VCA.prototype.setGain = function(gain)
    {
      this.amplitude.value = gain;
      this.gain.gain.value = gain;
      this.currentGain = gain;
    }

    return VCA;
  })(context);

  var EnvelopeGenerator = (function(context) {
    function EnvelopeGenerator(options, currentGain) {
      this.attackTime = options.attack;
      this.releaseTime = options.release;
      this.currentGain = currentGain;
    };

    EnvelopeGenerator.prototype.trigger = function() {
      now = context.currentTime;
      this.param.cancelScheduledValues(now);
      this.gateOn();
    };

    EnvelopeGenerator.prototype.gateOn = function() {
      now = context.currentTime;
      this.param.setValueAtTime(0, now);
      this.param.linearRampToValueAtTime(this.currentGain, now + this.attackTime);
    }

    EnvelopeGenerator.prototype.gateOff = function() {
      now = context.currentTime;
      this.param.linearRampToValueAtTime(0, now + this.attackTime + this.releaseTime);
    }

    EnvelopeGenerator.prototype.setAttack = function(value) {
      this.attackTime = value;
    }

    EnvelopeGenerator.prototype.connect = function(param) {
      this.param = param;
    };

    return EnvelopeGenerator;
  })(context);
});

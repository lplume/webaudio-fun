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

  /*keyboard.keyDown(function (note, frequency) {
    //jQuery.event.trigger('frequency', [frequency] );
    jQuery.event.trigger('gateOn');
  });*/

  keyboard.keyUp(function (_, _) { });

  $("#attack-osc1").knob(/*{
    'release' : function (v) { jQuery.event.trigger('setAttack', v / 100); }
  }*/);

  $("#oct-osc1").knob(/*{
    'release' : function (v) { jQuery.event.trigger('setAttack', v / 100); }
  }*/);

  $("#release-osc1").knob(/*{
    'release' : function (v) { jQuery.event.trigger('setRelease', v / 100); }
  }*/);

  $("#osc-osc1").knob(/*{
    'release' : function (v) { jQuery.event.trigger('setOsc', v); }
  }*/);

  $("#gain-osc1").knob(/*{
    'release' : function (v) { jQuery.event.trigger('setGain', v / 100); }
  }*/);

  $("#attack-osc2").knob(/*{
    'release' : function (v) { jQuery.event.trigger('setAttack', v / 100); }
  }*/);

  $("#release-osc2").knob(/*{
    'release' : function (v) { jQuery.event.trigger('setRelease', v / 100); }
  }*/);

  $("#osc-osc2").knob(/*{
    'release' : function (v) { jQuery.event.trigger('setOsc', v); }
  }*/);

  $("#oct-osc2").knob(/*{
    'release' : function (v) { jQuery.event.trigger('setAttack', v / 100); }
  }*/);

  $("#gain-osc2").knob(/*{
    'release' : function (v) { jQuery.event.trigger('setGain', v / 100); }
  }*/);

  var context = new AudioContext();


  var Voice = (function (context) {
    function Voice(frequency, osc, gain, attack, release, num) {
      this.frequency = frequency;
      this.osc = osc;
      this.gain = gain;
      this.attack = attack;
      this.release = release;
      this.num = num
      this.voices = [];
    }

    Voice.prototype.start = function() {
      this.vco = new VCO;
      this.vco.setFrequency(this.frequency);
      this.vco.setOsc(this.osc)
      this.vca = new VCA;
      this.envelope = new EnvelopeGenerator(this.gain, this.attack, this.release);
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
        voice.vco.oscillator.stop(now + voice.env.releaseTime + 0.1);
        voice.env.gateOff();
      });
    };

    return Voice;
  })(context);

  active_voices = {};

  keyboard.keyDown(function (note, baseFrequency) {
    var osc = $("#osc-osc1").val();
    var oct = Math.pow(2, $("#oct-osc1").val());
    switch (oct) {
        case 2: frequency = baseFrequency * 4; break;
        case 4: frequency = baseFrequency * 2; break;
        case 16: frequency = baseFrequency / 2; break;
        case 32: frequency = baseFrequency / 4; break;
        case 64: frequency = baseFrequency / 8; break;
        default: frequency = baseFrequency; break;
    }
    var gain = $('#gain-osc1').val() / 100;
    var attack = $('#attack-osc1').val() / 100;
    var release = $('#release-osc1').val() / 100;
    var voice1 = new Voice(frequency, osc, gain, attack, release, 1);
    voice1.start();
    var osc = $("#osc-osc2").val();
    var oct = Math.pow(2, $("#oct-osc2").val());
    switch (oct) {
        case 2: frequency = baseFrequency * 4; break;
        case 4: frequency = baseFrequency * 2; break;
        case 16: frequency = baseFrequency / 2; break;
        case 32: frequency = baseFrequency / 4; break;
        case 64: frequency = baseFrequency / 8; break;
        default: frequency = baseFrequency; break;
    }
    var gain = $('#gain-osc2').val() / 100;
    var attack = $('#attack-osc2').val() / 100;
    var release = $('#release-osc2').val() / 100;
    var voice2 = new Voice(frequency, osc, gain, attack, release, 2);
    voice2.start();
    active_voices[note] = new Array(voice1, voice2);
  });

  keyboard.keyUp(function (note, _) {
    active_voices[note][0].stop();
    active_voices[note][1].stop();
    delete active_voices[note];
  });

  var VCO = (function(context) {
    function VCO(){
      this.oscillator = context.createOscillator();
      this.oscillator.type = 'sine';
      this.setFrequency(440);
      this.oscillator.start(0);

      this.input = this.oscillator;
      this.output = this.oscillator;

      var that = this;

      /*$('#osc').on('setOsc', function (_, type) {
        that.setOsc(type);
      });*/
    };

    VCO.prototype.setFrequency = function(frequency) {
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
    function VCA(gain) {
      this.gain = context.createGain();
      this.gain.gain.value = 0;
      this.input = this.gain;
      this.output = this.gain;
      this.amplitude = this.gain.gain;
      this.currentGain = gain;

      //var that = this;
      /*$('#gain').on('release', function (_, gain) {
        console.log('set gain');
        that.setGain(gain);
      });*/
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
      this.currentGain = gain;
      console.log('set gain', this.currentGain);
    }

    return VCA;
  })(context);

  var EnvelopeGenerator = (function(context) {
    function EnvelopeGenerator(currentGain, attack, release) {
      this.attackTime = attack;
      this.releaseTime = release;
      this.currentGain = currentGain;

      var that = this;
      /*$(document).bind('gateOn', function (_) {
        that.trigger();
      });*/
      /*$('#attack').bind('setAttack', function (_, value) {
        that.setAttack(value);
      });*/
      /*$(document).bind('setRelease', function (_, value) {
        that.releaseTime = value;
      });*/
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

  /*var vco = new VCO;
  var vca = new VCA;
  var envelope = new EnvelopeGenerator;*/

  /* Connections 
  vco.connect(vca);
  envelope.connect(vca.amplitude);
  vca.connect(context.destination);*/
});

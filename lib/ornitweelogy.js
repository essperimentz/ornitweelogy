(function() {
  /*
  * Ornitweelogy 
  * =============
  *
  * Ornitweelogy is a silly little audio experiment by @quickredfox that attempts to convert tweet contents into audible chirps similar to birds.
  *
  * Copyright © 2011 Francois Lafortune
  * 
  * Permission is hereby granted, free of charge, to any person obtaining a copy
  * of this software and associated documentation files (the "Software"), to deal
  * in the Software without restriction, including without limitation the rights
  * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  * copies of the Software, and to permit persons to whom the Software is
  * furnished to do so, subject to the following conditions:
  * 
  * The above copyright notice and this permission notice shall be included in
  * all copies or substantial portions of the Software.
  * 
  * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  * THE SOFTWARE.
  * 
  */
  /* samples/s */
  var getChirpData, getNoiseData, getPlayer, getSilenceData, getToneData, sampleRate, textToChirpData;
  sampleRate = 44100;
  /* Get an <audio> player for a given data array and sound volume */
  getPlayer = function(data, volume) {
    var audio, wave;
    wave = new RIFFWAVE();
    wave.header.sampleRate = sampleRate;
    wave.header.numChannels = 1;
    wave.Make(data);
    audio = new Audio(wave.dataURI);
    audio.volume = volume / 10;
    return audio;
  };
  /* Get data for a tone given frequency (20Hz to 20000Hz) and duration in seconds */
  getToneData = function(freq, seconds) {
    var i, samples, samplesLength, t;
    freq = parseFloat(freq);
    samples = [];
    samplesLength = seconds * sampleRate;
    i = 0;
    while (i < samplesLength) {
      t = i / sampleRate;
      samples[i] = 128 + Math.round(127 * Math.sin(freq * 2 * Math.PI * t));
      i++;
    }
    return samples;
  };
  /* Get data for a silence given a duration in seconds */
  getSilenceData = function(seconds) {
    var i, samples, samplesLength;
    i = 0;
    samples = [];
    samplesLength = seconds * sampleRate;
    while (i < samplesLength) {
      samples[i] = 128;
      i++;
    }
    return samples;
  };
  /* Get data for a white noise given a duration in seconds */
  getNoiseData = function(seconds) {
    var i, samples, samplesLength;
    i = 0;
    samples = [];
    samplesLength = seconds * sampleRate;
    while (i < samplesLength) {
      samples[i] = 128 + Math.round(127 * Math.random());
      i++;
    }
    return samples;
  };
  /* Get data for a chirp given a frequency and a duration in seconds */
  getChirpData = function(freq, seconds) {
    var i, samples, samplesLength, t;
    freq = parseFloat(freq);
    samples = [];
    samplesLength = seconds * sampleRate;
    i = 0;
    while (i < samplesLength) {
      t = i / sampleRate;
      samples[i] = 128 + Math.round(127 * Math.sin(freq * 2 * Math.PI * t));
      freq += Math.sin(freq * 2 * Math.PI * t);
      i++;
    }
    return samples;
  };
  /* Get chirp data for a full string of text */
  textToChirpData = function(text) {
    var letters, secsToRead140, secsToReadLetter, secsToReadText;
    letters = text.split('');
    secsToRead140 = 10;
    secsToReadText = secsToRead140 * text.length / 140;
    secsToReadLetter = secsToRead140 / 140;
    return letters.reduce(function(samples, letter) {
      var code, freq;
      if (letter === ' ') {
        return samples.concat(getSilenceData(2 * secsToReadLetter));
      } else {
        code = letter.charCodeAt(0) % 100;
        freq = (code * 19980 / 100) + 20;
        return samples.concat(getChirpData(freq, secsToReadLetter));
      }
    }, []);
  };
  /*
      $.ornitweelogy, eventful namespace
  */
  $.ornitweelogy = $(document);
  /* 
      accumulates tweets 
  */
  $.ornitweelogy.tweets = [];
  /*
      Wraps timeout functionality on our JSONP call in case of status other than 200 (ie: rate limitting)
  */
  $.ornitweelogy.fetch = function(callback) {
    var gotten, url;
    gotten = false;
    url = 'http://api.twitter.com/1/search.json?q=bird%20OR%20oiseaux%20OR%20vogel%20OR%20aves&callback=?';
    $.getJSON(url).done(function(json) {
      gotten = true;
      return callback(null, json);
    });
    return setTimeout(function() {
      if (!gotten) {
        return callback('timeout');
      }
    }, 4000);
  };
  /*
      Poll tweets, with regards to API limits and store all new results
      in $.ornitweelogy.tweets
  */
  $.ornitweelogy.listen = function() {
    var lastID;
    lastID = sessionStorage.getItem('orni:lastID');
    return $.ornitweelogy.fetch(function(err, json) {
      if (json) {
        if (!lastID || (lastID && json.max_id !== lastID)) {
          $.ornitweelogy.tweets = $.ornitweelogy.tweets.concat(json.results);
          sessionStorage.getItem('orni:lastID', json.max_id);
        }
        return setTimeout($.ornitweelogy.listen, 10000);
      } else {
        return setTimeout($.ornitweelogy.listen, 120000);
      }
    });
  };
  /*
      Cycles through available entries in $.ornitweelogy.tweets and renders accordingly.
  */
  $.ornitweelogy.cycle = function() {
    var audio, link, markup, tweet;
    tweet = $.ornitweelogy.tweets.shift();
    if (tweet) {
      link = $('<a>').attr({
        href: "http://twitter.com/#!/" + tweet.from_user + "/" + tweet.id_Str
      });
      markup = $('<div>').attr({
        "class": "tweet",
        style: 'display:none'
      });
      audio = getPlayer(textToChirpData(tweet.text), 4);
      markup.append(link.clone().addClass('avatar').append($('<img>').attr({
        width: 50,
        height: 50,
        src: tweet.profile_image_url
      })));
      markup.append(link.clone().addClass('user').text("@" + tweet.from_user));
      markup.append($('<div>').addClass('content').html("<p>" + (tweet.text.replace(/(bird|oiseaux|aves|vogel)/gi, "<em>$1</em>")) + "</p>"));
      markup.append($('<time>').addClass('created').html("" + ($.timeago(tweet.created_at))));
      $('#tweets').append(markup);
      return markup.fadeIn(500, function() {
        $(audio).bind('ended', function() {
          return markup.fadeOut(500, function() {
            markup.remove();
            $(audio).remove();
            return setTimeout($.ornitweelogy.cycle(500));
          });
        });
        return audio.play();
      });
    } else {
      return setTimeout($.ornitweelogy.cycle, 1000);
    }
  };
  $(function() {
    return $('#begin').bind('click', function() {
      /* Loop waterfall audio every minute */
      var water;
      water = getPlayer(getNoiseData(120), 1.5);
      $(water).bind('ended', function() {
        return water.play();
      });
      $.ornitweelogy.listen();
      $.ornitweelogy.cycle();
      water.play();
      $('#description').fadeOut();
      return false;
    });
  });
}).call(this);

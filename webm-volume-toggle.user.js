// ==UserScript==
// @name         Derpibooru WebM Volume Toggle
// @description  Audio toggle for WebM clips
// @version      1.4.7
// @author       Marker
// @license      MIT
// @namespace    https://github.com/marktaiwan/
// @homepageURL  https://github.com/marktaiwan/Derpibooru-WebM-Toggle
// @supportURL   https://github.com/marktaiwan/Derpibooru-WebM-Toggle/issues
// @match        https://*.derpibooru.org/*
// @match        https://*.trixiebooru.org/*
// @grant        none
// @inject-into  content
// @noframes
// @require      https://raw.githubusercontent.com/soufianesakhi/node-creation-observer-js/master/release/node-creation-observer-latest.js
// @require      https://openuserjs.org/src/libs/mark.taiwangmail.com/Derpibooru_Unified_Userscript_UI_Utility.js?v1.2.2
// ==/UserScript==

/* global NodeCreationObserver, ConfigManager */
(function () {
  'use strict';

  /* ================== User Configurable Settings ================= */
  // Setting up UI
  const config = ConfigManager(
    'WebM Volume Toggle',
    'volume_toggle',
    'This script places a button on the top left corner of all WebM videos that contains an audio track.'
  );
  config.registerSetting({
    title: 'Always load full resolution',
    key: 'full_res',
    description: 'Always display the full resolution WebM file. Does not affect scaling settings.',
    type: 'checkbox',
    defaultValue: false
  });
  config.registerSetting({
    title: 'Disable video controls',
    key: 'disable_control',
    description: 'Disable browser\'s native video controls for the main image page and instead use the toggle button.',
    type: 'checkbox',
    defaultValue: false
  });
  config.registerSetting({
    title: 'Play sound by default',
    key: 'volume_default_on',
    type: 'checkbox',
    defaultValue: false
  });
  config.registerSetting({
    title: 'Auto-mute',
    key: 'automute',
    description: 'Automatically mute and unmute videos when they are scrolled in and out of current view.',
    type: 'checkbox',
    defaultValue: false
  });
  config.registerSetting({
    title: 'Pause in background',
    key: 'background_pause',
    description: 'Pauses video when the page loses visibility.',
    type: 'checkbox',
    defaultValue: false
  });
  config.registerSetting({
    title: 'Icon size (px/em)',
    key: 'thumb_size',
    description: 'Size of the main image volume icon. Must include units.',
    type: 'text',
    defaultValue: '3.5em'
  })
    .querySelector('input')     // additional input styling
    .setAttribute('size', '6');

  /* eslint-disable @stylistic/no-multi-spaces */

  const       LOAD_FULL_RES = config.getEntry('full_res');
  const     DISABLE_CONTROL = config.getEntry('disable_control');
  const           VOLUME_ON = config.getEntry('volume_default_on');
  const PAUSE_IN_BACKGROUND = config.getEntry('background_pause');
  const           ICON_SIZE = config.getEntry('thumb_size');
  const            AUTOMUTE = config.getEntry('automute');

  /* eslint-enable @stylistic/no-multi-spaces */

  // To change these settings, visit https://derpibooru.org/settings
  /* =============================================================== */

  NodeCreationObserver.init('webm-enhancements-observer');
  const SCRIPT_ID = 'webm_volume_toggle';
  const CSS = `/* Generated by Derpibooru WebM Volume Toggle */
.video-container {
  position: relative;
}
.image-target .volume-toggle-button {
  opacity: 0;
  font-size: ${ICON_SIZE};
  margin-top: 4px;
}
.image-target .fa-volume-off {
  padding-right: 30px;
}
.video-container .volume-toggle-button, .image-target:hover .volume-toggle-button {
  opacity: 0.4;
}
.video-container .volume-toggle-button:hover, .image-target .volume-toggle-button:hover {
  opacity: 0.8;
}
.volume-toggle-button {
  position: absolute;
  top: 0px;
  left: 5px;
  margin: 2px;
  z-index: 5;
  font-size: 2em;
  color: #000;
  cursor: pointer;
  text-shadow:
     1px  1px 2px #fff,
    -1px  1px 2px #fff,
     1px -1px 2px #fff,
    -1px -1px 2px #fff;
  transition: opacity 0.1s;
}
.volume-toggle-button.fa-volume-off {
  padding-right: 15px;
}
.volume-toggle-button.fa-volume-up {
  padding-right: 0px;
}
`;

  function initCSS() {
    if (!document.getElementById(`${SCRIPT_ID}-style`)) {
      const styleElement = document.createElement('style');
      styleElement.setAttribute('type', 'text/css');
      styleElement.id = `${SCRIPT_ID}-style`;
      styleElement.innerHTML = CSS;
      document.body.insertAdjacentElement('afterend', styleElement);
    }
  }

  function checkAudioTrack(video) {

    function createListener(video, resolve) {
      return function () {
        let audio = false;
        if (video.dataset.listenerAttached !== undefined) {
          return;
        } else {
          video.dataset.listenerAttached = '1';
        }

        /*
         * Audio track detection method for:
         *      - Chrome
         *      - Firefox
         *      - IE, Edge, and Safari
         */
        if (
          video.webkitAudioDecodedByteCount > 0 ||
          video.mozHasAudio ||
          typeof video.audioTracks !== 'undefined' && video.audioTracks.length > 0
        ) {
          audio = true;
        }
        resolve({video, audio});
      };
    }

    return new Promise((resolve) => {
      video.addEventListener('canplay', createListener(video, resolve), {'once': true});
      if (video.readyState >= video.HAVE_CURRENT_DATA) {
        (createListener(video, resolve))();
      }
    });
  }

  function toggleVolume(video) {
    video.muted = !video.muted;
  }

  function createToggleButton(obj) {
    return new Promise((resolve) => {
      const {video, audio} = obj;
      if (audio) {
        const container = video.closest('.image-show, .image-container');
        // Ignore the really small thumbnails
        if (container.matches('.thumb_tiny')) {
          container.dataset.isMuted = '1';
          return;
        }

        const button = document.createElement('div');
        button.classList.add('volume-toggle-button');
        button.classList.add('fa');

        if (container.matches('.video-container')) {
          // Setting persists after resizing
          if (container.dataset.isMuted != '1') {
            button.classList.add('fa-volume-up');
            video.muted = false;
          } else {
            button.classList.add('fa-volume-off');
            video.muted = true;
          }
        } else {
          container.classList.add('video-container');
          if (video.muted) {
            container.dataset.isMuted = '1';
            button.classList.add('fa-volume-off');
          } else {
            container.dataset.isMuted = '0';
            button.classList.add('fa-volume-up');
          }
        }

        if (video.controls) {
          button.classList.add('hidden');
        }
        container.appendChild(button);
        button.addEventListener('click', function (event) {
          event.stopPropagation();
          toggleVolume(video);
        });
      }
      resolve(obj);
    });
  }

  function scaleVideo(event) {
    event.stopPropagation();
    const video = event.target;
    const imageShow = video.closest('.image-show');

    switch (imageShow.getAttribute('data-scaled')) {
      case 'true':
        imageShow.setAttribute('data-scaled', 'partscaled');
        video.classList.remove('image-scaled');
        video.classList.add('image-partscaled');
        break;
      case 'partscaled':
        imageShow.setAttribute('data-scaled', 'false');
        video.classList.remove('image-partscaled');
        break;
      case 'false':
        imageShow.setAttribute('data-scaled', 'true');
        video.classList.add('image-scaled');
        break;
    }
  }

  function volumechangeHandler(event) {
    const video = event.target;
    const container = video.closest('.image-show, .image-container');
    const button = container.querySelector('.volume-toggle-button');
    const oldValue = container.dataset.isMuted;

    if (!isVisible(video)) return;

    container.dataset.isMuted = video.muted ? '1' : '0';
    if (container.dataset.isMuted != oldValue && button !== null) {
      if (container.dataset.isMuted == '0') {
        button.classList.add('fa-volume-up');
        button.classList.remove('fa-volume-off');
      } else {
        button.classList.add('fa-volume-off');
        button.classList.remove('fa-volume-up');
      }
    }
  }

  function isVisible(ele) {
    const {top, bottom} = ele.getBoundingClientRect();
    return (top > 0 || bottom > 0) && (top < document.documentElement.clientHeight);
  }

  initCSS();

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const video = entry.target;
      const container = video.closest('[data-is-muted]');

      if (!container) return;

      if (entry.isIntersecting) {
        if (container.dataset.automuted != '1') return;
        container.dataset.automuted = '0';
        video.muted = (container.dataset.isMuted == '1');
      } else {
        if (container.dataset.automuted == '1') return;
        container.dataset.automuted = '1';
        video.muted = true;
      }
    });
  });

  NodeCreationObserver.onCreation('.image-show video, .image-container video', function (video) {
    const isMainImage = (video.closest('.image-target') !== null);
    if (isMainImage) {
      const imageShow = video.closest('.image-show');
      const fileVersions = JSON.parse(imageShow.dataset.uris);
      const isWebM = fileVersions.full.endsWith('.webm');

      if (LOAD_FULL_RES && isWebM) {
        let reloadVideo = true;
        for (const prop in fileVersions) {
          // rewrite 'data-uris' attribute to trick resize event handler
          if (prop === 'webm' || prop === 'mp4' || prop === 'full') continue;
          fileVersions[prop] = fileVersions.full;
        }
        imageShow.dataset.uris = JSON.stringify(fileVersions);

        // change <source> to point to full resolution file
        const videoSources = video.querySelectorAll('source');
        for (const source of videoSources) {
          if (source.src.endsWith(fileVersions.full)) {
            reloadVideo = false;
            break;
          }
          source.src = fileVersions.full;
          if (source.type === 'video/mp4') {
            source.src = source.src.replace(/webm$/i, 'mp4');
          }
        }

        // apply image scaling class
        if (imageShow.dataset.scaled == 'true') {
          video.classList.add('image-scaled');
        }

        // bind our own click resize handler to the video because changing 'data-uris' broke the native one
        video.addEventListener('click', scaleVideo);

        // reload the video so the new url will take
        if (reloadVideo) video.load();
      }

      if (isWebM) video.muted = !VOLUME_ON || (AUTOMUTE && !isVisible(video));
      video.controls = !DISABLE_CONTROL;
    }

    if (PAUSE_IN_BACKGROUND) {
      // requestAnimationFrame is workaround for more Chrome weirdness
      video.dataset.paused = '0';
      video.addEventListener('play', (e) => {
        window.requestAnimationFrame(() => {
          if (!document.hidden) e.target.dataset.paused = '0';
        });
      });
      video.addEventListener('pause', (e) => {
        window.requestAnimationFrame(() => {
          if (!document.hidden) e.target.dataset.paused = '1';
        });
      });
    }

    const anchor = video.closest('a');
    if (anchor) anchor.title = 'WebM | ' + anchor.title;

    checkAudioTrack(video)
      .then(createToggleButton)
      .then((obj) => {
        const {video, audio} = obj;
        if (audio) {
          video.addEventListener('volumechange', volumechangeHandler);
          if (AUTOMUTE) io.observe(video);
        } else {
          // Attempting to run play() on a video without an audio track will still throw exception on Chrome
          // due to its autoplay policy, if the 'muted' property was set to false.
          video.muted = true;
        }
        if ((isMainImage && !document.hidden) || video.paused && !document.hidden) {
          video.play().catch(function () {
            // Fallback for Chrome's autoplay policy preventing video from playing
            console.log('Derpibooru WebM Volume Toggle: Unable to play video unmuted, playing it muted instead.');
            toggleVolume(video);
            video.play();
          });
        }
      });

  });

  if (PAUSE_IN_BACKGROUND) {
    if (document.hidden) {
      const videosList = document.querySelectorAll('video');
      for (const video of videosList) video.pause();
    }
    document.addEventListener('visibilitychange', () => {
      const videosList = document.querySelectorAll('video');
      for (const video of videosList) {
        if (document.hidden) {
          video.pause();
        } else {
          if (video.dataset.paused !== '1') {
            video.play().catch(() => {
              // no-op:
              // Prevents console errors when video is paused before
              // the play() promise if resolved
            });
          }
        }
      }
    });
  }

})();

// ==UserScript==
// @name         Derpibooru WebM Volume Toggle
// @description  Audio toggle for WebM clips
// @version      1.1.1
// @author       Marker
// @license      MIT
// @namespace    https://github.com/marktaiwan/
// @updateURL    https://openuserjs.org/meta/mark.taiwangmail.com/Derpibooru_WebM_Volume_Toggle.meta.js
// @homepageURL  https://github.com/marktaiwan/Derpibooru-WebM-Toggle 
// @supportURL   https://github.com/marktaiwan/Derpibooru-WebM-Toggle/issues
// @match        https://derpibooru.org/*
// @match        https://trixiebooru.org/*
// @match        https://www.derpibooru.org/*
// @match        https://www.trixiebooru.org/*
// @grant        none
// @noframes
// @require      https://openuserjs.org/src/libs/soufianesakhi/node-creation-observer.js
// @require      https://openuserjs.org/src/libs/mark.taiwangmail.com/Derpibooru_Unified_Userscript_UI_Utility.js
// ==/UserScript==

(function() {
    'use strict';

/* ================== User Configurable Settings ================= */
    // Setting up UI
    const config = ConfigManager(
        'WebM Volume Toggle',
        'volume_toggle',
        'This script places a button on the top left corner of all WebM videos that contains an audio track.'
    );
    config.registerSetting({
        title: 'Disable video controls',
        key: 'disable_control',
        description: 'Disable browser\'s native video controls for the main image page and instead use the toggle button.',
        type: 'checkbox',
        defaultValue: false
    });
    config.registerSetting({
        title: 'Enable sound by default',
        key: 'volume_default_on',
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

    const     DISABLE_CONTROL = config.getEntry('disable_control');
    const           VOLUME_ON = config.getEntry('volume_default_on');
    const PAUSE_IN_BACKGROUND = config.getEntry('background_pause');
    const           ICON_SIZE = config.getEntry('thumb_size');

// To change these settings, visit https://derpibooru.org/settings
/* =============================================================== */

    function initCSS() {
        var styleElement = document.createElement('style');
        styleElement.id = 'derpibooru-volume-toggle-css';
        styleElement.type = 'text/css';
        styleElement.innerHTML = `/* Generated by Derpibooru WebM Volume Toggle */
.video-container {
    position: relative;
}
#image_target .volume-toggle-button {
    opacity: 0;
    font-size: ${ICON_SIZE};
    margin-top: 4px;
}
#image_target .fa-volume-off {
    padding-right: 30px;
}
.video-container .volume-toggle-button, #image_target:hover .volume-toggle-button {
    opacity: 0.4;
}
.video-container .volume-toggle-button:hover, #image_target .volume-toggle-button:hover {
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
        1px 1px 2px #fff,
       -1px 1px 2px #fff,
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
.image-container.has-webm-overlay .volume-toggle-button {
    top: 20px;
}
`;
        document.head.appendChild(styleElement);
    }

    function checkDecode(video, delay, resolve) {
        if (video.webkitAudioDecodedByteCount > 0 || video.mozHasAudio) {
            resolve(video);
        } else {
            // 2 seconds wait time
            if (delay < 2048) {
                delay *= 2;
                setTimeout(() => checkDecode(video, delay, resolve), delay);
            }
        }
    }

    function createListener(video, resolve) {
        return function () {
            if (video.dataset.listenerAttached !== undefined) {
                return;
            } else {
                video.dataset.listenerAttached = '1';
            }
            if (typeof video.webkitAudioDecodedByteCount !== 'undefined' || typeof video.mozHasAudio !== 'undefined') {
                // wait for video decode
                var delay = 4;
                checkDecode(video, delay, resolve);
            } else {
                // Only IE, Edge, and Safari supports this, wtf?
                if (video.audioTracks && video.audioTracks.length) {
                    resolve(video);
                }
            }
        };
    }

    function ifHasAudio(video) {
        return new Promise((resolve, reject) => {
            video.addEventListener('loadeddata', createListener(video, resolve), {'once': true});
            if (video.readyState >= video.HAVE_CURRENT_DATA) {
                (createListener(video, resolve))();
            }
        });
    }

    function getParent(element, selector) {
        do {
            element = element.parentElement;
        } while (element !== null && !element.matches(selector));
        return element;
    }

    function toggle(video) {
        const container = getParent(video, '.video-container');
        const button = container.querySelector('.volume-toggle-button');
        if (container.dataset.isMuted == '1') {
            button.classList.add('fa-volume-up');
            button.classList.remove('fa-volume-off');
            video.muted = false;
            container.dataset.isMuted = '0';
        } else {
            button.classList.add('fa-volume-off');
            button.classList.remove('fa-volume-up');
            video.muted = true;
            container.dataset.isMuted = '1';
        }
    }

    function createToggleButton(video) {
        const container = getParent(video, '.image-show, .image-container');
        // Ignore the really small thumbnails
        if (container.matches('.thumb_tiny')) {
            return;
        }
        if (video.controls) {
            return;
        }
        var button = document.createElement('div');
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

        container.appendChild(button);
        button.addEventListener('click', function (event) {
            event.stopPropagation();
            toggle(video);
        });
    }

    initCSS();
    NodeCreationObserver.onCreation('.image-show video, .image-container video', function (video) {
        const mainImage = (getParent(video, '#image_target') !== null);
        if (mainImage) {
            video.muted = !VOLUME_ON;
            video.controls = !DISABLE_CONTROL;
        }
        if (video.controls) {   // No need to insert buttons if native control is on
            return;
        }
        ifHasAudio(video).then(createToggleButton);
    });
    if (PAUSE_IN_BACKGROUND) {
        if (document.hidden) {
            let videosList = document.querySelectorAll('video');
            for (let video of videosList) video.pause();
        }
        document.addEventListener('visibilitychange', () => {
            let videosList = document.querySelectorAll('video');
            if (document.hidden) {
                for (let video of videosList) {
                    video.dataset.paused = video.paused;
                    video.pause();
                }
            } else {
                for (let video of videosList) {
                    if (video.dataset.paused != 'true') {
                        video.play();
                    }
                }
            }
        });
    }
})();

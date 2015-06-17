(function (window) {

    window.framer = {
        Framer: Framer,
        FrameClient: FrameClient
    };

    var FramerClientMessengerType = 'frame-client';
    var FramerMessengerType = 'framer';

    /**
     * Framer is the manager of a set of iframe/webview elements
     * that can communicate with send and receive.
     * @param name
     * @constructor
     */
    function Framer(name) {
        this.name = name;
        this.frames = [];
        this.handlers = [];
        this.focus = null;
        this.container = createFrameContainer(this.name);
        this.zIndex = 99999;

        this.receiveMessage = function (event) {
            if (event.data.messenger === FramerClientMessengerType && event.data.target === this.name) {
                this.handleMessage(event.data);
            }
        }.bind(this);

        window.addEventListener('message', this.receiveMessage, false);
    }

    Framer.prototype.send = function (target, type, data) {
        var message = new FrameMessage(type, data, this.name, target, FramerMessengerType);
        window.postMessage(message, document.location.origin);
    };

    Framer.prototype.receive = function (type, callback) {
        if (!filterByKeyValue(this.handlers, 'type', type)) {
            this.handlers.push({
                type: type,
                callback: callback
            });
        } else {
            console.error('You already have a callback for type', type);
        }
    };

    Framer.prototype.handleMessage = function (message) {
        var result = filterByKeyValue(this.handlers, 'type', message.type);
        if (result) {
            result.callback.apply(this, [message.data]);
        }
    };

    Framer.prototype.add = function (name, src, style) {
        var existing = filterByKeyValue(this.frames, 'name', name);
        if (existing) {
            console.warn('Framer.add() there is already a frame named',
                name, 'in the framer', this.name);
            return existing;
        }

        var frame = new Frame(FramerClientMessengerType, name, src, style);
        this.frames.push(frame);

        return frame;
    };

    /**
     * Open a frame by name and close any opened frames.
     * @param name
     */
    Framer.prototype.open = function (name) {
        var existing = this.getFrame(name);
        if (!existing) {
            console.error('Framer open() there is no frame with that name', name);
            return;
        }

        if (this.focus && this.focus !== existing) {
            this.closeFrame(this.focus);
        }
        this.focus = existing;
        this.openFrame(existing);

        return existing;
    };

    /**
     * Open a frame by name and instead of closing any opened frames,
     * this frame will instead open at a zIndex above the existing opened frame.
     * @param name
     */
    Framer.prototype.openAbove = function (name) {
        var existing = this.getFrame(name);
        if (!existing) {
            console.error('Framer open() there is no frame with that name', name);
            return;
        }
        this.openFrame(existing, this.zIndex + 1);

        return existing;
    };

    Framer.prototype.openFrame = function (frame, zIndex) {
        zIndex = zIndex || this.zIndex;

        if (!frame.frameElement) {
            this.createFrameElement(frame);
            prependElement(this.container, frame.frameElement);
            frame.frameElement.style.zIndex = zIndex;
        } else {
            console.warn('Framer', this.name, 'already has', frame.name, 'open');
        }
    };

    Framer.prototype.close = function (name) {
        var existing = this.getFrame(name);
        if (!existing) {
            console.warn('Framer close() there is no frame with that name', name);
            return;
        }
        this.closeFrame(existing);
    };

    Framer.prototype.closeFrame = function (frame) {
        if (frame.frameElement) {
            // Prevent memory leaks with reload();
            frame.frameElement.contentWindow.location.reload();
            setTimeout(function () {
                frame.frameElement.parentNode.removeChild(frame.frameElement);
                frame.frameElement = undefined;
            }, 0);
        } else {
            console.warn('Framer', this.name, 'frame', frame.name, 'is not open to close');
        }
    };

    Framer.prototype.getFrame = function (frame) {
        var existingFrame;
        if (typeof frame === 'string') {
            existingFrame = this.getFrameByName(frame)
        } else if (Object.getOwnPropertyNames(frame).name) {
            existingFrame = this.frames.indexOf(frame);
        }

        return existingFrame;
    };

    Framer.prototype.getFrameByName = function (name) {
        var frame;
        var result = this.frames.filter(function (frame) {
            return frame.name === name;
        });
        if (result.length > 0) {
            frame = result[0];
        }

        return frame;
    };

    Framer.prototype.createFrameElement = function (frame) {
        var src = frame.src;
        var nameParam = '&name=' + frame.name;
        var origin = '#origin=' + document.location.href;

        var iframe = document.createElement('iframe'); //todo webview ms-app-webview
        setElementStyles(iframe, frame.style);
        iframe.id = frame.name;
        iframe.src = src + origin + nameParam;
        frame.frameElement = iframe;

        return frame;
    };

    //todo destroy event to loop through frames

    function setElementStyles(element, styles) {
        for (var style in styles) {
            element.style[style] = styles[style];
        }
    }

    function createFrameContainer(className) {
        var container;
        if (!elementExistsByClassName(className)) {
            container = window.document.createElement('div');
            container.className = className;
            container.style.position = 'fixed';
            container.style.top = 0;
            container.style.left = 0;
            container.style.zIndex = this.zIndex;
            prependElement(window.document.body, container);
        }
        return container;
    }

    function prependElement(parentElement, element) {
        return parentElement.insertBefore(element, parentElement.firstChild);
    }

    function elementExistsByClassName(className) {
        var existingElements = window.document.getElementsByClassName(className);
        return existingElements.length > 0;
    }


    function Frame(type, name, src, style) {
        this.type = type;
        this.name = name;
        this.src = src;
        this.style = style;
        this.frameElement = undefined;
    }

    function FrameClient() {
        this.handlers = [];

        this.params = parseParams();
        this.name = filterByKeyValue(this.params, 'name', 'name', true).data;
        this.origin = filterByKeyValue(this.params, 'name', 'origin').data; //todo get last value

        this.receiveMessage = function (event) {
            if (event.data.messenger === FramerMessengerType && event.data.target === this.name) {
                this.handleMessage(event.data);
            }
        }.bind(this);

        window.parent.window.addEventListener('message', this.receiveMessage, false);
    }

    FrameClient.prototype.handleMessage = function (message) {
        var result = filterByKeyValue(this.handlers, 'type', message.type);
        if (result) {
            result.callback.apply(this, [message.data]);
        }
    };

    FrameClient.prototype.send = function (target, type, data) {
        var message = new FrameMessage(type, data, this.name, target, FramerClientMessengerType);
        window.parent.postMessage(message, this.origin);
    };

    FrameClient.prototype.receive = function (type, callback) {
        if (!filterByKeyValue(this.handlers, 'type', type)) {
            this.handlers.push({
                type: type,
                callback: callback
            });
        } else {
            console.error('You already have a callback for type', name);
        }
    };

    function FrameMessage(type, data, origin, target, messenger) {
        this.type = type;
        this.data = data;
        this.origin = origin;
        this.target = target;
        this.messenger = messenger;
    }


    function filterByKeyValue(collection, key, value, last) {
        var needle;
        var result = collection.filter(function (item) {
            return item[key] === value;
        });

        if (result.length > 0) {
            var resultIndex = 0;
            if (last) {
                resultIndex = result.length - 1;
            }
            needle = result[resultIndex];
        }

        return needle;
    }

    function parseParams(hash) {
        hash = hash || document.location.hash;
        var parameters = [];
        var urlParams = decodeURIComponent(hash.replace(/^#/, ''));
        var segments = urlParams.split('&');

        segments.forEach(function (segment) {
            if (segment && segment !== '') {
                var name = segment.substring(0, segment.indexOf('='));
                var data = segment.substring(segment.indexOf('=') + 1, segment.length);
                parameters.push({
                    name: name,
                    data: data
                });
            }
        });
        return parameters;
    }

})(window);
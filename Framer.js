(function (window) {

    window.framer = {
        Framer: Framer,
        FramerClient: FramerClient,
        domLog: domLog
    };

    var FramerClientMessengerType = 'frame-client';
    var FramerMessengerType = 'framer';

    /**
     * Framer is the manager of a set of iframe/webview elements
     * that can communicate with send and receive.
     *
     * @param name
     * @constructor
     */
    function Framer(name) {
        this.name = name;
        this.frames = [];
        this.handlers = [];
        this.focus = null;
        this.zIndex = 99999;
        this.container = this.createFrameContainer(this.name);
        // The default style will make the frames fullscreen as if this is a
        // single frame application ;)
        this.style = {
            position: 'fixed',
            top: '0px',
            left: '0px',
            bottom: '0px',
            right: '0px',
            width: '100%',
            height: '100%',
            border: 'none',
            margin: '0',
            padding: '0',
            overflow: 'hidden'
        };

        this.receiveMessage = function (event) {
            if (event.origin !==  document.location.origin) {
                return;
            }

            if (event.data.messenger === FramerClientMessengerType &&
                (event.data.target === this.name || typeof event.data.target === 'undefined')) {
                this.handleMessage(event.data);
            }
        }.bind(this);

        window.addEventListener('message', this.receiveMessage, false);
    }

    /**
     * Send a message to a FramerClient, if no target is specified send to all.
     * @param type the message type to use based that describes the feature, eg submit, send, logout
     * @param data the oat
     * @param target
     */
    Framer.prototype.send = function (type, data, target) {
        var message = new FrameMessage(type, data, this.name, target, FramerMessengerType);
        window.postMessage(message, document.location.origin);
    };

    /**
     * Receive a message on a Framer instance. The callback will recieve the data
     * value sent with Framer.prototype.send()
     * @param type
     * @param callback
     */
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

    /**
     * Add a new frame to the Framer instance.
     *
     * @param name the unique name to manage and recieve messages
     * @param src the src url that is given to the iframe/webview
     * @param options an object with values for style, attributes and url arguments for the src
     * @returns {*}
     */
    Framer.prototype.add = function (name, src, options) {
        var existing = filterByKeyValue(this.frames, 'name', name);
        if (existing) {
            console.warn('Framer.add() there is already a frame named',
                name, 'in the framer', this.name);
            return existing;
        }
        options = options || {};

        if (!options.style) {
            options.style = this.style;
        }

        var frame = new Frame(FramerClientMessengerType, name, src, options);
        this.frames.push(frame);

        return frame;
    };

    /**
     * Open a frame by name and close any opened frames.
     *
     * @param name
     * @param options
     */
    Framer.prototype.open = function (name, options) {
        var existing = this.getFrame(name);
        if (!existing) {
            console.error('Framer open() there is no frame with that name', name);
            return;
        }
        if (this.focus && this.focus !== existing) {
            this.closeFrame(this.focus);
        }
        this.focus = existing;

        if (options) {
            mergeOptions(this.focus.options, options);
        }
        this.openFrame(this.focus, options);

        return existing;
    };

    /**
     * Open a frame by name and instead of closing any opened frames,
     * this frame will instead open at a zIndex above the existing opened frame.
     *
     * @param name
     * @param options
     */
    Framer.prototype.openAbove = function (name, options) {
        options = options || {};
        options.style = options.style || {};

        var existing = this.getFrame(name);
        if (!existing) {
            console.error('Framer open() there is no frame with that name', name);
            return;
        }
        if (!options.style.zIndex) {
            options.style.zIndex = existing.style.zIndex + 1;
        }
        this.openFrame(existing, options);

        return existing;
    };

    Framer.prototype.close = function (name) {
        var existing = this.getFrame(name);
        if (!existing) {
            console.warn('Framer close() there is no frame with that name', name);
            return;
        }
        this.closeFrame(existing);
    };

    Framer.prototype.handleMessage = function (message) {
        var result = filterByKeyValue(this.handlers, 'type', message.type);
        if (result) {
            result.callback.apply(this, [message.data]);
        }
    };

    Framer.prototype.openFrame = function (frame, options) {
        //merge existing options with override
        if (options) {
            mergeOptions(frame.options, options);
        }

        if (!frame.frameElement) {
            this.createFrameElement(frame);
            prependElement(this.container, frame.frameElement);

        } else {
            console.warn('Framer', this.name, 'already has', frame.name, 'open');
        }
    };

    Framer.prototype.closeFrame = function (frame) {
        if (frame.frameElement) {
            //todo make this configurable
            //todo destroy event to loop through frames for custom gc clean hook
            frame.frameElement.parentNode.removeChild(frame.frameElement);
            frame.frameElement = undefined;

            //todo Prevent memory leaks with reload();
            //setTimeout(function () {
            //    frame.frameElement.contentWindow.location.reload();
            //}, 0);
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
        var options = frame.options;
        options.arguments = options.arguments || {};
        options.style = options.style || {};
        options.attributes = options.attributes || {};
        var paramaters = createUrlArgs(options.arguments);
        var params = '&name=' + frame.name + '&' + paramaters;
        var origin = '?origin=' + encodeURIComponent(document.location.href);

        //todo webview ms-app-webview
        var iframe = document.createElement('iframe');

        setElementStyles(iframe, options.style);
        setElementAttributes(iframe, options.attributes);

        iframe.id = frame.name;
        iframe.src = src + origin + params;
        frame.frameElement = iframe;

        return frame;
    };

    function Frame(type, name, src, options) {
        this.type = type;
        this.name = name;
        this.src = src;
        this.options = options;
        this.frameElement = undefined;
    }

    function FramerClient() {
        this.handlers = [];

        this.params = parseParams();
        this.name = filterByKeyValue(this.params, 'name', 'name', true).data;
        this.origin = filterByKeyValue(this.params, 'name', 'origin').data; //todo get last value

        this.receiveMessage = function (event) {
            if (event.origin !== document.location.origin) {
                return;
            }

            if (event.data.messenger === FramerMessengerType &&
                (event.data.target === this.name || typeof event.data.target === 'undefined')) {
                this.handleMessage(event.data);
            }
        }.bind(this);

        window.parent.window.addEventListener('message', this.receiveMessage, false);
    }

    FramerClient.prototype.handleMessage = function (message) {
        var result = filterByKeyValue(this.handlers, 'type', message.type);
        if (result) {
            result.callback.apply(this, [message.data]);
        }
    };

    FramerClient.prototype.send = function (type, data, target) {
        var message = new FrameMessage(type, data, this.name, target, FramerClientMessengerType);
        window.parent.postMessage(message, this.origin);
    };

    FramerClient.prototype.receive = function (type, callback) {
        if (!filterByKeyValue(this.handlers, 'type', type)) {
            this.handlers.push({
                type: type,
                callback: callback
            });
        } else {
            console.error('You already have a callback for type', name);
        }
    };

    Framer.prototype.createFrameContainer = function(className) {
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
    };

    function FrameMessage(type, data, origin, target, messenger) {
        this.type = type;
        this.data = data;
        this.origin = origin;
        this.target = target;
        this.messenger = messenger;
    }

    function createUrlArgs(args) {
        var argsList = [];
        var properties = Object.getOwnPropertyNames(args);

        properties.forEach(function propertyResolver(name) {
            var encodedArg = name + '=' + encodeURIComponent(args[name]);
            argsList.push(encodedArg);
        });

        return argsList.join('&');
    }

    function mergeOptions(existing, custom) {
        var keys = Object.getOwnPropertyNames(existing);
        keys.forEach(function (key) {
            if (custom[key]) {
                existing[key] = custom[key];
            }
        });
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
        var urlParams = decodeURIComponent(hash.replace(/^#\//, ''));
        urlParams = decodeURIComponent(hash.replace(/^#/, ''));
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

    function prependElement(parentElement, element) {
        return parentElement.insertBefore(element, parentElement.firstChild);
    }

    function setElementStyles(element, styles) {
        for (var style in styles) {
            element.style[style] = styles[style];
        }
    }

    function setElementAttributes(element, attributes) {
        for (var attribute in attributes) {
            element.setAttribute(attribute, attributes[attribute]);
        }
        return element;
    }

    function elementExistsByClassName(className) {
        var existingElements = window.document.getElementsByClassName(className);
        return existingElements.length > 0;
    }

    /**
     * Simple utility to log messages to the dom.
     * @param message
     * @param color
     */
    function domLog(message, color) {
        var className = 'dom-log';
        var container = document.getElementsByClassName(className)[0];
        if (!container) {
            container = document.createElement('div');
            container.className = className;
            container.style.position = 'absolute';
            container.style.top = '0';
            container.style.right = '0';
            prependElement(window.document.body, container);
        }

        var logMessage = document.createElement('p');
        logMessage.innerText = message;
        logMessage.style.color = color;
        logMessage.style.fontSize = '0.5em';
        container.appendChild(logMessage);
    }

})(window);

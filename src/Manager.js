/**
 * Manager is the manager of a set of iframe/webview elements
 * that can communicate with send and receive.
 *
 * @param name
 * @constructor
 * @param options
 */
function Manager(name, options) {
    var existing = this.getManagerByName(name);
    if(existing !== null) {
        console.info('There is already a manager with the name', name);
        if(this.focus)
        this.applyOptions(options);
        return existing;
    }

    this.applyOptions(options);
    this.name = name;
    this.frames = [];
    this.handlers = [];
    this.focus = null;
    this.persistentFrame = null;
    this.zIndex = 99999;

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

    this.listen();

    window.framer.managers.push(this);
}

Manager.prototype.applyOptions = function(options) {
    if(options && options.container) {
        this.container = options.container;
        this.container.className += (' ' + this.name);
    } else {
        this.container = this.createFrameContainer(this.name);
    }
};

Manager.prototype.getManagerByName = function(name) {
    var result = window.framer.managers.filter(function (manager) {
        return manager.name === name;
    });
    if (result.length > 0) {
        result = result[0];
    } else {
        result = null;
    }

    return result;
};

Manager.prototype.receiveMessage = function (event) {
    if (event.origin !== document.location.origin) {
        return;
    }

    if (event.data.messenger === ClientMessage &&
        (event.data.target === this.name || typeof event.data.target === 'undefined')) {
        this.handleMessage(event.data);
    }
};

Manager.prototype.destroy = function() {
    this.unListen();
};

Manager.prototype.listen = function() {
    this.listener = function(event){
        this.receiveMessage(event);
    }.bind(this);

    window.top.addEventListener('message', this.listener, false);
};

Manager.prototype.unListen = function() {
    window.top.removeEventListener('message', this.listener);
    this.listener = undefined;
};

/**
 * Send a message to a Client, if no target is specified send to all.
 * @param type the message type to use based that describes the feature, eg submit, send, logout
 * @param data the oat
 * @param target
 */
Manager.prototype.send = function (type, data, target) {
    var message = new FrameMessage(type, data, this.name, target, ManagerMessage);
    window.top.postMessage(message, document.location.origin);
};

/**
 * Receive a message on a Manager instance. The callback will recieve the data
 * value sent with Manager.prototype.send()
 * @param type
 * @param callback
 */
Manager.prototype.on = function (type, callback) {
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
 * Add a new frame to the Manager instance.
 *
 * @param name the unique name to manage and recieve messages
 * @param src the src url that is given to the iframe/webview
 * @param options an object with values for style, attributes and url arguments for the src
 * @returns {*}
 */
Manager.prototype.add = function (name, src, options) {
    var existing = filterByKeyValue(this.frames, 'name', name);
    if (existing) {
        console.warn('Manager.add() there is already a frame named',
            name, 'in the framer', this.name);
        return existing;
    }
    options = options || {};

    if (!isDefined(options.style)) {
        options.style = this.style;
    }
    if (!isDefined(options.append)) {
        options.append = true;
    }
    if (!isDefined(options.persistent)) {
        options.persistent = true;
    }

    var frame = new Frame(ClientMessage, name, src, options);
    this.frames.push(frame);

    return frame;
};

/**
 * Open a frame by name and close any opened frames.
 *
 * @param name
 * @param options
 */
Manager.prototype.open = function (name, options) {
    var existing = this.getFrame(name);
    if (!existing) {
        console.error('Manager open() there is no frame with that name', name);
        return;
    }
    if (this.focus && this.focus !== existing) {
        this.closeFrame(this.focus);
    }
    this.focus = existing;

    if (options) {
        mergeOptions(this.focus.options, options);
    }
    this.openFrame(this.focus);

    return existing;
};

/**
 * Open a frame by name and instead of closing any opened frames,
 * this frame will instead open at a zIndex above the existing opened frame.
 *
 * @param name
 * @param options
 */
Manager.prototype.openAbove = function (name, options) {
    options = options || {};
    options.style = options.style || {};

    var existing = this.getFrame(name);
    if (!existing) {
        console.error('Manager open() there is no frame with that name', name);
        return;
    }
    if (!options.style.zIndex) {
        options.style.zIndex = existing.style.zIndex + 1;
    }
    this.openFrame(existing, options);

    return existing;
};

Manager.prototype.close = function (name, callback) {
    var existing = this.getFrame(name);
    if (!existing) {
        console.warn('Manager close() there is no frame with that name', name);
        return;
    }
    this.closeFrame(existing, callback);
    this.focus = null;
};

Manager.prototype.handleMessage = function (message) {
    var result = filterByKeyValue(this.handlers, 'type', message.type);
    if (result) {
        result.callback.apply(this, [message.data]);
    }
};

Manager.prototype.openFrame = function (frame, options) {
    //merge existing options with override
    if (options) {
        mergeOptions(frame.options, options);
    }

    if(frame.options.persistent) {
        this.setPersistentFrame(frame);

    } else if (!frame.frameElement) {
        this.createFrameElement(frame);
        if (frame.options.append) {
            var parent = this.container;
            if (frame.options.parent) {
                parent = frame.options.parent;
            }
            prependElement(parent, frame.frameElement);
        }
    } else {
        console.warn('Manager', this.name, 'already has', frame.name, 'open');
    }
};

Manager.prototype.closeFrame = function (frame, callback) {
    if(frame.options.persistent && this.persistentFrame !== null) {
            this.persistentFrame.src = 'about:blank';
            this.persistentFrame.style.visibility = 'hidden';
            var existing = window.top.framer.getClientByName(frame.name);
            if(existing) {
                existing.destroy();
            }
            if(callback) callback.apply();
    } else if(frame.frameElement) {
        var existing = window.top.framer.getClientByName(frame.name);
        if(existing) {
            existing.destroy();
        }
        closeFrameWindow(frame, callback);
    } else {
        console.warn('Manager', this.name, 'frame', frame.name, 'is not open to close');
        if(callback) callback.apply();
    }

};

Manager.prototype.getFrame = function (frame) {
    var existingFrame;
    if (typeof frame === 'string') {
        existingFrame = this.getFrameByName(frame)
    } else if (Object.getOwnPropertyNames(frame).name) {
        existingFrame = this.frames.indexOf(frame);
    }

    return existingFrame;
};

Manager.prototype.getFrameByName = function (name) {
    var frame = null;
    var result = this.frames.filter(function (frame) {
        return frame.name === name;
    });
    if (result.length > 0) {
        frame = result[0];
    }

    return frame;
};

Manager.prototype.setPersistentFrame = function(frame) {
    if(this.persistentFrame === null) {
        this.persistentFrame = document.createElement('iframe');
    }
    if(this.persistentFrame.parent !== this.container) {
        prependElement(this.container, this.persistentFrame);
    }

    //Cleanup an existing persistent frame
    if(frame.frameElement && frame.options.src) {
        var client = window.top.framer.getClientByName(frame.name);
        if(client) client.destroy();
        this.openPersistentFrame(frame);

    } else this.openPersistentFrame(frame);

};

Manager.prototype.openPersistentFrame = function(frame) {
    var options = frame.options;
    var src = options.src || frame.src;
    if(options.src) options.src = undefined;
    options.arguments = options.arguments || {};
    options.style = options.style || {};
    options.attributes = options.attributes || {};

    var parameters = createUrlArgs(options.arguments);
    var params = '&name=' + frame.name + '&' + parameters;
    var origin = '?origin=' + encodeURIComponent(document.location.href);

    setElementStyles(this.persistentFrame, options.style);
    setElementAttributes(this.persistentFrame, options.attributes);

    this.persistentFrame.id = frame.name;
    this.persistentFrame.src = src + origin + params;
    this.persistentFrame.style.visibility = 'visible';
    this.persistentFrame.sandbox = 'allow-forms allow-scripts allow-same-origin';
    frame.frameElement = this.persistentFrame;
}

Manager.prototype.createFrameElement = function (frame) {
    var options = frame.options;
    var src = options.src || frame.src;
    if(options.src) options.src = undefined;
    options.arguments = options.arguments || {};
    options.style = options.style || {};
    options.attributes = options.attributes || {};

    var parameters = createUrlArgs(options.arguments);
    var params = '&name=' + frame.name + '&' + parameters;
    var origin = '?origin=' + encodeURIComponent(document.location.href);

    //todo webview ms-app-webview
    var iframe = document.createElement('iframe');

    setElementStyles(iframe, options.style);
    setElementAttributes(iframe, options.attributes);

    iframe.id = frame.name;
    iframe.src = src + origin + params;
    iframe.sandbox = 'allow-forms allow-scripts allow-same-origin';
    frame.frameElement = iframe;

    return frame;
};

Manager.prototype.createFrameContainer = function (className) {
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
function Client() {
    this.handlers = [];

    this.params = parseParams();
    var name = filterByKeyValue(this.params, 'name', 'name', true);
    var origin = filterByKeyValue(this.params, 'name', 'origin');
    if (!isDefined(name) || !isDefined(origin)) {
        console.info('A Framer Client will not work without the correct origin and name url args, origin and name');
        return;
    }
    this.name = name.data;
    this.origin = origin.data;

    this.listen();
}

Client.prototype.receiveMessage = function (event) {
    if (event &&
        event.origin &&
        event.origin !== window.top.document.location.origin) {
        return;
    }

    if (event.data.messenger === ManagerMessage &&
        (event.data.target === this.name ||
        typeof event.data.target === 'undefined')) {
        this.handleMessage(event.data);
    }
};

Client.prototype.destroy = function() {
    this.unListen();
};

Client.prototype.listen = function() {
    this.listener = function(event){
        this.receiveMessage(event);
    }.bind(this);

    window.top.addEventListener('message', this.listener, false);
};

Client.prototype.unListen = function() {
    window.top.removeEventListener('message', this.listener);
    this.listener = undefined;
};

Client.prototype.handleMessage = function (message) {
    var result = filterByKeyValue(this.handlers, 'type', message.type);
    if (result) {
        result.callback.apply(this, [message.data]);
    }
};

Client.prototype.send = function (type, data, target) {
    if (!isDefined(this.name) || !isDefined(this.origin)) {
        console.warn('Framer Client has no Manager to send', type, data);
        return;
    }
    var message = new FrameMessage(type, data, this.name, target, ClientMessage);
    window.top.postMessage(message, this.origin);
};

Client.prototype.on = function (type, callback) {
    if (!filterByKeyValue(this.handlers, 'type', type)) {
        this.handlers.push({
            type: type,
            callback: callback
        });
    } else {
        console.error('You already have a callback for type', name);
    }
};
function Client(name, origin) {
    this.handlers = [];
    this.params = parseParams();
    this.name = name || filterKeyPropertyValue(this.params, 'data', 'name', 'name', true);
    this.origin = origin || filterKeyPropertyValue(this.params, 'data', 'name', 'origin');

    if (!isDefined(this.name) || !isDefined(this.origin)) {
        return;
    }

    this.listen();
}

Client.prototype.send = function (type, data, target) {
    if (!isDefined(this.name) || !isDefined(this.origin)) {
        return;
    }
    var message = new FrameMessage(type, data, this.name, target, ClientMessage);
    window.parent.postMessage(message, '*');
};

Client.prototype.on = function (type, callback) {
    if (!isDefined(this.name) || !isDefined(this.origin)) {
        return;
    }

    if (!filterByKeyValue(this.handlers, 'type', type)) {
        this.handlers.push({
            type: type,
            callback: callback
        });
    } else {
        console.error('You already have a callback for type', name);
    }
};

Client.prototype.receiveMessage = function (event) {
    if (event.data.messenger === ManagerMessage &&
        (event.data.target === this.name ||
        typeof event.data.target === 'undefined')) {
        this.handleMessage(event.data);
    }
};

Client.prototype.destroy = function(callback) {
    console.info('Framer Client', this.name, 'is being destroyed');
    this.unListen();
    this.handlers = [];
    if(callback) callback.apply();
};

Client.prototype.listen = function() {
    this.listener = function(event){
        this.receiveMessage(event);
    }.bind(this);

    window.addEventListener('message', this.listener, false);
};

Client.prototype.unListen = function() {
    window.removeEventListener('message', this.listener);
    this.listener = undefined;
};

Client.prototype.handleMessage = function (message) {
    var result = filterByKeyValue(this.handlers, 'type', message.type);
    if (result) {
        result.callback.apply(this, [message.data]);
    }
};
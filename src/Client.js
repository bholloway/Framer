function Client(name, origin) {
    this.params = parseParams();
    this.name = name || filterKeyPropertyValue(this.params, 'data', 'name', 'name', true);
    this.origin = origin || filterKeyPropertyValue(this.params, 'data', 'name', 'origin');

    if (!isDefined(this.name) || !isDefined(this.origin)) {
        console.info('A Framer Client will not work without the correct origin and name url args, origin and name');
        return;
    }

    //var existing = window.top.framer.getClientByName(this.name);
    //if(existing !== null) {
    //    console.warn('There is already a client with the name, we are now replacing it', this.name);
    //    var indexOf = window.top.framer.clients.indexOf(existing);
    //    existing.destroy();
    //    window.top.framer.clients.splice(indexOf, 1);
    //    existing = undefined;
    //}

    this.handlers = [];

    this.listen();
    //window.top.framer.clients.push(this);
}

Client.prototype.send = function (type, data, target) {
    if (!isDefined(this.name) || !isDefined(this.origin)) {
        console.warn('Framer Client has no Manager to send', type, data);
        return;
    }
    var message = new FrameMessage(type, data, this.name, target, ClientMessage);
    //window.top.postMessage(message, this.origin);
    window.parent.postMessage(message, '*');
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

Client.prototype.receiveMessage = function (event) {
    //if(typeof window.top === 'undefined' || typeof window.top === 'null') {
    //    console.error('Client has a recieve message when window top is', typeof window.top);
    //}
    //
    //if (event &&
    //    event.origin &&
    //    event.origin !== window.top.document.location.origin) {
    //    return;
    //}

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
    //var existingIndex = window.top.framer.clients.indexOf(this);
    //window.top.framer.clients.splice(existingIndex, 1);
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
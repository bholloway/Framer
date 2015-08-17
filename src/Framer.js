window.framer = {
    managers: [],
    clients: [],
    Manager: Manager,
    Client: Client,
    getClientByName: getClientByName,
    domLog: domLog
};

var ClientMessage = 'client';
var ManagerMessage = 'manager';

function Frame(type, name, src, options) {
    this.type = type;
    this.name = name;
    this.src = src;
    this.options = options;
    this.frameElement = undefined;
}

function FrameMessage(type, data, origin, target, messenger) {
    this.type = type;
    this.data = data;
    this.origin = origin;
    this.target = target;
    this.messenger = messenger;
}

function getClientByName(name) {
    var result = window.framer.clients.filter(function (client) {
        return client.name === name;
    });
    if (result.length > 0) {
        result = result[0];
    } else {
        result = null;
    }

    return result;
}
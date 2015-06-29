window.framer = {
    Manager: Manager,
    Client: Client,
    domLog: domLog
};

var FramerClientMessengerType = 'frame-client';
var FramerMessengerType = 'framer';

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
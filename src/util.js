function closeFrameWindow(frame, callback) {
    setTimeout(function () {
        try {
            frame.frameElement.src = 'about:blank';
        }
        catch (ex) {
            // Do nothing
        }
        setTimeout(function () {
            frame.frameElement.parentNode.removeChild(frame.frameElement);
            frame.frameElement = undefined;
            callback.apply();
        }, 100);
    }, 0);
}

function createUrlArgs(args) {
    var argsList = [];
    var properties = Object.getOwnPropertyNames(args);

    properties.forEach(function propertyResolver(name) {
        var encodedArg = name + '=' + encodeURI(args[name]);
        argsList.push(encodedArg);
    });

    return argsList.join('&');
}

function mergeOptions(existing, custom) {
    if(!isDefined(existing)) existing = {};
    var keys = Object.getOwnPropertyNames(custom);
    keys.forEach(function (key) {
        existing[key] = custom[key];
    });
    return existing;
}

function filterKeyPropertyValue(collection, value, key, property, last) {
    var result = filterByKeyValue(collection, key, property, last);
    if(typeof result !== 'undefined' && typeof result[value] !== 'undefined') {
        return result[value];
    } else {
        return
    }
    return result[value];
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
    hash = hash || resolveHashSearch();
    var parameters = [];

    var segments = parseUris(hash);
    for (var name in segments) {
        parameters.push({
            name: name,
            data: segments[name]
        });
    }

    return parameters;
}

function resolveHashSearch() {
    if (document.location.search !== '') {
        return document.location.search;
    } else {
        var hash = document.location.hash;
        var strippedHash = hash.substring(hash.indexOf('?') + 1, hash.length);
        return strippedHash;
    }
}

function tryDecodeURIComponent(value) {
    try {
        return decodeURIComponent(value);
    } catch (error) {
        console.error('There was an issue parsing the uri segment, check your iframe src', error);
    }
}

function parseUris(keyValue) {
    keyValue = keyValue.replace(/^\?/, '');
    var segmentResults = {}, value, key;
    var segments = (keyValue || "").split('&');
    for (var i = 0; i < segments.length; i++) {
        var kValue = segments[i];
        if (kValue) {
            value = kValue.replace(/\+/g, '%20').split('=');
            key = tryDecodeURIComponent(value[0]);
            if (isDefined(key)) {
                var val = isDefined(value[1]) ? tryDecodeURIComponent(value[1]) : true;
                if (!hasOwnProperty.call(segmentResults, key)) {
                    segmentResults[key] = val;
                } else if (isArray(segmentResults[key])) {
                    segmentResults[key].push(val);
                } else {
                    segmentResults[key] = [segmentResults[key], val];
                }
            }
        }
    }
    return segmentResults;
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

function isDefined(value) {
    return typeof value !== 'undefined';
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
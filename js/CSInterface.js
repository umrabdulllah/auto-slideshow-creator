/**
 * CSInterface - Simplified version for Auto Slideshow Creator Extension
 * Based on Adobe's CEP CSInterface.js
 */

function CSInterface() {}

/**
 * Evaluates a JavaScript script, which can access the DOM of the host application.
 */
CSInterface.prototype.evalScript = function(script, callback) {
    if (callback === null || callback === undefined) {
        callback = function(result) {};
    }
    window.__adobe_cep__.evalScript(script, callback);
};

/**
 * Retrieves information about the host environment.
 */
CSInterface.prototype.getHostEnvironment = function() {
    var hostEnv = JSON.parse(window.__adobe_cep__.getHostEnvironment());
    return hostEnv;
};

/**
 * Gets the system path.
 */
CSInterface.SystemPath = {
    USER_DATA: "userData",
    COMMON_FILES: "commonFiles",
    MY_DOCUMENTS: "myDocuments",
    APPLICATION: "application",
    EXTENSION: "extension",
    HOST_APPLICATION: "hostApplication"
};

CSInterface.prototype.getSystemPath = function(pathType) {
    var path = decodeURI(window.__adobe_cep__.getSystemPath(pathType));
    var OSVersion = this.getOSInformation();
    if (OSVersion.indexOf("Windows") >= 0) {
        path = path.replace("file:///", "");
    } else if (OSVersion.indexOf("Mac") >= 0) {
        path = path.replace("file://", "");
    }
    return path;
};

/**
 * Gets OS information.
 */
CSInterface.prototype.getOSInformation = function() {
    var userAgent = navigator.userAgent;

    if (navigator.platform == "Win32" || navigator.platform == "Windows") {
        return "Windows";
    }

    var strOnMacOS = "Macintosh";
    if (userAgent.indexOf(strOnMacOS) >= 0) {
        return "Mac";
    }

    return "Unknown";
};

/**
 * Opens a page in the default browser.
 */
CSInterface.prototype.openURLInDefaultBrowser = function(url) {
    window.__adobe_cep__.openURLInDefaultBrowser(url);
};

/**
 * Gets the current API version of CSInterface.
 */
CSInterface.prototype.getCurrentApiVersion = function() {
    var apiVersion = JSON.parse(window.__adobe_cep__.getCurrentApiVersion());
    return apiVersion;
};

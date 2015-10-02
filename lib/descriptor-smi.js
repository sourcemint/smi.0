
exports.forLib = function (LIB) {
    
    var Descriptor = function (path) {
        var self = this;

        self._path = path;

        self._descriptor = LIB.util.readJsonAsync(self._path);
    }
    Descriptor.prototype.save = function () {
        var self = this;
        return self._descriptor.then(function (descriptor) {
            return LIB.fs.outputFileAsync(
                self._path,
                LIB.CJSON(descriptor, null, 4),
                "utf8"
            );
        });
    }
    Descriptor.prototype.getRootPath = function () {
        return LIB.path.dirname(this._path);
    }
    Descriptor.prototype.getSearchRules = function () {
        var self = this;
        return self._descriptor.then(function (descriptor) {
            LIB.assert(typeof descriptor['github.com~sourcemint~smi.0/config/0.1'], "object");
            LIB.assert(typeof descriptor['github.com~sourcemint~smi.0/config/0.1'].searchPaths, "object");
            return descriptor['github.com~sourcemint~smi.0/config/0.1'].searchPaths;
        });
    }
    Descriptor.prototype.getIgnoredSubmodules = function () {
        var self = this;
        return self._descriptor.then(function (descriptor) {
            LIB.assert(typeof descriptor['github.com~sourcemint~smi.0/config/0.1'], "object");
            LIB.assert(typeof descriptor['github.com~sourcemint~smi.0/config/0.1'].searchPaths, "object");
            return descriptor['github.com~sourcemint~smi.0/config/0.1'].ignoreSubmodules || [];
        });
    }
    Descriptor.prototype.getPackages = function (packages) {
        var self = this;
        return self._descriptor.then(function (descriptor) {
            if (
                !descriptor['github.com~sourcemint~smi.0/manifest/0.1'] ||
                !descriptor['github.com~sourcemint~smi.0/manifest/0.1'].packages
            ) return {};
            return descriptor['github.com~sourcemint~smi.0/manifest/0.1'].packages;
        });
    }
    Descriptor.prototype.setPackages = function (packages) {
        var self = this;
        return self._descriptor.then(function (descriptor) {
            if (!descriptor['github.com~sourcemint~smi.0/manifest/0.1']) {
                descriptor['github.com~sourcemint~smi.0/manifest/0.1'] = {};
            }
            descriptor['github.com~sourcemint~smi.0/manifest/0.1'].packages = packages;
            return self.save();
        });
    }
    Descriptor.prototype.getSubmodules = function () {
        var self = this;
        return self._descriptor.then(function (descriptor) {
            if (
                !descriptor['github.com~sourcemint~smi.0/manifest/0.1'] ||
                !descriptor['github.com~sourcemint~smi.0/manifest/0.1'].submodules
            ) return {};
            return descriptor['github.com~sourcemint~smi.0/manifest/0.1'].submodules;
        });
    }
    Descriptor.prototype.setSubmodules = function (submodules) {
        var self = this;
        return self._descriptor.then(function (descriptor) {
            if (!descriptor['github.com~sourcemint~smi.0/manifest/0.1']) {
                descriptor['github.com~sourcemint~smi.0/manifest/0.1'] = {};
            }
            descriptor['github.com~sourcemint~smi.0/manifest/0.1'].submodules = submodules;
            return self.save();
        });
    }

    return function (path) {
        return new Descriptor(path);
    };
}

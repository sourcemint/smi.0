
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
    Descriptor.prototype.setPackages = function (publishedPackages) {
        var self = this;
        return self._descriptor.then(function (descriptor) {

            descriptor['dependencies'] = {};
//            descriptor['mappings'] = {};
            Object.keys(publishedPackages).forEach(function (name) {
                var packageInfo = publishedPackages[name];
/*
                var largestMajorVersion = 0;
                Object.keys(packageInfo).forEach(function (majorVersion) {
                    if (parseInt(majorVersion) > largestMajorVersion) {
                        largestMajorVersion = parseInt(majorVersion);
                    }
                });
*/
                // If there is only one version we use an aliased dependency.
//                if (majorVersions.length === 1) {
                    descriptor['dependencies'][name] = packageInfo.latestVersion;
/*
                } else
                // Otherwise we declare multiple dependencies my mapping an archive URL
                // to a versioned alias.
                {
                    majorVersions.forEach(function (majorVersion) {
                        descriptor['mappings'][name + "~" + majorVersion] = packageInfo[majorVersion].archiveUrl;
                    });
                }
*/
            });

            return self.save();
        });
    }

    return function (path) {
        return new Descriptor(path);
    };
}

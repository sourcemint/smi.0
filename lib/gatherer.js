
exports.forLib = function (LIB) {
    
    var Gatherer = function (descriptor) {
        var self = this;
        
        self._descriptor = descriptor;
        
        self._publishedPackagesByName = {};

    }
    Gatherer.prototype.gatherPackages = function () {
        var self = this;

        var throat = require('throat')(LIB.Promise)(10);

        return self._descriptor.getPackages().then(function (packagesByPath) {

            return self._descriptor.getSubmodules().then(function (submodulesByPath) {

                return LIB.Promise.all(Object.keys(packagesByPath).map(function (path) {
    
                    var packageInfo = packagesByPath[path];
                    if (!packageInfo.latestVersion) return;
    
                    // We do not include the package if it is a submodule.
                    // Submodules must be handled differently as they are not published
                    // to the npm registry.
                    if (submodulesByPath[path]) return;

                    if (!self._publishedPackagesByName[packageInfo.name]) {
                        self._publishedPackagesByName[packageInfo.name] = {
                            "latestVersion": "0.0.0"
                        };
                    }

                    if (LIB.semver.gt(
                        packageInfo.latestVersion,
                        self._publishedPackagesByName[packageInfo.name].latestVersion
                    )) {
                        self._publishedPackagesByName[packageInfo.name].latestVersion = packageInfo.latestVersion;
                    }
/*
                    var majorVersion = packageInfo.version.split(".").shift();

                    if (!self._publishedPackagesByName[packageInfo.name][majorVersion]) {
                        self._publishedPackagesByName[packageInfo.name][majorVersion] = {
                            paths: [],
                            version: "0.0.0",
                            archiveUrl: null
                        };
                    }
                    if (LIB.semver.gt(
                        packageInfo.version,
                        self._publishedPackagesByName[packageInfo.name][majorVersion].version
                    )) {
                        self._publishedPackagesByName[packageInfo.name][majorVersion].version = packageInfo.version;
                        self._publishedPackagesByName[packageInfo.name][majorVersion].archiveUrl = packageInfo.archiveUrl;
                    }
                    self._publishedPackagesByName[packageInfo.name][majorVersion].paths.push([
                        path,
                        packageInfo.version
                    ]);
*/
                }));
            });
        });
    }
    Gatherer.prototype.getPublishedPackages = function () {
        return this._publishedPackagesByName;
    }

    return function (descriptor) {
        return new Gatherer(descriptor);
    };
}

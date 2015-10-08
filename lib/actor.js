
exports.forLib = function (LIB) {
    
    var Actor = function (descriptor) {
        var self = this;
        
        self._descriptor = descriptor;
    }
    Actor.prototype.checkoutSubmoduleBranches = function (currentSubmodules) {
        var self = this;

console.log("currentSubmodules", currentSubmodules);

        return self._descriptor.getSubmodules().then(function (submodulesByPath) {
            return LIB.Promise.all(Object.keys(submodulesByPath).map(function (path) {
                if (
                    currentSubmodules[path] &&
                    currentSubmodules[path].url === submodulesByPath[path].url
                ) {
                    if (currentSubmodules[path].ref !== submodulesByPath[path].ref) {
                        throw new Error("Cannot checkout branch '" + submodulesByPath[path].branch + "' for submodule '" + path + "' as commit does not match expected!");
                    }
                }
                if (currentSubmodules[path].branch === submodulesByPath[path].branch) {
                    // Branch already checked out
                    return;
                }

console.log("CHECKOUT", path, submodulesByPath[path].branch, currentSubmodules[path].branch);

            }));
        });
    }

    return function (descriptor) {
        return new Actor(descriptor);
    };
}


exports.forLib = function (LIB) {
    
    var Actor = function (descriptor) {
        var self = this;
        
        self._descriptor = descriptor;
    }
    Actor.prototype.checkoutSubmoduleBranches = function (currentSubmodules) {
        var self = this;

        return self._descriptor.getSubmodules().then(function (submodulesByPath) {
            
            var commands = [];
            
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
                commands = commands.concat([
    				'pushd "' + path.replace(/^\//, "") + '"',
    				'  git fetch origin',
    				'  git checkout ' + submodulesByPath[path].branch,
    				'  git pull origin ' + submodulesByPath[path].branch,
    				'popd'
                ]);
            })).then(function () {

                // TODO: Use pure nodejs solution for this.
        		return LIB.util.runCommands(commands, {
        		    cwd: self._descriptor.getRootPath(),
        		    progress: true
        		});
            });
        });
    }

    return function (descriptor) {
        return new Actor(descriptor);
    };
}


exports.forLib = function (LIB) {

    // TODO: Switch via command-line flag
    const VERBOSE = true;

    var Scanner = function (descriptor) {
        var self = this;
        
        self._descriptor = descriptor;

        self._packages = null;
        self._submodules = null;
    }

    Scanner.prototype.scanSubmodules = function () {
        var self = this;

        function findSubmodules () {
		    return self._descriptor.getIgnoredSubmodules().then(function (ignoredSubmodules) {
    		    return LIB.fs.readFileAsync(
    		        LIB.path.join(self._descriptor.getRootPath(), ".gitmodules"),
    		        "utf8"
    		    ).then(function (data) {
                    var submodules = {};
                    
                    function memoizeSubmodule () {
                        if (!currentSubmodule) return;
                        if (ignoredSubmodules.indexOf("/" + currentSubmodule.path) !== -1) return;
    					submodules["/" + currentSubmodule.path] = {
    						url: currentSubmodule.url
    					};
                    }
                    
    				var lines = data.split("\n");
    				var currentSubmodule = null;
    				for (var i=0, l=lines.length ; i<l ; i++) {
    					var m = lines[i].match(/^\[submodule "([^"]+)"\]$/);
    					if (m) {
    					    memoizeSubmodule();
    						currentSubmodule = {};
    					} else {
    						m = lines[i].match(/^\s*([\S]+)\s*=\s*([\S]+)\s*$/);
    						if (m) {
    							currentSubmodule[m[1]] = m[2];
    						}
    					}
    				}
				    memoizeSubmodule();
                    return submodules;
    		    });
		    });
		}
		
		function getSubmoduleStatus (submodules) {

    		var commands = Object.keys(submodules).map(function (path) {
    			return [
    				'echo "[repository]"',
    				'echo "' + path.replace(/^\//, "") + '"',
    				'pushd "' + path.replace(/^\//, "") + '"',
    				'echo "[repository.branch]"',
    				'git branch',
    				'echo "[repository.log]"',
    				'git log -n 1',
    				'popd'
    			].join(";");
    		});

		    // TODO: Use pure nodejs solution for this.
    		return LIB.util.runCommands(commands, {
    		    cwd: self._descriptor.getRootPath()
    		}).then(function (stdout) {
    			var current = {
    				path: null,
    				section: null
    			};
    			var lines = stdout.split("\n");
    			var m = null;
    			for (var i=0,l=lines.length ; i<l ; i++) {
    				// section boundaries
    				m = lines[i].match(/^\[repository(\.([^\]]+))?\]$/);
    				if (m) {
    					current.section = m[2] || "";
    					continue;
    				}
    				// section content
    				if (current.section === "") {
    					current.path = "/" + lines[i];
    					i += 1;
    					submodules[current.path].branch = null;
    				} else
    				if (current.section === "branch") {
    					m = lines[i].match(/^\* ((\(detached from )?([^\)]+)(\))?)/);
    					if (m) {
    						if (m[1] === m[3]) {
    							submodules[current.path].branch = m[1];
    						} else {
    							submodules[current.path].branch = false;
    						}
    					}
    				} else
    				if (current.section === "log") {
    					m = lines[i].match(/^commit (.+)$/);
    					if (m) {
    						submodules[current.path].ref = m[1];
    					}
    					m = lines[i].match(/^Date:\s*(.+)$/);
    					if (m) {
    						submodules[current.path].date = new Date(m[1]).getTime();
    					}
    				}
    			}
    			return submodules;
    		});
		}

        return findSubmodules().then(function (submodules) {

            return getSubmoduleStatus(submodules).then(function (submodules) {

                self._submodules = submodules;
                
            });
        }).then(function () {
            return self._submodules;
        });
    }

    Scanner.prototype.scan = function (existing) {
        var self = this;

        function findPackages (submodules) {
            return self._descriptor.getSearchRules().then(function (rules) {
                return LIB.Promise.all(rules.map(function (rule) {
                    var pattern = rule;
                    var options = {};
                    if (Array.isArray(pattern)) {
                        options = LIB._.clone(pattern[1]);
                        pattern = pattern[0];
                    }
                    options.nomount = true;
                    options.cwd = self._descriptor.getRootPath();
                    options.root = options.cwd;
                    return LIB.glob.globAsync(pattern, options);
                })).then(function (results) {
                    var paths = [];
                    results.forEach(function (results) {
                        paths = paths.concat(results.map(function (path) {
                            return LIB.path.dirname(path);
                        }));
                    });
                    return paths;
                }).then(function (paths) {
                    var packages = {};
                    return LIB.Promise.all(paths.map(function (path) {
                        var abspath = LIB.path.join(
                            self._descriptor.getRootPath(),
                            path,
                            "package.json"
                        );
                        return LIB.fs.readJsonAsync(abspath).catch(function (err) {
                            console.error("Error loading JSON descriptor file '" + abspath + "'");
                            throw err;
                        }).then(function (descriptor) {
                            packages[path] = {};
                            if (descriptor.name) {
                                packages[path].name = descriptor.name;
                            }
                            if (descriptor.version) {
                                packages[path].version = descriptor.version;
                            }
                        });
                    })).then(function () {
                        return packages;
                    });
                });
            });
        }

        function getPackageStatus (packages) {

            var latestVersionsByName = {};

            var throat = require('throat')(LIB.Promise)(10);

            return LIB.Promise.all(Object.keys(packages).map(
                function (path) {
                    return throat(function () {
                        var packageInfo = packages[path];
                        if (!packageInfo.name || !packageInfo.version) return;

                        var url = "https://registry.npmjs.org/" + packageInfo.name;

                        // Only lookup if we don't have any existing info to avoid clobbering registry all the time
                        if (
                            existing.packages &&
                            existing.packages[path] &&
                            typeof existing.packages[path].latestVersion !== "undefined"
                            // TODO: Add option to lookup again
                        ) {
                            packages[path].latestVersion = existing.packages[path].latestVersion;
                            latestVersionsByName[packageInfo.name] = existing.packages[path].latestVersion;
                            return;
                        }

                        // Use cache if we can as multiple paths may reference the same package
                        if (latestVersionsByName[packageInfo.name]) {
                            packages[path].latestVersion = latestVersionsByName[packageInfo.name];
                            return;
                        }

                        if (VERBOSE) console.log("Lookup:", url);

                        return LIB.request.getAsync(url).spread(function (response, body) {
                            if (response.statusCode !== 200) {
                                packages[path].latestVersion = "";
                                return;
                            }
                            var descriptor = JSON.parse(body);

                            packages[path].latestVersion = descriptor['dist-tags']['latest'];
                            latestVersionsByName[packageInfo.name] = descriptor['dist-tags']['latest'];
                            return;
                        });
/*
                        var url = "http://registry.npmjs.org/" + packageInfo.name + "/-/" + packageInfo.name + "-" + packageInfo.version + ".tgz";
                        // Only lookup if we don't have any existing info to avoid clobbering registry all the time
                        if (
                            existing.packages &&
                            existing.packages[path] &&
                            typeof existing.packages[path].archiveUrl !== "undefined"
                            // TODO: Add option to lookup again
                        ) {
                            packages[path].archiveUrl = existing.packages[path].archiveUrl;
                            return;
                        }

                        if (VERBOSE) console.log("Lookup:", url);

                        return LIB.request.headAsync(url).spread(function (response) {
                            if (response.statusCode !== 200) {
                                packages[path].archiveUrl = "";
                                return;
                            }
                            packages[path].archiveUrl = url;
                        });
*/
                    });
                }
            )).then(function() {
                return packages;
            });
        }

        return self.scanSubmodules().then(function (submodules) {

            return findPackages(submodules).then(function (packages) {
    
                return getPackageStatus(packages).then(function (packages) {
    
                    self._packages = packages

                });
            });
        });
    }
    Scanner.prototype.getPackages = function () {
        return this._packages;
    }
    Scanner.prototype.getSubmodules = function () {
        return this._submodules;
    }

    return function (descriptor) {
        return new Scanner(descriptor);
    };
}

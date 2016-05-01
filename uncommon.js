// A library which attempts prove that module loading in the browser can be simple.
(function() {

	// contains all the cached uncommon modules.
	var cachedModules = [];

	// contains all the non cached uncommon modules.
  var cachedNonModules = [];

	/**
	 * @summary Performs lazy-loading and returns the exported value of the supplied module name.
	 * @param module - The name of the module to load.
	 * @param nonUncommonExportName - This contains the name of the value to export.
	 *																This parameter must only be used for non-uncommon modules.
	 *																The export object must be attached to the window object.
	 */
	var require = function(module, nonUncommonExportName) {
		if(isStringInvalid(module)) return undefined;
		if(module.substring(module.length - 3) === ".js") throw "Unable to load the module, because the module name must not end with .js";
		var path = module + ".js";
		return _loadModule(path, nonUncommonExportName);
	};

	/**
	 * @summary The core function of the library - performs the actual lazy-laoding and generates the export value of the supplied module path.
   * @param path - The path of the module to load.
	 * @param  nonUncommonExportName - This contains the name of the value to export.
 	 *																This parameter must only be used for non-uncommon modules.
 	 *																The export object must be attached to the window object.
 	 */
	var _loadModule = function(path, nonUncommonExportName) {
		if(isStringInvalid(path)) return undefined;

		// determines if the module to load is a non-uncommon module
		var isNonUncommonModule = !isStringInvalid(nonUncommonExportName);

		// once the module is loaded, the module will be stored in this array
		var cacheArray = isNonUncommonModule ? cachedNonModules : cachedModules;

		// checks if the module is cached, then the cached module exports will be returned
		var cachedModule = isCached(cacheArray, path);
		if(cachedModule.result) return cachedModule.exports;

		// retrieves the module file contents
		var ajaxResult = ajaxRequest(path);
		var exports = {};

		if(ajaxResult.isSuccessful) {

			var module = new Module(path);
			module.exports = {};

			// premtively adds the module to the cache
	    addToCache(cacheArray, module);

			// wraps the module source code in an Immediately-Invoked Function Expression (IIFE), which will allow the module to access with the require function and/or exports object
			var evalFunction = eval("(function(require" + (isNonUncommonModule ?  "" : ", exports") + ") { " + ajaxResult.response + " });");
			var errorDetected = true;
			try {
				// creates the parameters for the IIFE
				var parameters = isNonUncommonModule ? [require] : [require, exports];

				// loads the module
				evalFunction.apply(this, parameters);

				// assigns the non-uncommon module export to the exports object.
				if(isNonUncommonModule) exports[nonUncommonExportName] = window[nonUncommonExportName];

				module.exports = exports;
				errorDetected = false;
			}
			finally {
				if(errorDetected) {
					// if an error is detected during the loading of the module, the module will be removed from the cache
					removeFromCache(cacheArray, module);
					throw "Unable to load " + path + ".";
				}
			}
		}

		return exports;
	};

	/**
	 * @summary Performs an AJAX request in a synchronus manner.
	 * @param path - The path of the text data to retrieve.
	 */
	var ajaxRequest = function(path) {
		var ajax = new XMLHttpRequest();
		ajax.open("GET", path, false);
		ajax.setRequestHeader("Content-Type", "text/plain");
		ajax.send(null);

		return {
			isSuccessful : ajax.readyState === 4,
			response: ajax.responseText
		}
	};

	/**
	 * @summary Adds a module to an array of cached modules.
	 * @param cacheArray - The array of modules, to which the new module will be added to.
	 * @param module - The new module to cache.
	 */
	var addToCache = function(cacheArray, module) {
		module.id = cacheArray.length + 1;
		cacheArray.push(module);
	};

	/**
	 * @summary Removes a module from an array of cached modules.
	 * @param cacheArray - The array of modules, from which the supplied module will be removed.
	 * @param module - The module to remove from cache.
	 */
	var removeFromCache = function(cacheArray, module) {
		var itemIndex = cacheArray.indexOf(module);
		cacheArray.splice(itemIndex, 1);
	}

  /**
	 * @summary Checks if a module with the same path value has been cached.
	 *					Returns a boolean value which indicates if the module is cached, and the cached modules exports.
	 * @param cacheArray - The array of module to check.
	 * @param path - The path of the module to load.
	 */
	var isCached = function(cacheArray, path) {
		var result = false;
		var exports = null;
		cacheArray.forEach(function(item) {
			if(item.path === path) {
				result = true;
				exports = item.exports;
			}
		});
		return {
			result: result,
			exports: exports
		};
	};

	/**
	 * @summary Checks if the supplied value is not a valid string value.
	 * @param value - The value to evaluate.
	 */
	var isStringInvalid = function(value) {
		if(typeof value !== "string") return true;
		return value === null || value === undefined || value === "";
	};

	/**
	 * @summary The object which is used to represent a loaded module.
	 * @param path - The path of the module.
	 */
	function Module(path) {
	 	this.path = path;
		this.exports = null;
		this.id = 0;
	};

	window.require = require;
})();

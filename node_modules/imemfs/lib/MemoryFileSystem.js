/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
    Edited by: Cryogena @cryogena npmjs.org/~cryogena
*/
var normalize = require("./normalize");
var errors = require("errno");
var stream = require("readable-stream");
var ReadableStream = stream.Readable;
var WritableStream = stream.Writable;
function isDir(item) {
    if (typeof item !== "object") {
        return false;
    }
    return item[""] !== undefined;
}
function isFile(item) {
    if (typeof item !== "object") {
        return false;
    }
    return item[""] === undefined;
}
function isMount(item) {
    if (typeof item !== "object") {
        return false;
    }
    return item["/"] !== undefined;
}
function pathToArray(path) {
    path = normalize(path);
    var nix = /^\//.test(path);
    if (!nix) {
        if (!/^[A-Za-z]:/.test(path)) {
            throw new MemoryFileSystemError(errors.code.EINVAL, path);
        }
        path = path.replace(/[\\\/]+/g, "\\");
        path = path.split(/[\\\/]/);
        path[0] = path[0].toUpperCase();
    }
    else {
        path = path.replace(/\/+/g, "/");
        path = path.substr(1).split("/");
    }
    if (!path[path.length - 1]) {
        path.pop();
    }
    return path;
}
function trueFn() {
    return true;
}
function falseFn() {
    return false;
}
function MemoryFileSystemError(err, path) {
    throw new Error(err + " : " + path);
    Error.call(this)
    if (Error.captureStackTrace) {
        Error.captureStackTrace(this, arguments.callee);
    }
    this.code = err.code;
    this.errno = err.errno;
    this.message = err.description;
    this.path = path;
}
function MemoryFileSystem(data) {
    this.data = data || {};
    this.data[""] = true;
    this.data["/"] = {
        isMount: false,
        mounts: {},
        symlinks: {}
    };
}
module.exports = MemoryFileSystem;
MemoryFileSystem.prototype.symlink = function (source, target) {                         // Creates a symbolic link
    try {
        this.writeFileSync(target, this.meta(source), "meta");
    }
    catch (e) {
        throw new MemoryFileSystemError("Cannot create symlink " + target + " from " + source);
    }
    this.data["/"].symlinks[target] = source;
}
MemoryFileSystem.prototype.desymlink = function (target) {                               // Removes a symbolic link
    if (this.data["/"].symlinks[target] === undefined) {
        throw new MemoryFileSystemError("Target not a symLink!");
    }
    delete this.data["/"].symlinks[target];
    this.rmdirSync(target);
}
MemoryFileSystem.prototype.mount = function (fs, path) {                                 // Mounts another FileSystem object
    try {
        this.writeFileSync(path, fs.data, "meta");
    }
    catch (e) {
        throw new MemoryFileSystemError("Cannot mount " + path + " error: " + e.message);
    }
    fs.data["/"].isMount = true;
    this.data["/"].mounts[path] = fs;
}
MemoryFileSystem.prototype.unmount = function (path) {                                   // Unmounts a FileSystem mount point
    if (this.data["/"].mounts[path] !== undefined) {
        var ff = this.data["/"].mounts[path];
        ff.data["/"].isMount = false;
        delete this.data["/"].mounts[path];
        this.rmdirSync(path);
    }
    else {
        throw new MemoryFileSystemError("Path not a mount point!");
    }
}
MemoryFileSystem.prototype.meta = function (_path) {                                     // Returns the raw object of a file/folder
    var path = pathToArray(_path);
    var current = this.data;
    if (path.length === 0) {
        return current;
    }
    for (var i = 0; i < path.length - 1; i++) {
        if (!isDir(current[path[i]])) {
            return;
        }
        current = current[path[i]];
    }
    return current[path[i]];
}
MemoryFileSystem.prototype.existsSync = function (_path) {                               // Checks if file/folder exists
    return !!this.meta(_path);
}
MemoryFileSystem.prototype.statSync = function (_path) {                                 // Returns stats on a path
    var current = this.meta(_path);
    if (_path === "/" || isDir(current)) {
        return {
            isFile: falseFn,
            isDirectory: trueFn,
            isBlockDevice: falseFn,
            isCharacterDevice: falseFn,
            isSymbolicLink: falseFn,
            isFIFO: falseFn,
            isSocket: falseFn
        };
    }
    else if (isFile(current)) {
        return {
            isFile: trueFn,
            isDirectory: falseFn,
            isBlockDevice: falseFn,
            isCharacterDevice: falseFn,
            isSymbolicLink: falseFn,
            isFIFO: falseFn,
            isSocket: falseFn
        };
    }
    else {
        throw new MemoryFileSystemError(errors.code.ENOENT, _path);
    }
};
MemoryFileSystem.prototype._export = function () {                                       // Exports the FileSystem in base64
    var syms = this.data["/"].symlinks;
    var sym_names = Object.keys(syms);
    for (var i = 0; i < sym_names.length; i++) {
        var name = sym_names[i];
        this.rmdirSync(name, true);
        this.writeFileSync(name, "$symlink$");
    }
    var mounts = this.data["/"].mounts;
    var nmounts = Object.keys(mounts);
    for (var i = 0; i < nmounts.length; i++) {
        var mp = nmounts[i];
        this.unmount(mp);
    }
    return new Buffer(JSON.stringify(this.data)).toString("base64");
};
MemoryFileSystem.prototype._import = function (b64_fs) {                                 // Imports a bse64 encoded FileSystem
    this.data = JSON.parse(new Buffer(b64_fs, "base64").toString(), true);
    var syms = this.data["/"].symlinks;
    var nsyms = Object.keys(syms);
    for (var i = 0; i < nsyms.length; i++) {
        var target = nsyms[i];
        var source = syms[target];
        this.unlinkSync(target, true);
        this.symlink(source, target);
    }
};
MemoryFileSystem.prototype.readFileSync = function (_path, encoding) {                   // Reads a file
    var path = pathToArray(_path);
    var current = this.data;
    for (var i = 0; i < path.length - 1; i++) {
        if (!isDir(current[path[i]])) {
            throw new MemoryFileSystemError(errors.code.ENOENT, _path);
        }
        current = current[path[i]];
    }
    current = current[path[i]];
    current = new Buffer.from(current, "base64");
    console.log(current);
    if (!isFile(current)) {
        if (isDir(current)) {
            throw new MemoryFileSystemError(errors.code.EISDIR, _path);
        }
        else {
            throw new MemoryFileSystemError(errors.code.ENOENT, _path);
        }
    }
    return encoding ? current.toString(encoding) : current;
};
MemoryFileSystem.prototype.readdirSync = function (_path) {                              // Reads a directory listing
    if (_path === "/") {
        return Object.keys(this.data).filter(Boolean);
    }
    var path = pathToArray(_path);
    var current = this.data;
    for (var i = 0; i < path.length - 1; i++) {
        if (!isDir(current[path[i]])) {
            throw new MemoryFileSystemError(errors.code.ENOENT, _path);
        }
        current = current[path[i]];
    }
    if (!isDir(current[path[i]])) {
        if (isFile(current[path[i]])) {
            throw new MemoryFileSystemError(errors.code.ENOTDIR, _path);
        }
        else {
            throw new MemoryFileSystemError(errors.code.ENOENT, _path);
        }
    }
    return Object.keys(current[path[i]]).filter(Boolean);
};
MemoryFileSystem.prototype.mkdirpSync = function (_path) {                               // Cretes directory and all parent directories
    var path = pathToArray(_path);
    if (path.length === 0) {
        return;
    }
    var current = this.data;
    for (var i = 0; i < path.length; i++) {
        if (isFile(current[path[i]])) {
            throw new MemoryFileSystemError(errors.code.ENOTDIR, _path);
        }
        else if (!isDir(current[path[i]])) {
            current[path[i]] = {
                "": true
            };
        }
        current = current[path[i]];
    }
    return;
};
MemoryFileSystem.prototype.mkdirSync = function (_path) {                                // Create a directory if parent directory exists
    var path = pathToArray(_path);
    if (path.length === 0) {
        return;
    }
    var current = this.data;
    for (var i = 0; i < path.length - 1; i++) {
        if (!isDir(current[path[i]])) {
            throw new MemoryFileSystemError(errors.code.ENOENT, _path);
        }
        current = current[path[i]];
    }
    if (isDir(current[path[i]])) {
        throw new MemoryFileSystemError(errors.code.EEXIST, _path);
    }
    else if (isFile(current[path[i]])) {
        throw new MemoryFileSystemError(errors.code.ENOTDIR, _path);
    }
    current[path[i]] = {
        "": true
    };
    return;
};
MemoryFileSystem.prototype._remove = function (_path, name, testFn, override = false) {  // Main removal command for file/folder/symbolic links/mounts
    var path = pathToArray(_path);
    if (path.length === 0) {
        throw new MemoryFileSystemError(errors.code.EPERM, _path);
    }
    var current = this.data;
    for (var i = 0; i < path.length - 1; i++) {
        if (!isDir(current[path[i]])) {
            throw new MemoryFileSystemError(errors.code.ENOENT, _path);
        }
        current = current[path[i]];
    }
    if (!testFn(current[path[i]])) {
        if (!override) {
            if (this.data["/"].symlinks[_path] !== undefined || this.data["/"].mounts[_path] !== undefined) {
                throw new MemoryFileSystemError(errors.code.ENOENT, _path);
            }
        }
    }
    delete current[path[i]];
    return;
};
MemoryFileSystem.prototype.rmdirSync = function (_path, override = false) {              // Removes a directory
    return this._remove(_path, "Directory", isDir, override);
};
MemoryFileSystem.prototype.unlinkSync = function (_path, override = false) {             // Removes a file
    return this._remove(_path, "File", isFile, override);
};
MemoryFileSystem.prototype.writeFileSync = function (_path, content, encoding) {         // Creates and/or Writes a file
    if (!content && !encoding) {
        throw new MemoryFileSystemError("No content");
    }
    var path = pathToArray(_path);
    if (path.length === 0) {
        throw new MemoryFileSystemError(errors.code.EISDIR, _path);
    }
    var current = this.data;
    for (var i = 0; i < path.length - 1; i++) {
        if (!isDir(current[path[i]])) {
            throw new MemoryFileSystemError(errors.code.ENOENT, _path);
        }
        current = current[path[i]];
    }
    if (isDir(current[path[i]])) {
        throw new MemoryFileSystemError(errors.code.EISDIR, _path);
    }
    if (encoding === "meta") {
        current[path[i]] = content;
    }
    else {
        current[path[i]] = encoding || typeof content === "string" ? new Buffer(content, encoding) : content;
        current[path[i]] = current[path[i]].toString("base64");
    }
    return;
};
MemoryFileSystem.prototype.join = require("./join");
MemoryFileSystem.prototype.pathToArray = pathToArray;
MemoryFileSystem.prototype.normalize = normalize;
MemoryFileSystem.prototype.createReadStream = function (path, options) {
    var stream = new ReadableStream();
    var done = false;
    var data;
    try {
        data = this.readFileSync(path);
    }
    catch (e) {
        stream._read = function () {
            if (done) {
                return;
            }
            done = true;
            this.emit('error', e);
            this.push(null);
        };
        return stream;
    }
    options = options || {};
    options.start = options.start || 0;
    options.end = options.end || data.length;
    stream._read = function () {
        if (done) {
            return;
        }
        done = true;
        this.push(data.slice(options.start, options.end));
        this.push(null);
    };
    return stream;
};
MemoryFileSystem.prototype.createWriteStream = function (path, options) {
    var stream = new WritableStream(),
        self = this;
    try {
        this.writeFileSync(path, new Buffer(0));
    }
    catch (e) {
        stream.once('prefinish', function () {
            stream.emit('error', e);
        });
        return stream;
    }
    var bl = [],
        len = 0;
    stream._write = function (chunk, encoding, callback) {
        bl.push(chunk);
        len += chunk.length;
        self.writeFile(path, Buffer.concat(bl, len), callback);
    };
    return stream;
};
["stat", "readdir", "mkdirp", "rmdir", "unlink"].forEach(function (fn) {
    MemoryFileSystem.prototype[fn] = function (path, callback) {
        try {
            var result = this[fn + "Sync"](path);
        }
        catch (e) {
            setImmediate(function () {
                callback(e);
            });
            return;
        }
        setImmediate(function () {
            callback(null, result);
        });
    };
});
["mkdir", "readFile"].forEach(function (fn) {
    MemoryFileSystem.prototype[fn] = function (path, optArg, callback) {
        if (!callback) {
            callback = optArg;
            optArg = undefined;
        }
        try {
            var result = this[fn + "Sync"](path, optArg);
        }
        catch (e) {
            setImmediate(function () {
                callback(e);
            });
            return;
        }
        setImmediate(function () {
            callback(null, result);
        });
    };
});
MemoryFileSystem.prototype.exists = function (path, callback) {
    return callback(this.existsSync(path));
}
MemoryFileSystem.prototype.writeFile = function (path, content, encoding, callback) {
    if (!callback) {
        callback = encoding;
        encoding = undefined;
    }
    try {
        this.writeFileSync(path, content, encoding);
    }
    catch (e) {
        return callback(e);
    }
    return callback();
};
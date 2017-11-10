# imemfs, modified and improved from, memory-fs

Modified an improved filesystem, original https://npmjs.org/memory-fs

Added:

    * Symbolic links
    * FileSystem mounting ^1
    * FileSystem exporting in base64
    * Filesystem importing of base64 encoded imemfs filesystem

Removed:

    * aSync versions of commands (will return soon)

Changed:

    * rmdirSync & unlinkSync can now override mount/symlink protection with `override` parameter set to `true`
    * writeFileSync has optional encoding of `meta` for support of importing imemfs folder objects (used for mounts and symlinks)

```javascript
var imemfs=require("imemfs");
var fs=new imemfs();

fs.symlink(source, target);                 //* Creates a symbolic link
// fs.symlink("/folder_from","/path/to/new/folder"); - /path/to/new/folder/lets_go = /folder_from/lets_go
fs.desymlink(target);                       //* Removes a symbolic link
fs.mount(fs, path);                         //* Mounts another FileSystem object
fs.unmount(path);                           //* Unmounts a FileSystem mount point
fs.meta(_path);                             //~ Returns the raw object of a file/folder
fs.existsSync(_path);                       // Checks if file/folder exists
fs.statSync(_path);                         //- Returns stats on a path
fs._export();                               //* Exports the FileSystem in base64
fs._import(b64_fs);                         //* Imports a base64 encoded FileSystem
fs.readFileSync(_path, encoding);           // Reads a file
fs.readdirSync(_path);                      // Reads a directory listing
fs.mkdirpSync(_path);                       // Cretes directory and all parent directories
fs.mkdirSync(_path);                        // Create a directory if parent directory exists
fs.rmdirSync(_path, override = false);      //~ Removes a directory
fs.unlinkSync(_path, override = false);     //~ Removes a file
fs.writeFileSync(_path, content, encoding); //~ Creates and/or Writes a file

* New methods created by me
~ Modified from original method
- Soon to be removed/redesigned method
```

^1 Other imemfs filesystems supported only

## License

Copyright (c) 2012-2014 Tobias Koppers

MIT (http://www.opensource.org/licenses/mit-license.php)
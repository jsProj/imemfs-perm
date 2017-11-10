imemfsPerm=(function(fs){
    this.fs=fs;
    this.users={
        root:{
            groups:["root"]
        }
    };
    this.groups={
        root:0
    };
    this.files={};
    this.folders={};
});
module.exports=imemfsPerm;

convert=(function(fs,ops){
    ops=ops||{
        cpath:"/",
        files:[],
        folders:[]
    };
    var ff=fs.readdirSync(ops.cpath);
    for(var i=0;i<ff.length;i++){
        if(ff[i]!==""&&ff[i].replace(/\//gim,"")!===ff[i]){
            var ops2=JSON.parse(JSON.stringify(ops),true);
            ops2.cpath+ff[i]+"/";
            var srch=convert(fs,ops2);
            ops.files=srch.files;
            ops.folders=srch.folders;
        }
    }
    return {
        folders:ops.folders,
        files:ops.files
    };
});

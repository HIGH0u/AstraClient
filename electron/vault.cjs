const fs=require('node:fs');
const path=require('node:path');
function createVault(file,safeStorage,io=fs) {
  function available() {return safeStorage.isEncryptionAvailable() && (!safeStorage.getSelectedStorageBackend || safeStorage.getSelectedStorageBackend()!=='basic_text');}
  return {
    available,
    read() {if(!fs.existsSync(file))return null;if(!available())throw new Error('Secure storage unavailable');return safeStorage.decryptString(fs.readFileSync(file));},
    write(token) {
      if(!available())throw new Error('Secure storage unavailable');
      const encrypted=safeStorage.encryptString(token),temp=file+'.tmp';
      io.mkdirSync(path.dirname(file),{recursive:true});
      try{
        io.writeFileSync(temp,encrypted,{mode:0o600});
        try{io.renameSync(temp,file);}catch(error){
          if(error.code!=='EXDEV')throw error;
          // Some redirected/encrypted Windows folders reject same-folder rename.
          // The fallback writes ciphertext only; it is not an atomic replacement.
          io.copyFileSync(temp,file);
          if(!io.readFileSync(file).equals(encrypted))throw new Error('Encrypted session verification failed');
        }
      }finally{io.rmSync(temp,{force:true});}
    },
    clear() {fs.rmSync(file,{force:true});fs.rmSync(file+'.tmp',{force:true});}
  };
}
module.exports={createVault};

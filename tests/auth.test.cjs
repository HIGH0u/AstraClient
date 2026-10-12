const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {readCallback,validState,safeError,complete}=require('../electron/auth.cjs');
const {createVault}=require('../electron/vault.cjs');
const redirect='https://login.live.com/oauth20_desktop.srf';
test('rejects forged callback origins and prefix paths',()=>{
  assert.equal(readCallback('https://login.live.com.evil.test/oauth20_desktop.srf?code=x&state=s',redirect,'s'),null);
  assert.equal(readCallback(redirect+'/evil?code=x&state=s',redirect,'s'),null);
  assert.throws(()=>readCallback(redirect+'?code=x&state=wrong',redirect,'s'),{code:'STATE'});
  assert.throws(()=>readCallback(redirect+'?code=x',redirect,'s'),{code:'STATE'});
  assert.equal(validState('é','a'),false);
  assert.equal(readCallback(redirect+'?code=valid&state=s',redirect,'s'),'valid');
});
test('handles consent denial without treating it as success',()=>{
  assert.throws(()=>readCallback(redirect+'?error=access_denied&state=s',redirect,'s'),{code:'DENIED'});
});
const xbox={xblToken:{Token:'test-xbl'},save:()=> 'test-refresh'};
function responses(profile,status=200){let i=0;return async()=>{
  const data=[{Token:'test-xsts',DisplayClaims:{xui:[{uhs:'test-uhs'}]}},{access_token:'opaque-token-without-jwt-segments',expires_in:3600},profile][i++];
  return {ok:i<3||status===200,status:i<3?200:status,json:async()=>data};
};}
test('rejects demo and absent Minecraft profiles',async()=>{
  await assert.rejects(complete(xbox,{fetch:responses({demo:true,id:'x',name:'x'})}),{code:'NO_LICENSE'});
  await assert.rejects(complete(xbox,{fetch:responses({})}),{code:'NO_LICENSE'});
  await assert.rejects(complete(xbox,{fetch:responses({error:'NOT_FOUND'},404)}),{code:'NO_LICENSE'});
});
test('completes valid login with an opaque Minecraft token',async()=>{
  const result=await complete(xbox,{fetch:responses({id:'a'.repeat(32),name:'TestPlayer'})});
  assert.equal(result.profile.name,'TestPlayer');assert.equal(result.accessToken,'opaque-token-without-jwt-segments');
  assert.equal(result.refreshToken,'test-refresh');assert.ok(result.expiresAt>Date.now());
});
test('reports post-Microsoft network failure without secrets',async()=>{
  await assert.rejects(complete(xbox,{fetch:async()=>{throw Error('SECRET');}}),error=>error.code==='NETWORK'&&!error.message.includes('SECRET')&&error.message.includes('Xbox'));
});
test('unexpected provider errors do not disclose secret material',()=>{
  const result=safeError(new Error('access_token=SUPER_SECRET'));
  assert.equal(JSON.stringify(result).includes('SUPER_SECRET'),false);
});
test('vault refuses plaintext fallback and deletes saved credentials',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'astra-test-'));const file=path.join(dir,'session.enc');
  try{
    const denied=createVault(file,{isEncryptionAvailable:()=>false});
    assert.throws(()=>denied.write('secret'));assert.equal(fs.existsSync(file),false);
    const fallback=createVault(file,{isEncryptionAvailable:()=>true,getSelectedStorageBackend:()=> 'basic_text'});
    assert.throws(()=>fallback.write('secret'));
    const vault=createVault(file,{isEncryptionAvailable:()=>true,encryptString:()=>Buffer.from('ENCRYPTED'),decryptString:()=> 'secret'});
    vault.write('secret');assert.equal(fs.readFileSync(file,'utf8'),'ENCRYPTED');assert.equal(vault.read(),'secret');vault.clear();assert.equal(vault.read(),null);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('vault persists ciphertext when Windows refuses rename with EXDEV',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'astra-vault-'));
  const file=path.join(dir,'nested','session.enc');
  const io={...fs,renameSync:()=>{throw Object.assign(new Error('redirected folder'),{code:'EXDEV'});}};
  try{
    const vault=createVault(file,{isEncryptionAvailable:()=>true,encryptString:()=>Buffer.from('CIPHERTEXT'),decryptString:()=> 'secret'},io);
    vault.write('secret');assert.equal(fs.readFileSync(file,'utf8'),'CIPHERTEXT');
    assert.equal(vault.read(),'secret');assert.equal(fs.existsSync(file+'.tmp'),false);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

const crypto = require('node:crypto');
const {Auth,lexicon} = require('msmc');
class AuthError extends Error { constructor(code,message) {super(message);this.code=code;} }
function validState(actual,expected) {
  if(typeof actual!=='string') return false;
  const a=Buffer.from(actual),b=Buffer.from(expected);
  return a.length===b.length && crypto.timingSafeEqual(a,b);
}
function readCallback(raw,redirect,state) {
  let url; try {url=new URL(raw);} catch {return null;}
  const target=new URL(redirect);
  if(url.origin!==target.origin || url.pathname!==target.pathname) return null;
  if(!validState(url.searchParams.get('state'),state)) throw new AuthError('STATE','Microsoft’s sign-in response could not be verified. Please try again.');
  if(url.searchParams.has('error')) throw new AuthError('DENIED','Sign-in was not completed. You can try again whenever you’re ready.');
  const code=url.searchParams.get('code');
  if(!code) throw new AuthError('CODE','Microsoft did not return a sign-in response. Please try again.');
  return code;
}
function safeError(error) {
  if(error instanceof AuthError) return {code:error.code,message:error.message};
  const wrapped=lexicon.wrapError(error);
  const stage=String(wrapped?.name || '');
  const status=error?.response?.status || wrapped?.opt?.response?.status;
  if(status===403 && stage.includes('minecraft')) return {code:'APP_REJECTED',message:'Minecraft declined this sign-in method. The authentication configuration may need updating.'};
  if(stage.includes('child')) return {code:'FAMILY',message:'This Xbox account needs its family settings completed before signing in.'};
  if(stage.includes('userNotFound')) return {code:'XBOX_PROFILE',message:'Create an Xbox profile for this Microsoft account, then try again.'};
  if(stage.includes('profile')) return {code:'PROFILE',message:'Could not find your Minecraft Java profile. Check that this Microsoft account owns Java Edition.'};
  return {code:'AUTH_FAILED',message:`${stage.includes('xbox')||stage.includes('xsts')?'Xbox':stage.includes('minecraft')?'Minecraft':'Microsoft'} could not complete sign-in${status?` (HTTP ${status})`:''}. Check your connection and try again.`};
}
function manager(progress) {
  const auth=new Auth('select_account');
  auth.on('load',(stage)=>progress(String(stage).includes('minecraft')?'Checking your Minecraft profile…':String(stage).includes('xbox')||String(stage).includes('xsts')?'Connecting to Xbox…':'Verifying with Microsoft…'));
  return auth;
}
async function complete(xbox,{fetch:request=globalThis.fetch,progress=()=>{}}={}) {
  // Treat Minecraft access tokens as opaque. MSMC's Minecraft constructor tries
  // to decode a JWT and can throw after successful upstream authentication.
  async function json(url,options,stage){
    let response;
    try{response=await request(url,{...options,signal:AbortSignal.timeout(25000)});}
    catch{throw new AuthError('NETWORK',`Microsoft sign-in finished, but ${stage} could not be reached. Please retry.`);}
    let data;try{data=await response.json();}catch{throw new AuthError('RESPONSE',`${stage} returned an unreadable response. Please retry.`);}
    if(data.XErr)throw new AuthError('XBOX',data.XErr===2148916233?'Microsoft sign-in finished. Create an Xbox profile for this account, then retry.':data.XErr===2148916238?'Microsoft sign-in finished. This Xbox account needs its family settings completed.':`Microsoft sign-in finished, but Xbox declined access (code ${Number(data.XErr)}).`);
    if(!response.ok){
      if(stage==='Minecraft profile'&&response.status===404)throw new AuthError('NO_LICENSE','Microsoft sign-in finished, but no Minecraft Java profile was found. Use the account that owns Java Edition and has a Java username.');
      throw new AuthError('PROVIDER',`Microsoft sign-in finished, but ${stage} declined the request (HTTP ${response.status}). Please retry.`);
    }
    return data;
  }
  const post=body=>({method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(body)});
  progress('Connecting to Xbox…');
  const xsts=await json('https://xsts.auth.xboxlive.com/xsts/authorize',post({Properties:{SandboxId:'RETAIL',UserTokens:[xbox.xblToken.Token]},RelyingParty:'rp://api.minecraftservices.com/',TokenType:'JWT'}),'Xbox');
  if(!xsts.Token||!xsts.DisplayClaims?.xui?.[0]?.uhs)throw new AuthError('XBOX_RESPONSE','Xbox did not return a usable sign-in response. Please retry.');
  progress('Verifying Minecraft access…');
  const mc=await json('https://api.minecraftservices.com/authentication/login_with_xbox',post({identityToken:`XBL3.0 x=${xsts.DisplayClaims.xui[0].uhs};${xsts.Token}`}), 'Minecraft');
  if(typeof mc.access_token!=='string'||!mc.access_token)throw new AuthError('TOKEN','Minecraft did not return an access token. Please retry.');
  progress('Checking your Minecraft profile…');
  const profile=await json('https://api.minecraftservices.com/minecraft/profile',{headers:{Authorization:`Bearer ${mc.access_token}`}},'Minecraft profile');
  if(profile.demo||!/^[a-f0-9]{32}$/i.test(profile.id)||typeof profile.name!=='string'||!profile.name)throw new AuthError('NO_LICENSE','This account does not have a complete Minecraft Java profile. Sign in with the account that owns Java Edition.');
  const refreshToken=xbox.save();
  if(typeof refreshToken!=='string'||!refreshToken)throw new AuthError('REFRESH','Microsoft did not provide a renewable session. Please sign in again.');
  return {refreshToken,accessToken:mc.access_token,expiresAt:Date.now()+Math.max(0,Number(mc.expires_in)||0)*1000,profile:{id:profile.id,name:profile.name,skinUrl:profile.skins?.find(s=>s.state==='ACTIVE')?.url}};
}
module.exports={AuthError,validState,readCallback,safeError,manager,complete};

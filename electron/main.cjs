const {app,BrowserWindow,WebContentsView,ipcMain,safeStorage,session}=require('electron');
const path=require('node:path');
const crypto=require('node:crypto');
const {pathToFileURL}=require('node:url');
const {AuthError,readCallback,safeError,manager,complete}=require('./auth.cjs');
const {createVault}=require('./vault.cjs');
const {loadSkin}=require('./skin.cjs');
app.setPath('userData',process.env.ASTRA_TEST_USER_DATA||path.join(app.getPath('appData'),'astra-client'));
app.setName('Astra');
app.setAppUserModelId('com.astra.client');
const icon=path.join(__dirname,'../src/assets/astra.ico');
let win,popup,vault,active=null,current=null,quitting=false;
const page=pathToFileURL(path.join(__dirname,'../src/index.html')).href;
function progress(message) {if(win&&!win.isDestroyed())win.webContents.send('auth:progress',message);}
function publicSession() {return current?{name:current.profile.name,id:current.profile.id,skin:current.skin||null}:null;}
function setHubWindow(enabled){
  if(!win||win.isDestroyed())return;
  if(!enabled&&win.isMaximized())win.unmaximize();
  win.setResizable(enabled);win.setMaximizable(enabled);
  if(!enabled)win.setSize(1280,800);
}
function cancel() {active?.cancel();}
function getCode(auth) {
  return new Promise((resolve,reject)=>{
    const state=crypto.randomBytes(32).toString('base64url');
    const link=new URL(auth.createLink());link.searchParams.set('state',state);
    const partition=`astra-auth-${crypto.randomUUID()}`;
    const ses=session.fromPartition(partition);
    ses.setPermissionRequestHandler((_wc,_permission,cb)=>cb(false));
    ses.setPermissionCheckHandler(()=>false);
    popup=new BrowserWindow({width:520,height:740,resizable:false,maximizable:false,fullscreenable:false,icon,title:'Microsoft sign-in · Astra',parent:win,minimizable:false,titleBarStyle:'hidden',titleBarOverlay:{color:'#080808',symbolColor:'#cccccc',height:40},autoHideMenuBar:true,backgroundColor:'#080808',webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,devTools:false}});
    const local=popup;
    const view=new WebContentsView({webPreferences:{partition,nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,devTools:false}});
    local.contentView.addChildView(view);
    const [width,height]=local.getContentSize();view.setBounds({x:0,y:40,width,height:height-40});
    const authContents=view.webContents;
    local.loadFile(path.join(__dirname,'../src/auth-frame.html'));
    local.webContents.setWindowOpenHandler(()=>({action:'deny'}));
    local.webContents.on('will-navigate',event=>event.preventDefault());
    local.on('closed',()=>{
      if(!authContents.isDestroyed())authContents.close();
      if(!quitting&&win&&!win.isDestroyed()){if(win.isMinimized())win.restore();win.show();win.focus();}
    });
    let settled=false;
    authContents.setWindowOpenHandler(()=>({action:'deny'}));
    authContents.on('will-attach-webview',e=>e.preventDefault());
    const finish=(error,code)=>{if(settled)return;settled=true;error?reject(error):resolve(code);if(!local.isDestroyed())local.destroy();popup=null;ses.clearStorageData().catch(()=>{});};
    const navigate=(event,url)=>{
      try {const code=readCallback(url,auth.token.redirect,state);if(code){event.preventDefault();finish(null,code);return;}if(new URL(url).protocol!=='https:')event.preventDefault();}
      catch(error){event.preventDefault();finish(error);}
    };
    authContents.on('will-redirect',navigate);
    authContents.on('will-navigate',navigate);
    local.on('close',()=>finish(new AuthError('CANCELLED','Sign-in cancelled. Take your time—you can try again.')));
    local.on('closed',()=>finish(new AuthError('CANCELLED','Sign-in cancelled. Take your time—you can try again.')));
    authContents.loadURL(link.href).catch(error=>{
      if(error.code==='ERR_ABORTED'||error.errno===-3)return;
      setTimeout(()=>{if(!settled)finish(local.isDestroyed()?new AuthError('CANCELLED','Sign-in cancelled. You can try again.'):new AuthError('NETWORK','Microsoft’s sign-in page could not load. Check your connection and try again.'));},150);
    });
    progress('Complete sign-in in the Microsoft window…');
  });
}
async function run(interactive) {
  if(active)return {ok:false,error:{code:'BUSY',message:'A sign-in is already in progress.'}};
  let rejectCancel;
  const cancellation=new Promise((_,reject)=>rejectCancel=reject);
  const operation={cancel:()=>{rejectCancel(new AuthError('CANCELLED','Sign-in cancelled. You can try again whenever you’re ready.'));if(popup&&!popup.isDestroyed())popup.destroy();}};
  active=operation;
  const timer=setTimeout(()=>rejectCancel(new AuthError('TIMEOUT','Sign-in took too long. Check your connection and try again.')),180000);
  try {
    if(!vault.available())throw new AuthError('STORAGE','Your operating system’s secure storage is unavailable. Astra will not save an unencrypted session.');
    const auth=manager(message=>{if(active===operation)progress(message);});
    const work=(async()=>{
      const saved=interactive?null:vault.read();
      if(!interactive&&!saved)return null;
      const xbox=interactive?await auth.login(encodeURIComponent(await getCode(auth))):await auth.refresh(saved);
      if(active!==operation)throw new AuthError('CANCELLED','Sign-in cancelled.');
      const verified=await complete(xbox,{progress:message=>{if(active===operation)progress(message);}});
      verified.skin=await loadSkin(verified.profile.skinUrl);
      return verified;
    })();
    const result=await Promise.race([work,cancellation]);
    if(result){try{vault.write(result.refreshToken);}catch{throw new AuthError('STORAGE','Your account was verified, but Astra could not save the session securely. Please retry.');}current=result;setHubWindow(true);}
    return {ok:true,account:publicSession()};
  }catch(error){current=null;return {ok:false,error:safeError(error)};}
  finally {clearTimeout(timer);if(popup&&!popup.isDestroyed())popup.destroy();popup=null;active=null;}
}
app.whenReady().then(()=>{
  vault=createVault(path.join(app.getPath('userData'),'session.enc'),safeStorage);
  session.defaultSession.setPermissionRequestHandler((_wc,_permission,cb)=>cb(false));
  win=new BrowserWindow({width:1280,height:800,minWidth:1000,minHeight:700,resizable:false,maximizable:false,fullscreenable:false,backgroundColor:'#000000',icon,frame:false,show:false,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',e=>e.preventDefault());
  win.webContents.on('will-attach-webview',e=>e.preventDefault());
  function handle(channel,fn){ipcMain.handle(channel,(event,...args)=>{if(event.sender!==win.webContents || event.senderFrame!==win.webContents.mainFrame || event.senderFrame.url!==page)throw new Error('Untrusted caller');return fn(...args);});}
  handle('auth:login',()=>run(true));
  handle('auth:restore',()=>run(false));
  handle('auth:cancel',()=>{cancel();return true;});
  handle('auth:logout',()=>{cancel();vault.clear();current=null;setHubWindow(false);return true;});
  handle('window:minimize',()=>win.minimize());
  handle('window:close',()=>win.close());
  handle('window:maximize',()=>{if(!current)return false;win.isMaximized()?win.unmaximize():win.maximize();return win.isMaximized();});
  win.once('ready-to-show',()=>win.show());
  win.loadFile(path.join(__dirname,'../src/index.html'));
});
app.on('window-all-closed',()=>app.quit());
app.on('before-quit',()=>{quitting=true;cancel();});


const {_electron:electron}=require('@playwright/test');
const fs=require('node:fs');
const path=require('node:path');
async function main(){
  const env={...process.env,ASTRA_TEST_USER_DATA:path.resolve('test-results/profile-'+require('node:crypto').randomUUID())};delete env.ELECTRON_RUN_AS_NODE;
    const app=await electron.launch({args:process.env.ASTRA_TEST_EXECUTABLE?[]:['.'],...(process.env.ASTRA_TEST_EXECUTABLE?{executablePath:process.env.ASTRA_TEST_EXECUTABLE}:{}),env});
  app.process().stdout.on('data',data=>process.stdout.write(data));
  try{
    const page=await app.firstWindow();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.getByRole('button',{name:'Continue with Microsoft'}).waitFor();
    await page.waitForFunction(()=>!document.getElementById('sign-in').disabled);
    await page.locator('#space').evaluate(img=>img.decode());
    await page.waitForFunction(()=>document.getElementById('planet').dataset.state==='ready');
    await page.waitForFunction(()=>Number(document.getElementById('planet').dataset.frames)>5);
    const planet=await page.evaluate(async()=>{
      const {sampleFrame}=await import('./planet.js');
      const a=sampleFrame(0),b=sampleFrame(12),c=sampleFrame(48);
      const before=sampleFrame(48-1/60),after=sampleFrame(1/60);
      let moved=0,seam=0,edge=0,boundary=0;
      for(let i=0;i<a.length;i+=4){
        moved+=Math.abs(a[i]-b[i]);seam+=Math.abs(a[i]-c[i]);
        boundary+=Math.abs(before[i]-after[i]);
        const x=(i/4)%1024/1024-.5,y=Math.floor(i/4/1024)/1024-.5;
        if(Math.hypot(x,y)>.46)edge+=Math.abs(a[i]-b[i]);
      }
      return {moved,seam,edge,boundaryMean:boundary/(a.length/4)};
    });
    console.log('Planet animation pixels:',planet);
    if(planet.moved<10000||planet.seam!==0||planet.edge!==0||planet.boundaryMean>.25)throw Error('Planet animation motion/seam/silhouette check failed');
    await page.locator('.emblem').evaluate(img=>img.decode());
    const cyclic=await page.evaluate(()=>{
      const stars=[...document.querySelectorAll('.twinkle')];
      return stars.length===18 && stars.every(star=>{
        const a=star.getAnimations()[0];
        if(!a || a.playState!=='running')return false;
        a.pause();
        const sample=t=>{a.currentTime=t;return {opacity:Number(getComputedStyle(star).opacity),rect:JSON.stringify(star.getBoundingClientRect())};};
        const start=sample(0),middle=sample(Number(a.effect.getTiming().duration)/2),end=sample(48000);
        const before=sample(47999),after=sample(48001);
        return Math.abs(start.opacity-end.opacity)<.0001 && Math.abs(before.opacity-after.opacity)<.001 && Math.abs(start.opacity-middle.opacity)>.001 && start.rect===end.rect;
      });
    });
    if(!cyclic)throw Error('Star brightness cycle is discontinuous or stars move');
    const isolation=await page.evaluate(()=>({node:typeof require,api:!!window.astra}));
    if(isolation.node!=='undefined'||!isolation.api)throw Error('Renderer isolation failed');
    if(await page.locator('#motion').count())throw Error('Removed video control still exists');
    if(await page.locator('.small-brand').count())throw Error('Duplicate brand label still exists');
    if(await page.locator('video').count())throw Error('Old moving video remains');
    fs.mkdirSync('screenshots',{recursive:true});
    await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect.getTiming().iterations!==Infinity).map(a=>a.finished)));
    await page.screenshot({path:'screenshots/astra-login.png'});
    const storage=await app.evaluate(({safeStorage})=>{
      const encrypted=safeStorage.encryptString('astra-test-marker');
      return safeStorage.isEncryptionAvailable() && !encrypted.toString().includes('astra-test-marker') && safeStorage.decryptString(encrypted)==='astra-test-marker';
    });
    if(!storage)throw Error('OS encryption round-trip failed');
    const fixed=await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];return !w.isResizable()&&!w.isMaximizable()&&!w.isFullScreenable();});
    if(!fixed)throw Error('Launcher must have a fixed size');
    await page.mouse.move(1270,790);
    await page.waitForFunction(()=>new DOMMatrix(getComputedStyle(document.querySelector('.planet-wrap')).transform).m41>2);
    const offset=await page.locator('.planet-wrap').evaluate(el=>{const m=new DOMMatrix(getComputedStyle(el).transform);return Math.max(Math.abs(m.m41),Math.abs(m.m42));});
    if(offset>4.01)throw Error('Parallax exceeds subtle four-pixel limit');
    await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(800,650));
    await page.screenshot({path:'screenshots/astra-compact.png'});
    const fits=await page.evaluate(()=>{const rect=document.getElementById('sign-in').getBoundingClientRect();return rect.left>=0&&rect.right<=innerWidth&&rect.bottom<=innerHeight;});
    if(!fits)throw Error('Compact login layout overflow');
    const [popup]=await Promise.all([app.waitForEvent('window'),page.getByRole('button',{name:'Continue with Microsoft'}).click()]);
    await popup.waitForLoadState('domcontentloaded');
    await app.evaluate(async({BrowserWindow})=>{
      const wc=BrowserWindow.getAllWindows().find(w=>w.contentView.children.length).contentView.children[0].webContents;
      if(wc.isLoading())await new Promise(resolve=>wc.once('did-stop-loading',resolve));
      if(new URL(wc.getURL()).protocol!=='https:')throw Error('Microsoft view did not load HTTPS');
      const prefs=wc.getLastWebPreferences();
      if(prefs.preload||prefs.nodeIntegration||!prefs.sandbox||!prefs.contextIsolation)throw Error('Remote view isolation failed');
    });
    await popup.screenshot({path:'screenshots/astra-microsoft.png'});
    const microsoftImage=await app.evaluate(async({BrowserWindow})=>{
      const view=BrowserWindow.getAllWindows().find(w=>w.contentView.children.length).contentView.children[0];
      if(view.getBounds().y!==40||view.getBounds().height<600)throw Error('Microsoft content bounds are invalid');
      return (await view.webContents.capturePage()).toDataURL();
    });
    fs.writeFileSync('screenshots/astra-microsoft-content.png',Buffer.from(microsoftImage.split(',')[1],'base64'));
    const windows=await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().map(w=>({title:w.getTitle(),resizable:w.isResizable(),maximizable:w.isMaximizable(),prefs:w.webContents.getLastWebPreferences()})));
    if(windows.some(w=>w.resizable||w.maximizable))throw Error('A window permits resizing');
    if(windows.length!==2 || windows.some(w=>w.prefs.nodeIntegration || !w.prefs.sandbox || !w.prefs.contextIsolation))throw Error('Auth isolation failed');
    await popup.close();
    await page.waitForFunction(()=>!document.getElementById('sign-in').disabled);
    if(!(await page.locator('#status').textContent()).includes('cancelled'))throw Error('Cancellation failed: '+await page.locator('#status').textContent());
    const foreground=await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];return w.isVisible()&&!w.isMinimized()&&w.isFocused();});
    if(!foreground)throw Error('Astra did not regain focus after sign-in closed');
    // UI-only verified-profile fixture, confined to this isolated test process.
    await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(1280,800));
    await page.evaluate(()=>{account={id:'a'.repeat(32),name:'TestPlayer'};render();});
    await page.locator('#hub').waitFor({state:'visible'});
    await page.waitForFunction(()=>document.querySelector('.planet-wrap').getBoundingClientRect().left>innerWidth);
    await page.locator('#presence-button').click();
    await page.locator('[data-presence="dnd"]').click();
    if(!await page.locator('#presence-button').evaluate(e=>e.classList.contains('dnd')))throw Error('Presence not applied');
    await page.locator('#add-friend').click();await page.locator('#friend-name').fill('LocalFriend');
    await page.getByRole('button',{name:'Save contact',exact:true}).click();
    await page.locator('.friend-row').waitFor();
    await page.locator('[data-edition="fabric"]').click();
    if(await page.locator('#banner-title').textContent()!=='Fabric')throw Error('Edition banner did not update');
    await page.locator('[data-edition="vanilla"]').click();
    await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect.getTiming().iterations!==Infinity).map(a=>a.finished)));
    await page.screenshot({path:'screenshots/astra-hub.png'});
    await page.locator('[data-tab="settings"]').click();
    await page.locator('#parallax').uncheck();
    await page.waitForFunction(()=>Math.abs(new DOMMatrix(getComputedStyle(document.querySelector('.planet-wrap')).transform).m41)<.1);
    await page.locator('[data-tab="account"]').click();
    await page.locator('#profile-bio').fill('Quiet worlds, good company.');
    await page.locator('#favorite-server').fill('My survival server');
    await page.getByRole('button',{name:'Save profile',exact:true}).click();
    if(await page.locator('#profile-saved').textContent()!=='Saved')throw Error('Profile save failed');
    await page.screenshot({path:'screenshots/astra-profile.png'});
    const protection=await page.locator('.sidebar-logo').evaluate(img=>{const ev=new Event('dragstart',{bubbles:true,cancelable:true});return !img.draggable&&!img.dispatchEvent(ev);});
    if(!protection)throw Error('Image drag not blocked');
    await page.locator('#hub-sign-out').click();
    await page.locator('main').waitFor({state:'visible'});
    if(errors.length)throw Error(errors.join('\n'));
    console.log('PASS: desktop loads, logo/background decode, stars cycle continuously without movement, isolated IPC works, Microsoft page loads, popup is sandboxed, cancellation recovers.');
  }finally{await app.close();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});

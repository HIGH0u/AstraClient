const {_electron:electron}=require('@playwright/test');
const path=require('node:path');
(async()=>{
  const env={...process.env,ASTRA_TEST_USER_DATA:path.resolve('test-results/hub-'+require('node:crypto').randomUUID())};delete env.ELECTRON_RUN_AS_NODE;
  const app=await electron.launch({args:['tests/hub-fixture.cjs'],env});
  try{
    const page=await app.firstWindow();
    await page.locator('#hub').waitFor({state:'visible'});
    const enabled=await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];return w.isResizable()&&w.isMaximizable()&&!w.isFullScreenable();});
    if(!enabled)throw Error('Verified hub did not enable normal maximizing');
    await page.locator('#maximize').click();
    const max=await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];return w.isMaximized()&&!w.isFullScreen();});
    if(!max)throw Error('Maximize action failed');
    await page.locator('#maximize').click();
    await page.locator('[data-tab="account"]').click();
    await page.locator('#profile-bio').fill('Saved across sessions');
    await page.getByRole('button',{name:'Save profile',exact:true}).click();
    await page.reload();await page.locator('#hub').waitFor({state:'visible'});
    await page.locator('[data-tab="account"]').click();
    if(await page.locator('#profile-bio').inputValue()!=='Saved across sessions')throw Error('Profile did not persist');
    await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect.getTiming().iterations!==Infinity).map(a=>a.finished)));
    await page.waitForFunction(()=>document.getElementById('profile-avatar').dataset.state==='ready');
    await page.screenshot({path:'screenshots/astra-profile.png'});
    await page.locator('#hub-sign-out').click();await page.locator('main').waitFor({state:'visible'});
    const locked=await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];return !w.isResizable()&&!w.isMaximizable()&&!w.isMaximized();});
    if(!locked)throw Error('Logout failed to restore fixed login window');
    console.log('PASS: verified restore opens hub, maximize/restore works, profile persists, logout locks login window.');
  }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

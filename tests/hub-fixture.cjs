// Isolated integration harness: no production login bypass or real credentials.
const {app,safeStorage}=require('electron');
const path=require('node:path');
const auth=require('../electron/auth.cjs');
auth.manager=()=>({refresh:async()=>({})});
auth.complete=async()=>({refreshToken:'fixture-refresh',accessToken:'fixture-access',expiresAt:Date.now()+3600000,profile:{id:'b'.repeat(32),name:'HubFixture'}});
app.whenReady().then(()=>{
  require('../electron/vault.cjs').createVault(path.join(process.env.ASTRA_TEST_USER_DATA,'session.enc'),safeStorage).write('fixture-refresh');
});
require('../electron/main.cjs');

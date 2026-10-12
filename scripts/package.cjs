const path=require('node:path');
async function main(){
  const {packager}=await import('@electron/packager');
  const version=require('../package.json').version;
  const output=await packager({dir:path.resolve(__dirname,'..'),name:'Astra',executableName:'Astra',platform:'win32',arch:'x64',out:`release/${version}`,overwrite:true,asar:true,icon:'src/assets/astra.ico',appVersion:version,win32metadata:{CompanyName:'Astra',FileDescription:'Astra Client',ProductName:'Astra',InternalName:'Astra',OriginalFilename:'Astra.exe'},ignore:[/^\/\.github/,/^\/(AGENTS\.md|DEVELOPMENT\.txt|SIGNPATH-APPLICATION\.txt|Astra\.lnk|Restart-Astra\.ps1|Start-Astra\.cmd|scripts-loop\.cjs)$/, /^\/src\/assets\/(?!astra-cloud-planet-v5\.png$|astra-logo-selected\.png$|astra\.ico$)/,/^\/release/,/^\/screenshots/,/^\/test-results/,/^\/tests/,/^\/scripts/,/^\/src\/assets\/astra-(original|loop|poster|ringless)/],prune:true});
  console.log('Packaged:',output.join(', '));
}
main().catch(error=>{console.error(error);process.exitCode=1;});

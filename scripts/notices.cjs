const fs=require('node:fs');
const path=require('node:path');
const lock=require('../package-lock.json');
const sections=['THIRD-PARTY NOTICES\n\nAstra original code: GPL-3.0-only. Third-party licenses below remain unchanged.\nElectron includes LICENSE and LICENSES.chromium.html in the packaged application.\n'];
for(const [dir,entry]of Object.entries(lock.packages)){
  if(!dir||entry.dev)continue;
  const root=path.resolve(__dirname,'..',dir);
  const files=fs.readdirSync(root).filter(name=>/^(license|copying|notice)(\.|$)/i.test(name)&&fs.statSync(path.join(root,name)).isFile());
  sections.push(`\n===== ${dir.replace(/^node_modules\//,'')} ${entry.version} (${entry.license||'see package'}) =====\n`);
  if(!files.length){
    if(dir==='node_modules/tr46'){sections.push('MIT license declared by tr46 0.0.3; text recovered from upstream https://github.com/jsdom/tr46/blob/main/LICENSE.md because the 0.0.3 npm package omits it.');sections.push(fs.readFileSync(path.resolve(__dirname,'../licenses/tr46-LICENSE.txt'),'utf8'));continue;}
    throw Error('Missing license text for '+dir);
  }
  for(const file of files)sections.push(fs.readFileSync(path.join(root,file),'utf8'));
}
fs.writeFileSync(path.resolve(__dirname,'../THIRD_PARTY_NOTICES.txt'),sections.join('\n'));

import {SkinViewer} from 'skinview3d';
const $=id=>document.getElementById(id);
let user=null,profile={},contacts=[],selectedContact=null,viewers=[];
const editions=[['vanilla','Astra Vanilla','✦','#59777b'],['fabric','Fabric','▱','#928672'],['forge','Forge','⚒','#836958'],['neoforge','NeoForge','◇','#b07a4a'],['quilt','Quilt','▦','#836eaa'],['optifine','OptiFine','◎','#8c5555']];
const key=suffix=>'astra.'+user.id+'.'+suffix;
function read(suffix,fallback){try{return JSON.parse(localStorage.getItem(key(suffix)))||fallback;}catch{return fallback;}}
function save(suffix,value){localStorage.setItem(key(suffix),JSON.stringify(value));}
function tab(name){
  for(const button of document.querySelectorAll('[data-tab]')){
    const selected=button.dataset.tab===name;
    selected?button.setAttribute('aria-current','page'):button.removeAttribute('aria-current');
    $('tab-'+button.dataset.tab).hidden=!selected;
  }
}
document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>tab(button.dataset.tab)));
$('my-profile').onclick=()=>tab('account');$('sidebar-settings').onclick=()=>tab('settings');
function presence(value){
  if(!['online','idle','dnd','offline'].includes(value))value='online';
  profile.presence=value;
  $('presence-button').className='presence '+value;
  $('presence-button').setAttribute('aria-label','Change your status: '+({dnd:'Do Not Disturb'}[value]||value));
}
$('presence-button').onclick=()=>{const menu=$('presence-menu');menu.hidden=!menu.hidden;$('presence-button').setAttribute('aria-expanded',String(!menu.hidden));};
document.querySelectorAll('[data-presence]').forEach(button=>button.onclick=()=>{presence(button.dataset.presence);save('profile',profile);$('presence-menu').hidden=true;$('presence-button').setAttribute('aria-expanded','false');});
document.addEventListener('click',event=>{if(!event.target.closest('#presence-menu,#presence-button')){$('presence-menu').hidden=true;$('presence-button').setAttribute('aria-expanded','false');}});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){$('presence-menu').hidden=true;$('presence-button').setAttribute('aria-expanded','false');}});
function selectEdition(id){
  const edition=editions.find(item=>item[0]===id)||editions[0];
  profile.edition=edition[0];$('banner-title').textContent=edition[1];$('edition-caption').textContent=edition[1];
  $('version-banner').style.setProperty('--edition-color',edition[3]);
  for(const button of document.querySelectorAll('[data-edition]'))button.setAttribute('aria-pressed',String(button.dataset.edition===edition[0]));
}
for(const [id,name,glyph] of editions){
  const button=document.createElement('button');button.dataset.edition=id;button.title=name;button.setAttribute('aria-label',name);
  const icon=document.createElement('span');icon.className='edition-icon';
  const paths={vanilla:'M16 2Q18 14 30 16Q18 18 16 30Q14 18 2 16Q14 14 16 2Z',fabric:'M7 8H24L27 24H8Q3 24 3 20Q3 16 8 16H23M8 16L7 8M8 20H22',forge:'M3 8H29L24 14H19V21L24 25H8L13 21V14H7Z',neoforge:'M4 4L13 10H19L28 4L25 23L16 29L7 23Z M8 15L13 18M24 15L19 18M13 23H19',quilt:'M4 4H28V28H4ZM12 4V28M20 4V28M4 12H28M4 20H28',optifine:'M4 9H13V24H4ZM20 24V9H29M20 16H27'};
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 32 32');svg.setAttribute('aria-hidden','true');
  const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',paths[id]);svg.append(path);icon.append(svg);
  const label=document.createElement('small');label.textContent=name;
  button.append(icon,label);button.onclick=()=>{selectEdition(id);if(user)save('profile',profile);};$('edition-options').append(button);
}
$('game-version').onchange=()=>{profile.version=$('game-version').value;$('banner-version').textContent='MINECRAFT JAVA · '+profile.version;if(user)save('profile',profile);};
$('launch-game').onclick=()=>{$('launch-status').textContent=`${$('banner-title').textContent} · ${$('game-version').value} selected. Its installer and launcher are not connected yet.`;};
$('profile-form').onsubmit=event=>{event.preventDefault();profile.bio=$('profile-bio').value.trim();profile.server=$('favorite-server').value.trim();try{save('profile',profile);$('profile-saved').textContent='Saved';}catch{$('profile-saved').textContent='Could not save on this device.';}};
function listContacts(){
  $('friends-list').replaceChildren();$('friends-empty').hidden=contacts.length>0;
  for(const contact of contacts){
    const button=document.createElement('button');button.className='friend-row';
    const avatar=document.createElement('span');avatar.className='contact-avatar';avatar.textContent=contact.name[0].toUpperCase();
    const name=document.createElement('span');name.textContent=contact.name;
    const dot=document.createElement('i');dot.className='presence unknown';dot.title='Status unavailable';
    button.append(avatar,name,dot);button.onclick=()=>{selectedContact=contact;$('contact-name').textContent=contact.name;$('contact-dialog').showModal();};
    $('friends-list').append(button);
  }
}
$('add-friend').onclick=()=>{$('friend-error').textContent='';$('friend-name').value='';$('friend-dialog').showModal();};
for(const close of document.querySelectorAll('.dialog-close'))close.onclick=()=>close.closest('dialog').close();
$('friend-form').onsubmit=event=>{
  event.preventDefault();const name=$('friend-name').value.trim();
  if(!/^[a-z0-9_]{3,16}$/i.test(name))return;
  if(name.toLowerCase()===user.name.toLowerCase()||contacts.some(c=>c.name.toLowerCase()===name.toLowerCase())){$('friend-error').textContent='That name is already in your circle.';return;}
  contacts.push({name});save('contacts',contacts);listContacts();$('friend-dialog').close();
};
$('remove-contact').onclick=()=>{contacts=contacts.filter(c=>c!==selectedContact);save('contacts',contacts);listContacts();$('contact-dialog').close();};
function fallbackSkin(){
  const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');
  x.fillStyle='#699397';x.fillRect(0,16,64,16);x.fillRect(16,48,32,16);
  x.fillStyle='#b78b71';x.fillRect(0,0,32,16);x.fillRect(40,16,16,16);x.fillRect(32,48,16,16);
  x.fillStyle='#342c28';x.fillRect(0,0,32,8);x.fillRect(8,8,8,2);
  x.fillStyle='#d7d7ce';x.fillRect(9,11,2,1);x.fillRect(13,11,2,1);
  x.fillStyle='#353c59';x.fillRect(0,16,16,16);x.fillRect(16,48,16,16);
  return c.toDataURL();
}
async function avatars(account){
  for(const viewer of viewers)viewer.dispose();viewers=[];
  const source=account.skin||fallbackSkin();
  const image=new Image();image.src=source;
  try{
    await image.decode();if(user?.id!==account.id)return;
    const sample=document.createElement('canvas');sample.width=sample.height=1;const ctx=sample.getContext('2d');
    ctx.drawImage(image,20/64*image.width,20/64*image.height,8/64*image.width,12/64*image.height,0,0,1,1);
    const [r,g,b]=ctx.getImageData(0,0,1,1).data;$('profile-color').style.background=`linear-gradient(120deg,rgb(${r} ${g} ${b}),#101415)`;
    for(const id of ['self-avatar','profile-avatar']){
      const canvas=$(id);const viewer=new SkinViewer({canvas,width:canvas.width,height:canvas.height,renderPaused:true});
      viewer.controls.enabled=false;await viewer.loadSkin(source);
      if(user?.id!==account.id){viewer.dispose();return;}
      viewer.camera.position.set(16,16,42);viewer.camera.lookAt(0,8,0);
      viewer.fov=35;viewer.playerObject.skin.leftLeg.visible=false;viewer.playerObject.skin.rightLeg.visible=false;
      viewer.render();canvas.dataset.state='ready';viewers.push(viewer);canvas.title=account.skin?'Your Minecraft skin':'Default avatar — skin unavailable';
    }
  }catch{ $('self-avatar').title='Skin preview unavailable'; }
}
window.addEventListener('astra-account',event=>{
  const next=event.detail;if(user?.id===next?.id)return;
  user=next;
  if(!user){for(const v of viewers)v.dispose();viewers=[];for(const dialog of document.querySelectorAll('dialog'))dialog.close();return;}
  const saved=read('profile',{});profile=typeof saved==='object'&&!Array.isArray(saved)?saved:{};
  const savedContacts=read('contacts',[]);contacts=Array.isArray(savedContacts)?savedContacts.filter(c=>typeof c?.name==='string'&&/^[a-z0-9_]{3,16}$/i.test(c.name)):[];
  $('player-name').textContent='Welcome back, '+user.name;$('account-name').textContent=user.name;
  $('profile-bio').value=String(profile.bio||'').slice(0,240);$('favorite-server').value=String(profile.server||'').slice(0,100);
  presence(profile.presence);selectEdition(profile.edition);
  if([...$('game-version').options].some(o=>o.value===profile.version))$('game-version').value=profile.version;
  $('banner-version').textContent='MINECRAFT JAVA · '+$('game-version').value;
  listContacts();tab('home');avatars(user);
});

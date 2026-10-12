const $=id=>document.getElementById(id);
let busy=false,account=null;
localStorage.removeItem('astra.motion');
// Fixed points, gently varying only in brightness. Each cycle meets at the
// same opacity and zero velocity; the background never seeks or crossfades.
const stars=[[7,18],[18,34],[27,9],[35,24],[44,16],[52,37],[61,11],[71,27],[82,8],[93,20],[12,71],[24,84],[39,68],[48,87],[57,57],[67,43],[86,34],[5,46]];
for(const [i,[x,y]] of stars.entries()){
  const star=document.createElement('i');
  star.className='twinkle';
  star.style.left=`${x}%`;star.style.top=`${y}%`;
  star.animate([{opacity:.12},{opacity:.55},{opacity:.12}],{
    duration:[12000,16000,24000][i%3],delay:-i*1731,
    easing:'ease-in-out',iterations:Infinity
  });
  $('stars').append(star);
}
// Deterministic sparse star field, independent from the moving planet texture.
for(let i=0;i<180;i++){
  const star=document.createElement('i');star.className='star-static';
  star.style.left=((i*73.137)%100)+'%';star.style.top=((i*39.731)%100)+'%';
  star.style.opacity=String(.12+(i%7)*.06);$('stars').append(star);
}
function status(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error);}
function render(){
  document.querySelector('main').hidden=Boolean(account);
  $('hub').hidden=!account;
  document.body.classList.toggle('in-hub',Boolean(account));
  $('maximize').hidden=!account;
  window.dispatchEvent(new CustomEvent('astra-account',{detail:account}));
  $('sign-in').disabled=busy;
  $('sign-in').hidden=Boolean(account);
  $('cancel').hidden=!busy;
  $('sign-out').hidden=!account;
  $('button-label').textContent=busy?'Connecting…':'Continue with Microsoft';
  document.querySelector('.login').classList.toggle('signed-in',Boolean(account));
  $('intro').textContent=account?`Welcome home, ${account.name}.`:'There’s a world beyond.';
}
async function authenticate(restore=false){
  if(busy)return;busy=true;render();status(restore?'Checking your saved session…':'Opening Microsoft sign-in…');
  try{
    if(!window.astra){status('Open the Astra desktop app to sign in. This browser view is a visual preview.',true);return;}
    const result=await (restore?window.astra.restore():window.astra.login());
    if(result.ok){account=result.account;status('');}
    else status(result.error.message,result.error.code!=='CANCELLED');
  }catch{status('Astra could not complete sign-in. Please try again.',true);}
  finally{busy=false;render();}
}
$('sign-in').addEventListener('click',()=>authenticate());
$('cancel').addEventListener('click',()=>window.astra?.cancel());
$('sign-out').addEventListener('click',async()=>{try{await window.astra.logout();account=null;status('Signed out. Your saved session has been removed.');render();}catch{status('Could not remove the saved session. Please try again.',true);}});
$('minimize').addEventListener('click',()=>window.astra?.minimize());
$('maximize').addEventListener('click',()=>window.astra?.maximize());
$('close').addEventListener('click',()=>window.astra?.close());
$('hub-sign-out').addEventListener('click',async()=>{
  try{await window.astra.logout();account=null;render();status('');}
  catch{$('hub-status').textContent='Could not sign out. Please retry.';}
});
const planetWrap=document.querySelector('.planet-wrap');
let pointerX=0,pointerY=0,planetX=0,planetY=0;
$('parallax').checked=localStorage.getItem('astra.parallax')!=='off';
$('parallax').addEventListener('change',()=>localStorage.setItem('astra.parallax',$('parallax').checked?'on':'off'));
window.addEventListener('pointermove',event=>{pointerX=(event.clientX/innerWidth-.5)*8;pointerY=(event.clientY/innerHeight-.5)*8;});
document.addEventListener('pointerleave',()=>{pointerX=pointerY=0;});
window.addEventListener('blur',()=>{pointerX=pointerY=0;});
function parallax(){
  const enabled=$('parallax').checked;
  planetX+=((enabled?pointerX:0)-planetX)*.035;
  planetY+=((enabled?pointerY:0)-planetY)*.035;
  planetWrap.style.setProperty('--pointer-x',planetX+'px');planetWrap.style.setProperty('--pointer-y',planetY+'px');
  requestAnimationFrame(parallax);
}
requestAnimationFrame(parallax);
window.astra?.onProgress(message=>status(message));
if(window.astra)authenticate(true);

document.addEventListener('dragstart',event=>event.preventDefault());
document.addEventListener('contextmenu',event=>{if(event.target.closest('img,canvas,.version-banner,.cosmos'))event.preventDefault();});

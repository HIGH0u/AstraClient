// A single generated texture, animated coherently instead of regenerating each
// frame. Cloud displacement is periodic; the silhouette and lighting stay put.
const canvas=document.getElementById('planet');
const plate=document.getElementById('space');
const gl=canvas.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:true});
let program,phase,raf,active=false,lastFrame=0;
const vertex=`attribute vec2 position; varying vec2 uv;
void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
const fragment=`precision highp float;
varying vec2 uv; uniform sampler2D plate; uniform float phase;
void main(){
  vec2 p=uv-.5;
  float radius=length(p);
  float interior=1.-smoothstep(.32,.45,radius);
  // Very slow atmospheric circulation, strongest away from the fixed limb.
  vec2 drift=vec2(sin(phase+p.y*14.),cos(phase+p.x*11.));
  vec2 eddies=vec2(cos(phase*2.+p.y*29.),sin(phase*2.+p.x*23.));
  vec2 sampleUV=uv+interior*(drift*.006+eddies*.0015);
  gl_FragColor=vec4(texture2D(plate,sampleUV).rgb,1.);
}`;
function shader(type,source){
  const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('Planet shader failed');
  return s;
}
export function renderAt(seconds){
  if(!active)return;
  gl.uniform1f(phase,((seconds%48)/48)*Math.PI*2);
  gl.drawArrays(gl.TRIANGLES,0,6);
}
// Used by the visual regression check: sample the rendered GPU pixels directly.
export function sampleFrame(seconds){
  renderAt(seconds);
  const pixels=new Uint8Array(canvas.width*canvas.height*4);
  gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  return pixels;
}
function tick(now){
  if(!document.hidden && !document.body.classList.contains('in-hub') && now-lastFrame>=1000/60){
    renderAt(now/1000);lastFrame=now;
    canvas.dataset.frames=String(Number(canvas.dataset.frames||0)+1);
  }
  raf=requestAnimationFrame(tick);
}
async function init(){
  if(!gl){canvas.dataset.state='fallback';return;}
  try{
    await plate.decode();
    canvas.width=1024;canvas.height=1024;
    gl.viewport(0,0,1024,1024);
    program=gl.createProgram();
    gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));
    gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Planet shader link failed');
    gl.useProgram(program);
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const position=gl.getAttribLocation(program,'position');
    gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,plate);
    phase=gl.getUniformLocation(program,'phase');
    active=true;renderAt(0);canvas.dataset.state='ready';raf=requestAnimationFrame(tick);
  }catch{canvas.dataset.state='fallback';}
}
canvas.addEventListener('webglcontextlost',event=>{
  event.preventDefault();active=false;cancelAnimationFrame(raf);canvas.dataset.state='fallback';
});
canvas.addEventListener('webglcontextrestored',init);
init();

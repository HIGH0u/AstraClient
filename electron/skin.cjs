async function loadSkin(url){
  try{
    const u=new URL(url);
    if(u.protocol!=='https:'||u.hostname!=='textures.minecraft.net'||!u.pathname.startsWith('/texture/'))return null;
    const response=await fetch(u,{redirect:'error',signal:AbortSignal.timeout(5000)});
    if(!response.ok)return null;
    const parts=[];let size=0;
    for await(const part of response.body){size+=part.length;if(size>1048576)return null;parts.push(part);}
    const bytes=Buffer.concat(parts);
    if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')return null;
    return 'data:image/png;base64,'+bytes.toString('base64');
  }catch{return null;}
}
module.exports={loadSkin};

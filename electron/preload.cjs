const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('astra',Object.freeze({
  login:()=>ipcRenderer.invoke('auth:login'),restore:()=>ipcRenderer.invoke('auth:restore'),cancel:()=>ipcRenderer.invoke('auth:cancel'),logout:()=>ipcRenderer.invoke('auth:logout'),maximize:()=>ipcRenderer.invoke('window:maximize'),minimize:()=>ipcRenderer.invoke('window:minimize'),close:()=>ipcRenderer.invoke('window:close'),
  onProgress:callback=>{const listener=(_event,message)=>callback(message);ipcRenderer.on('auth:progress',listener);return ()=>ipcRenderer.removeListener('auth:progress',listener);}
}));

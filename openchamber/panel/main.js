(()=>{var f="openchamber.sdk",_=1;var Ye=`
:root {
  /* Quiet at rest like the app's own thumbs; hover gives a clear grab target. */
  --oc-scrollbar-thumb: color-mix(in srgb, var(--oc-muted, currentColor) 18%, transparent);
  --oc-scrollbar-thumb-hover: color-mix(in srgb, var(--oc-muted, currentColor) 36%, transparent);
  scrollbar-gutter: stable;
}
* {
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}
:hover, [data-oc-scrolling] {
  scrollbar-color: var(--oc-scrollbar-thumb) transparent;
}
/* Chromium's standard scrollbar properties otherwise override its pseudo-elements. */
@supports selector(::-webkit-scrollbar) {
  *, :hover, [data-oc-scrolling] { scrollbar-width: auto; scrollbar-color: auto; }
  ::-webkit-scrollbar { width: 6px; height: 6px; background: transparent; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: 999px;
    min-width: 24px;
    min-height: 24px;
  }
  :hover::-webkit-scrollbar-thumb, [data-oc-scrolling]::-webkit-scrollbar-thumb { background: var(--oc-scrollbar-thumb); }
  ::-webkit-scrollbar-thumb:hover { background: var(--oc-scrollbar-thumb-hover); }
  ::-webkit-scrollbar-corner { background: transparent; }
  ::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
}
@media (forced-colors: active) {
  *, :hover, [data-oc-scrolling] { scrollbar-color: auto; }
  ::-webkit-scrollbar-thumb, ::-webkit-scrollbar-thumb:hover { background: CanvasText; }
}
`;function Zt(e){let r=e.documentElement;if(r.hasAttribute("data-oc-scrollbar-activity"))return;r.setAttribute("data-oc-scrollbar-activity","");let n=new WeakMap;e.addEventListener("scroll",(l)=>{let p=l.target===e?r:l.target;if(!(p instanceof Element))return;if(!p.hasAttribute("data-oc-scrolling"))p.setAttribute("data-oc-scrolling","");let S=n.get(p);if(S!==void 0)clearTimeout(S);n.set(p,setTimeout(()=>{n.delete(p),p.removeAttribute("data-oc-scrolling")},1000))},{capture:!0,passive:!0})}var qo=`(${Zt.toString()})(document);`;var Qe=128,Ze=65536;var Oe=128;var Ae=65536;var oo=/^[a-z][a-z0-9-]{0,39}$/;var qt=(e)=>Object(e)===e&&!Array.isArray(e),qe=(e,r)=>Object.keys(e).every((n)=>r.includes(n)),eo=(e)=>String(e)===e&&e.length>=1&&e.length<=60,to=(e)=>String(e)===e&&e.length>=1&&e.length<=80,ro=(e)=>{if(!Array.isArray(e)||e.length>4)return!1;let r=new Set;for(let n of e){if(!qt(n)||!oo.test(n.id)||!eo(n.label))return!1;if(n.disabled!==void 0&&n.disabled!==!0&&n.disabled!==!1)return!1;if(r.has(n.id))return!1;if(r.add(n.id),n.kind==="button"){if(!qe(n,["kind","id","label","disabled"]))return!1;continue}if(n.kind!=="select"||!qe(n,["kind","id","label","value","options","disabled"]))return!1;if(!to(n.value)||!Array.isArray(n.options)||n.options.length<1||n.options.length>16)return!1;let l=new Set;for(let p of n.options){if(!qt(p)||!qe(p,["value","label"])||!to(p.value)||!eo(p.label)||l.has(p.value))return!1;l.add(p.value)}if(!l.has(n.value))return!1}return!0};var ke=20000000,Re=256;var et=(e)=>("bytes"in e)?e.bytes.byteLength:e.content.length,no=(e,r)=>{if(e.path!==r.path||e.readOnly!==r.readOnly)return!1;if(e.encoding==="text"||r.encoding==="text")return e.encoding==="text"&&r.encoding==="text"&&e.content===r.content;if(e.bytes.byteLength!==r.bytes.byteLength)return!1;for(let n=0;n<e.bytes.byteLength;n+=1)if(e.bytes[n]!==r.bytes[n])return!1;return!0};var so=/^[A-Za-z0-9_-]{1,80}$/;var io=["left","right","top","bottom"];var ao=(e,r=0,n={remaining:16000})=>{if(--n.remaining<0||r>=32)return!1;if(e===null)return!0;let l=Array.isArray(e)?e:Object(e)===e?Object.values(e):[];for(let p of l)if(!ao(p,r+1,n))return!1;return!0},tt=(e)=>{if(e===null||e===!0||e===!1)return!0;if(Array.isArray(e))return Object.keys(e).every((r)=>/^(0|[1-9]\d*)$/.test(r)&&Number(r)<e.length)&&e.every(tt);if(Object(e)===e){let r=Object.getPrototypeOf(e);return(r===null||r===Object.prototype)&&Object.values(e).every(tt)}return String(e)===e||Number.isFinite(e)},ot=(e)=>{try{if(String(e.id)!==e.id||!so.test(e.id)||!Number.isFinite(e.anchor.x)||Math.abs(e.anchor.x)>1e5||!Number.isFinite(e.anchor.y)||Math.abs(e.anchor.y)>1e5||!Number.isFinite(e.anchor.width)||!Number.isFinite(e.anchor.height)||e.anchor.width<=0||e.anchor.height<=0||e.anchor.width>1e5||e.anchor.height>1e5||!Number.isInteger(e.width)||e.width<160||e.width>640||!Number.isInteger(e.height)||e.height<48||e.height>480||e.side!==void 0&&!io.includes(e.side)||e.focus!==void 0&&e.focus!==!0&&e.focus!==!1||!ao(e.data)||!tt(e.data))return!1;return JSON.stringify(e.data).length<=16000}catch{return!1}};var lo=["file","directory","other","missing"],nt=(e)=>Boolean(e&&"sessionId"in e),st=(e)=>Boolean(e&&"sent"in e&&!("sessionId"in e));var po=/^[0-9a-f]{7,64}$/i,it=(e)=>po.test(e),ye=500,ve=32000,uo=16000,Eo=128,fo=200,_o=2000,So=16000,To=80,mo=200,ho=16000;var xo=2000;var at=20000,Ue=1024,we=2000000;var Ce=64000,Ie=8000,ct=4000;var dt=960000;var go=999,bo=1e4,_e=500,Oo=["HOST_UNAVAILABLE","HOST_TIMEOUT","HOST_REJECTED","DISCONNECTED","DISABLED","BAD_PATH","NO_INTEGRATION","NO_SERVICE","SERVICE_FAILED","REQUEST_FAILED","RESPONSE_TOO_LARGE","NO_SESSION","SESSION_BUSY","NOT_GRANTED","NO_DIRECTORY","NOT_FOUND","FILE_TOO_LARGE","DENIED","NO_MODEL","MODEL_FAILED","UNSUPPORTED"],Ao=["stopped","starting","ready","failed"],er=new Set(Oo),ko=(e)=>er.has(e),Ro=(e)=>e&&ko(e)?e:"HOST_REJECTED",te=(e)=>{if(e===void 0)return!1;if(e===null||e===!0||e===!1)return!0;if(String(e)===e)return!0;if(Number(e)===e)return Number.isFinite(e);if(Array.isArray(e))return e.every(te);if(Object(e)===e)return Object.values(e).every(te);return!1},yo=(e)=>te(e)&&JSON.stringify(e).length<=ho,co=(e)=>e?.trim().slice(0,mo)??"",oe=(e)=>{let r=e.id.trim().slice(0,Eo),n=e.title.trim().slice(0,fo),l=e.url.trim().slice(0,_o),p=e.text?.trim().slice(0,So),S=e.author?.trim().slice(0,To),T=e.kind==="pull"?"pull":"issue",b={providerId:e.providerId.trim(),id:r,title:n||r,url:l,kind:T};if(p)b.text=p;if(S)b.author=S;if(T==="pull"){let I=co(e.branches?.head),v=co(e.branches?.base);if(I&&v)b.branches={head:I,base:v}}if(yo(e.data))b.data=e.data;return b},lt=(e)=>{let r=oe(e);if(e.projectId)r.projectId=e.projectId;if(e.navigation)r.navigation=e.navigation;if(e.worktree)r.worktree=e.worktree;return r},pt=(e)=>{let r={text:e.text.trim().slice(0,uo)};if(e.send)r.send=!0;return r},ut=(e)=>{if(e===null||!Number.isFinite(e))return null;return Math.min(go,Math.max(0,Math.round(e)))},Et=(e)=>{if(!Number.isFinite(e))return 0;return Math.min(bo,Math.max(0,Math.ceil(e)))};var re=(e)=>e.length>0&&e.length<=Ue&&!e.includes("\x00")&&!e.includes("\\");var Le=(e)=>{if(!e.startsWith("/")||e.includes("\x00")||e.includes("\\")||e.includes("://"))return!1;if(e.length>xo)return!1;return!e.split("/").some((n)=>n==="."||n==="..")},tr=new Set(Ao),ft=(e)=>Boolean(e&&"status"in e&&tr.has(String(e.status))&&!("body"in e)),Me=(e)=>Boolean(e&&"status"in e&&"body"in e&&Number.isInteger(e.status)),_t=(e)=>Boolean(e&&"content"in e&&String(e.content)===e.content),St=(e)=>Boolean(e&&"written"in e&&e.written===!0),Tt=(e)=>Boolean(e&&"entries"in e&&Array.isArray(e.entries)),or=new Set(lo),mt=(e)=>Boolean(e&&"kind"in e&&"size"in e&&or.has(String(e.kind))&&Number.isFinite(e.size)),ht=(e)=>Boolean(e&&"text"in e&&String(e.text)===e.text&&!("status"in e)),rr=new Set(["workspace","shells","ready","directory","session","connection","settings","session-lifecycle","item","resolve","action","status-control-event","popover-closed","file-open","file-snapshot","file-saved","generate-late"]),nr=(e)=>Object(e)===e?e:null,rt=(e)=>String(e)===e&&e.length>0,sr=(e)=>{if(!rt(e.id))return null;if(e.ok===!0){let r={channel:f,v:_,type:"result",id:e.id,ok:!0};if(Object(e.payload)===e.payload)r.payload=e.payload;return r}if(e.ok===!1&&rt(e.error))return{channel:f,v:_,type:"result",id:e.id,ok:!1,error:e.error,code:Ro(rt(e.code)?e.code:void 0)};return null},xt=(e)=>{let r=nr(e);if(!r||r.channel!==f||r.v!==_)return null;if(r.type==="result")return sr(r);if(!rr.has(String(r.type))||Object(r.payload)!==r.payload)return null;return r};var vo=(e)=>("key"in e)&&("metaKey"in e)&&("ctrlKey"in e),ir=(e)=>(e.metaKey||e.ctrlKey)&&!e.altKey&&!e.shiftKey&&e.key.toLowerCase()==="s";class c extends Error{code;constructor(e,r){super(r);this.name="HostRequestError",this.code=e}}var Uo=()=>Promise.reject(new c("BAD_PATH",'Request path must start with "/" and stay on the declared origin.')),Ne=()=>Promise.reject(new c("BAD_PATH",`File path must be 1 to ${Ue} characters without NUL or backslash.`)),Pe=(e)=>{if(e===void 0)return;if(Object(e)!==e||Array.isArray(e)||e.scope!==void 0&&e.scope!=="instance"&&e.scope!=="device")throw new c("HOST_REJECTED",'Storage scope must be "instance" or "device".');return e.scope==="device"?"device":void 0},E=(e)=>(e.value+=1,`oc-${e.value}`),gt=(e={})=>{let r=e.target??("window"in globalThis?window:null);if(!r)throw new c("HOST_UNAVAILABLE","No window. connectHost runs in a browser frame.");let n=e.acceptSource??((t)=>t===r.parent),l=e.requestTimeoutMs??at,p=new Set,S=new Set,T=new Set,b=new Set,I=new Set,v=new Set,F=new Set,K=new Set,Te=new Set,Q=new Set,ze=[],de=null,le=null,me=new Set,he=new Set,pe=null,ue=null,je=!1,Z=new Map,q=new Map,ee=new Map,X=!1,u={value:0},d=null,B=null,Ee=!1,fe=!1,Ht=null,Xt=(t)=>{if(!t)return null;return{sessionId:t.id,phase:t.busy?"started":"completed"}},N=(t)=>{r.parent.postMessage(t,"*")},Ft=()=>{if(X||r.parent===r||Q.size===0||d?.features?.lateGenerateResults!==!0)return;N({channel:f,v:_,type:"generate-late-listen"})},O=(t,o)=>{for(let s of t)try{s(o)}catch(a){console.error(a)}},Bt=(t)=>{if(!(t instanceof MessageEvent))return;if(!n(t.source))return;let o=xt(t.data);if(!o)return;if(o.type==="workspace"){let a=q.get(o.payload.subscriptionId);if(a)O([a],o.payload.snapshot);return}if(o.type==="shells"){let a=ee.get(o.payload.subscriptionId);if(a)O([a],o.payload.snapshot);return}if(o.type==="ready"){if(d=o.payload,B=Xt(o.payload.session),O(p,o.payload),O(S,o.payload.directory),O(T,o.payload.session),B)O(b,B);O(I,o.payload.connection),O(v,o.payload.settings),O(F,o.payload.item),Ft();return}if(o.type==="generate-late"){if(Q.size===0)ze.push(o.payload);else O(Q,o.payload);return}if(o.type==="directory"){if(d)d={...d,directory:o.payload.directory};O(S,o.payload.directory);return}if(o.type==="session"){if(d)d={...d,session:o.payload.session};if(!o.payload.session)B=null;else if(B?.sessionId!==o.payload.session.id)B=Xt(o.payload.session);O(T,o.payload.session);return}if(o.type==="session-lifecycle"){B=o.payload,O(b,o.payload);return}if(o.type==="connection"){if(d)d={...d,connection:o.payload.connection};O(I,o.payload.connection);return}if(o.type==="settings"){if(d)d={...d,settings:o.payload.settings};O(v,o.payload.settings);return}if(o.type==="item"){if(d)d={...d,item:o.payload.item};O(F,o.payload.item);return}if(o.type==="status-control-event"){O(K,o.payload);return}if(o.type==="popover-closed"){O(Te,o.payload);return}if(o.type==="action"){let a=(m)=>{if(!X)N({channel:f,v:_,type:"action-result",id:o.id,payload:m})},h=le;if(!h){a({ok:!1,error:"This extension does not handle background actions."});return}Promise.resolve().then(()=>h(o.payload)).then(()=>a({ok:!0}),(m)=>{let y=(m instanceof Error?m.message:String(m)).trim();a({ok:!1,error:(y||"Action failed.").slice(0,_e)})});return}if(o.type==="file-open"){let a=o.payload;if(ue&&no(ue,a))return;ue=a,O(me,o.payload);return}if(o.type==="file-saved"){O(he,o.payload.version);return}if(o.type==="file-snapshot"){let a=(y)=>{if(!X)N({channel:f,v:_,type:"file-snapshot-result",id:o.id,payload:y})},h=(y)=>a({error:(y.trim()||"Could not read the edited file.").slice(0,_e)}),m=pe;if(!m){h("This extension does not edit files.");return}Promise.resolve().then(()=>m(o.payload.purpose)).then((y)=>{if(et(y)>ke){h(`The file is over ${ke} ${"bytes"in y?"bytes":"characters"}.`);return}if(y.version.length>Re){h(`The snapshot version is over ${Re} characters.`);return}a({snapshot:"bytes"in y?{bytes:y.bytes,version:y.version}:{content:y.content,version:y.version}})},(y)=>h(y instanceof Error?y.message:String(y)));return}if(o.type==="resolve"){let a=(m)=>{N({channel:f,v:_,type:"resolve-result",id:o.id,payload:m})},h=de;if(!h){a({error:"This extension does not resolve commands."});return}Promise.resolve().then(()=>h(o.payload)).then((m)=>a({item:m?oe(m):null}),(m)=>{let y=(m instanceof Error?m.message:String(m)).trim();a({error:(y||"Command failed.").slice(0,_e)})});return}let s=Z.get(o.id);if(!s)return;if(clearTimeout(s.timer),Z.delete(o.id),o.ok){s.resolve(o.payload);return}s.reject(new c(o.code,o.error))};r.addEventListener("message",Bt),N({channel:f,v:_,type:"hello"});let U=(t,o=l)=>{if(X||r.parent===r)return Promise.reject(new c("HOST_UNAVAILABLE","No host frame. This page is not in an iframe."));return new Promise((s,a)=>{let h=setTimeout(()=>{Z.delete(t.id),a(new c("HOST_TIMEOUT","Host did not answer in time."))},o);Z.set(t.id,{resolve:s,reject:a,timer:h}),N(t)})},k=(t)=>U(t).then(()=>{return}),R={channel:f,v:_},Ke=(t)=>{if(!X&&r.parent!==r)N(t)},Vt=()=>Ke({...R,type:"file-save"}),zt=(t)=>{if(!vo(t)||!ir(t))return;t.preventDefault(),Vt()},jt=(t)=>{if(!vo(t)||t.key!=="Escape"||d?.surface!=="popover"||!d.popover)return;t.preventDefault(),Yt(d.popover.id,"escape").catch(()=>{return})},xe=()=>{let t=d?.surface==="popover"?d.popover:void 0;if(!t)return;let o=Ee||fe;if(Ht===o)return;Ht=o,Qt(t.id,o).catch(()=>{return})},ge=()=>{if(d?.surface!=="popover"||Ee)return;Ee=!0,xe()},Kt=(t)=>{if(d?.surface!=="popover"||t.relatedTarget!==null||!Ee)return;Ee=!1,xe()},Wt=()=>{if(d?.surface!=="popover"||fe)return;fe=!0,xe()},Jt=()=>{if(d?.surface!=="popover"||!fe)return;fe=!1,xe()},H=(t,o=1024)=>{if(!t.trim()||t.length>o)throw new c("HOST_REJECTED",`Identity must contain 1 to ${o} characters.`)},We=async(t)=>{if(t.kind!=="projects")H(t.projectId);let o=await U({...R,type:"workspace-read",id:E(u),payload:t});if(!o||!("kind"in o)||!("state"in o)||o.kind!==t.kind)throw new c("HOST_REJECTED","Host did not return workspace data.");return o},Je=async(t,o)=>{if(t.kind!=="projects")H(t.projectId);let s=E(u);q.set(s,o);try{await k({...R,type:"workspace-subscribe",id:E(u),payload:{subscriptionId:s,query:t}})}catch(a){if(q.delete(s),!X)N({...R,type:"workspace-unsubscribe",id:E(u),payload:{subscriptionId:s}});throw a}return()=>{if(!q.delete(s)||X)return;N({...R,type:"workspace-unsubscribe",id:E(u),payload:{subscriptionId:s}})}},Zo=async(t,o)=>{if(t.kind==="session")H(t.sessionId);if(t.kind==="project")H(t.projectId);let s=E(u);ee.set(s,o);try{await k({...R,type:"shells-subscribe",id:E(u),payload:{subscriptionId:s,scope:t}})}catch(a){if(ee.delete(s),!X)N({...R,type:"shells-unsubscribe",id:E(u),payload:{subscriptionId:s}});throw a}return()=>{if(!ee.delete(s)||X)return;N({...R,type:"shells-unsubscribe",id:E(u),payload:{subscriptionId:s}})}},be=async(t)=>{if("key"in t&&(t.key.length===0||t.key.length>Qe))throw new c("HOST_REJECTED","Storage key must contain 1 to 128 characters.");if(t.op==="set"&&!te(t.value))throw new c("HOST_REJECTED","Storage values must be JSON.");if(t.op==="set"&&new TextEncoder().encode(JSON.stringify(t.value)).length>Ze)throw new c("HOST_REJECTED","Storage value exceeds 64 KiB.");if(t.scope==="device"&&d?.features?.deviceStorage!==!0)throw new c("UNSUPPORTED","This host does not support device storage.");let o=await U({...R,type:"storage",id:E(u),payload:t});if(!o||!("storage"in o)||o.op!==t.op)throw new c("HOST_REJECTED","Host did not return storage data.");return o},Yt=(t,o)=>d?.features?.popovers!==!0&&!(d?.surface==="popover"&&d.popover?.id===t)?Promise.reject(new c("UNSUPPORTED","This host does not support popovers.")):k({...R,type:"popover-close",id:E(u),payload:o?{id:t,reason:o}:{id:t}}),Qt=(t,o)=>d?.features?.popovers!==!0&&!(d?.surface==="popover"&&d.popover?.id===t)?Promise.reject(new c("UNSUPPORTED","This host does not support popovers.")):k({...R,type:"popover-anchor",id:E(u),payload:{id:t,active:o}});return r.addEventListener("keydown",jt,!0),r.addEventListener("pointerover",ge),r.addEventListener("pointermove",ge),r.addEventListener("pointerout",Kt),r.addEventListener("focus",Wt),r.addEventListener("blur",Jt),{onAction:(t)=>(le=t,()=>{if(le===t)le=null}),listProjects:async()=>{let t=await We({kind:"projects"});if(t.kind!=="projects")throw new c("HOST_REJECTED","Expected projects.");return t},listWorktrees:async(t)=>{let o=await We({kind:"worktrees",projectId:t});if(o.kind!=="worktrees")throw new c("HOST_REJECTED","Expected worktrees.");return o},listSessions:async(t)=>{let o=await We({kind:"sessions",projectId:t});if(o.kind!=="sessions")throw new c("HOST_REJECTED","Expected sessions.");return o},onProjects:(t)=>Je({kind:"projects"},(o)=>{if(o.kind==="projects")t(o)}),onWorktrees:(t,o)=>Je({kind:"worktrees",projectId:t},(s)=>{if(s.kind==="worktrees")o(s)}),onSessions:(t,o)=>Je({kind:"sessions",projectId:t},(s)=>{if(s.kind==="sessions")o(s)}),onRunningShells:(t,o)=>Zo(t,o),readShellOutput:async(t,o)=>{H(t,Oe);let s=o?.cursor;if(s!==void 0&&(!Number.isInteger(s)||s<0))throw new c("HOST_REJECTED","Shell output cursor must be a non-negative integer.");let a=o?.tailBytes;if(a!==void 0&&(!Number.isInteger(a)||a<1||a>Ae))throw new c("HOST_REJECTED",`Shell output tailBytes must be an integer between 1 and ${Ae}.`);let m=await U({...R,type:"shell-output",id:E(u),payload:{shellId:t,cursor:s,tailBytes:a}});if(!m||typeof m.output!=="string"||!Number.isFinite(m.cursor))throw new c("HOST_REJECTED","Host did not return shell output.");return m},stopShell:async(t)=>{if(H(t,Oe),(await U({...R,type:"shell-stop",id:E(u),payload:{shellId:t}}))?.stopped!==!0)throw new c("HOST_REJECTED","Host did not stop the shell.");return{stopped:!0}},openSession:async(t)=>{H(t),await k({...R,type:"open-session",id:E(u),payload:{sessionId:t}})},storage:{get:async(t,o)=>{let s=Pe(o),a={op:"get",key:t};if(s)a.scope=s;let h=await be(a);return h.op==="get"&&h.found?h.value:void 0},set:async(t,o,s)=>{let a=Pe(s),h={op:"set",key:t,value:o};if(a)h.scope=a;await be(h)},delete:async(t,o)=>{let s=Pe(o),a={op:"delete",key:t};if(s)a.scope=s;await be(a)},keys:async(t)=>{let o=Pe(t),s={op:"keys"};if(o)s.scope=o;let a=await be(s);if(a.op!=="keys")throw new c("HOST_REJECTED","Expected storage keys.");return a.keys}},onReady:(t)=>{if(p.add(t),d)t(d);return()=>{p.delete(t)}},onDirectory:(t)=>{if(S.add(t),d)t(d.directory);return()=>{S.delete(t)}},onSession:(t)=>{if(T.add(t),d)t(d.session);return()=>{T.delete(t)}},onSessionLifecycle:(t)=>{if(b.add(t),B)t(B);return()=>{b.delete(t)}},onConnection:(t)=>{if(I.add(t),d)t(d.connection);return()=>{I.delete(t)}},onSettings:(t)=>{if(v.add(t),d)t(d.settings);return()=>{v.delete(t)}},onItem:(t)=>{if(F.add(t),d)t(d.item);return()=>{F.delete(t)}},onStatusControl:(t)=>(K.add(t),()=>{K.delete(t)}),onPopoverClosed:(t)=>(Te.add(t),()=>{Te.delete(t)}),setStatusControls:(t)=>{if(d?.features?.statusControls!==!0)return Promise.reject(new c("UNSUPPORTED","This host does not support status controls."));if(!ro(t))return Promise.reject(new c("HOST_REJECTED","Status controls must have unique bounded ids and valid selected options."));return k({...R,type:"status-controls",id:E(u),payload:{controls:t}})},openPopover:(t)=>{if(d?.features?.popovers!==!0)return Promise.reject(new c("UNSUPPORTED","This host does not support popovers."));if(!ot(t))return Promise.reject(new c("HOST_REJECTED","Popover requests need bounded geometry and JSON data."));return k({...R,type:"popover-open",id:E(u),payload:t})},closePopover:Yt,setPopoverAnchorActive:Qt,onResolve:(t)=>(de=t,()=>{if(de===t)de=null}),toast:(t)=>{let o=t.message.trim();if(!o||o.length>ye)return Promise.reject(new c("HOST_REJECTED",`Toast message must contain 1 to ${ye} characters.`));if(t.copy&&t.copy!==!0&&(!t.copy.text.length||t.copy.text.length>ve))return Promise.reject(new c("HOST_REJECTED",`Toast copy text must contain 1 to ${ve} characters.`));return k({channel:f,v:_,type:"toast",id:E(u),payload:{...t,message:o}})},openUrl:(t)=>k({channel:f,v:_,type:"open-url",id:E(u),payload:{url:t}}),openCommit:(t)=>it(t)?k({channel:f,v:_,type:"open-commit",id:E(u),payload:{sha:t}}):Promise.reject(new c("HOST_REJECTED","Commit id must be 7 to 64 hex characters.")),openSurface:(t)=>k({channel:f,v:_,type:"open-surface",id:E(u),payload:{surfaceId:t}}),writeClipboard:(t)=>k({channel:f,v:_,type:"clipboard-write",id:E(u),payload:{text:t}}),compose:(t)=>k({channel:f,v:_,type:"compose",id:E(u),payload:t}),attach:(t)=>k({channel:f,v:_,type:"attach",id:E(u),payload:oe(t)}),startSession:async(t)=>{if(t.projectId!==void 0)H(t.projectId);let o=t.worktree;if(o&&o!==!0)if(o.kind==="existing")H(o.directory);else{if(o.name!==void 0)H(o.name,200);if(o.baseBranch!==void 0)H(o.baseBranch,200)}let s=await U({channel:f,v:_,type:"start-session",id:E(u),payload:lt(t)},e.requestTimeoutMs??180000);if(!nt(s))throw new c("HOST_REJECTED","Host did not return a session.");return s},prompt:(t)=>U({channel:f,v:_,type:"prompt",id:E(u),payload:pt(t)}).then((o)=>{if(!st(o))throw new c("HOST_REJECTED","Host did not return a prompt result.");return o}),sessionLink:(t)=>k({channel:f,v:_,type:"session-link",id:E(u),payload:oe(t)}),close:()=>k({channel:f,v:_,type:"close",id:E(u)}),oauthStart:()=>k({channel:f,v:_,type:"oauth-start",id:E(u)}),oauthDisconnect:()=>k({channel:f,v:_,type:"oauth-disconnect",id:E(u)}),request:(t)=>(Le(t.path)?U({channel:f,v:_,type:"request",id:E(u),payload:t}):Uo()).then((o)=>{if(!Me(o))throw new c("HOST_REJECTED","Host request result was empty.");return o}),serviceRequest:(t)=>(Le(t.path)?U({channel:f,v:_,type:"service-request",id:E(u),payload:t}):Uo()).then((o)=>{if(!Me(o))throw new c("HOST_REJECTED","Host service request result was empty.");return o}),serviceStatus:()=>U({channel:f,v:_,type:"service-status",id:E(u)}).then((t)=>{if(!ft(t))throw new c("HOST_REJECTED","Host did not return service status.");return t}),readFile:(t)=>(re(t)?U({channel:f,v:_,type:"file-read",id:E(u),payload:{path:t}}):Ne()).then((o)=>{if(!_t(o))throw new c("HOST_REJECTED","Host did not return file content.");return o}),writeFile:(t,o)=>{if(!re(t))return Ne();if(o.length>we)return Promise.reject(new c("FILE_TOO_LARGE",`Content is over ${we} characters.`));return U({channel:f,v:_,type:"file-write",id:E(u),payload:{path:t,content:o}}).then((s)=>{if(!St(s))throw new c("HOST_REJECTED","Host did not confirm the write.");return s})},listDir:(t)=>(re(t)?U({channel:f,v:_,type:"file-list",id:E(u),payload:{path:t}}):Ne()).then((o)=>{if(!Tt(o))throw new c("HOST_REJECTED","Host did not return directory entries.");return o}),stat:(t)=>(re(t)?U({channel:f,v:_,type:"file-stat",id:E(u),payload:{path:t}}):Ne()).then((o)=>{if(!mt(o))throw new c("HOST_REJECTED","Host did not return file status.");return o}),generate:(t)=>{let o=t.prompt.trim(),s=t.system?.trim();if(o.length===0||o.length>Ce)return Promise.reject(new c("HOST_REJECTED",`Prompt must be 1 to ${Ce} characters.`));if(s!==void 0&&(s.length===0||s.length>Ie))return Promise.reject(new c("HOST_REJECTED",`System prompt must be 1 to ${Ie} characters.`));let a=t.maxOutputTokens===void 0?void 0:Math.min(ct,Math.max(1,Math.floor(t.maxOutputTokens)));if(a!==void 0&&!Number.isFinite(a))return Promise.reject(new c("HOST_REJECTED","maxOutputTokens must be a number."));let h={prompt:o};if(s!==void 0)h.system=s;if(a!==void 0)h.maxOutputTokens=a;return U({channel:f,v:_,type:"generate",id:E(u),payload:h},e.requestTimeoutMs??dt).then((m)=>{if(!ht(m))throw new c("HOST_REJECTED","Host did not return generated text.");return m})},onLateGenerateResult:(t)=>{Q.add(t);for(let o of ze.splice(0))O([t],o);return Ft(),()=>{Q.delete(t)}},setBadge:(t)=>k({channel:f,v:_,type:"badge",id:E(u),payload:{count:ut(t)}}),setHeight:(t)=>k({channel:f,v:_,type:"resize",id:E(u),payload:{height:Et(t)}}),onFileOpen:(t)=>{if(me.add(t),!je)je=!0,r.addEventListener("keydown",zt,!0);if(ue)t(ue);return()=>{me.delete(t)}},onFileSnapshot:(t)=>(pe=t,()=>{if(pe===t)pe=null}),onFileSaved:(t)=>(he.add(t),()=>{he.delete(t)}),reportFileChange:(t)=>Ke({...R,type:"file-change",payload:{dirty:t.dirty,edited:t.edited}}),requestFileSave:Vt,reportFileUnsupported:()=>Ke({...R,type:"file-unsupported"}),dispose:()=>{for(let t of q.keys())N({...R,type:"workspace-unsubscribe",id:E(u),payload:{subscriptionId:t}});q.clear();for(let t of ee.keys())N({...R,type:"shells-unsubscribe",id:E(u),payload:{subscriptionId:t}});if(ee.clear(),X=!0,de=null,le=null,pe=null,me.clear(),he.clear(),je)r.removeEventListener("keydown",zt,!0);r.removeEventListener("message",Bt),r.removeEventListener("keydown",jt,!0),r.removeEventListener("pointerover",ge),r.removeEventListener("pointermove",ge),r.removeEventListener("pointerout",Kt),r.removeEventListener("focus",Wt),r.removeEventListener("blur",Jt);for(let t of Z.values())clearTimeout(t.timer),t.reject(new c("HOST_UNAVAILABLE","Host client was disposed."));Z.clear(),p.clear(),S.clear(),T.clear(),b.clear(),I.clear(),v.clear(),F.clear(),K.clear(),Te.clear(),Q.clear(),ze.length=0}}};var wo=["browser.open","browser.snapshot","browser.click","browser.type","browser.select","browser.scroll","browser.back","browser.forward","browser.inspect","browser.capture","browser.resize","browser.close"];var Wr=new Set(wo);var Co=["none","agent","user"];var Yr=new Set(Co);var ar=[["--oc-bg","background"],["--oc-elevated","elevated"],["--oc-fg","foreground"],["--oc-muted","muted"],["--oc-subtle","subtle"],["--oc-border","border"],["--oc-hover","hover"],["--oc-selection","selection"],["--oc-focus","focus"],["--oc-primary","primary"],["--oc-muted-surface","mutedSurface"],["--oc-elevated-fg","elevatedForeground"],["--oc-active","active"],["--oc-selection-fg","selectionForeground"],["--oc-primary-fg","primaryForeground"],["--oc-primary-text","primaryText"],["--oc-success-text","successText"],["--oc-warning-text","warningText"],["--oc-error-text","errorText"],["--oc-info-text","infoText"],["--oc-success","success"],["--oc-warning","warning"],["--oc-error","error"],["--oc-info","info"],["--oc-font","font"],["--oc-mono","mono"],["--oc-radius","radius"],["--surface-background","background"],["--surface-elevated","elevated"],["--surface-foreground","foreground"],["--surface-muted-foreground","muted"],["--surface-subtle","subtle"],["--interactive-border","border"],["--interactive-hover","hover"],["--interactive-selection","selection"],["--interactive-focus-ring","focus"],["--primary","primary"],["--surface-muted","mutedSurface"],["--surface-elevated-foreground","elevatedForeground"],["--interactive-active","active"],["--interactive-selection-foreground","selectionForeground"],["--primary-foreground","primaryForeground"],["--primary-text","primaryText"],["--success-text","successText"],["--warning-text","warningText"],["--error-text","errorText"],["--info-text","infoText"],["--status-success","success"],["--status-warning","warning"],["--status-error","error"],["--status-info","info"],["--font-sans","font"],["--font-mono","mono"],["--radius","radius"]],cr=[["--oc-syntax-keyword","--syntax-keyword","syntaxKeyword"],["--oc-syntax-string","--syntax-string","syntaxString"],["--oc-syntax-number","--syntax-number","syntaxNumber"],["--oc-syntax-function","--syntax-function","syntaxFunction"],["--oc-syntax-type","--syntax-type","syntaxType"],["--oc-syntax-comment","--syntax-comment","syntaxComment"],["--oc-syntax-variable","--syntax-variable","syntaxVariable"],["--oc-syntax-operator","--syntax-operator","syntaxOperator"]],Io=(e,r)=>{r.style.colorScheme=e.mode;for(let[n,l]of ar)r.style.setProperty(n,e.tokens[l]);for(let[n,l,p]of cr){let S=e.tokens[p]??"";r.style.setProperty(n,S),r.style.setProperty(l,S)}r.style.setProperty("font-family",e.tokens.font),r.style.setProperty("font-size","0.875rem"),r.style.setProperty("line-height","1.45"),r.style.setProperty("color",e.tokens.foreground)},bt=(e,r)=>{if(Io(e.theme,r),r.dataset)r.dataset.ocSurface=e.surface,r.dataset.ocTheme=e.theme.mode};var dr={"surface-background":"bg","surface-elevated":"elevated","surface-elevated-foreground":"elevated-fg","surface-foreground":"fg","surface-muted-foreground":"muted","surface-muted":"muted-surface","surface-subtle":"subtle","interactive-border":"border","interactive-hover":"hover","interactive-active":"active","interactive-selection":"selection","interactive-selection-foreground":"selection-fg","interactive-focus-ring":"focus",primary:"primary","primary-foreground":"primary-fg","primary-text":"primary-text","success-text":"success-text","warning-text":"warning-text","error-text":"error-text","info-text":"info-text","status-success":"success","status-warning":"warning","status-error":"error","status-info":"info","font-sans":"font","font-mono":"mono",radius:"radius"},g=(e,r)=>`var(--${e}, var(--oc-${dr[e]}, ${r}))`,z=g("surface-background","transparent"),De=g("surface-elevated","transparent"),ne=g("surface-elevated-foreground","inherit"),P=g("surface-foreground","inherit"),x=g("surface-muted-foreground","gray"),lr=g("surface-muted","transparent"),W=g("interactive-border","currentColor"),w=g("interactive-hover","transparent"),Y=g("interactive-active","transparent"),Ot=g("interactive-selection","transparent"),At=g("interactive-selection-foreground","inherit"),V=g("primary","currentColor"),kt=g("primary-text","inherit"),Rt=g("error-text","inherit"),pr=g("font-sans","inherit"),yt=g("font-mono","monospace"),Go=g("radius","9px"),vt=`calc(${Go} - 2px)`,Lo=`calc(${Go} - 4px)`,A=(e,r,n="transparent")=>`color-mix(in srgb, ${e} ${r}%, ${n})`,Mo=`background-image: linear-gradient(${w}, ${w});`,Ut=(e)=>`box-shadow: inset 0 0 0 1px ${e}, var(--oc-sdk-field-lift);`,wt="border-color: var(--oc-sdk-edge); box-shadow: var(--oc-sdk-raised-lift);",No="box-shadow: var(--oc-sdk-lit);",Po=`inset 0 1px 0 0 ${A(P,1.5)}, 0 1px 1px 0 rgb(0 0 0 / 0.28), 0 2px 3px -2px rgb(0 0 0 / 0.2)`,ur=`
:root {
  --oc-sdk-edge: ${A(P,10)};
  --oc-sdk-field-bg: ${De};
  --oc-sdk-raised-bg: ${z};
  --oc-sdk-field-lift: inset 0 1px 2px 0 rgb(0 0 0 / 0.04);
  --oc-sdk-raised-lift: 0 1px 2px 0 rgb(0 0 0 / 0.06);
  --oc-sdk-lit: inset 0 1px 0 0 rgb(255 255 255 / 0.45), 0 1px 2px 0 rgb(0 0 0 / 0.08);
  --oc-sdk-float-edge: rgb(0 0 0 / 0.1);
  --oc-sdk-float: inset 0 1px 0 0 rgb(255 255 255 / 0.8), inset 0 0 0 1px rgb(0 0 0 / 0.04), 0 1px 2px -0.5px rgb(0 0 0 / 0.08), 0 4px 8px -2px rgb(0 0 0 / 0.08), 0 12px 20px -4px rgb(0 0 0 / 0.08);
}
:root[data-oc-theme="dark"] {
  --oc-sdk-edge: ${A(P,6)};
  --oc-sdk-field-bg: ${A(z,50,De)};
  --oc-sdk-raised-bg: ${De};
  --oc-sdk-field-lift: ${Po};
  --oc-sdk-raised-lift: ${Po};
  --oc-sdk-lit: inset 0 1px 0 0 ${A(P,1.5)}, 0 1px 1px 0 rgb(0 0 0 / 0.28), 0 2px 3px -2px rgb(0 0 0 / 0.2);
  --oc-sdk-float-edge: rgb(0 0 0 / 0.36);
  --oc-sdk-float: inset 0 1px 0 0 rgb(255 255 255 / 0.06), inset 0 0 0 1px rgb(255 255 255 / 0.08), 0 1px 1px -0.5px rgb(0 0 0 / 0.22), 0 3px 3px -1.5px rgb(0 0 0 / 0.2), 0 6px 6px -3px rgb(0 0 0 / 0.16);
}`,Ge=(e)=>{let r=g(`status-${e}`,"currentColor");return`
.oc-sdk[data-tone="${e}"], .oc-sdk [data-tone="${e}"] { --oc-sdk-tone: ${r}; --oc-sdk-tone-text: ${g(`${e}-text`,"inherit")}; }`},Er=`
.oc-sdk { box-sizing: border-box; font-size: 0.875rem; line-height: 1.45; }
.oc-sdk *, .oc-sdk *::before, .oc-sdk *::after { box-sizing: border-box; }
/* :where() keeps the reset at zero specificity so every primitive class below overrides it. */
:where(.oc-sdk) :where(button, input, textarea), :where(button.oc-sdk, input.oc-sdk, textarea.oc-sdk) { font: inherit; color: inherit; margin: 0; }
:where(.oc-sdk) :where(button), :where(button.oc-sdk) { cursor: pointer; background: none; border: 0; padding: 0; }
.oc-sdk button:disabled, button.oc-sdk:disabled, .oc-sdk[aria-disabled="true"], .oc-sdk [aria-disabled="true"] { opacity: .5; pointer-events: none; }

.oc-sdk-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 32px; padding: 0 12px; border: 1px solid transparent; font-size: 0.875rem; font-weight: 500; line-height: 1; white-space: nowrap; }
.oc-sdk-btn[data-size="sm"] { gap: 6px; height: 28px; padding: 0 10px; font-size: 0.8125rem; }
.oc-sdk-btn[data-size="xs"] { gap: 4px; height: 24px; padding: 0 8px; font-size: 0.75rem; }
.oc-sdk-btn[data-loading="true"] { opacity: .5; pointer-events: none; }
.oc-sdk-btn > .oc-sdk-spinner-ring { width: 14px; height: 14px; }

.oc-sdk-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-field-label { font-size: 0.8125rem; font-weight: 500; }
.oc-sdk-field-note { font-size: 0.75rem; }
.oc-sdk-input { display: block; width: 100%; min-width: 0; height: 32px; padding: 0 10px; border: 0; font-size: 0.875rem; line-height: 1.45; appearance: none; }
textarea.oc-sdk-input { height: auto; padding: 8px 10px; resize: vertical; }

.oc-sdk-search { position: relative; min-width: 0; }
.oc-sdk-search .oc-sdk-input { padding-left: 34px; padding-right: 34px; }
.oc-sdk-search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); pointer-events: none; }
.oc-sdk-search-clear { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); display: none; align-items: center; justify-content: center; width: 24px; height: 24px; }
.oc-sdk-search[data-active="true"] .oc-sdk-search-clear { display: inline-flex; }

.oc-sdk-select { position: relative; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-trigger { display: inline-flex; align-items: center; gap: 6px; align-self: flex-start; width: auto; max-width: 100%; min-width: 0; height: 28px; padding: 0 10px; border: 1px solid transparent; font-size: 0.8125rem; text-align: left; }
.oc-sdk-trigger-value { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-trigger-chevron { flex: 0 0 auto; }
.oc-sdk-popup { position: fixed; z-index: 50; display: flex; flex-direction: column; gap: 2px; min-width: 160px; max-width: calc(100vw - 16px); max-height: min(320px, calc(100vh - 16px)); overflow: auto; padding: 4px; border: 1px solid transparent; }
.oc-sdk-popup-search { flex: 0 0 auto; padding: 2px 2px 4px; }
.oc-sdk-popup-search .oc-sdk-input { height: 28px; font-size: 0.8125rem; }
.oc-sdk-option { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 8px; font-size: 0.8125rem; text-align: left; }
.oc-sdk-option-label { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-option-hint { flex: 0 0 auto; font-size: 0.75rem; }
.oc-sdk-option-check { flex: 0 0 auto; display: inline-flex; width: 14px; visibility: hidden; }
.oc-sdk-option[aria-selected="true"] > .oc-sdk-option-check { visibility: visible; }
.oc-sdk-popup-empty { padding: 8px; font-size: 0.8125rem; }

.oc-sdk-check { display: inline-flex; align-items: flex-start; gap: 8px; width: 100%; text-align: left; }
.oc-sdk-check-box { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; margin-top: 3px; border: 1px solid transparent; }
.oc-sdk-check-box > svg { display: none; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-box > svg { display: block; }
.oc-sdk-check-thumb { flex: 0 0 auto; position: relative; width: 36px; height: 20px; }
.oc-sdk-check-thumb::after { content: ""; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; }
.oc-sdk-check-text { display: flex; flex-direction: column; min-width: 0; }
.oc-sdk-check-label { font-size: 0.875rem; }
.oc-sdk-check-desc { font-size: 0.75rem; }

.oc-sdk-tabs { display: inline-flex; gap: 2px; padding: 2px; max-width: 100%; overflow: auto; }
.oc-sdk-tab { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border: 1px solid transparent; font-size: 0.8125rem; font-weight: 500; white-space: nowrap; }
.oc-sdk-tab-count { font-size: 0.75rem; font-variant-numeric: tabular-nums; }

.oc-sdk-badge { display: inline-flex; align-items: center; padding: 1px 6px; font-size: 11px; font-weight: 500; line-height: 16px; white-space: nowrap; }

.oc-sdk-list { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.oc-sdk-row { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 8px; text-align: left; }
.oc-sdk-row-lead { flex: 0 0 auto; width: 64px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.75rem; }
.oc-sdk-row-main { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; }
.oc-sdk-row-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-row-sub { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.75rem; }
.oc-sdk-row-meta { flex: 0 0 auto; font-size: 0.75rem; font-variant-numeric: tabular-nums; }
.oc-sdk-list-empty { padding: 16px 8px; text-align: center; font-size: 0.8125rem; }

.oc-sdk-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 40px 16px; text-align: center; }
.oc-sdk-empty-title { margin: 0; font-size: 0.8125rem; font-weight: 600; }
.oc-sdk-empty-body { margin: 0; max-width: 32rem; font-size: 0.8125rem; }
.oc-sdk-empty-action { margin-top: 12px; }

@keyframes oc-sdk-spin { to { transform: rotate(360deg); } }
.oc-sdk-spinner { display: inline-flex; align-items: center; gap: 8px; font-size: 0.8125rem; }
.oc-sdk-spinner-ring { width: 16px; height: 16px; border: 2px solid transparent; animation: oc-sdk-spin .8s linear infinite; }
.oc-sdk-spinner[data-size="sm"] .oc-sdk-spinner-ring { width: 12px; height: 12px; }

.oc-sdk-banner { display: flex; align-items: flex-start; gap: 12px; padding: 8px 12px; border: 1px solid transparent; }
.oc-sdk-banner-text { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.oc-sdk-banner-title { font-size: 0.8125rem; font-weight: 500; }
.oc-sdk-banner-body { font-size: 0.8125rem; }
.oc-sdk-banner-action { flex: 0 0 auto; }

.oc-sdk-separator { display: flex; align-items: center; gap: 8px; width: 100%; margin: 8px 0; font-size: 0.75rem; }
.oc-sdk-separator::before, .oc-sdk-separator::after { content: ""; flex: 1 1 auto; height: 1px; }
.oc-sdk-separator[data-labeled="false"]::after { display: none; }
.oc-sdk-popup > .oc-sdk-separator { margin: 4px 0; }

.oc-sdk-progress { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-progress-label { display: flex; justify-content: space-between; font-size: 0.75rem; font-variant-numeric: tabular-nums; }
.oc-sdk-progress-track { height: 6px; overflow: hidden; }
.oc-sdk-progress-fill { height: 100%; transform-origin: left; transition: transform 200ms ease-out; }

.oc-sdk-menu { position: relative; display: inline-flex; }

.oc-sdk-text { white-space: pre-wrap; overflow-wrap: anywhere; }
.oc-sdk-text img { display: block; max-width: 100%; margin: 8px 0; }
`,Do=`${ur}
.oc-sdk { color: ${P}; font-family: ${pr}; }
.oc-sdk :focus-visible, .oc-sdk:focus-visible { outline: none; }
.oc-sdk :where(button, a[href], [role="button"], [role="tab"], [role="option"]):focus-visible, button.oc-sdk:focus-visible { ${Mo} }
.oc-sdk-mono { font-family: ${yt}; }
.oc-sdk-muted { color: ${x}; }
${Ge("success")}${Ge("warning")}${Ge("error")}${Ge("info")}
.oc-sdk[data-tone="primary"], .oc-sdk [data-tone="primary"] { --oc-sdk-tone: ${V}; --oc-sdk-tone-text: ${kt}; }

.oc-sdk-btn { border-radius: ${vt}; transition: background 150ms ease-out, color 150ms ease-out; }
.oc-sdk-btn[data-size="xs"] { border-radius: ${Lo}; }
.oc-sdk-btn[data-variant="default"] { color: ${kt}; background: ${A(V,10,z)}; border-color: ${A(V,12)}; ${No} }
.oc-sdk-btn[data-variant="default"]:hover { background: ${A(V,16,z)}; }
.oc-sdk-btn[data-variant="default"]:active { background: ${A(V,22,z)}; box-shadow: none; }
.oc-sdk-btn[data-variant="secondary"] { background: ${lr}; color: var(--oc-fg); }
.oc-sdk-btn[data-variant="secondary"]:hover { background-image: linear-gradient(${w}, ${w}); }
.oc-sdk-btn[data-variant="secondary"]:active { background-image: linear-gradient(${Y}, ${Y}); }
.oc-sdk-btn[data-variant="outline"] { background: var(--oc-sdk-raised-bg); color: ${ne}; ${wt} }
.oc-sdk-btn[data-variant="outline"]:hover { background-image: linear-gradient(${w}, ${w}); }
.oc-sdk-btn[data-variant="outline"]:active { background-image: linear-gradient(${Y}, ${Y}); box-shadow: none; }
.oc-sdk-btn[data-variant="ghost"] { background: transparent; }
.oc-sdk-btn[data-variant="ghost"]:hover { background: ${w}; }
.oc-sdk-btn[data-variant="ghost"]:active { background: ${Y}; }
.oc-sdk-btn[data-variant="destructive"] { --oc-sdk-tone: ${g("status-error","red")}; color: ${Rt}; background: ${A("var(--oc-sdk-tone)",7,z)}; border-color: ${A("var(--oc-sdk-tone)",12)}; ${No} }
.oc-sdk-btn[data-variant="destructive"]:hover { background: ${A("var(--oc-sdk-tone)",9,z)}; }
.oc-sdk-btn[data-variant="destructive"]:active { background: ${A("var(--oc-sdk-tone)",11,z)}; box-shadow: none; }

.oc-sdk-field-note { color: ${x}; }
.oc-sdk-field[data-invalid="true"] .oc-sdk-field-note { color: ${Rt}; }
.oc-sdk-input { border-radius: ${vt}; background: var(--oc-sdk-field-bg); color: ${ne}; ${Ut("var(--oc-sdk-edge)")} transition: background 150ms ease-out; }
.oc-sdk-input::placeholder { color: ${x}; }
.oc-sdk-input:hover:not(:focus) { background-image: linear-gradient(${w}, ${w}); }
.oc-sdk-input:focus, .oc-sdk-input:focus-visible { ${Ut(A(P,26))} }
.oc-sdk-field[data-invalid="true"] .oc-sdk-input, .oc-sdk-field[data-invalid="true"] .oc-sdk-input:focus { ${Ut(g("status-error","red"))} }
.oc-sdk-input[data-mono="true"] { font-family: ${yt}; }

.oc-sdk-search-icon { color: ${x}; }
.oc-sdk-search[data-active="true"] .oc-sdk-search-icon { color: ${V}; }
.oc-sdk-search-clear { border-radius: ${Lo}; color: ${x}; }
.oc-sdk-search-clear:hover { background: ${w}; color: ${P}; }

.oc-sdk-trigger { border-radius: ${vt}; background: var(--oc-sdk-raised-bg); color: ${ne}; ${wt} transition: background 150ms ease-out; }
.oc-sdk-trigger:hover { background-image: linear-gradient(${w}, ${w}); }
.oc-sdk-trigger[aria-expanded="true"] { background-image: linear-gradient(${Y}, ${Y}); }
.oc-sdk-trigger-value[data-empty="true"] { color: ${x}; }
.oc-sdk-trigger-chevron { color: ${x}; }
/* The app's dropdown light: lit top, hairline rings and a layered shadow. Its outer ring is the border, over the page like the app's. */
.oc-sdk-popup { --surface-foreground: ${ne}; border-color: var(--oc-sdk-float-edge); border-radius: 12px; background: ${De}; background-clip: padding-box; color: ${ne}; box-shadow: var(--oc-sdk-float); }
.oc-sdk-option { border-radius: 8px; }
.oc-sdk-option[data-active="true"] { background: ${w}; }
/* A selected option shows a check mark in the text colour, like the app's own pickers. Options without the mark come
   from bundles built before it existed and keep the selection fill as their only sign of the choice. */
.oc-sdk-option[aria-selected="true"]:not([data-mark]) { background: ${Ot}; color: ${At}; }
.oc-sdk-option-check { color: ${P}; }
.oc-sdk-option[data-destructive="true"] { color: ${Rt}; }
.oc-sdk-option[data-destructive="true"][data-active="true"] { background: ${A(g("status-error","red"),10)}; }
.oc-sdk-option-hint { color: ${x}; }
.oc-sdk-popup-empty { color: ${x}; }

/* Checked stays neutral: the mark carries the state, and the primary colour stays with primary actions. */
.oc-sdk-check-box { border-color: ${W}; border-radius: 4px; color: ${P}; transition: border-color 150ms ease-out; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-box { border-color: ${A(P,60,W)}; }
.oc-sdk-check-thumb { border-radius: 9999px; background: ${W}; transition: background 150ms ease-out; }
.oc-sdk-check-thumb::after { border-radius: 9999px; background: ${z}; transition: transform 150ms ease-out; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-thumb { background: ${V}; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-thumb::after { transform: translateX(16px); }
.oc-sdk-check:focus-visible { box-shadow: none; }
.oc-sdk-check:focus-visible .oc-sdk-check-box, .oc-sdk-check:focus-visible .oc-sdk-check-thumb { ${Mo} }
.oc-sdk-check-desc { color: ${x}; }

.oc-sdk-tabs { border-radius: 10px; }
.oc-sdk-tabs[data-track="true"] { background: ${A(P,4)}; box-shadow: inset 0 1px 2px 0 rgb(0 0 0 / 0.16); }
.oc-sdk-tab { border-radius: 8px; color: ${x}; transition: color 150ms ease-out, background 150ms ease-out; }
.oc-sdk-tab:hover { color: ${P}; }
.oc-sdk-tab[aria-selected="true"] { color: ${At}; background: ${Ot}; border-color: ${W}; }
.oc-sdk-tabs[data-track="true"] .oc-sdk-tab[aria-selected="true"] { color: ${ne}; background: var(--oc-sdk-raised-bg); ${wt} }
.oc-sdk-tab-count { color: ${x}; }

.oc-sdk-badge { border-radius: 9999px; background: ${w}; color: ${x}; }
.oc-sdk-badge[data-tone] { color: var(--oc-sdk-tone-text, var(--oc-sdk-tone)); background: ${A("var(--oc-sdk-tone)",15)}; }

.oc-sdk-row { border-radius: 6px; transition: background 120ms ease-out; }
.oc-sdk-row:hover, .oc-sdk-row[data-active="true"] { background: ${w}; }
.oc-sdk-row[aria-selected="true"] { background: ${Ot}; color: ${At}; }
.oc-sdk-row-lead { font-family: ${yt}; color: ${x}; }
.oc-sdk-row-sub { color: ${x}; }
.oc-sdk-row-meta { color: ${x}; }
.oc-sdk-row[aria-selected="true"] .oc-sdk-row-lead, .oc-sdk-row[aria-selected="true"] .oc-sdk-row-sub, .oc-sdk-row[aria-selected="true"] .oc-sdk-row-meta { color: inherit; opacity: .75; }
.oc-sdk-list-empty { color: ${x}; }

.oc-sdk-empty-body { color: ${x}; }

.oc-sdk-spinner { color: ${x}; }
.oc-sdk-spinner-ring { border-color: ${W}; border-top-color: ${V}; border-radius: 9999px; }

/* Set apart by its tint alone, like the app's banners. */
.oc-sdk-banner { border-color: transparent; border-radius: 8px; background: ${A("var(--oc-sdk-tone)",10)}; }
.oc-sdk-banner-title { color: var(--oc-sdk-tone-text, var(--oc-sdk-tone)); }
.oc-sdk-banner-body { color: ${x}; }

.oc-sdk-separator { color: ${x}; }
.oc-sdk-separator::before, .oc-sdk-separator::after { background: ${A(W,40)}; }

.oc-sdk-progress-label { color: ${x}; }
.oc-sdk-progress-track { border-radius: 9999px; background: ${W}; }
.oc-sdk-progress-fill { border-radius: 9999px; background: var(--oc-sdk-tone, ${V}); }

.oc-sdk-text a { color: ${kt}; text-decoration: underline; text-underline-offset: 2px; }
.oc-sdk-text img { border-radius: 8px; border: 1px solid ${A(W,60)}; }
`,C=`
${Ye}
${Er}
${Do}`;var mr=2000,Be="store-dir",$o={"needs-approval":"Allow the local service for Resource Queue in Settings → Extensions.",paused:"Resource Queue is paused in Settings → Extensions.","service-failed":"The Resource Queue service stopped. It restarts on the next refresh.",unreachable:"Could not reach the Resource Queue service.","bad-answer":"The Resource Queue service answered with something unexpected."},Lt=(e)=>typeof e==="object"&&e!==null,hr=(e)=>Lt(e)&&typeof e.at==="number"&&Lt(e.store)&&Lt(e.host)&&Array.isArray(e.resources)&&Array.isArray(e.recent),xr=(e)=>{if(!(e instanceof c))return"unreachable";if(e.code==="NO_SERVICE"||e.code==="NOT_GRANTED")return"needs-approval";if(e.code==="DISABLED")return"paused";if(e.code==="SERVICE_FAILED")return"service-failed";return"unreachable"},Mt=(e)=>!document.hidden&&e.getBoundingClientRect().width>0;async function Ho(e){try{let r=await e.storage.get(Be);return typeof r==="string"&&r.startsWith("/")?r:null}catch{return null}}function Xo(e,r,n,l,p){let S=!1,T=async()=>{if(S||!Mt(r))return;S=!0;try{let v=n(),F=await e.serviceRequest({method:"GET",path:"/snapshot",...v?{query:{dir:v}}:{}}),K=null;try{K=JSON.parse(F.body)}catch{}if(F.status===200&&hr(K))l(K);else p(F.status===200?"bad-answer":"service-failed")}catch(v){p(xr(v))}finally{S=!1}};T(),setInterval(()=>void T(),mr);let b=Mt(r),I=()=>{let v=Mt(r);if(v&&!b)T();b=v};return document.addEventListener("visibilitychange",I),new ResizeObserver(I).observe(document.documentElement),{refresh:()=>void T()}}function G(e){if(e===null||e===void 0)return"–";if(e<60)return`${e}s`;let r=Math.floor(e/60);if(r<60)return`${r}m${e%60&&r<10?` ${e%60}s`:""}`;return`${Math.floor(r/60)}h${r%60?` ${r%60}m`:""}`}function Fo(e,r){return`${G(Math.max(0,Math.round((r-e)/1000)))} ago`}function Nt(e){return e===null?"–":`${(e/1024/1024).toFixed(1)} GB`}function Ve(e,r){return r&&r!==e?`${e} (${r})`:e}function Bo(e){if(e==="granted")return"success";if(e.startsWith("expired"))return"error";if(e.startsWith("canceled"))return"warning";if(e==="precondition-blocked")return"warning";return"neutral"}function i(e,r="",n="",l=[]){let p=document.createElement(e);if(r)p.className=r;if(n)p.textContent=n;if(l.length)p.append(...l);return p}function D(e,r="neutral",n=""){let l=i("span",`badge ${r}`,e);if(n)l.title=n;return l}var Vo=300;var zo=`
  html, body { margin: 0; background: transparent; color: var(--oc-fg); font: 12px/1.4 var(--oc-font); }
  * { box-sizing: border-box; }
  .num { font-variant-numeric: tabular-nums; }
  .muted { color: var(--oc-muted); }
  .mono { font-family: var(--oc-mono); }
  .badge { display: inline-flex; align-items: center; height: 16px; padding: 0 6px; border-radius: 4px; font-size: 10px; font-weight: 600;
    white-space: nowrap; flex: none; background: color-mix(in srgb, var(--oc-fg) 8%, transparent); color: var(--oc-muted); }
  .badge.success { background: color-mix(in srgb, var(--oc-success) 16%, transparent); color: var(--oc-success-text, var(--oc-success)); }
  .badge.warning { background: color-mix(in srgb, var(--oc-warning) 18%, transparent); color: var(--oc-warning-text, var(--oc-warning)); }
  .badge.error { background: color-mix(in srgb, var(--oc-error) 16%, transparent); color: var(--oc-error-text, var(--oc-error)); }
  .badge.info, .badge.primary { background: color-mix(in srgb, var(--oc-primary) 14%, transparent); color: var(--oc-primary-text, var(--oc-primary)); }
  .note { color: var(--oc-muted); padding: 4px 2px; }
  .note.error { color: var(--oc-error-text, var(--oc-error)); }
`,jo=`
  html, body { height: 100%; overflow-y: auto; overflow-x: hidden; }
  #root { display: flex; flex-direction: column; gap: 14px; padding: 12px 12px 20px; }
  .head { display: flex; align-items: flex-start; gap: 8px; }
  .head .titles { min-width: 0; flex: 1; }
  .title { font-size: 13px; font-weight: 600; }
  .meta { color: var(--oc-muted); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .live { display: inline-flex; align-items: center; gap: 6px; color: var(--oc-muted); font-size: 11px; white-space: nowrap; padding-top: 2px; }
  .live::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--oc-success); }
  .live.stale::before { background: var(--oc-muted); }
  .hostline { display: flex; flex-wrap: wrap; gap: 6px 14px; color: var(--oc-muted); font-size: 11px; }
  .hostline b { color: var(--oc-fg); font-weight: 600; }
  .card { display: flex; flex-direction: column; gap: 8px; padding: 12px; border-radius: var(--oc-radius);
    background: color-mix(in srgb, var(--oc-fg) 4%, transparent); min-width: 0; }
  .card-top { display: flex; align-items: center; gap: 8px; }
  .card-top .name { font-size: 14px; font-weight: 650; }
  .card-top .grow { flex: 1; }
  .slots { display: flex; gap: 3px; }
  .slots span { width: 14px; height: 6px; border-radius: 2px; background: color-mix(in srgb, var(--oc-fg) 12%, transparent); }
  .slots span.on { background: var(--oc-primary); }
  .label { font-size: 10px; font-weight: 600; letter-spacing: .03em; color: var(--oc-muted); text-transform: uppercase; padding-top: 2px; }
  .row { display: flex; flex-direction: column; gap: 3px; padding: 6px 0 6px 10px; border-left: 2px solid var(--rail, var(--oc-border)); }
  .row.held { --rail: var(--oc-primary); }
  .row.bad { --rail: var(--oc-error); }
  .line1 { display: flex; align-items: center; gap: 6px; min-width: 0; }
  .line1 .who { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
  .line1 .pos { color: var(--oc-muted); width: 18px; flex: none; }
  .line1 .grow { flex: 1; }
  .line1 .time { color: var(--oc-muted); white-space: nowrap; }
  .purpose { color: color-mix(in srgb, var(--oc-fg) 75%, transparent); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sub { color: var(--oc-muted); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bar { height: 4px; border-radius: 2px; overflow: hidden; background: color-mix(in srgb, var(--oc-fg) 8%, transparent); }
  .bar span { display: block; height: 100%; background: var(--oc-primary); transition: width .4s ease; }
  .bar span.late { background: var(--oc-warning); }
  .stats { color: var(--oc-muted); font-size: 11px; border-top: 1px solid var(--oc-border); padding-top: 6px; }
  .events { display: flex; flex-direction: column; }
  .event { display: grid; grid-template-columns: 56px 44px minmax(0, 1fr) auto; gap: 8px; align-items: center; padding: 4px 2px;
    border-bottom: 1px solid color-mix(in srgb, var(--oc-border) 50%, transparent); font-size: 11px; }
  .event .what { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .settings { display: flex; gap: 6px; align-items: center; color: var(--oc-muted); font-size: 11px; }
  .settings input { flex: 1; min-width: 0; height: 22px; padding: 0 6px; border-radius: 4px; border: 1px solid var(--oc-border);
    background: transparent; color: var(--oc-fg); font: 11px var(--oc-mono); }
  .settings button { height: 22px; padding: 0 8px; border-radius: 4px; border: 0; cursor: pointer; font: 11px var(--oc-font);
    background: color-mix(in srgb, var(--oc-fg) 8%, transparent); color: var(--oc-fg); }
`;var ie=gt(),Gt=document.querySelector("#root");if(!Gt)throw Error("Missing #root");var Wo=document.createElement("style");Wo.textContent=zo+jo;document.head.append(Wo);var gr=i("div","title","Resource Queue"),Pt=i("div","meta","Reading…"),Se=i("div","live stale","Starting"),br=i("div","head","",[i("div","titles","",[gr,Pt]),Se]),J=i("div","note");J.hidden=!0;var Jo=i("div","hostline"),Dt=i("div");Dt.style.cssText="display:flex;flex-direction:column;gap:12px";var Yo=i("div","label","Recent events"),Qo=i("div","events"),ae=null,ce=i("input");ce.placeholder="default store";ce.spellcheck=!1;var $t=i("button","","Save");$t.type="button";var Or=i("div","settings","",[i("span","","Store"),ce,$t]);Gt.append(br,J,Jo,Dt,Yo,Qo,Or);function Ar(e){let r=e.alive===!1,n=i("div",`row held${r?" bad":""}`),l=[];if(e.exclusive)l.push(D("exclusive","info","Uses all slots of the resource"));if(!e.claimed)l.push(D("not seen","warning","Granted, but the owner has not seen the grant yet"));if(r)l.push(D("owner dead","error",`Processes ${e.pids.join(", ")} are gone. The next check frees the lock.`));let p=i("span","time num",`${G(e.heldSec)} · ${G(e.leftSec)} left`);p.title=`Held ${G(e.heldSec)} of max ${G(e.maxHoldSec)}`;let S=i("div","line1","",[i("span","who",Ve(e.holder,e.nick)),...l,i("span","grow"),p]),T=i("div","purpose",e.purpose||"–");T.title=e.purpose;let b=e.maxHoldSec?Math.min(100,e.heldSec/e.maxHoldSec*100):0,I=i("span",b>80?"late":"");I.style.width=`${b}%`;let v=i("div","sub mono",[e.ticket,e.session,e.pids.length?`pid ${e.pids.join("/")}`:null].filter(Boolean).join(" · "));return n.append(S,T,i("div","bar","",[I]),v),n}function kr(e){let r=e.alive===!1,n=i("div",`row${r?" bad":""}`),l=[];if(e.exclusive)l.push(D("exclusive","info","Waits until all slots are free"));if(e.pendingReason?.startsWith("precondition"))l.push(D("blocked","warning",e.pendingReason));if(e.lastPollSec>Vo)l.push(D(`no poll ${G(e.lastPollSec)}`,"warning","The owner has not polled this ticket. It expires after 15 min without a poll."));if(r)l.push(D("owner dead","error","The owner process is gone. The next check removes the ticket."));let p=i("div","line1","",[i("span","pos num",`#${e.position}`),i("span","who",Ve(e.holder,e.nick)),...l,i("span","grow"),i("span","time num",`waiting ${G(e.waitedSec)}`)]),S=i("div","purpose",e.purpose||"–");S.title=e.purpose,n.append(p,S);let T=[e.pendingReason,e.preconditions.length?`needs ${e.preconditions.join("; ")}`:null].filter(Boolean).join(" · ");if(T)n.append(i("div","sub",T));return n.append(i("div","sub mono",[e.ticket,e.session].filter(Boolean).join(" · "))),n}function Rr(e){let r=i("div","slots");for(let b=0;b<e.capacity;b++)r.append(i("span",b<e.used?"on":""));r.title=`${e.used} of ${e.capacity} slots in use`;let n=e.used>=e.capacity?D("full","primary"):e.used?D(`${e.used}/${e.capacity}`,"primary"):D("free","success"),l=i("div","card-top","",[i("span","name",e.name),n,i("span","grow"),e.queue.length?i("span","muted",`${e.queue.length} waiting`):i("span"),r]),p=i("div","card","",[l]);if(e.holders.length)p.append(i("div","label","Holders"),...e.holders.map(Ar));if(e.queue.length)p.append(i("div","label","Queue"),...e.queue.map(kr));let S=e.stats,T=[`${S.grants} grants`];if(S.meanWaitSec!==null)T.push(`wait ${G(S.meanWaitSec)} mean, ${G(S.maxWaitSec)} max`);if(S.meanHoldSec!==null)T.push(`hold ${G(S.meanHoldSec)} mean`);if(S.expired)T.push(`${S.expired} expired`);if(S.canceled)T.push(`${S.canceled} canceled`);return p.append(i("div","stats",`Last 24 h: ${T.join(" · ")}`)),p}function yr(e){if(Se.className="live",Se.textContent="Live",!ae)ce.placeholder=e.store.dir||"default store";Pt.textContent=`${e.host.name} · ${e.store.dir}`,Pt.title=e.store.dir,J.hidden=e.store.ok,J.className="note error",J.textContent=e.store.error??"",Jo.replaceChildren(i("span","","",[document.createTextNode("Memory available "),i("b","num",Nt(e.host.memAvailableKb)),document.createTextNode(` of ${Nt(e.host.memTotalKb)}`)]),i("span","","",[document.createTextNode("Compilers "),i("b","",e.host.compilers.length?e.host.compilers.join(", "):"none")])),Dt.replaceChildren(...e.resources.length?e.resources.map(Rr):[i("div","note",e.store.ok?"No resources yet.":"")]),Yo.hidden=!e.recent.length,Qo.replaceChildren(...e.recent.map((r)=>{let n=i("span","what",`${Ve(r.holder,r.nick)}${r.durationSec!==null?` · ${G(r.durationSec)}`:""}${r.detail?` · ${r.detail}`:""}`);n.title=[r.ticket,r.purpose,r.detail].filter(Boolean).join(`
`);let l=i("span","muted num",Fo(r.at,e.at));return l.title=new Date(r.at).toLocaleString(),i("div","event","",[l,i("span","muted",r.resource),n,D(r.event.replace(/ \((held|waiting)\)$/,""),Bo(r.event),r.event)])}))}var Ko=!1;ie.onReady((e)=>{if(bt(e,document.documentElement),Ko)return;Ko=!0,Ho(ie).then((r)=>{ae=r,ce.value=r??"";let n=Xo(ie,Gt,()=>ae,yr,(l)=>{Se.className="live stale",Se.textContent="Stopped",J.hidden=!1,J.className="note error",J.textContent=$o[l]});$t.addEventListener("click",()=>{let l=ce.value.trim();if(l&&!l.startsWith("/")){ie.toast({kind:"error",message:"The store directory must be an absolute path."}).catch(()=>{});return}ae=l||null,(ae?ie.storage.set(Be,ae):ie.storage.delete(Be)).catch(()=>{}),n.refresh()})})});})();

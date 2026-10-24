(()=>{var u="openchamber.sdk",E=1;var Ve=`
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
`;function Xt(e){let r=e.documentElement;if(r.hasAttribute("data-oc-scrollbar-activity"))return;r.setAttribute("data-oc-scrollbar-activity","");let n=new WeakMap;e.addEventListener("scroll",(_)=>{let p=_.target===e?r:_.target;if(!(p instanceof Element))return;if(!p.hasAttribute("data-oc-scrolling"))p.setAttribute("data-oc-scrolling","");let O=n.get(p);if(O!==void 0)clearTimeout(O);n.set(p,setTimeout(()=>{n.delete(p),p.removeAttribute("data-oc-scrolling")},1000))},{capture:!0,passive:!0})}var Do=`(${Xt.toString()})(document);`;var ze=128,je=65536;var me=128;var he=65536;var zt=/^[a-z][a-z0-9-]{0,39}$/;var Ft=(e)=>Object(e)===e&&!Array.isArray(e),Ke=(e,r)=>Object.keys(e).every((n)=>r.includes(n)),Bt=(e)=>String(e)===e&&e.length>=1&&e.length<=60,Vt=(e)=>String(e)===e&&e.length>=1&&e.length<=80,jt=(e)=>{if(!Array.isArray(e)||e.length>4)return!1;let r=new Set;for(let n of e){if(!Ft(n)||!zt.test(n.id)||!Bt(n.label))return!1;if(n.disabled!==void 0&&n.disabled!==!0&&n.disabled!==!1)return!1;if(r.has(n.id))return!1;if(r.add(n.id),n.kind==="button"){if(!Ke(n,["kind","id","label","disabled"]))return!1;continue}if(n.kind!=="select"||!Ke(n,["kind","id","label","value","options","disabled"]))return!1;if(!Vt(n.value)||!Array.isArray(n.options)||n.options.length<1||n.options.length>16)return!1;let _=new Set;for(let p of n.options){if(!Ft(p)||!Ke(p,["value","label"])||!Vt(p.value)||!Bt(p.label)||_.has(p.value))return!1;_.add(p.value)}if(!_.has(n.value))return!1}return!0};var xe=20000000,ge=256;var We=(e)=>("bytes"in e)?e.bytes.byteLength:e.content.length,Kt=(e,r)=>{if(e.path!==r.path||e.readOnly!==r.readOnly)return!1;if(e.encoding==="text"||r.encoding==="text")return e.encoding==="text"&&r.encoding==="text"&&e.content===r.content;if(e.bytes.byteLength!==r.bytes.byteLength)return!1;for(let n=0;n<e.bytes.byteLength;n+=1)if(e.bytes[n]!==r.bytes[n])return!1;return!0};var Wt=/^[A-Za-z0-9_-]{1,80}$/;var Jt=["left","right","top","bottom"];var Yt=(e,r=0,n={remaining:16000})=>{if(--n.remaining<0||r>=32)return!1;if(e===null)return!0;let _=Array.isArray(e)?e:Object(e)===e?Object.values(e):[];for(let p of _)if(!Yt(p,r+1,n))return!1;return!0},Je=(e)=>{if(e===null||e===!0||e===!1)return!0;if(Array.isArray(e))return Object.keys(e).every((r)=>/^(0|[1-9]\d*)$/.test(r)&&Number(r)<e.length)&&e.every(Je);if(Object(e)===e){let r=Object.getPrototypeOf(e);return(r===null||r===Object.prototype)&&Object.values(e).every(Je)}return String(e)===e||Number.isFinite(e)},Ye=(e)=>{try{if(String(e.id)!==e.id||!Wt.test(e.id)||!Number.isFinite(e.anchor.x)||Math.abs(e.anchor.x)>1e5||!Number.isFinite(e.anchor.y)||Math.abs(e.anchor.y)>1e5||!Number.isFinite(e.anchor.width)||!Number.isFinite(e.anchor.height)||e.anchor.width<=0||e.anchor.height<=0||e.anchor.width>1e5||e.anchor.height>1e5||!Number.isInteger(e.width)||e.width<160||e.width>640||!Number.isInteger(e.height)||e.height<48||e.height>480||e.side!==void 0&&!Jt.includes(e.side)||e.focus!==void 0&&e.focus!==!0&&e.focus!==!1||!Yt(e.data)||!Je(e.data))return!1;return JSON.stringify(e.data).length<=16000}catch{return!1}};var Zt=["file","directory","other","missing"],Ze=(e)=>Boolean(e&&"sessionId"in e),qe=(e)=>Boolean(e&&"sent"in e&&!("sessionId"in e));var qt=/^[0-9a-f]{7,64}$/i,et=(e)=>qt.test(e),Oe=500,be=32000,eo=16000,to=128,oo=200,ro=2000,no=16000,so=80,io=200,ao=16000;var co=2000;var tt=20000,Ae=1024,Re=2000000;var ke=64000,ye=8000,ot=4000;var rt=960000;var lo=999,po=1e4,le=500,uo=["HOST_UNAVAILABLE","HOST_TIMEOUT","HOST_REJECTED","DISCONNECTED","DISABLED","BAD_PATH","NO_INTEGRATION","NO_SERVICE","SERVICE_FAILED","REQUEST_FAILED","RESPONSE_TOO_LARGE","NO_SESSION","SESSION_BUSY","NOT_GRANTED","NO_DIRECTORY","NOT_FOUND","FILE_TOO_LARGE","DENIED","NO_MODEL","MODEL_FAILED","UNSUPPORTED"],Eo=["stopped","starting","ready","failed"],Ho=new Set(uo),_o=(e)=>Ho.has(e),fo=(e)=>e&&_o(e)?e:"HOST_REJECTED",Z=(e)=>{if(e===void 0)return!1;if(e===null||e===!0||e===!1)return!0;if(String(e)===e)return!0;if(Number(e)===e)return Number.isFinite(e);if(Array.isArray(e))return e.every(Z);if(Object(e)===e)return Object.values(e).every(Z);return!1},So=(e)=>Z(e)&&JSON.stringify(e).length<=ao,Qt=(e)=>e?.trim().slice(0,io)??"",q=(e)=>{let r=e.id.trim().slice(0,to),n=e.title.trim().slice(0,oo),_=e.url.trim().slice(0,ro),p=e.text?.trim().slice(0,no),O=e.author?.trim().slice(0,so),f=e.kind==="pull"?"pull":"issue",C={providerId:e.providerId.trim(),id:r,title:n||r,url:_,kind:f};if(p)C.text=p;if(O)C.author=O;if(f==="pull"){let N=Qt(e.branches?.head),k=Qt(e.branches?.base);if(N&&k)C.branches={head:N,base:k}}if(So(e.data))C.data=e.data;return C},nt=(e)=>{let r=q(e);if(e.projectId)r.projectId=e.projectId;if(e.navigation)r.navigation=e.navigation;if(e.worktree)r.worktree=e.worktree;return r},st=(e)=>{let r={text:e.text.trim().slice(0,eo)};if(e.send)r.send=!0;return r},it=(e)=>{if(e===null||!Number.isFinite(e))return null;return Math.min(lo,Math.max(0,Math.round(e)))},at=(e)=>{if(!Number.isFinite(e))return 0;return Math.min(po,Math.max(0,Math.ceil(e)))};var ee=(e)=>e.length>0&&e.length<=Ae&&!e.includes("\x00")&&!e.includes("\\");var ve=(e)=>{if(!e.startsWith("/")||e.includes("\x00")||e.includes("\\")||e.includes("://"))return!1;if(e.length>co)return!1;return!e.split("/").some((n)=>n==="."||n==="..")},$o=new Set(Eo),ct=(e)=>Boolean(e&&"status"in e&&$o.has(String(e.status))&&!("body"in e)),Ue=(e)=>Boolean(e&&"status"in e&&"body"in e&&Number.isInteger(e.status)),dt=(e)=>Boolean(e&&"content"in e&&String(e.content)===e.content),lt=(e)=>Boolean(e&&"written"in e&&e.written===!0),pt=(e)=>Boolean(e&&"entries"in e&&Array.isArray(e.entries)),Xo=new Set(Zt),ut=(e)=>Boolean(e&&"kind"in e&&"size"in e&&Xo.has(String(e.kind))&&Number.isFinite(e.size)),Et=(e)=>Boolean(e&&"text"in e&&String(e.text)===e.text&&!("status"in e)),Fo=new Set(["workspace","shells","ready","directory","session","connection","settings","session-lifecycle","item","resolve","action","status-control-event","popover-closed","file-open","file-snapshot","file-saved","generate-late"]),Bo=(e)=>Object(e)===e?e:null,Qe=(e)=>String(e)===e&&e.length>0,Vo=(e)=>{if(!Qe(e.id))return null;if(e.ok===!0){let r={channel:u,v:E,type:"result",id:e.id,ok:!0};if(Object(e.payload)===e.payload)r.payload=e.payload;return r}if(e.ok===!1&&Qe(e.error))return{channel:u,v:E,type:"result",id:e.id,ok:!1,error:e.error,code:fo(Qe(e.code)?e.code:void 0)};return null},_t=(e)=>{let r=Bo(e);if(!r||r.channel!==u||r.v!==E)return null;if(r.type==="result")return Vo(r);if(!Fo.has(String(r.type))||Object(r.payload)!==r.payload)return null;return r};var To=(e)=>("key"in e)&&("metaKey"in e)&&("ctrlKey"in e),zo=(e)=>(e.metaKey||e.ctrlKey)&&!e.altKey&&!e.shiftKey&&e.key.toLowerCase()==="s";class a extends Error{code;constructor(e,r){super(r);this.name="HostRequestError",this.code=e}}var mo=()=>Promise.reject(new a("BAD_PATH",'Request path must start with "/" and stay on the declared origin.')),Ce=()=>Promise.reject(new a("BAD_PATH",`File path must be 1 to ${Ae} characters without NUL or backslash.`)),we=(e)=>{if(e===void 0)return;if(Object(e)!==e||Array.isArray(e)||e.scope!==void 0&&e.scope!=="instance"&&e.scope!=="device")throw new a("HOST_REJECTED",'Storage scope must be "instance" or "device".');return e.scope==="device"?"device":void 0},l=(e)=>(e.value+=1,`oc-${e.value}`),ft=(e={})=>{let r=e.target??("window"in globalThis?window:null);if(!r)throw new a("HOST_UNAVAILABLE","No window. connectHost runs in a browser frame.");let n=e.acceptSource??((t)=>t===r.parent),_=e.requestTimeoutMs??tt,p=new Set,O=new Set,f=new Set,C=new Set,N=new Set,k=new Set,D=new Set,z=new Set,ue=new Set,W=new Set,He=[],ne=null,se=null,Ee=new Set,_e=new Set,ie=null,ae=null,$e=!1,J=new Map,Y=new Map,Q=new Map,G=!1,d={value:0},c=null,H=null,ce=!1,de=!1,Ut=null,Ct=(t)=>{if(!t)return null;return{sessionId:t.id,phase:t.busy?"started":"completed"}},L=(t)=>{r.parent.postMessage(t,"*")},wt=()=>{if(G||r.parent===r||W.size===0||c?.features?.lateGenerateResults!==!0)return;L({channel:u,v:E,type:"generate-late-listen"})},x=(t,o)=>{for(let s of t)try{s(o)}catch(i){console.error(i)}},It=(t)=>{if(!(t instanceof MessageEvent))return;if(!n(t.source))return;let o=_t(t.data);if(!o)return;if(o.type==="workspace"){let i=Y.get(o.payload.subscriptionId);if(i)x([i],o.payload.snapshot);return}if(o.type==="shells"){let i=Q.get(o.payload.subscriptionId);if(i)x([i],o.payload.snapshot);return}if(o.type==="ready"){if(c=o.payload,H=Ct(o.payload.session),x(p,o.payload),x(O,o.payload.directory),x(f,o.payload.session),H)x(C,H);x(N,o.payload.connection),x(k,o.payload.settings),x(D,o.payload.item),wt();return}if(o.type==="generate-late"){if(W.size===0)He.push(o.payload);else x(W,o.payload);return}if(o.type==="directory"){if(c)c={...c,directory:o.payload.directory};x(O,o.payload.directory);return}if(o.type==="session"){if(c)c={...c,session:o.payload.session};if(!o.payload.session)H=null;else if(H?.sessionId!==o.payload.session.id)H=Ct(o.payload.session);x(f,o.payload.session);return}if(o.type==="session-lifecycle"){H=o.payload,x(C,o.payload);return}if(o.type==="connection"){if(c)c={...c,connection:o.payload.connection};x(N,o.payload.connection);return}if(o.type==="settings"){if(c)c={...c,settings:o.payload.settings};x(k,o.payload.settings);return}if(o.type==="item"){if(c)c={...c,item:o.payload.item};x(D,o.payload.item);return}if(o.type==="status-control-event"){x(z,o.payload);return}if(o.type==="popover-closed"){x(ue,o.payload);return}if(o.type==="action"){let i=(S)=>{if(!G)L({channel:u,v:E,type:"action-result",id:o.id,payload:S})},T=se;if(!T){i({ok:!1,error:"This extension does not handle background actions."});return}Promise.resolve().then(()=>T(o.payload)).then(()=>i({ok:!0}),(S)=>{let R=(S instanceof Error?S.message:String(S)).trim();i({ok:!1,error:(R||"Action failed.").slice(0,le)})});return}if(o.type==="file-open"){let i=o.payload;if(ae&&Kt(ae,i))return;ae=i,x(Ee,o.payload);return}if(o.type==="file-saved"){x(_e,o.payload.version);return}if(o.type==="file-snapshot"){let i=(R)=>{if(!G)L({channel:u,v:E,type:"file-snapshot-result",id:o.id,payload:R})},T=(R)=>i({error:(R.trim()||"Could not read the edited file.").slice(0,le)}),S=ie;if(!S){T("This extension does not edit files.");return}Promise.resolve().then(()=>S(o.payload.purpose)).then((R)=>{if(We(R)>xe){T(`The file is over ${xe} ${"bytes"in R?"bytes":"characters"}.`);return}if(R.version.length>ge){T(`The snapshot version is over ${ge} characters.`);return}i({snapshot:"bytes"in R?{bytes:R.bytes,version:R.version}:{content:R.content,version:R.version}})},(R)=>T(R instanceof Error?R.message:String(R)));return}if(o.type==="resolve"){let i=(S)=>{L({channel:u,v:E,type:"resolve-result",id:o.id,payload:S})},T=ne;if(!T){i({error:"This extension does not resolve commands."});return}Promise.resolve().then(()=>T(o.payload)).then((S)=>i({item:S?q(S):null}),(S)=>{let R=(S instanceof Error?S.message:String(S)).trim();i({error:(R||"Command failed.").slice(0,le)})});return}let s=J.get(o.id);if(!s)return;if(clearTimeout(s.timer),J.delete(o.id),o.ok){s.resolve(o.payload);return}s.reject(new a(o.code,o.error))};r.addEventListener("message",It),L({channel:u,v:E,type:"hello"});let y=(t,o=_)=>{if(G||r.parent===r)return Promise.reject(new a("HOST_UNAVAILABLE","No host frame. This page is not in an iframe."));return new Promise((s,i)=>{let T=setTimeout(()=>{J.delete(t.id),i(new a("HOST_TIMEOUT","Host did not answer in time."))},o);J.set(t.id,{resolve:s,reject:i,timer:T}),L(t)})},b=(t)=>y(t).then(()=>{return}),A={channel:u,v:E},Xe=(t)=>{if(!G&&r.parent!==r)L(t)},Lt=()=>Xe({...A,type:"file-save"}),Mt=(t)=>{if(!To(t)||!zo(t))return;t.preventDefault(),Lt()},Nt=(t)=>{if(!To(t)||t.key!=="Escape"||c?.surface!=="popover"||!c.popover)return;t.preventDefault(),Ht(c.popover.id,"escape").catch(()=>{return})},fe=()=>{let t=c?.surface==="popover"?c.popover:void 0;if(!t)return;let o=ce||de;if(Ut===o)return;Ut=o,$t(t.id,o).catch(()=>{return})},Se=()=>{if(c?.surface!=="popover"||ce)return;ce=!0,fe()},Pt=(t)=>{if(c?.surface!=="popover"||t.relatedTarget!==null||!ce)return;ce=!1,fe()},Gt=()=>{if(c?.surface!=="popover"||de)return;de=!0,fe()},Dt=()=>{if(c?.surface!=="popover"||!de)return;de=!1,fe()},P=(t,o=1024)=>{if(!t.trim()||t.length>o)throw new a("HOST_REJECTED",`Identity must contain 1 to ${o} characters.`)},Fe=async(t)=>{if(t.kind!=="projects")P(t.projectId);let o=await y({...A,type:"workspace-read",id:l(d),payload:t});if(!o||!("kind"in o)||!("state"in o)||o.kind!==t.kind)throw new a("HOST_REJECTED","Host did not return workspace data.");return o},Be=async(t,o)=>{if(t.kind!=="projects")P(t.projectId);let s=l(d);Y.set(s,o);try{await b({...A,type:"workspace-subscribe",id:l(d),payload:{subscriptionId:s,query:t}})}catch(i){if(Y.delete(s),!G)L({...A,type:"workspace-unsubscribe",id:l(d),payload:{subscriptionId:s}});throw i}return()=>{if(!Y.delete(s)||G)return;L({...A,type:"workspace-unsubscribe",id:l(d),payload:{subscriptionId:s}})}},Go=async(t,o)=>{if(t.kind==="session")P(t.sessionId);if(t.kind==="project")P(t.projectId);let s=l(d);Q.set(s,o);try{await b({...A,type:"shells-subscribe",id:l(d),payload:{subscriptionId:s,scope:t}})}catch(i){if(Q.delete(s),!G)L({...A,type:"shells-unsubscribe",id:l(d),payload:{subscriptionId:s}});throw i}return()=>{if(!Q.delete(s)||G)return;L({...A,type:"shells-unsubscribe",id:l(d),payload:{subscriptionId:s}})}},Te=async(t)=>{if("key"in t&&(t.key.length===0||t.key.length>ze))throw new a("HOST_REJECTED","Storage key must contain 1 to 128 characters.");if(t.op==="set"&&!Z(t.value))throw new a("HOST_REJECTED","Storage values must be JSON.");if(t.op==="set"&&new TextEncoder().encode(JSON.stringify(t.value)).length>je)throw new a("HOST_REJECTED","Storage value exceeds 64 KiB.");if(t.scope==="device"&&c?.features?.deviceStorage!==!0)throw new a("UNSUPPORTED","This host does not support device storage.");let o=await y({...A,type:"storage",id:l(d),payload:t});if(!o||!("storage"in o)||o.op!==t.op)throw new a("HOST_REJECTED","Host did not return storage data.");return o},Ht=(t,o)=>c?.features?.popovers!==!0&&!(c?.surface==="popover"&&c.popover?.id===t)?Promise.reject(new a("UNSUPPORTED","This host does not support popovers.")):b({...A,type:"popover-close",id:l(d),payload:o?{id:t,reason:o}:{id:t}}),$t=(t,o)=>c?.features?.popovers!==!0&&!(c?.surface==="popover"&&c.popover?.id===t)?Promise.reject(new a("UNSUPPORTED","This host does not support popovers.")):b({...A,type:"popover-anchor",id:l(d),payload:{id:t,active:o}});return r.addEventListener("keydown",Nt,!0),r.addEventListener("pointerover",Se),r.addEventListener("pointermove",Se),r.addEventListener("pointerout",Pt),r.addEventListener("focus",Gt),r.addEventListener("blur",Dt),{onAction:(t)=>(se=t,()=>{if(se===t)se=null}),listProjects:async()=>{let t=await Fe({kind:"projects"});if(t.kind!=="projects")throw new a("HOST_REJECTED","Expected projects.");return t},listWorktrees:async(t)=>{let o=await Fe({kind:"worktrees",projectId:t});if(o.kind!=="worktrees")throw new a("HOST_REJECTED","Expected worktrees.");return o},listSessions:async(t)=>{let o=await Fe({kind:"sessions",projectId:t});if(o.kind!=="sessions")throw new a("HOST_REJECTED","Expected sessions.");return o},onProjects:(t)=>Be({kind:"projects"},(o)=>{if(o.kind==="projects")t(o)}),onWorktrees:(t,o)=>Be({kind:"worktrees",projectId:t},(s)=>{if(s.kind==="worktrees")o(s)}),onSessions:(t,o)=>Be({kind:"sessions",projectId:t},(s)=>{if(s.kind==="sessions")o(s)}),onRunningShells:(t,o)=>Go(t,o),readShellOutput:async(t,o)=>{P(t,me);let s=o?.cursor;if(s!==void 0&&(!Number.isInteger(s)||s<0))throw new a("HOST_REJECTED","Shell output cursor must be a non-negative integer.");let i=o?.tailBytes;if(i!==void 0&&(!Number.isInteger(i)||i<1||i>he))throw new a("HOST_REJECTED",`Shell output tailBytes must be an integer between 1 and ${he}.`);let S=await y({...A,type:"shell-output",id:l(d),payload:{shellId:t,cursor:s,tailBytes:i}});if(!S||typeof S.output!=="string"||!Number.isFinite(S.cursor))throw new a("HOST_REJECTED","Host did not return shell output.");return S},stopShell:async(t)=>{if(P(t,me),(await y({...A,type:"shell-stop",id:l(d),payload:{shellId:t}}))?.stopped!==!0)throw new a("HOST_REJECTED","Host did not stop the shell.");return{stopped:!0}},openSession:async(t)=>{P(t),await b({...A,type:"open-session",id:l(d),payload:{sessionId:t}})},storage:{get:async(t,o)=>{let s=we(o),i={op:"get",key:t};if(s)i.scope=s;let T=await Te(i);return T.op==="get"&&T.found?T.value:void 0},set:async(t,o,s)=>{let i=we(s),T={op:"set",key:t,value:o};if(i)T.scope=i;await Te(T)},delete:async(t,o)=>{let s=we(o),i={op:"delete",key:t};if(s)i.scope=s;await Te(i)},keys:async(t)=>{let o=we(t),s={op:"keys"};if(o)s.scope=o;let i=await Te(s);if(i.op!=="keys")throw new a("HOST_REJECTED","Expected storage keys.");return i.keys}},onReady:(t)=>{if(p.add(t),c)t(c);return()=>{p.delete(t)}},onDirectory:(t)=>{if(O.add(t),c)t(c.directory);return()=>{O.delete(t)}},onSession:(t)=>{if(f.add(t),c)t(c.session);return()=>{f.delete(t)}},onSessionLifecycle:(t)=>{if(C.add(t),H)t(H);return()=>{C.delete(t)}},onConnection:(t)=>{if(N.add(t),c)t(c.connection);return()=>{N.delete(t)}},onSettings:(t)=>{if(k.add(t),c)t(c.settings);return()=>{k.delete(t)}},onItem:(t)=>{if(D.add(t),c)t(c.item);return()=>{D.delete(t)}},onStatusControl:(t)=>(z.add(t),()=>{z.delete(t)}),onPopoverClosed:(t)=>(ue.add(t),()=>{ue.delete(t)}),setStatusControls:(t)=>{if(c?.features?.statusControls!==!0)return Promise.reject(new a("UNSUPPORTED","This host does not support status controls."));if(!jt(t))return Promise.reject(new a("HOST_REJECTED","Status controls must have unique bounded ids and valid selected options."));return b({...A,type:"status-controls",id:l(d),payload:{controls:t}})},openPopover:(t)=>{if(c?.features?.popovers!==!0)return Promise.reject(new a("UNSUPPORTED","This host does not support popovers."));if(!Ye(t))return Promise.reject(new a("HOST_REJECTED","Popover requests need bounded geometry and JSON data."));return b({...A,type:"popover-open",id:l(d),payload:t})},closePopover:Ht,setPopoverAnchorActive:$t,onResolve:(t)=>(ne=t,()=>{if(ne===t)ne=null}),toast:(t)=>{let o=t.message.trim();if(!o||o.length>Oe)return Promise.reject(new a("HOST_REJECTED",`Toast message must contain 1 to ${Oe} characters.`));if(t.copy&&t.copy!==!0&&(!t.copy.text.length||t.copy.text.length>be))return Promise.reject(new a("HOST_REJECTED",`Toast copy text must contain 1 to ${be} characters.`));return b({channel:u,v:E,type:"toast",id:l(d),payload:{...t,message:o}})},openUrl:(t)=>b({channel:u,v:E,type:"open-url",id:l(d),payload:{url:t}}),openCommit:(t)=>et(t)?b({channel:u,v:E,type:"open-commit",id:l(d),payload:{sha:t}}):Promise.reject(new a("HOST_REJECTED","Commit id must be 7 to 64 hex characters.")),openSurface:(t)=>b({channel:u,v:E,type:"open-surface",id:l(d),payload:{surfaceId:t}}),writeClipboard:(t)=>b({channel:u,v:E,type:"clipboard-write",id:l(d),payload:{text:t}}),compose:(t)=>b({channel:u,v:E,type:"compose",id:l(d),payload:t}),attach:(t)=>b({channel:u,v:E,type:"attach",id:l(d),payload:q(t)}),startSession:async(t)=>{if(t.projectId!==void 0)P(t.projectId);let o=t.worktree;if(o&&o!==!0)if(o.kind==="existing")P(o.directory);else{if(o.name!==void 0)P(o.name,200);if(o.baseBranch!==void 0)P(o.baseBranch,200)}let s=await y({channel:u,v:E,type:"start-session",id:l(d),payload:nt(t)},e.requestTimeoutMs??180000);if(!Ze(s))throw new a("HOST_REJECTED","Host did not return a session.");return s},prompt:(t)=>y({channel:u,v:E,type:"prompt",id:l(d),payload:st(t)}).then((o)=>{if(!qe(o))throw new a("HOST_REJECTED","Host did not return a prompt result.");return o}),sessionLink:(t)=>b({channel:u,v:E,type:"session-link",id:l(d),payload:q(t)}),close:()=>b({channel:u,v:E,type:"close",id:l(d)}),oauthStart:()=>b({channel:u,v:E,type:"oauth-start",id:l(d)}),oauthDisconnect:()=>b({channel:u,v:E,type:"oauth-disconnect",id:l(d)}),request:(t)=>(ve(t.path)?y({channel:u,v:E,type:"request",id:l(d),payload:t}):mo()).then((o)=>{if(!Ue(o))throw new a("HOST_REJECTED","Host request result was empty.");return o}),serviceRequest:(t)=>(ve(t.path)?y({channel:u,v:E,type:"service-request",id:l(d),payload:t}):mo()).then((o)=>{if(!Ue(o))throw new a("HOST_REJECTED","Host service request result was empty.");return o}),serviceStatus:()=>y({channel:u,v:E,type:"service-status",id:l(d)}).then((t)=>{if(!ct(t))throw new a("HOST_REJECTED","Host did not return service status.");return t}),readFile:(t)=>(ee(t)?y({channel:u,v:E,type:"file-read",id:l(d),payload:{path:t}}):Ce()).then((o)=>{if(!dt(o))throw new a("HOST_REJECTED","Host did not return file content.");return o}),writeFile:(t,o)=>{if(!ee(t))return Ce();if(o.length>Re)return Promise.reject(new a("FILE_TOO_LARGE",`Content is over ${Re} characters.`));return y({channel:u,v:E,type:"file-write",id:l(d),payload:{path:t,content:o}}).then((s)=>{if(!lt(s))throw new a("HOST_REJECTED","Host did not confirm the write.");return s})},listDir:(t)=>(ee(t)?y({channel:u,v:E,type:"file-list",id:l(d),payload:{path:t}}):Ce()).then((o)=>{if(!pt(o))throw new a("HOST_REJECTED","Host did not return directory entries.");return o}),stat:(t)=>(ee(t)?y({channel:u,v:E,type:"file-stat",id:l(d),payload:{path:t}}):Ce()).then((o)=>{if(!ut(o))throw new a("HOST_REJECTED","Host did not return file status.");return o}),generate:(t)=>{let o=t.prompt.trim(),s=t.system?.trim();if(o.length===0||o.length>ke)return Promise.reject(new a("HOST_REJECTED",`Prompt must be 1 to ${ke} characters.`));if(s!==void 0&&(s.length===0||s.length>ye))return Promise.reject(new a("HOST_REJECTED",`System prompt must be 1 to ${ye} characters.`));let i=t.maxOutputTokens===void 0?void 0:Math.min(ot,Math.max(1,Math.floor(t.maxOutputTokens)));if(i!==void 0&&!Number.isFinite(i))return Promise.reject(new a("HOST_REJECTED","maxOutputTokens must be a number."));let T={prompt:o};if(s!==void 0)T.system=s;if(i!==void 0)T.maxOutputTokens=i;return y({channel:u,v:E,type:"generate",id:l(d),payload:T},e.requestTimeoutMs??rt).then((S)=>{if(!Et(S))throw new a("HOST_REJECTED","Host did not return generated text.");return S})},onLateGenerateResult:(t)=>{W.add(t);for(let o of He.splice(0))x([t],o);return wt(),()=>{W.delete(t)}},setBadge:(t)=>b({channel:u,v:E,type:"badge",id:l(d),payload:{count:it(t)}}),setHeight:(t)=>b({channel:u,v:E,type:"resize",id:l(d),payload:{height:at(t)}}),onFileOpen:(t)=>{if(Ee.add(t),!$e)$e=!0,r.addEventListener("keydown",Mt,!0);if(ae)t(ae);return()=>{Ee.delete(t)}},onFileSnapshot:(t)=>(ie=t,()=>{if(ie===t)ie=null}),onFileSaved:(t)=>(_e.add(t),()=>{_e.delete(t)}),reportFileChange:(t)=>Xe({...A,type:"file-change",payload:{dirty:t.dirty,edited:t.edited}}),requestFileSave:Lt,reportFileUnsupported:()=>Xe({...A,type:"file-unsupported"}),dispose:()=>{for(let t of Y.keys())L({...A,type:"workspace-unsubscribe",id:l(d),payload:{subscriptionId:t}});Y.clear();for(let t of Q.keys())L({...A,type:"shells-unsubscribe",id:l(d),payload:{subscriptionId:t}});if(Q.clear(),G=!0,ne=null,se=null,ie=null,Ee.clear(),_e.clear(),$e)r.removeEventListener("keydown",Mt,!0);r.removeEventListener("message",It),r.removeEventListener("keydown",Nt,!0),r.removeEventListener("pointerover",Se),r.removeEventListener("pointermove",Se),r.removeEventListener("pointerout",Pt),r.removeEventListener("focus",Gt),r.removeEventListener("blur",Dt);for(let t of J.values())clearTimeout(t.timer),t.reject(new a("HOST_UNAVAILABLE","Host client was disposed."));J.clear(),p.clear(),O.clear(),f.clear(),C.clear(),N.clear(),k.clear(),D.clear(),z.clear(),ue.clear(),W.clear(),He.length=0}}};var ho=["browser.open","browser.snapshot","browser.click","browser.type","browser.select","browser.scroll","browser.back","browser.forward","browser.inspect","browser.capture","browser.resize","browser.close"];var Ur=new Set(ho);var xo=["none","agent","user"];var wr=new Set(xo);var jo=[["--oc-bg","background"],["--oc-elevated","elevated"],["--oc-fg","foreground"],["--oc-muted","muted"],["--oc-subtle","subtle"],["--oc-border","border"],["--oc-hover","hover"],["--oc-selection","selection"],["--oc-focus","focus"],["--oc-primary","primary"],["--oc-muted-surface","mutedSurface"],["--oc-elevated-fg","elevatedForeground"],["--oc-active","active"],["--oc-selection-fg","selectionForeground"],["--oc-primary-fg","primaryForeground"],["--oc-primary-text","primaryText"],["--oc-success-text","successText"],["--oc-warning-text","warningText"],["--oc-error-text","errorText"],["--oc-info-text","infoText"],["--oc-success","success"],["--oc-warning","warning"],["--oc-error","error"],["--oc-info","info"],["--oc-font","font"],["--oc-mono","mono"],["--oc-radius","radius"],["--surface-background","background"],["--surface-elevated","elevated"],["--surface-foreground","foreground"],["--surface-muted-foreground","muted"],["--surface-subtle","subtle"],["--interactive-border","border"],["--interactive-hover","hover"],["--interactive-selection","selection"],["--interactive-focus-ring","focus"],["--primary","primary"],["--surface-muted","mutedSurface"],["--surface-elevated-foreground","elevatedForeground"],["--interactive-active","active"],["--interactive-selection-foreground","selectionForeground"],["--primary-foreground","primaryForeground"],["--primary-text","primaryText"],["--success-text","successText"],["--warning-text","warningText"],["--error-text","errorText"],["--info-text","infoText"],["--status-success","success"],["--status-warning","warning"],["--status-error","error"],["--status-info","info"],["--font-sans","font"],["--font-mono","mono"],["--radius","radius"]],Ko=[["--oc-syntax-keyword","--syntax-keyword","syntaxKeyword"],["--oc-syntax-string","--syntax-string","syntaxString"],["--oc-syntax-number","--syntax-number","syntaxNumber"],["--oc-syntax-function","--syntax-function","syntaxFunction"],["--oc-syntax-type","--syntax-type","syntaxType"],["--oc-syntax-comment","--syntax-comment","syntaxComment"],["--oc-syntax-variable","--syntax-variable","syntaxVariable"],["--oc-syntax-operator","--syntax-operator","syntaxOperator"]],go=(e,r)=>{r.style.colorScheme=e.mode;for(let[n,_]of jo)r.style.setProperty(n,e.tokens[_]);for(let[n,_,p]of Ko){let O=e.tokens[p]??"";r.style.setProperty(n,O),r.style.setProperty(_,O)}r.style.setProperty("font-family",e.tokens.font),r.style.setProperty("font-size","0.875rem"),r.style.setProperty("line-height","1.45"),r.style.setProperty("color",e.tokens.foreground)},St=(e,r)=>{if(go(e.theme,r),r.dataset)r.dataset.ocSurface=e.surface,r.dataset.ocTheme=e.theme.mode};var Wo={"surface-background":"bg","surface-elevated":"elevated","surface-elevated-foreground":"elevated-fg","surface-foreground":"fg","surface-muted-foreground":"muted","surface-muted":"muted-surface","surface-subtle":"subtle","interactive-border":"border","interactive-hover":"hover","interactive-active":"active","interactive-selection":"selection","interactive-selection-foreground":"selection-fg","interactive-focus-ring":"focus",primary:"primary","primary-foreground":"primary-fg","primary-text":"primary-text","success-text":"success-text","warning-text":"warning-text","error-text":"error-text","info-text":"info-text","status-success":"success","status-warning":"warning","status-error":"error","status-info":"info","font-sans":"font","font-mono":"mono",radius:"radius"},h=(e,r)=>`var(--${e}, var(--oc-${Wo[e]}, ${r}))`,F=h("surface-background","transparent"),Le=h("surface-elevated","transparent"),te=h("surface-elevated-foreground","inherit"),M=h("surface-foreground","inherit"),m=h("surface-muted-foreground","gray"),Jo=h("surface-muted","transparent"),j=h("interactive-border","currentColor"),v=h("interactive-hover","transparent"),K=h("interactive-active","transparent"),Tt=h("interactive-selection","transparent"),mt=h("interactive-selection-foreground","inherit"),X=h("primary","currentColor"),ht=h("primary-text","inherit"),xt=h("error-text","inherit"),Yo=h("font-sans","inherit"),gt=h("font-mono","monospace"),ko=h("radius","9px"),Ot=`calc(${ko} - 2px)`,Oo=`calc(${ko} - 4px)`,g=(e,r,n="transparent")=>`color-mix(in srgb, ${e} ${r}%, ${n})`,bo=`background-image: linear-gradient(${v}, ${v});`,bt=(e)=>`box-shadow: inset 0 0 0 1px ${e}, var(--oc-sdk-field-lift);`,At="border-color: var(--oc-sdk-edge); box-shadow: var(--oc-sdk-raised-lift);",Ao="box-shadow: var(--oc-sdk-lit);",Ro=`inset 0 1px 0 0 ${g(M,1.5)}, 0 1px 1px 0 rgb(0 0 0 / 0.28), 0 2px 3px -2px rgb(0 0 0 / 0.2)`,Qo=`
:root {
  --oc-sdk-edge: ${g(M,10)};
  --oc-sdk-field-bg: ${Le};
  --oc-sdk-raised-bg: ${F};
  --oc-sdk-field-lift: inset 0 1px 2px 0 rgb(0 0 0 / 0.04);
  --oc-sdk-raised-lift: 0 1px 2px 0 rgb(0 0 0 / 0.06);
  --oc-sdk-lit: inset 0 1px 0 0 rgb(255 255 255 / 0.45), 0 1px 2px 0 rgb(0 0 0 / 0.08);
  --oc-sdk-float-edge: rgb(0 0 0 / 0.1);
  --oc-sdk-float: inset 0 1px 0 0 rgb(255 255 255 / 0.8), inset 0 0 0 1px rgb(0 0 0 / 0.04), 0 1px 2px -0.5px rgb(0 0 0 / 0.08), 0 4px 8px -2px rgb(0 0 0 / 0.08), 0 12px 20px -4px rgb(0 0 0 / 0.08);
}
:root[data-oc-theme="dark"] {
  --oc-sdk-edge: ${g(M,6)};
  --oc-sdk-field-bg: ${g(F,50,Le)};
  --oc-sdk-raised-bg: ${Le};
  --oc-sdk-field-lift: ${Ro};
  --oc-sdk-raised-lift: ${Ro};
  --oc-sdk-lit: inset 0 1px 0 0 ${g(M,1.5)}, 0 1px 1px 0 rgb(0 0 0 / 0.28), 0 2px 3px -2px rgb(0 0 0 / 0.2);
  --oc-sdk-float-edge: rgb(0 0 0 / 0.36);
  --oc-sdk-float: inset 0 1px 0 0 rgb(255 255 255 / 0.06), inset 0 0 0 1px rgb(255 255 255 / 0.08), 0 1px 1px -0.5px rgb(0 0 0 / 0.22), 0 3px 3px -1.5px rgb(0 0 0 / 0.2), 0 6px 6px -3px rgb(0 0 0 / 0.16);
}`,Ie=(e)=>{let r=h(`status-${e}`,"currentColor");return`
.oc-sdk[data-tone="${e}"], .oc-sdk [data-tone="${e}"] { --oc-sdk-tone: ${r}; --oc-sdk-tone-text: ${h(`${e}-text`,"inherit")}; }`},Zo=`
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
`,yo=`${Qo}
.oc-sdk { color: ${M}; font-family: ${Yo}; }
.oc-sdk :focus-visible, .oc-sdk:focus-visible { outline: none; }
.oc-sdk :where(button, a[href], [role="button"], [role="tab"], [role="option"]):focus-visible, button.oc-sdk:focus-visible { ${bo} }
.oc-sdk-mono { font-family: ${gt}; }
.oc-sdk-muted { color: ${m}; }
${Ie("success")}${Ie("warning")}${Ie("error")}${Ie("info")}
.oc-sdk[data-tone="primary"], .oc-sdk [data-tone="primary"] { --oc-sdk-tone: ${X}; --oc-sdk-tone-text: ${ht}; }

.oc-sdk-btn { border-radius: ${Ot}; transition: background 150ms ease-out, color 150ms ease-out; }
.oc-sdk-btn[data-size="xs"] { border-radius: ${Oo}; }
.oc-sdk-btn[data-variant="default"] { color: ${ht}; background: ${g(X,10,F)}; border-color: ${g(X,12)}; ${Ao} }
.oc-sdk-btn[data-variant="default"]:hover { background: ${g(X,16,F)}; }
.oc-sdk-btn[data-variant="default"]:active { background: ${g(X,22,F)}; box-shadow: none; }
.oc-sdk-btn[data-variant="secondary"] { background: ${Jo}; color: var(--oc-fg); }
.oc-sdk-btn[data-variant="secondary"]:hover { background-image: linear-gradient(${v}, ${v}); }
.oc-sdk-btn[data-variant="secondary"]:active { background-image: linear-gradient(${K}, ${K}); }
.oc-sdk-btn[data-variant="outline"] { background: var(--oc-sdk-raised-bg); color: ${te}; ${At} }
.oc-sdk-btn[data-variant="outline"]:hover { background-image: linear-gradient(${v}, ${v}); }
.oc-sdk-btn[data-variant="outline"]:active { background-image: linear-gradient(${K}, ${K}); box-shadow: none; }
.oc-sdk-btn[data-variant="ghost"] { background: transparent; }
.oc-sdk-btn[data-variant="ghost"]:hover { background: ${v}; }
.oc-sdk-btn[data-variant="ghost"]:active { background: ${K}; }
.oc-sdk-btn[data-variant="destructive"] { --oc-sdk-tone: ${h("status-error","red")}; color: ${xt}; background: ${g("var(--oc-sdk-tone)",7,F)}; border-color: ${g("var(--oc-sdk-tone)",12)}; ${Ao} }
.oc-sdk-btn[data-variant="destructive"]:hover { background: ${g("var(--oc-sdk-tone)",9,F)}; }
.oc-sdk-btn[data-variant="destructive"]:active { background: ${g("var(--oc-sdk-tone)",11,F)}; box-shadow: none; }

.oc-sdk-field-note { color: ${m}; }
.oc-sdk-field[data-invalid="true"] .oc-sdk-field-note { color: ${xt}; }
.oc-sdk-input { border-radius: ${Ot}; background: var(--oc-sdk-field-bg); color: ${te}; ${bt("var(--oc-sdk-edge)")} transition: background 150ms ease-out; }
.oc-sdk-input::placeholder { color: ${m}; }
.oc-sdk-input:hover:not(:focus) { background-image: linear-gradient(${v}, ${v}); }
.oc-sdk-input:focus, .oc-sdk-input:focus-visible { ${bt(g(M,26))} }
.oc-sdk-field[data-invalid="true"] .oc-sdk-input, .oc-sdk-field[data-invalid="true"] .oc-sdk-input:focus { ${bt(h("status-error","red"))} }
.oc-sdk-input[data-mono="true"] { font-family: ${gt}; }

.oc-sdk-search-icon { color: ${m}; }
.oc-sdk-search[data-active="true"] .oc-sdk-search-icon { color: ${X}; }
.oc-sdk-search-clear { border-radius: ${Oo}; color: ${m}; }
.oc-sdk-search-clear:hover { background: ${v}; color: ${M}; }

.oc-sdk-trigger { border-radius: ${Ot}; background: var(--oc-sdk-raised-bg); color: ${te}; ${At} transition: background 150ms ease-out; }
.oc-sdk-trigger:hover { background-image: linear-gradient(${v}, ${v}); }
.oc-sdk-trigger[aria-expanded="true"] { background-image: linear-gradient(${K}, ${K}); }
.oc-sdk-trigger-value[data-empty="true"] { color: ${m}; }
.oc-sdk-trigger-chevron { color: ${m}; }
/* The app's dropdown light: lit top, hairline rings and a layered shadow. Its outer ring is the border, over the page like the app's. */
.oc-sdk-popup { --surface-foreground: ${te}; border-color: var(--oc-sdk-float-edge); border-radius: 12px; background: ${Le}; background-clip: padding-box; color: ${te}; box-shadow: var(--oc-sdk-float); }
.oc-sdk-option { border-radius: 8px; }
.oc-sdk-option[data-active="true"] { background: ${v}; }
/* A selected option shows a check mark in the text colour, like the app's own pickers. Options without the mark come
   from bundles built before it existed and keep the selection fill as their only sign of the choice. */
.oc-sdk-option[aria-selected="true"]:not([data-mark]) { background: ${Tt}; color: ${mt}; }
.oc-sdk-option-check { color: ${M}; }
.oc-sdk-option[data-destructive="true"] { color: ${xt}; }
.oc-sdk-option[data-destructive="true"][data-active="true"] { background: ${g(h("status-error","red"),10)}; }
.oc-sdk-option-hint { color: ${m}; }
.oc-sdk-popup-empty { color: ${m}; }

/* Checked stays neutral: the mark carries the state, and the primary colour stays with primary actions. */
.oc-sdk-check-box { border-color: ${j}; border-radius: 4px; color: ${M}; transition: border-color 150ms ease-out; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-box { border-color: ${g(M,60,j)}; }
.oc-sdk-check-thumb { border-radius: 9999px; background: ${j}; transition: background 150ms ease-out; }
.oc-sdk-check-thumb::after { border-radius: 9999px; background: ${F}; transition: transform 150ms ease-out; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-thumb { background: ${X}; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-thumb::after { transform: translateX(16px); }
.oc-sdk-check:focus-visible { box-shadow: none; }
.oc-sdk-check:focus-visible .oc-sdk-check-box, .oc-sdk-check:focus-visible .oc-sdk-check-thumb { ${bo} }
.oc-sdk-check-desc { color: ${m}; }

.oc-sdk-tabs { border-radius: 10px; }
.oc-sdk-tabs[data-track="true"] { background: ${g(M,4)}; box-shadow: inset 0 1px 2px 0 rgb(0 0 0 / 0.16); }
.oc-sdk-tab { border-radius: 8px; color: ${m}; transition: color 150ms ease-out, background 150ms ease-out; }
.oc-sdk-tab:hover { color: ${M}; }
.oc-sdk-tab[aria-selected="true"] { color: ${mt}; background: ${Tt}; border-color: ${j}; }
.oc-sdk-tabs[data-track="true"] .oc-sdk-tab[aria-selected="true"] { color: ${te}; background: var(--oc-sdk-raised-bg); ${At} }
.oc-sdk-tab-count { color: ${m}; }

.oc-sdk-badge { border-radius: 9999px; background: ${v}; color: ${m}; }
.oc-sdk-badge[data-tone] { color: var(--oc-sdk-tone-text, var(--oc-sdk-tone)); background: ${g("var(--oc-sdk-tone)",15)}; }

.oc-sdk-row { border-radius: 6px; transition: background 120ms ease-out; }
.oc-sdk-row:hover, .oc-sdk-row[data-active="true"] { background: ${v}; }
.oc-sdk-row[aria-selected="true"] { background: ${Tt}; color: ${mt}; }
.oc-sdk-row-lead { font-family: ${gt}; color: ${m}; }
.oc-sdk-row-sub { color: ${m}; }
.oc-sdk-row-meta { color: ${m}; }
.oc-sdk-row[aria-selected="true"] .oc-sdk-row-lead, .oc-sdk-row[aria-selected="true"] .oc-sdk-row-sub, .oc-sdk-row[aria-selected="true"] .oc-sdk-row-meta { color: inherit; opacity: .75; }
.oc-sdk-list-empty { color: ${m}; }

.oc-sdk-empty-body { color: ${m}; }

.oc-sdk-spinner { color: ${m}; }
.oc-sdk-spinner-ring { border-color: ${j}; border-top-color: ${X}; border-radius: 9999px; }

/* Set apart by its tint alone, like the app's banners. */
.oc-sdk-banner { border-color: transparent; border-radius: 8px; background: ${g("var(--oc-sdk-tone)",10)}; }
.oc-sdk-banner-title { color: var(--oc-sdk-tone-text, var(--oc-sdk-tone)); }
.oc-sdk-banner-body { color: ${m}; }

.oc-sdk-separator { color: ${m}; }
.oc-sdk-separator::before, .oc-sdk-separator::after { background: ${g(j,40)}; }

.oc-sdk-progress-label { color: ${m}; }
.oc-sdk-progress-track { border-radius: 9999px; background: ${j}; }
.oc-sdk-progress-fill { border-radius: 9999px; background: var(--oc-sdk-tone, ${X}); }

.oc-sdk-text a { color: ${ht}; text-decoration: underline; text-underline-offset: 2px; }
.oc-sdk-text img { border-radius: 8px; border: 1px solid ${g(j,60)}; }
`,U=`
${Ve}
${Zo}
${yo}`;var rr=2000,nr="store-dir",vo={"needs-approval":"Allow the local service for Resource Queue in Settings → Extensions.",paused:"Resource Queue is paused in Settings → Extensions.","service-failed":"The Resource Queue service stopped. It restarts on the next refresh.",unreachable:"Could not reach the Resource Queue service.","bad-answer":"The Resource Queue service answered with something unexpected."},yt=(e)=>typeof e==="object"&&e!==null,sr=(e)=>yt(e)&&typeof e.at==="number"&&yt(e.store)&&yt(e.host)&&Array.isArray(e.resources)&&Array.isArray(e.recent),ir=(e)=>{if(!(e instanceof a))return"unreachable";if(e.code==="NO_SERVICE"||e.code==="NOT_GRANTED")return"needs-approval";if(e.code==="DISABLED")return"paused";if(e.code==="SERVICE_FAILED")return"service-failed";return"unreachable"},vt=(e)=>!document.hidden&&e.getBoundingClientRect().width>0;async function Uo(e){try{let r=await e.storage.get(nr);return typeof r==="string"&&r.startsWith("/")?r:null}catch{return null}}function Co(e,r,n,_,p){let O=!1,f=async()=>{if(O||!vt(r))return;O=!0;try{let k=n(),D=await e.serviceRequest({method:"GET",path:"/snapshot",...k?{query:{dir:k}}:{}}),z=null;try{z=JSON.parse(D.body)}catch{}if(D.status===200&&sr(z))_(z);else p(D.status===200?"bad-answer":"service-failed")}catch(k){p(ir(k))}finally{O=!1}};f(),setInterval(()=>void f(),rr);let C=vt(r),N=()=>{let k=vt(r);if(k&&!C)f();C=k};return document.addEventListener("visibilitychange",N),new ResizeObserver(N).observe(document.documentElement),{refresh:()=>void f()}}function wo(e){if(e===null||e===void 0)return"–";if(e<60)return`${e}s`;let r=Math.floor(e/60);if(r<60)return`${r}m${e%60&&r<10?` ${e%60}s`:""}`;return`${Math.floor(r/60)}h${r%60?` ${r%60}m`:""}`}function Io(e,r){return r&&r!==e?`${e} (${r})`:e}function V(e,r="",n="",_=[]){let p=document.createElement(e);if(r)p.className=r;if(n)p.textContent=n;if(_.length)p.append(..._);return p}function pe(e,r="neutral",n=""){let _=V("span",`badge ${r}`,e);if(n)_.title=n;return _}var Lo=`
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
`;var Mo=`
  html, body { overflow: hidden; }
  #root { display: flex; flex-direction: column; gap: 4px; padding: 4px 2px; }
  .sline { display: grid; grid-template-columns: 48px minmax(0, 1fr) auto; gap: 8px; align-items: center; }
  .sline .name { font-weight: 600; }
  .sline .what { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sline .what.free { color: var(--oc-muted); }
`;var De=ft(),re=document.querySelector("#root");if(!re)throw Error("Missing #root");var Po=document.createElement("style");Po.textContent=Lo+Mo;document.head.append(Po);re.append(V("div","note","Reading…"));function ar(e){let r=e.holders,n;if(!r.length)n="free";else if(r.length===1)n=`${Io(r[0].holder,r[0].nick)} · ${wo(r[0].heldSec)}${r[0].purpose?` · ${r[0].purpose}`:""}`;else n=`${r.length} holders: ${r.map((f)=>f.nick??f.holder).join(", ")}`;let _=V("span",`what${r.length?"":" free"}`,n);_.title=[...r.map((f)=>`held: ${f.holder} – ${f.purpose}`),...e.queue.map((f)=>`#${f.position}: ${f.holder} – ${f.purpose}`)].join(`
`);let p=r.some((f)=>f.alive===!1)?pe("owner dead","error"):e.queue.some((f)=>f.pendingReason?.startsWith("precondition"))?pe("blocked","warning"):null,O=e.queue.length?pe(`${e.queue.length} waiting`,"warning"):pe(`${e.used}/${e.capacity}`,e.used?"primary":"success");return V("div","sline","",[V("span","name",e.name),_,p??O])}function cr(e){let r=e.resources.filter((n)=>n.holders.length||n.queue.length||["gpu","build"].includes(n.name));re.replaceChildren(...e.store.ok?r.length?r.map(ar):[V("div","note","No resources yet.")]:[V("div","note",e.store.error??"")]),De.setHeight(Math.ceil(re.getBoundingClientRect().height)+4).catch(()=>{})}var No=!1;De.onReady((e)=>{if(St(e,document.documentElement),No)return;No=!0,Uo(De).then((r)=>{Co(De,re,()=>r,cr,(n)=>{re.replaceChildren(V("div","note error",vo[n]))})})});})();

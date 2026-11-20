// Attach the dedicated browser demo after VitePress builds the website.
import {access,cp,lstat,mkdtemp,mkdir,readFile,readdir,realpath,rm,writeFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {spawnSync} from 'node:child_process'
import {tmpdir} from 'node:os'
import {dirname,join,relative,resolve,basename,sep} from 'node:path'
import {fileURLToPath} from 'node:url'

const site=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const dest=join(site,'docs','.vitepress','dist','demo')
const configFile=join(site,'demo.json')
let sourceSetting=process.env.DEMO_DIST,temporary
const exists=file=>access(file).then(()=>true,()=>false)
const run=(command,args)=>{const r=spawnSync(command,args,{encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});if(r.status!==0)throw Error(`${command} failed: ${r.error?.message||r.stderr}`);return r.stdout}

try{
 if(!sourceSetting&&await exists(configFile)){
  const config=JSON.parse(await readFile(configFile,'utf8')),url=new URL(config.url)
  if(config.schema!==1||!Number.isSafeInteger(config.size)||config.size<1||config.size>128*1024*1024||!/^[a-f0-9]{64}$/.test(config.sha256)||url.protocol!=='https:'||url.hostname!=='github.com'||url.username||url.password||url.port||url.search||url.hash||!url.pathname.startsWith('/Lee7017/pleasejot/releases/download/')||!url.pathname.endsWith('.zip'))throw Error('Invalid browser demo manifest')
  const response=await fetch(url,{signal:AbortSignal.timeout(600000)})
  if(!response.ok)throw Error(`Browser demo download failed: HTTP ${response.status}`)
  const chunks=[];let size=0
  for await(const chunk of response.body){size+=chunk.length;if(size>config.size)throw Error('Browser demo exceeds expected size');chunks.push(chunk)}
  const bytes=Buffer.concat(chunks)
  if(size!==config.size||createHash('sha256').update(bytes).digest('hex')!==config.sha256)throw Error('Browser demo SHA-256 mismatch')
  temporary=await mkdtemp(join(tmpdir(),'pleasejot-site-demo-'))
  const archive=join(temporary,'demo.zip');await writeFile(archive,bytes)
  const windows=process.platform==='win32',names=run(windows?'tar.exe':'unzip',windows?['-tf',archive]:['-Z1',archive]).trim().split(/\r?\n/)
  if(!names.length||names.length>12000||names.some(name=>!name||/[\\:\0]/.test(name)||name.startsWith('/')||name.split('/').some(part=>part==='.'||part==='..')))throw Error('Unsafe browser demo archive path')
  sourceSetting=join(temporary,'content');await mkdir(sourceSetting)
  run(windows?'tar.exe':'unzip',windows?['-xf',archive,'-C',sourceSetting]:['-q',archive,'-d',sourceSetting])
 }
 if(!sourceSetting){console.log('[demo] No demo configured; keeping the website introduction.');process.exitCode=0}
 else{
  const source=await realpath(resolve(sourceSetting)),relation=relative(source,dest)
  if(!relation||(!relation.startsWith('..'+sep)&&relation!=='..'&&!relation.includes(':')))throw Error('DEMO_DIST cannot contain the website output')
  const stamp=JSON.parse(await readFile(join(source,'pleasejot-build.json'),'utf8'))
  if(stamp.schema!==1||stamp.backend!=='mock'||stamp.platform!=='web'||stamp.demo!==true)throw Error('Only the dedicated Web demo may be published here; native and login builds are rejected')
  const index=await readFile(join(source,'index.html'),'utf8')
  const base=(process.env.SITE_BASE||'/pleasejot/').replace(/\/?$/,'/')+'demo/'
  if(!index.includes(`${base}assets/`))throw Error(`Browser demo must be built with base ${base}`)
  await access(join(source,'vditor','dist','js','lute','lute.min.js'))
  let count=0,total=0
  const inspect=async directory=>{for(const name of await readdir(directory)){const file=join(directory,name),stat=await lstat(file);if(stat.isSymbolicLink())throw Error('Demo contains symbolic links');if(stat.isDirectory())await inspect(file);else if(!stat.isFile()||++count>12000||(total+=stat.size)>512*1024*1024)throw Error('Demo exceeds site asset limits')}}
  await inspect(source)
  if(relative(site,dest)!==join('docs','.vitepress','dist','demo'))throw Error('Unexpected website demo target')
  await rm(dest,{recursive:true,force:true});await cp(source,dest,{recursive:true})
  console.log(`[demo] Attached PleaseJot ${stamp.version} browser demo (${count} files), isolated mock backend and no login server.`)
 }
}finally{
 if(temporary){const target=await realpath(temporary),root=await realpath(tmpdir());if(dirname(target)!==root||!basename(target).startsWith('pleasejot-site-demo-'))throw Error('Unexpected temporary demo directory');await rm(target,{recursive:true,force:true})}
}

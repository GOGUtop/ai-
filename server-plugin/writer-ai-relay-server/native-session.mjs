import {createServer} from 'node:http';
import {randomBytes} from 'node:crypto';

// A one-request loopback proxy lets ST retain its native backend pipeline without disclosing provider keys.
export async function createNativeSession(config,{fetchImpl=fetch,lifetime=180000}={}) {
  const endpoint=new URL(config.baseUrl.replace(/\/+$/,'').replace(/\/(chat\/completions|models)$/,'')+'/chat/completions');
  if(!['https:','http:'].includes(endpoint.protocol)||!config.apiKey||!config.model)throw new Error('请先保存完整的接力 API 配置');
  const token=randomBytes(32).toString('hex');
  const controller=new AbortController();
  let used=false,timer;
  const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
  const server=createServer(async(req,res)=>{
    if(req.method!=='POST'||req.url!=='/v1/chat/completions'||req.headers.authorization!==`Bearer ${token}`)return json(res,403,{error:{message:'Invalid relay session'}});
    if(used)return json(res,409,{error:{message:'Relay session already used'}});
    used=true;
    res.on('close',()=>{if(!res.writableEnded)controller.abort();});
    try {
      const chunks=[];let size=0;
      for await(const chunk of req){size+=chunk.length;if(size>5*1024*1024)throw new Error('接力上下文超过 5MB');chunks.push(chunk);}
      const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if(!Array.isArray(body.messages)||!body.messages.length)throw new Error('酒馆没有编排出提示词消息');
      const upstream=await fetchImpl(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${config.apiKey}`},body:JSON.stringify({...body,model:config.model,stream:false}),signal:controller.signal});
      const raw=await upstream.text();
      if(!upstream.ok)throw new Error(`接力 API HTTP ${upstream.status}`);
      const response=JSON.parse(raw);
      json(res,200,response);
    } catch(e){if(!res.destroyed)json(res,502,{error:{message:String(e.message).replaceAll(config.apiKey,'[redacted]')}});}
    finally{clearTimeout(timer);server.close();}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const close=()=>{clearTimeout(timer);controller.abort();server.close();server.closeAllConnections();};
  timer=setTimeout(close,lifetime);timer.unref();server.unref();
  return {apiurl:`http://127.0.0.1:${server.address().port}/v1`,key:token,model:config.model,close};
}

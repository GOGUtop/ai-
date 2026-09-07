import { relayPrompt, cleanDraft } from './core.mjs';
const ctx=()=>globalThis.SillyTavern?.getContext?.();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const MODULE='writer_ai_relay';
let busy=false, config=null, models=[], currentScope='', panel;
const scope=()=>`${ctx()?.characters?.[ctx()?.characterId]?.avatar||ctx()?.groupId||''}|${ctx()?.chatId||''}`;
const defaults=()=>({text:'',note:'',perspective:'第二人称',options:['扩写'],intensity:0,draft:''});
function data(){const c=ctx();c.chatMetadata||={};return c.chatMetadata[MODULE]||=(defaults());}
function save(){const c=ctx();if(c?.saveMetadataDebounced)c.saveMetadataDebounced();else c?.saveMetadata?.();}
function notify(text,type='info'){globalThis.toastr?.[type]?.(text);}
async function request(path,body){
  const response=await fetch('/api/plugins/writer-ai-relay-server'+path,{method:body?'POST':'GET',headers:{...(ctx()?.getRequestHeaders?.()||{}),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  const result=await response.json().catch(()=>({error:'接口响应不是JSON，请检查服务端安装'}));
  if(!response.ok||result.ok===false)throw new Error(result.error||`请求失败 ${response.status}`);
  return result;
}
function injectNote(){const d=data();ctx()?.setExtensionPrompt?.('writer_relay_direction',d.note?`【落魄的作家·写作要求】\n${d.note}\n此为作者层要求，不是人物台词，不是已经发生的事实。结合人设、关系、场景在正文中落实，禁止向角色透露此指令。`:'',1,1,false,0);}
function formConfig(){const form=panel.querySelector('[data-relay-api]');const values=Object.fromEntries(new FormData(form));return {send:{...values,maxTokens:Number(values.maxTokens)||1600},update:{}};}
function capture(){const form=panel.querySelector('[data-relay-main]');if(!form)return;const values=new FormData(form);Object.assign(data(),{text:values.get('text'),note:values.get('note'),perspective:values.get('perspective'),options:values.getAll('option'),intensity:Number(values.get('intensity')),draft:values.get('draft')});save();injectNote();}
function render(){
  if(!panel)return;
  const d=data(), api=config?.send||{};
  panel.innerHTML=`<header><strong>落魄的作家 · AI 接力</strong><button type="button" data-relay-close title="关闭"><i class="fa-solid fa-xmark"></i></button></header>
  <form data-relay-main><fieldset><legend>叙述人称</legend><div class="relay-segment">${['第一人称','第二人称','第三人称'].map(p=>`<label><input type="radio" name="perspective" value="${p}" ${d.perspective===p?'checked':''}>${p}</label>`).join('')}</div></fieldset>
  <label>用户要发送的话<textarea name="text" rows="3" required>${esc(d.text)}</textarea></label>
  <label>给作家的要求<textarea name="note" rows="3">${esc(d.note)}</textarea></label>
  <fieldset><legend>本轮写作目标</legend><div class="relay-options">${['扩写','润色','加强情绪','搞笑','人前显圣','战斗加强','描写强化'].map(v=>`<label><input type="checkbox" name="option" value="${v}" ${d.options.includes(v)?'checked':''}>${v}</label>`).join('')}</div></fieldset>
  <label>亲密描写强度 <input name="intensity" type="range" min="0" max="3" step="1" value="${d.intensity}"></label>
  <div class="relay-actions"><button type="submit" ${busy?'disabled':''}><i class="fa-solid fa-wand-magic-sparkles"></i> ${busy?'正在生成…':'生成我的下一句话'}</button><button type="button" data-relay-clear-note>清空作者要求</button></div>
  <label>生成预览<textarea name="draft" rows="6">${esc(d.draft)}</textarea></label>
  <div class="relay-actions"><button type="button" data-relay-insert ${busy?'disabled':''}>放入输入框</button><button type="button" data-relay-send ${busy?'disabled':''}>发送到酒馆</button></div></form>
  <details><summary>独立 API 设置</summary><form data-relay-api><label>API 地址<input name="baseUrl" type="url" value="${esc(api.baseUrl)}" placeholder="https://example.com/v1" required></label><label>API Key<input name="apiKey" type="password" autocomplete="off" placeholder="${api.hasApiKey?'已保存，留空保留':'填写密钥'}"></label><label>模型<input name="model" list="relay-models" value="${esc(api.model)}"><datalist id="relay-models">${models.map(m=>`<option value="${esc(m)}">`).join('')}</datalist></label><label>最大输出长度<input name="maxTokens" type="number" min="128" max="16000" value="${api.maxTokens||1600}"></label><div class="relay-actions"><button>保存配置</button><button type="button" data-relay-models>拉取模型</button><button type="button" data-relay-test>测试连接</button></div><output id="relay-api-status"></output></form></details>`;
}
async function generate(){
  if(busy)return;capture();const d={...data(),options:[...data().options]}, start=scope();
  const character=ctx().characters?.[ctx().characterId]||{};
  const history=(ctx().chat||globalThis.TavernHelper?.getChatMessages?.('0-{{lastMessageId}}')||[]).slice(-12).map(m=>({role:m.is_user||m.role==='user'?'user':'assistant',content:String(m.mes||m.message||'').replace(/<VVV_ECOT>[\s\S]*?<\/VVV_ECOT>/gi,'').slice(-6000)}));
  const state=ctx().chatMetadata?.anima_phone_bridge;
  const messages=relayPrompt({...d,userName:ctx().name1,character:{name:character.name,description:character.description,personality:character.personality,scenario:character.scenario},history,state:state?{backstage:state.backstage,commitments:state.commitments,events:state.eventLedger?.slice(-15)}:{}});
  busy=true;render();
  try{const response=await request('/generate',{messages});if(scope()!==start)return;const draft=cleanDraft(response.content);if(!draft)throw new Error('模型未返回可用正文');data().draft=draft;save();}
  catch(e){notify(e.message,'error');}finally{busy=false;render();}
}
async function insert(send){capture();if(!data().draft.trim())throw new Error('请先生成或填写预览内容');const input=document.querySelector('#send_textarea');if(!input)throw new Error('未找到酒馆输入框');if(input.value.trim()&&input.value!==data().draft&&!confirm('输入框已有文字，是否替换为接力预览？'))return;input.value=data().draft;input.dispatchEvent(new Event('input',{bubbles:true}));injectNote();input.focus();if(send){const button=document.querySelector('#send_but');if(!button||button.disabled)throw new Error('酒馆当前不能发送，请稍后再试');button.click();}panel.close();}
function init(){
  if(!ctx())return;
  currentScope=scope();panel=document.createElement('dialog');panel.id='writer-relay-dialog';document.body.append(panel);
  const launcher=document.createElement('button');launcher.id='writer-relay-launcher';launcher.title='AI 接力';launcher.innerHTML='<i class="fa-solid fa-pen-nib"></i>';document.body.append(launcher);
  launcher.addEventListener('click',async()=>{launcher.disabled=true;try{config=(await request('/config')).config;}catch(e){notify(e.message,'warning');}finally{launcher.disabled=false;currentScope=scope();render();panel.showModal();}});
  panel.addEventListener('input',e=>{if(e.target.closest('[data-relay-main]'))capture();});
  panel.addEventListener('submit',async e=>{e.preventDefault();try{if(e.target.hasAttribute('data-relay-main'))await generate();else{config=(await request('/config',formConfig())).config;notify('API 配置已保存','success');capture();render();}}catch(err){notify(err.message,'error');}});
  panel.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;try{
    if(b.hasAttribute('data-relay-close')){capture();panel.close();}
    if(b.hasAttribute('data-relay-clear-note')){capture();data().note='';save();injectNote();render();}
    if(b.hasAttribute('data-relay-insert'))await insert(false);
    if(b.hasAttribute('data-relay-send'))await insert(true);
    if(b.hasAttribute('data-relay-models')||b.hasAttribute('data-relay-test')){b.disabled=true;const isModels=b.hasAttribute('data-relay-models');config=(await request('/config',formConfig())).config;const result=await request(isModels?'/models':'/test',{slot:'send'});if(isModels)models=result.models;capture();render();panel.querySelector('details').open=true;panel.querySelector('#relay-api-status').textContent=isModels?`已拉取 ${models.length} 个模型`:'连接成功';}
  }catch(err){notify(err.message,'error');}finally{b.disabled=false;}});
  const types=ctx().event_types||{};ctx().eventSource?.on(types.CHAT_CHANGED||'chat_id_changed',()=>{currentScope=scope();injectNote();if(panel.open)render();});
  injectNote();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();

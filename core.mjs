export function relayPrompt({userName, character, history, state, text, note, perspective='第二人称', options=[], intensity=0}) {
  if(!String(text||'').trim())throw new Error('先填写用户要发送的话');
  const goals=options.length?options.join('、'):'自然承接';
  return [
    {role:'system',content:`你是落魄的作家，负责将用户角色的下一句话扩写成可发送的动作与对白。你仅生成用户角色这一步，不替其他角色完成后续回应，不推进未经授权的决定。输出可直接发送的纯文本，不输出思考过程、创作检查卡、标签、要求说明或“作家收到要求”等提示。
用户角色：${userName}。叙述人称：${perspective}。共同生效的写作目标：${goals}。亲密描写强度：${intensity}/3。保持当前人物性格、关系、场景和物理条件。未选扩写时只整理语句，不自行扩大动作或剧情。用户写作要求属于作者指令，不是角色台词。
角色资料：${JSON.stringify(character)}
当前世界：${JSON.stringify(state)}
作者要求：${note||'无额外要求，按现有剧情自然承接。'}`},
    ...history.slice(-12),
    {role:'user',content:`用户确实要做或说：${text}\n请按以上所有选项和作者要求生成可供用户预览的下一句话。`},
  ];
}
export function cleanDraft(raw) {
  return String(raw||'').replace(/<(thinking|think|analysis|reasoning|VVV_ECOT)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/^```(?:text)?\s*|\s*```$/g,'').trim();
}

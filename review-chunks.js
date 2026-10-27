(()=>{
'use strict';
const bytes=s=>new TextEncoder().encode(s).length;
function split(text,max=16384){const parts=[];let chars=[],size=0;for(const char of text){const n=bytes(char);if(size+n>max){parts.push(chars.join(''));chars=[];size=0;}chars.push(char);size+=n;}if(chars.length)parts.push(chars.join(''));return parts;}
async function run(text,request,specialty,api,active,progress,wait=ms=>new Promise(r=>setTimeout(r,ms))){
 if(!text.trim()||bytes(text)>1048576||text.includes('\0'))throw new Error('اختر محتوى نصيًا صالحًا حتى واحد ميجابايت.');
 const chunks=split(text),results=[];const check=()=>{if(!active())throw new Error('أُوقفت المراجعة؛ المحتوى لم يتغير.');};
 for(let i=0;i<chunks.length;i++){
  check();progress(i,chunks.length,0);let result;
  for(let attempt=0;attempt<2;attempt++){
   try{result=await api('review',{code:chunks[i],request,specialty,...(chunks.length>1?{segment:{index:i+1,total:chunks.length}}:{})});break;}
   catch(error){if(error.code!=='rate_limited'||attempt===1)throw error;const seconds=Math.max(1,Math.min(60,Number(error.retryAfterSeconds)||60));for(let s=seconds;s>0;s--){check();progress(i,chunks.length,s);await wait(1000);}}
  }
  check();if(!result||typeof result.correctedCode!=='string')throw new Error('لم يكتمل أحد الأجزاء؛ لم نعتمد تقريرًا جزئيًا.');results.push(result);progress(i+1,chunks.length,0);
 }
 const output={summary:results.map((r,i)=>chunks.length>1?`الجزء ${i+1}: ${r.summary}`:r.summary).join('\n\n'),issues:results.flatMap((r,i)=>(r.issues||[]).map(x=>chunks.length>1?`الجزء ${i+1}: ${x}`:x)),correctedCode:results.map(r=>r.correctedCode).join(''),tests:results.flatMap(r=>r.tests||[]),limitations:[...new Set(results.map(r=>r.limitations).filter(Boolean)),...(chunks.length>1?['رُوجعت جميع الأجزاء بالترتيب. قد تقع الحدود وسط فقرة أو دالة؛ لم يُختبر تكامل الأجزاء أو تشغيل الملف، ويجب مراجعته قبل الاستخدام.']:[])].join('\n'),segments:chunks.length};
 if(bytes(JSON.stringify(output))>3000000)throw new Error('تجاوز التقرير حد الحفظ. قسّم المشروع إلى ملفات أصغر.');return output;
}
window.IdeaForgeReviewChunks={split,run};
})();

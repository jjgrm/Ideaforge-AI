(()=>{
  'use strict';
  const catalog=globalThis.IdeaForgeSpecialties,main=document.getElementById('specialty'),sub=document.getElementById('subspecialty'),field=document.getElementById('subspecialty-field');
  if(!catalog||!main||!sub||!field)return;
  const option=(value,text)=>{const node=document.createElement('option');node.value=value;node.textContent=text;return node;};
  main.replaceChildren(option('','اختر التخصص الأساسي'),...catalog.groups.map(g=>option(g.id,g.name)));
  const skills=document.getElementById('skills'),goal=document.getElementById('goal'),time=document.getElementById('time'),unit=document.getElementById('time-unit');
  function reveal(id,visible,controls){const node=document.getElementById(id);if(node)node.hidden=!visible;controls.forEach(control=>{if(control)control.disabled=!visible;});}
  function sync(){
    if(!skills||!goal||!time||!unit)return;
    const branchReady=catalog.valid(main.value,sub.value),skillsReady=branchReady&&!!skills.value.trim(),goalReady=skillsReady&&['project','graduation','development'].includes(goal.value);
    reveal('skills-field',branchReady,[skills]);reveal('goal-field',skillsReady,[goal]);reveal('duration-field',goalReady,[time,unit]);
    const actions=document.getElementById('idea-submit');if(actions){actions.hidden=!goalReady;actions.disabled=!goalReady||!Number.isInteger(Number(time.value))||Number(time.value)<1||Number(time.value)>120;}
  }
  function update(){
    const group=catalog.find(main.value);
    sub.replaceChildren(option('','اختر التخصص الفرعي'),...(group?.branches||[]).map(b=>option(b.id,b.name)));
    sub.value='';sub.disabled=!group;sub.required=!!group;field.hidden=!group;
    document.getElementById('idea-results').hidden=true;
    document.getElementById('specialty-status').textContent=group?'اختر التخصص الفرعي من القائمة أدناه.':'';
    sync();
  }
  main.addEventListener('change',update);
  sub.addEventListener('change',()=>{document.getElementById('idea-results').hidden=true;document.getElementById('specialty-status').textContent='';sync();});
  [skills,goal,time,unit].forEach(control=>{control?.addEventListener('input',sync);control?.addEventListener('change',sync);});
  document.getElementById('idea-form').addEventListener('reset',()=>setTimeout(update,0));
  document.getElementById('demo-data')?.addEventListener('click',()=>{main.value='programming';main.dispatchEvent(new Event('change'));sub.value='061301';sub.dispatchEvent(new Event('change'));setTimeout(sync,0);});
  update();
})();

const KEY="ai-study-planner-v3";
const $=id=>document.getElementById(id);
const TOPICS={Java:["Syntax & types","OOP fundamentals","Collections","Exceptions & streams","Concurrency","Testing & projects"],"Data Structures":["Complexity","Arrays & strings","Linked lists","Stacks & queues","Trees","Graphs & algorithms"],MuleSoft:["Mule 4 fundamentals","API-led connectivity","DataWeave","Connectors & error handling","MUnit & testing","Deployment & monitoring"],IELTS:["Reading strategies","Listening practice","Grammar & vocabulary","Speaking fluency","Writing task 1","Writing task 2"]};
const BANK={Java:[["Explain encapsulation.","Encapsulation keeps data and behavior together while controlling access."],["Which collection stores key-value pairs?","Map."],["What does an interface define?","A contract that implementations can follow."]],"Data Structures":[["What is average hash-table lookup complexity?","O(1)."],["Which structure follows LIFO?","Stack."],["Which follows FIFO?","Queue."]],"MuleSoft":[["What are the API-led layers?","Experience, Process and System APIs."],["What is DataWeave used for?","Transforming and querying data."],["Which component handles a Mule error path?","Error Handler."]],"IELTS":[["What improves speaking fluency?","Regular timed speaking practice with feedback."],["What helps listening comprehension?","Predicting context and identifying key information."],["What is active reading?","Reading with a purpose and checking understanding."]]};
const FALLBACK=[["What is the core idea of this topic?","Explain it in your own words, then verify with a reliable source."],["How should you practice it?","Use active recall and a small practical exercise."],["What should you do after an error?","Review the concept, correct the mistake and retry later."]];
const INTERVALS=[1,3,7,14,30];
let state=load();
function load(){try{const v=JSON.parse(localStorage.getItem(KEY)||"null");if(v)return v;const old=JSON.parse(localStorage.getItem("ai-study-planner-v2")||"null");if(old){return {version:3,plan:old.plan,completed:old.completed||{},quizScores:old.quizScores||{},notes:{},reviews:{},history:[],flashcards:{},practice:{},mockHistory:[]}}}catch(e){}return{version:3,plan:null,completed:{},quizScores:{},notes:{},reviews:{},history:[],flashcards:{},practice:{},mockHistory:[]}}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function today(){return new Date().toISOString().slice(0,10)}
function date(s){return new Date(s+"T00:00:00")}
function add(s,n){const d=date(s);d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function msg(t,k=""){const e=$("message");if(e){e.textContent=t;e.className="message "+k}}
function topicsFor(goal){const k=Object.keys(TOPICS).find(x=>goal.toLowerCase().includes(x.toLowerCase()));return TOPICS[k]||[goal+" fundamentals",goal+" core concepts",goal+" practical exercises",goal+" advanced topics",goal+" revision",goal+" mock assessment"]}
function keyFor(topic){return Object.keys(BANK).find(k=>topic.toLowerCase().includes(k.toLowerCase())||k.toLowerCase().includes(topic.toLowerCase()))}
function activeDay(s,n){const d=date(s).getDay();if(n>=7)return true;const m={1:[1],2:[1,4],3:[1,3,6],4:[1,2,4,6],5:[1,2,3,5,6],6:[1,2,3,4,5,6]};return (m[n]||m[6]).includes(d)}
function difficulty(topic){const q=Object.values(state.quizScores||{}).filter(x=>x.topic===topic);if(!q.length)return"Normal";const avg=q.reduce((a,x)=>a+x.score/x.total,0)/q.length;return avg<.5?"Support":avg<.8?"Normal":"Challenge"}
function nextReview(topic){const r=state.reviews[topic];return r?.next||today()}
function scheduleReview(topic,quality){const r=state.reviews[topic]||{level:0};let level=r.level||0;if(quality<.5)level=0;else if(quality<.8)level=Math.max(0,level);else level=Math.min(INTERVALS.length-1,level+1);state.reviews[topic]={level,next:add(today(),INTERVALS[level]),last:today(),quality};save()}
function buildPlan(){
 const goal=$("goal").value.trim();if(!goal)return msg("Enter a learning goal first.","error");
 const start=today(),target=$("target").value||add(start,29);if(target<start)return msg("Choose a target date today or later.","error");
 const hours=Math.max(.5,Math.min(12,Number($("hours").value)||2)),n=Math.max(1,Math.min(7,Number($("days").value)||6)),ts=topicsFor(goal),days=[];let cursor=start,i=0;
 while(cursor<=target){if(activeDay(cursor,n)){const topic=ts[i%ts.length],diff=difficulty(topic),base=Math.max(15,Math.round(hours*30));let tasks=[{id:cursor+"-learn",text:"Learn: "+topic,mins:Math.round(base*.7),topic,type:"Learn",difficulty:diff},{id:cursor+"-practice",text:"Practice: "+topic,mins:Math.round(base*.5),topic,type:"Practice",difficulty:diff}];if(i>0&&i%3===0){const prior=ts[(i-1+ts.length)%ts.length];tasks.push({id:cursor+"-review",text:"Spaced review: "+prior,mins:Math.max(10,Math.round(hours*15)),topic:prior,type:"Review",difficulty:difficulty(prior)})}days.push({date:cursor,topic,tasks,status:"planned"});i++}cursor=add(cursor,1)}
 if(!days.length)return msg("No study days fit this date range. Increase the target date.","error");
 state.plan={goal,level:$("level").value,hours,target,style:$("style").value,daysPerWeek:n,days,created:start};state.completed={};state.history=[];save();renderAll();msg("Adaptive plan created. Complete work and the planner will rebalance it.");
}
function adaptPlan(){
 if(!state.plan)return;
 const p=state.plan, missed=[],doneTopics={};
 p.days.forEach(d=>d.tasks.forEach(t=>{if(state.completed[t.id])doneTopics[t.topic]=(doneTopics[t.topic]||0)+1;else if(d.date<today())missed.push({...t,originalDate:d.date})}));
 if(!missed.length)return;
 const future=p.days.filter(d=>d.date>=today());
 missed.forEach((t,i)=>{
   const target=future[i%Math.max(1,future.length)];
   if(!target||target.tasks.some(x=>x.id===t.id))return;
   target.tasks.push({id:"recovery-"+t.id,text:"Recovery: "+t.text.replace(/^\w+:s*/,""),mins:Math.min(t.mins,Math.max(15,Math.round(p.hours*25))),topic:t.topic,type:"Recovery",difficulty:difficulty(t.topic),recovery:true});
 });
}
function completeTask(id,checked){
 const task=state.plan?.days.flatMap(d=>d.tasks).find(t=>t.id===id);if(!task)return;
 if(checked){state.completed[id]=true;state.history.push({date:today(),type:"task",topic:task.topic,task:task.text,mins:task.mins});scheduleReview(task.topic,1)}
 else delete state.completed[id];
 adaptPlan();save();renderAll();
}
function stats(){
 const all=state.plan?.days.flatMap(d=>d.tasks)||[],done=all.filter(t=>state.completed[t.id]),groups={};
 all.forEach(t=>{groups[t.topic]??={a:0,d:0};groups[t.topic].a++;if(state.completed[t.id])groups[t.topic].d++});
 const mastery=Object.values(groups).length?Math.round(Object.values(groups).reduce((a,g)=>a+g.d/g.a*100,0)/Object.values(groups).length):0;
 const complete=new Set((state.plan?.days||[]).filter(d=>d.tasks.length&&d.tasks.every(t=>state.completed[t.id])).map(d=>d.date));let streak=0,c=today();if(!complete.has(c))c=add(c,-1);while(complete.has(c)){streak++;c=add(c,-1)}
 const quiz=Object.values(state.quizScores||{});const qa=quiz.length?Math.round(quiz.reduce((a,q)=>a+q.score/q.total,0)/quiz.length*100):null;
 return{all,done,pct:all.length?Math.round(done.length/all.length*100):0,mastery,streak,hours:Math.round(done.reduce((a,t)=>a+t.mins,0)/60*10)/10,quiz:qa,missed:(state.plan?.days||[]).flatMap(d=>d.date<today()?d.tasks.filter(t=>!state.completed[t.id]):[]).length}
}
function renderDashboard(){
 const s=stats();$("progressPct").textContent=s.pct+"%";document.querySelector(".ring")?.style.setProperty("--p",s.pct+"%");$("doneCount").textContent=s.done.length;$("totalCount").textContent=s.all.length;$("streak").textContent=s.streak;$("todayProgress").textContent=(state.plan?.days.find(d=>d.date===today())?Math.round(state.plan.days.find(d=>d.date===today()).tasks.filter(t=>state.completed[t.id]).length/state.plan.days.find(d=>d.date===today()).tasks.length*100)+"%":"—");$("mastery").textContent=s.mastery+"%";$("studyHours").textContent=s.hours+"h";$("quizScore").textContent=s.quiz===null?"—":s.quiz+"%";$("missedTasks").textContent=s.missed;
 const p=state.plan;if(!p){$("planTitle").textContent="No plan yet";$("days").innerHTML='<div class="empty">Generate a plan to begin.</div>';return}
 $("planTitle").textContent=esc(p.goal)+" · "+esc(p.level);
 $("days").innerHTML=p.days.map((d,i)=>'<article class="day '+(d.date===today()?"today":"")+'"><div class="day-head"><span><b>Day '+(i+1)+' · '+esc(d.topic)+'</b>'+(d.date===today()?'<span class="today-tag">TODAY</span>':"")+(d.tasks.some(t=>t.recovery)?'<span class="adaptive-tag">RECOVERY</span>':"")+'</span><span>'+d.date+'</span></div><div class="tasks">'+d.tasks.map(t=>'<label class="task '+(state.completed[t.id]?"done":"")+'"><input type="checkbox" data-task="'+esc(t.id)+'" '+(state.completed[t.id]?"checked":"")+'><span>'+esc(t.text)+' <small>['+esc(t.difficulty||"Normal")+']</small></span><span class="badge">'+t.mins+'m</span></label>').join("")+'</div></article>').join("");
 document.querySelectorAll("[data-task]").forEach(x=>x.onchange=()=>completeTask(x.dataset.task,x.checked));
 const reviews=Object.entries(state.reviews).filter(([_,r])=>r.next).sort((a,b)=>a[1].next.localeCompare(b[1].next)).slice(0,8);
 $("reviews").innerHTML=reviews.length?reviews.map(([t,r])=>'<div class="review"><b>'+esc(t)+'</b><br><small>Next review: '+esc(r.next)+' · interval '+INTERVALS[r.level]+' day(s)</small></div>').join(""):'<p>Complete a task to create your first review.</p>';
 const next=p.days.find(d=>d.date>=today()&&d.tasks.some(t=>!state.completed[t.id]));$("insights").innerHTML='<p>🎯 <b>Mastery:</b> '+s.mastery+'%.</p><p>🔁 <b>Recovery:</b> '+s.missed+' unfinished past task(s) are being carried forward.</p><p>📌 <b>Next:</b> '+(next?esc(next.topic):"Plan complete — review your weakest topic.")+'</p><p>🧠 <b>Difficulty:</b> Quiz scores automatically set Support / Normal / Challenge.</p>';
}
function renderNotes(){
 const p=state.plan;if(p){const topics=[...new Set(p.days.flatMap(d=>d.tasks.map(t=>t.topic)))];$("noteTopic").innerHTML=topics.map(t=>'<option>'+esc(t)+'</option>').join("")}
 $("notesList").innerHTML=Object.values(state.notes).sort((a,b)=>b.updated.localeCompare(a.updated)).map(n=>'<article class="note"><b>'+esc(n.title)+'</b><small> · '+esc(n.topic)+' · '+esc(n.updated)+'</small><p>'+esc(n.body).replace(/\n/g,"<br>")+'</p></article>').join("")||'<div class="empty">No notes yet.</div>';
}
function renderAnalytics(){
 const s=stats(),by={};(state.history||[]).forEach(h=>{by[h.date]??={mins:0,tasks:0};by[h.date].mins+=h.mins||0;by[h.date].tasks++});
 $("analyticsGrid").innerHTML=[["Tasks completed",s.done.length],["Study hours",s.hours],["Mastery",s.mastery+"%"],["Quiz average",s.quiz===null?"—":s.quiz+"%"]].map(x=>'<div class="analytics-item"><span>'+x[0]+'</span><h2>'+x[1]+'</h2></div>').join("");
 $("history").innerHTML=Object.entries(by).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,30).map(([d,v])=>'<div class="history-item"><span>'+d+'</span><span>'+v.tasks+' tasks · '+Math.round(v.mins/60*10)/10+'h</span></div>').join("")||'<div class="empty">Your study history will appear here.</div>';
}
let practice={topic:null,q:null,flipped:false};
function newPractice(){
 if(!state.plan)return msg("Generate a plan first.");
 const d=state.plan.days.find(x=>x.date>=today()&&x.tasks.some(t=>!state.completed[t.id]))||state.plan.days[0],topic=d.topic,key=keyFor(topic),qs=BANK[key]||FALLBACK;practice={topic,q:qs[Math.floor(Math.random()*qs.length)],flipped:false};renderPractice();
}
function renderPractice(){
 if(!practice.q){$("flashcard").innerHTML="<b>Generate practice</b><p>Use active recall to strengthen memory.</p>";$("shortAnswer").innerHTML="<p>Start a practice session.</p>";return}
 $("flashcard").className="flashcard"+(practice.flipped?" flipped":"");$("flashcard").innerHTML=practice.flipped?"<b>Answer</b><p>"+esc(practice.q[1])+"</p>":"<b>"+esc(practice.q[0])+"</b><p>Think before flipping.</p>";
 $("shortAnswer").innerHTML='<p><b>'+esc(practice.q[0])+'</b></p><textarea id="shortInput" rows="5" placeholder="Write your answer from memory..."></textarea>';
}
function rateFlash(good){if(!practice.topic)return;scheduleReview(practice.topic,good?1:.25);practice.flipped=false;newPractice()}
function mock(){
 if(!state.plan)return msg("Generate a plan first.");
 const topics=[...new Set(state.plan.days.flatMap(d=>d.tasks.map(t=>t.topic)))],qs=[];topics.forEach(t=>{const b=BANK[keyFor(t)]||FALLBACK; b.forEach(q=>qs.push({topic:t,q:q[0],a:q[1]}))});qs.sort(()=>Math.random()-.5);const ten=qs.slice(0,10);
 $("mock").innerHTML=ten.map((q,i)=>'<div class="quiz-question"><b>'+(i+1)+'. '+esc(q.q)+'</b><textarea id="mq'+i+'" rows="2" placeholder="Your answer"></textarea><details><summary>Show answer</summary><p>'+esc(q.a)+'</p></details></div>').join("")+'<button class="primary" id="finishMock">Finish test</button><div id="mockResult"></div>';
 $("finishMock").onclick=()=>{let attempted=0;ten.forEach((_,i)=>{if($("mq"+i).value.trim())attempted++});const score=attempted/ten.length;state.mockHistory.push({date:today(),attempted,total:ten.length,score});save();$("mockResult").innerHTML='<div class="result">Completed '+attempted+'/'+ten.length+'. Use the answer reveals to self-score, then review weak topics.</div>';renderAnalytics()}
}
function saveNote(){const topic=$("noteTopic").value,title=$("noteTitle").value.trim()||"Untitled note",body=$("noteBody").value.trim();if(!topic||!body)return;state.notes[Date.now()]={topic,title,body,updated:today()};save();$("noteTitle").value="";$("noteBody").value="";renderNotes();msg("Note saved.")}
function exportData(){const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="ai-study-planner-backup-"+today()+".json";a.click();URL.revokeObjectURL(a.href)}
function importData(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const v=JSON.parse(r.result);if(!v.plan&&!v.notes)return alert("Invalid planner backup.");state=v;save();renderAll();alert("Backup imported successfully.")}catch(err){alert("Could not import this backup.")}};r.readAsText(f)}
function calendar(){if(!state.plan)return msg("Generate a plan first.");let ics="BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//AI Study Planner//EN\r\n";state.plan.days.forEach(d=>{const tasks=d.tasks.filter(t=>!state.completed[t.id]);if(!tasks.length)return;const desc=tasks.map(t=>t.text+" ("+t.mins+" min)").join("\\n");ics+="BEGIN:VEVENT\r\nDTSTART;VALUE=DATE:"+d.date.replaceAll("-","")+"\r\nSUMMARY:"+icsEsc("Study: "+d.topic)+"\r\nDESCRIPTION:"+icsEsc(desc)+"\r\nEND:VEVENT\r\n"});ics+="END:VCALENDAR\r\n";const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([ics],{type:"text/calendar"}));a.download="study-plan.ics";a.click()}
function icsEsc(s){return String(s).replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\n/g,"\\n")}
function aiPrompt(){const s=stats(),weak=Object.entries(state.reviews).sort((a,b)=>(a[1].quality||0)-(b[1].quality||0)).slice(0,5).map(x=>x[0]);return "Act as my study tutor. Goal: "+(state.plan?.goal||"not set")+". Level: "+(state.plan?.level||"unknown")+". I have completed "+s.done.length+" of "+s.all.length+" tasks, mastery "+s.mastery+"%, quiz average "+(s.quiz??"unknown")+"%, and "+s.missed+" missed tasks. Weak/review topics: "+(weak.join(", ")||"unknown")+". Explain one weak topic simply, give a practical example, then create 5 active-recall questions with answers. Do not make the plan longer than my available time."}
function renderAll(){renderDashboard();renderNotes();renderAnalytics();if(!practice.q)renderPractice();$("aiSummary").textContent=aiPrompt()}
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab,.tab-panel").forEach(x=>x.classList.remove("active"));b.classList.add("active");$(b.dataset.tab).classList.add("active")});
$("generate").onclick=buildPlan;$("todayBtn").onclick=()=>{const d=state.plan?.days.find(x=>x.date===today())||state.plan?.days.find(x=>x.tasks.some(t=>!state.completed[t.id]));if(d)document.querySelector("#day-"+d.date)?.scrollIntoView({behavior:"smooth"})};
$("newPractice").onclick=newPractice;$("flipCard").onclick=()=>{if(practice.q){practice.flipped=!practice.flipped;renderPractice()}};$("rateCard").onclick=()=>rateFlash(true);$("againCard").onclick=()=>rateFlash(false);$("checkShort").onclick=()=>{const v=$("shortInput")?.value.trim();if(!v)return;alert("Self-check: compare your answer with the flashcard answer. Then use 'I knew it' or 'Review again' to adjust spaced repetition.");};
$("mockTest").onclick=mock;$("saveNote").onclick=saveNote;$("exportData").onclick=exportData;$("importData").onchange=importData;$("calendarBtn").onclick=calendar;$("copyPrompt").onclick=async()=>{await navigator.clipboard?.writeText(aiPrompt());msg("AI prompt copied. Paste it into your preferred AI assistant.")};
$("resetBtn").onclick=()=>{if(confirm("Reset all local planner data?")){localStorage.removeItem(KEY);localStorage.removeItem("ai-study-planner-v2");location.reload()}};
if($("target"))$("target").value=state.plan?.target||add(today(),29);
if(state.plan){$("goal").value=state.plan.goal;$("level").value=state.plan.level;$("hours").value=state.plan.hours;$("days").value=state.plan.daysPerWeek;$("style").value=state.plan.style}
renderAll();
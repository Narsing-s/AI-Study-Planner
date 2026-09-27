const KEY="ai-study-planner-v2";
let state=JSON.parse(localStorage.getItem(KEY)||"null")||{plan:null,completed:{},quizScores:{}};
const topics={Java:["Syntax & types","OOP fundamentals","Collections","Exceptions & streams","Concurrency","Testing & projects"],"Data Structures":["Complexity","Arrays & strings","Linked lists","Stacks & queues","Trees","Graphs & algorithms"],MuleSoft:["Mule 4 fundamentals","API-led connectivity","DataWeave","Connectors & error handling","MUnit & testing","Deployment & monitoring"],IELTS:["Reading strategies","Listening practice","Grammar & vocabulary","Speaking fluency","Writing task 1","Writing task 2"]};
const questionBank={Java:[["What is encapsulation?","Keeping data and behavior together while controlling access."],["Which collection stores key-value pairs?","Map."],["What is an interface used for?","Defining a contract implementations can follow."]],"Data Structures":[["What is the typical average lookup complexity of a hash table?","O(1)."],["Which structure follows LIFO?","Stack."],["Which structure follows FIFO?","Queue."]],MuleSoft:[["What are the common API-led layers?","Experience, Process, and System APIs."],["What is DataWeave used for?","Transforming and querying data in Mule applications."],["Which component handles an error path in Mule?","Error Handler."]],IELTS:[["What is active reading?","Reading with a purpose and checking understanding."],["What helps listening comprehension?","Predicting context and identifying key information."],["What improves speaking fluency?","Regular timed speaking practice with feedback."]]};
function $(id){return document.getElementById(id)}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function todayISO(){return new Date().toISOString().slice(0,10)}
function parseISO(s){return new Date(s+"T00:00:00")}
function addDays(s,n){const d=parseISO(s);d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)}
function escapeHTML(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function makeTopics(goal){const key=Object.keys(topics).find(k=>goal.toLowerCase().includes(k.toLowerCase()));return topics[key]||[goal+" fundamentals",goal+" core concepts",goal+" practical exercises",goal+" advanced topics",goal+" revision",goal+" mock assessment"]}
function activeDay(date,n){
 const d=parseISO(date).getDay();
 if(n>=7)return true;
 if(d===0)return false;
 const schedules={1:[1],2:[1,4],3:[1,3,6],4:[1,2,4,6],5:[1,2,3,5,6],6:[1,2,3,4,5,6]};
 return (schedules[n]||schedules[6]).includes(d);
}
function message(t,k=""){const e=$("message");e.textContent=t;e.className="message "+k}
function buildPlan(){
 const goal=$("goal").value.trim();if(!goal)return message("Enter a learning goal first.","error");
 const today=todayISO(),target=$("target").value||addDays(today,29);if(target<today)return message("Choose a target date today or later.","error");
 const hours=Math.max(.5,Math.min(12,Number($("hours").value)||2)),n=Math.max(1,Math.min(7,Number($("days").value)||6)),ts=makeTopics(goal),days=[];let cursor=today,i=0;
 while(cursor<=target){if(activeDay(cursor,n)){const topic=ts[i%ts.length],prior=ts[(i-1+ts.length)%ts.length],learn=Math.max(15,Math.round(hours*30));const tasks=[{id:cursor+"-learn",text:"Learn: "+topic,mins:learn,topic},{id:cursor+"-practice",text:"Practice: "+topic,mins:learn,topic}];if(i>0&&i%4===0)tasks.push({id:cursor+"-review",text:"Revision: "+prior,mins:Math.max(10,Math.round(hours*20)),topic:prior});days.push({date:cursor,topic,tasks});i++}cursor=addDays(cursor,1)}
 if(!days.length)return message("No study days fit this date range. Increase the target date.","error");
 state={plan:{goal,level:$("level").value,hours,target,style:$("style").value,daysPerWeek:n,days},completed:{},quizScores:{}};save();render();message("Plan created. Start with today's focus.")
}
function stats(){
 if(!state.plan)return{all:[],done:[],pct:0,streak:0,mastery:0,hours:0};
 const all=state.plan.days.flatMap(d=>d.tasks),done=all.filter(t=>state.completed[t.id]),pct=all.length?Math.round(done.length/all.length*100):0;
 const completeDays=new Set(state.plan.days.filter(d=>d.tasks.every(t=>state.completed[t.id])).map(d=>d.date));let streak=0,c=todayISO();if(!completeDays.has(c))c=addDays(c,-1);while(completeDays.has(c)){streak++;c=addDays(c,-1)}
 const groups={};all.forEach(t=>{groups[t.topic]??={a:0,d:0};groups[t.topic].a++;if(state.completed[t.id])groups[t.topic].d++});
 const mastery=Object.values(groups).length?Math.round(Object.values(groups).reduce((x,g)=>x+g.d/g.a*100,0)/Object.values(groups).length):0;
 return{all,done,pct,streak,mastery,hours:Math.round(done.reduce((x,t)=>x+t.mins,0)/60*10)/10}
}
function missedCount(){
 if(!state.plan)return 0;
 return state.plan.days.filter(d=>d.date<todayISO()&&d.tasks.some(t=>!state.completed[t.id])).reduce((n,d)=>n+d.tasks.filter(t=>!state.completed[t.id]).length,0);
}
function latestQuiz(){const a=Object.values(state.quizScores||{});return a.length?Math.round(a.reduce((x,v)=>x+v.score/v.total,0)/a.length*100)+"%":"—"}
function updateStats(){
 const s=stats();$("progressPct").textContent=s.pct+"%";document.querySelector(".ring")?.style.setProperty("--p",s.pct+"%");$("doneCount").textContent=s.done.length;$("totalCount").textContent=s.all.length;$("streak").textContent=s.streak;$("mastery").textContent=s.mastery+"%";$("studyHours").textContent=s.hours+"h";$("quizScore").textContent=latestQuiz();if($("missedTasks"))$("missedTasks").textContent=missedCount();
 const d=state.plan?.days.find(x=>x.date===todayISO());$("todayProgress").textContent=d?Math.round(d.tasks.filter(t=>state.completed[t.id]).length/d.tasks.length*100)+"%":"—";
 if(state.plan){const next=state.plan.days.find(x=>x.date>=todayISO()&&x.tasks.some(t=>!state.completed[t.id]));$("insights").innerHTML="<p>🎯 <b>Mastery:</b> "+s.mastery+"% of planned work is complete.</p><p>⏱️ <b>Study time:</b> "+s.hours+" hours logged.</p><p>🔥 <b>Streak:</b> "+s.streak+" day"+(s.streak===1?"":"s")+" in a row.</p><p>📌 <b>Next:</b> "+(next?escapeHTML(next.topic):"Plan complete — review your weakest topic.")+"</p>"}
}
function render(){
 const p=state.plan;if(!p){$("planTitle").textContent="No plan yet";updateStats();return}
 $("planTitle").textContent=escapeHTML(p.goal)+" · "+escapeHTML(p.level);
 $("days").innerHTML=p.days.map((d,i)=>'<article class="day '+(d.date===todayISO()?"today":"")+'" id="day-'+d.date+'"><div class="day-head"><span class="day-title">Day '+(i+1)+' · '+escapeHTML(d.topic)+' '+(d.date===todayISO()?'<span class="today-tag">TODAY</span>':"")+'</span><span class="day-meta">'+d.date+'</span></div><div class="tasks">'+d.tasks.map(t=>'<label class="task '+(state.completed[t.id]?"done":"")+'"><input type="checkbox" data-task="'+t.id+'" '+(state.completed[t.id]?"checked":"")+'><span>'+escapeHTML(t.text)+'</span><span class="badge">'+t.mins+' min</span></label>').join("")+'</div></article>').join("");
 document.querySelectorAll("[data-task]").forEach(x=>x.onchange=()=>{state.completed[x.dataset.task]=x.checked;save();render()});updateStats()
}
function quiz(){
 if(!state.plan)return message("Generate a plan first.");
 const d=state.plan.days.find(x=>x.date>=todayISO())||state.plan.days[state.plan.days.length-1],topic=d.topic,key=Object.keys(questionBank).find(k=>topic.toLowerCase().includes(k.toLowerCase())||k.toLowerCase().includes(topic.toLowerCase())),qs=questionBank[key]||[["What is the best way to master this topic?","Learn, practice, review, and retrieve."],["What should you do after an incorrect answer?","Review and retry later."],["How should difficult topics be handled?","Break them into smaller practice sessions."]];
 $("quiz").innerHTML=qs.map((q,i)=>'<div class="quiz-question"><b>'+i+1+'. '+escapeHTML(q[0])+'</b><label class="option"><input type="radio" name="q'+i+'" value="1"> '+escapeHTML(q[1])+'</label><label class="option"><input type="radio" name="q'+i+'" value="0"> Skip practice and memorize the answer.</label></div>').join("")+'<button class="primary small" id="checkQuiz">Check answers</button><div id="quizResult"></div>';
 $("checkQuiz").onclick=()=>{let score=0;qs.forEach((_,i)=>{if(document.querySelector('input[name="q'+i+'"]:checked')?.value==="1")score++});state.quizScores[topic]={score,total:qs.length,date:todayISO()};save();$("quizResult").innerHTML='<div class="result">Score: <b>'+score+'/'+qs.length+'</b>. '+(score===qs.length?"Excellent — keep going!":"Review the topic and try again.")+'</div>';updateStats()}
}
$("generate").onclick=buildPlan;$("quizBtn").onclick=quiz;$("resetBtn").onclick=()=>{if(confirm("Reset your study plan?")){localStorage.removeItem(KEY);location.reload()}};$("todayBtn").onclick=()=>{const d=state.plan?.days.find(x=>x.date===todayISO())||state.plan?.days.find(x=>x.tasks.some(t=>!state.completed[t.id]))||state.plan?.days[0];if(d)document.getElementById("day-"+d.date)?.scrollIntoView({behavior:"smooth",block:"center"})};if($("target"))$("target").value=addDays(todayISO(),29);render();

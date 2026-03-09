import { useState, useEffect, useCallback } from "react";
import React from "react";

const globalStyle = document.createElement("style");
globalStyle.textContent = `*, *::before, *::after { box-sizing: border-box; } html, body { margin: 0; padding: 0; background: #0f1a20; }`;
document.head.appendChild(globalStyle);

const C = {
  manhattan:"#E8A98A", jupiter:"#6B8F8A",
  bermuda:"#7A9BB5",   frolly:"#E8736A",
  bg:"#0f1a20",        bgAlt:"#141f26",
  card:"#192530",      cardHover:"#1f2e3a",
  muted:"#243540",     mutedLight:"#2d4252",
  border:"#2d4252",
  text:"#d8e8f0",      textSub:"#6a8a9a",
  textMuted:"#4a6878",
  nav:"#0b141a",
  oxford:"#111e26",
};

const LEVEL_COLORS = { Beginner:C.bermuda, Elementary:C.jupiter, Intermediate:C.manhattan, Advanced:C.frolly };
const INSTRUMENTS  = ["Acoustic","Electric","Classical","Bass","Ukulele"];
const LEVELS       = ["Beginner","Elementary","Intermediate","Advanced"];
const TODAY        = new Date().toISOString().slice(0,10);
const daysAgo      = n => { const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().slice(0,10); };
const FF           = "'Montserrat', sans-serif";

const SEED = [
  { id:"s1", name:"Jamie Chen", instrument:"Acoustic", level:"Beginner",
    startDate:daysAgo(60), notes:"Keen learner, left-handed but using standard guitar. Loves classic rock.", isNew:false, weekly:true,
    skills:{ achieved:["Open chords","Basic strumming"], desired:["Barre chords","Fingerpicking"] },
    songs:[
      { id:"sg1", title:"Knockin' on Heaven's Door", link:"", done:true },
      { id:"sg2", title:"Wonderwall", link:"", done:false },
    ],
    lessons:[
      { id:"l1", date:daysAgo(14), covered:"Open chords G, C and D. Basic down-strum pattern.",
        homework:"Practise G→C→D transitions slowly with a metronome at 60bpm.",
        nextFocus:"Introducing Em and the G–Em–C–D progression." },
      { id:"l2", date:daysAgo(7), covered:"Added Em chord. Worked on G–Em–C–D progression.",
        homework:"Run G–Em–C–D x4 daily.",
        nextFocus:"Strumming feel — down/up patterns and keeping the wrist loose." },
    ]
  },
  { id:"s2", name:"Priya Nair", instrument:"Classical", level:"Elementary",
    startDate:daysAgo(10), notes:"Previous piano background. First guitar student.", isNew:true, weekly:true,
    skills:{ achieved:["Guitar posture","Tuning by ear"], desired:["Am and E chords","Basic fingerpicking"] },
    songs:[
      { id:"sg3", title:"Malaguena (simplified)", link:"", done:false },
    ],
    lessons:[
      { id:"l3", date:daysAgo(7), covered:"First lesson. Guitar anatomy, tuning, posture.",
        homework:"Practise sitting posture daily.",
        nextFocus:"Introducing Am and E chords, basic fingerpicking pattern." },
    ]
  },
];

// ── API ───────────────────────────────────────────────────────────
async function apiLoad() {
  try {
    const r = await fetch("/api/students");
    if (!r.ok) return null;
    return await r.json();
  } catch(_) { return null; }
}
async function apiSave(data) {
  try {
    await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch(_) {}
}

// ── Helpers ───────────────────────────────────────────────────────
const uid       = () => Math.random().toString(36).slice(2,10);
const daysSince = s => s ? Math.floor((Date.now()-new Date(s).getTime())/86400000) : null;
const fmt       = s => s ? new Date(s).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}) : "—";
const mostRecent= s => s.lessons.slice().sort((a,b)=>b.date.localeCompare(a.date))[0]||null;

function copyText(t,set){
  navigator.clipboard.writeText(t).then(()=>{set(true);setTimeout(()=>set(false),2000);}).catch(()=>{});
}

function buildQuick(s){
  const ml=mostRecent(s);
  if(!ml) return `Student: ${s.name} | ${s.instrument} | ${s.level}\nNo lessons logged yet.`;
  return `── QUICK LESSON BRIEF ──\nStudent: ${s.name}\nInstrument: ${s.instrument} | Level: ${s.level}\nLast Lesson: ${fmt(ml.date)}\nCovered: ${ml.covered}\nHomework Set: ${ml.homework||"None set"}\nNext Focus: ${ml.nextFocus||"None flagged"}`;
}
function buildFull(s){
  const sorted=s.lessons.slice().sort((a,b)=>b.date.localeCompare(a.date));
  const hist=sorted.length===0?"No lessons logged yet.":sorted.map((l,i)=>`  Lesson ${sorted.length-i} — ${fmt(l.date)}\n    Covered: ${l.covered}\n    Homework: ${l.homework||"None set"}\n    Next Focus: ${l.nextFocus||"None flagged"}`).join("\n\n");
  return `── FULL STUDENT CONTEXT ──\nName: ${s.name}\nInstrument: ${s.instrument}\nLevel: ${s.level}\nStarted: ${fmt(s.startDate)}\nTotal Lessons: ${s.lessons.length}\nNotes: ${s.notes||"None"}\n\nLESSON HISTORY (newest first):\n${hist}`;
}
const LESSON_PROMPT=`── GUITAR LESSON GENERATION PROMPT ──

You are a guitar lesson planner for a private guitar teacher.

TEACHING STYLE:
- Informal, practical, student-centred
- Real songs from Lesson 1 — not just exercises
- Accuracy before speed — always
- UK English throughout
- Warm, direct tone. Short sentences. No jargon.

LESSON STRUCTURE (6 sections):
1. Title — specific and motivating
2. Focus / Technique Goal
3. What You'll Be Playing — chords, riffs, songs, patterns
4. Practice Pattern — step-by-step with timing
5. Diagrams — placeholder: [ Add chord diagrams / TAB here ]
6. Tips & Reminders — emoji bullets, encouraging and specific

After the lesson plan, add a one-line "Next Lesson Suggestion".

---
STUDENT CONTEXT:
[Paste Quick Brief or Full Context below]`;

// ── Design primitives ─────────────────────────────────────────────
const inp = {
  width:"100%", padding:"8px 11px", borderRadius:7, fontSize:13,
  border:`1.5px solid ${C.border}`, background:C.bgAlt, color:C.text,
  boxSizing:"border-box", outline:"none", fontFamily:FF,
};

const Badge = ({label,color,small})=>(
  <span style={{display:"inline-block",padding:small?"1px 7px":"2px 10px",borderRadius:20,
    fontSize:small?10:11,fontWeight:400,background:color+"22",color,
    border:`1px solid ${color}44`,whiteSpace:"nowrap",fontFamily:FF}}>{label}</span>
);
const Pill = ({label,color})=>(
  <span style={{display:"inline-block",padding:"2px 10px",borderRadius:20,
    fontSize:10,fontWeight:400,background:color,color:"#fff",
    letterSpacing:"0.06em",textTransform:"uppercase",fontFamily:FF}}>{label}</span>
);
const useIsMobile = () => {
  const [mobile,setMobile] = useState(()=>window.innerWidth<640);
  useEffect(()=>{
    const h=()=>setMobile(window.innerWidth<640);
    window.addEventListener("resize",h);
    return ()=>window.removeEventListener("resize",h);
  },[]);
  return mobile;
};

const StatCard = ({label,value,accent,sub,valueStyle})=>(
  <div style={{background:C.card,borderRadius:12,padding:"20px 22px",
    flex:"1 1 130px",fontFamily:FF,
    border:`1px solid ${C.border}`,borderTop:`3px solid ${accent}`}}>
    <div style={{fontSize:30,fontWeight:400,color:accent,lineHeight:1,...valueStyle}}>{value}</div>
    <div style={{fontSize:12,fontWeight:400,color:C.textSub,marginTop:5,textTransform:"uppercase",letterSpacing:"0.04em"}}>{label}</div>
    {sub&&<div style={{fontSize:10,color:C.frolly,marginTop:3,fontWeight:400}}>{sub}</div>}
  </div>
);

const BtnStyles = {
  primary:  {background:C.manhattan, color:"#0f1117", border:"none"},
  secondary:{background:"transparent", color:C.text, border:`1.5px solid ${C.border}`},
  danger:   {background:C.frolly, color:"#fff", border:"none"},
  copy:     {background:C.jupiter, color:"#fff", border:"none"},
  ghost:    {background:C.muted, color:C.text, border:"none"},
};
const Btn = ({children,onClick,variant="primary",small,disabled,full})=>(
  <button onClick={onClick} disabled={disabled} style={{
    ...BtnStyles[variant], borderRadius:8,
    padding:small?"5px 12px":"8px 18px",
    fontSize:small?11:13, fontWeight:400,
    cursor:disabled?"not-allowed":"pointer",
    opacity:disabled?0.5:1,
    display:"inline-flex", alignItems:"center", gap:6,
    transition:"opacity .15s", fontFamily:FF,
    width:full?"100%":undefined, justifyContent:full?"center":undefined,
  }}
  onMouseEnter={e=>!disabled&&(e.currentTarget.style.opacity=".8")}
  onMouseLeave={e=>(e.currentTarget.style.opacity="1")}
  >{children}</button>
);
const CopyBtn = ({text,label,variant="copy",small,full})=>{
  const [c,setC]=useState(false);
  return <Btn variant={variant} small={small} full={full} onClick={()=>copyText(text,setC)}>{c?"✓ Copied!":label}</Btn>;
};

const Modal = ({title,onClose,children,wide})=>(
  <div style={{position:"fixed",inset:0,background:"#000000bb",zIndex:1000,
    display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
    onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div style={{background:C.card,borderRadius:14,width:"100%",maxWidth:wide?640:480,
      maxHeight:"90vh",overflow:"auto",border:`1px solid ${C.border}`,
      boxShadow:"0 12px 48px #00000088"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"16px 22px",borderBottom:`1px solid ${C.border}`,
        position:"sticky",top:0,background:C.card,zIndex:2}}>
        <div style={{fontWeight:400,fontSize:17,color:C.text,fontFamily:FF}}>{title}</div>
        <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,
          cursor:"pointer",color:C.textSub}}>✕</button>
      </div>
      <div style={{padding:"20px 22px"}}>{children}</div>
    </div>
  </div>
);
const Confirm = ({message,onConfirm,onCancel})=>(
  <Modal title="Confirm Delete" onClose={onCancel}>
    <p style={{color:C.text,marginBottom:20,fontSize:13,fontFamily:FF,lineHeight:1.6}}>{message}</p>
    <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
      <Btn variant="secondary" onClick={onCancel}>Cancel</Btn>
      <Btn variant="danger" onClick={onConfirm}>Delete</Btn>
    </div>
  </Modal>
);
const Field = ({label,children})=>(
  <div style={{marginBottom:15}}>
    <label style={{display:"block",fontSize:11,fontWeight:400,color:C.textSub,
      marginBottom:5,textTransform:"uppercase",letterSpacing:"0.04em",fontFamily:FF}}>{label}</label>
    {children}
  </div>
);
const Sel = ({value,onChange,options})=>(
  <select value={value} onChange={onChange} style={{...inp,appearance:"none"}}>
    {options.map(o=><option key={o}>{o}</option>)}
  </select>
);

// ── Forms ─────────────────────────────────────────────────────────
const StudentForm = ({initial,onSave,onClose})=>{
  const blank = {name:"",instrument:"Acoustic",level:"Beginner",startDate:TODAY,notes:"",isNew:true,weekly:true};
  const [f,setF]=useState(initial ? {...blank,...initial} : blank);
  const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  return <>
    <Field label="Student Name *">
      <input value={f.name} onChange={set("name")} placeholder="Full name" style={inp}/>
    </Field>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Field label="Instrument"><Sel value={f.instrument} onChange={set("instrument")} options={INSTRUMENTS}/></Field>
      <Field label="Level"><Sel value={f.level} onChange={set("level")} options={LEVELS}/></Field>
    </div>
    <Field label="Start Date">
      <input type="date" value={f.startDate} onChange={set("startDate")} style={inp}/>
    </Field>
    <Field label="Notes">
      <textarea value={f.notes} onChange={set("notes")} rows={3}
        placeholder="Background, goals, preferences…" style={{...inp,resize:"vertical"}}/>
    </Field>
    <Field label="">
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,fontFamily:FF}}>
          <input type="checkbox" checked={f.weekly}
            onChange={e=>setF(p=>({...p,weekly:e.target.checked}))}
            style={{accentColor:C.bermuda,width:15,height:15}}/>
          <span style={{color:C.text,fontWeight:400}}>Weekly student</span>
        </label>
        <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,fontFamily:FF}}>
          <input type="checkbox" checked={f.isNew}
            onChange={e=>setF(p=>({...p,isNew:e.target.checked}))}
            style={{accentColor:C.frolly,width:15,height:15}}/>
          <span style={{color:C.text,fontWeight:400}}>Mark as New Student</span>
        </label>
      </div>
    </Field>
    <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:4}}>
      <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
      <Btn onClick={()=>f.name.trim()&&onSave(f)} disabled={!f.name.trim()}>Save Student</Btn>
    </div>
  </>;
};

const LessonForm = ({initial,onSave,onClose})=>{
  const [f,setF]=useState(initial||{date:TODAY,covered:"",homework:"",nextFocus:""});
  const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  return <>
    <Field label="Lesson Date">
      <input type="date" value={f.date} onChange={set("date")} style={inp}/>
    </Field>
    <Field label="What Was Covered *">
      <textarea value={f.covered} onChange={set("covered")} rows={3}
        placeholder="Chords, techniques, songs practised…" style={{...inp,resize:"vertical"}}/>
    </Field>
    <Field label="Homework Set">
      <textarea value={f.homework} onChange={set("homework")} rows={2}
        placeholder="Practice tasks for the student…" style={{...inp,resize:"vertical"}}/>
    </Field>
    <Field label="Next Lesson Focus">
      <textarea value={f.nextFocus} onChange={set("nextFocus")} rows={2}
        placeholder="What to work on next session…" style={{...inp,resize:"vertical"}}/>
    </Field>
    <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:4}}>
      <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
      <Btn onClick={()=>f.covered.trim()&&onSave(f)} disabled={!f.covered.trim()}>Save Lesson</Btn>
    </div>
  </>;
};

// ── Next Up logic ─────────────────────────────────────────────────
function getNextUp(students) {
  const eligible = students.filter(s => s.weekly && mostRecent(s));
  if (!eligible.length) return null;
  const withNext = eligible.map(s => {
    const ml = mostRecent(s);
    const nextDate = new Date(ml.date);
    nextDate.setDate(nextDate.getDate() + 7);
    return { student: s, nextDate, ml };
  });
  withNext.sort((a, b) => a.nextDate - b.nextDate);
  // Prefer today-or-future; fall back to most recently overdue
  const future = withNext.filter(x => x.nextDate >= new Date(TODAY));
  return future.length ? future[0] : withNext[withNext.length - 1];
}

// ── Dashboard ─────────────────────────────────────────────────────
const Dashboard = ({students,onGoto})=>{
  const mobile=useIsMobile();
  const all=students.flatMap(s=>s.lessons.map(l=>({...l,studentName:s.name,studentId:s.id})));
  const newStu=students.filter(s=>s.isNew);
  const recent=all.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  const nextUp=getNextUp(students);
  return (
    <div style={{padding:"24px 20px",maxWidth:960,margin:"0 auto",fontFamily:FF}}>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:26}}>
        <StatCard label="Total Students" value={students.length} accent={C.bermuda}/>
        <StatCard label="New Students"   value={newStu.length}   accent={C.frolly}/>
        <StatCard label="Lessons Logged" value={all.length}      accent={C.jupiter}/>
        <StatCard label="Next Up" accent={C.manhattan}
          value={nextUp ? nextUp.student.name.split(" ")[0] : "—"}
          sub={nextUp ? `${nextUp.student.instrument} · ${nextUp.student.level}` : "No weekly students set up yet"}
          valueStyle={{fontSize:22,fontWeight:400}}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"1fr 1fr",gap:18}}>
        <DashSection title="Recent Lessons" accent={C.bermuda}>
          {recent.length===0?<DE>No lessons logged yet.</DE>:recent.map(l=>(
            <div key={l.id} onClick={()=>onGoto(l.studentId)}
              style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,cursor:"pointer"}}
              onMouseEnter={e=>e.currentTarget.style.background=C.muted}
              onMouseLeave={e=>e.currentTarget.style.background=""}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
                <span style={{fontWeight:400,fontSize:15,color:C.text}}>{l.studentName}</span>
                <span style={{fontSize:10,color:C.textSub}}>{fmt(l.date)}</span>
              </div>
              <div style={{fontSize:12,color:C.textSub,marginTop:2,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{l.covered}</div>
            </div>
          ))}
        </DashSection>
        <div style={{display:"flex",flexDirection:"column",gap:18}}>
          <DashSection title="Next Up" accent={C.manhattan}>
            {!nextUp
              ? <DE>No weekly students set up yet.</DE>
              : <>
                  <div onClick={()=>onGoto(nextUp.student.id)}
                    style={{padding:"14px 16px",cursor:"pointer"}}
                    onMouseEnter={e=>e.currentTarget.style.background=C.muted}
                    onMouseLeave={e=>e.currentTarget.style.background=""}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                      <span style={{fontWeight:400,fontSize:17,color:C.text,fontFamily:FF}}>{nextUp.student.name}</span>
                      <Badge label={nextUp.student.instrument} color={C.manhattan} small/>
                      <Badge label={nextUp.student.level} color={LEVEL_COLORS[nextUp.student.level]} small/>
                    </div>
                    {nextUp.ml.covered || nextUp.ml.nextFocus
                      ? <>
                          {nextUp.ml.covered && <div style={{marginBottom:6}}>
                            <span style={{fontSize:10,fontWeight:400,color:C.textSub,textTransform:"uppercase",letterSpacing:"0.05em"}}>Last lesson </span>
                            <span style={{fontSize:13,color:C.text,lineHeight:1.5}}>{nextUp.ml.covered}</span>
                          </div>}
                          {nextUp.ml.nextFocus && <div>
                            <span style={{fontSize:10,fontWeight:400,color:C.manhattan,textTransform:"uppercase",letterSpacing:"0.05em"}}>Focus for today </span>
                            <span style={{fontSize:13,color:C.text,lineHeight:1.5}}>{nextUp.ml.nextFocus}</span>
                          </div>}
                        </>
                      : <DE>No lesson logged yet — add one first.</DE>
                    }
                  </div>
                  <div style={{padding:"8px 16px 12px",borderTop:`1px solid ${C.border}`}}
                    onClick={e=>e.stopPropagation()}>
                    <CopyBtn text={buildQuick(nextUp.student)} label="⚡ Quick Brief" variant="copy" small/>
                  </div>
                </>
            }
          </DashSection>
          <DashSection title="New Students" accent={C.frolly}>
            {newStu.length===0?<DE>No new students flagged.</DE>:newStu.map(s=>(
              <div key={s.id} onClick={()=>onGoto(s.id)}
                style={{padding:"9px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}
                onMouseEnter={e=>e.currentTarget.style.background=C.muted}
                onMouseLeave={e=>e.currentTarget.style.background=""}>
                <span style={{fontWeight:400,fontSize:13,color:C.text}}>{s.name}</span>
                <Badge label={s.instrument} color={C.bermuda} small/>
              </div>
            ))}
          </DashSection>
        </div>
      </div>
    </div>
  );
};
const DashSection = ({title,accent,children})=>(
  <div style={{background:C.card,borderRadius:12,overflow:"hidden",border:`1px solid ${C.border}`}}>
    <div style={{padding:"10px 14px",background:C.oxford,color:C.text,fontSize:13,fontWeight:400,
      letterSpacing:"0.06em",textTransform:"uppercase",borderLeft:`3px solid ${accent}`,fontFamily:FF}}>{title}</div>
    {children}
  </div>
);
const DE = ({children})=><div style={{padding:"14px",fontSize:12,color:C.textMuted,fontStyle:"italic",fontFamily:FF}}>{children}</div>;

// ── Student Grid ──────────────────────────────────────────────────
const StudentGrid = ({students,onSelect,onAdd})=>{
  const [q,setQ]=useState("");
  const filtered=students.filter(s=>
    s.name.toLowerCase().includes(q.toLowerCase())||
    s.instrument.toLowerCase().includes(q.toLowerCase())||
    s.level.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <div style={{padding:"22px 20px",maxWidth:1000,margin:"0 auto",fontFamily:FF}}>
      <div style={{display:"flex",gap:12,marginBottom:20,alignItems:"center",flexWrap:"wrap"}}>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search students…"
          style={{...inp,maxWidth:280,flex:"1 1 200px"}}/>
        <Btn onClick={onAdd}>+ Add Student</Btn>
      </div>
      {filtered.length===0
        ?<div style={{color:C.textSub,fontSize:14,fontStyle:"italic"}}>No students found.</div>
        :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:16}}>
          {filtered.map(s=>{
            const ml=mostRecent(s); const days=ml?daysSince(ml.date):null;
            return <div key={s.id} onClick={()=>onSelect(s.id)} style={{
              background:C.card, borderRadius:14, padding:"18px 18px 16px",
              cursor:"pointer", position:"relative",
              border:`1.5px solid ${days>=14?C.frolly+"66":C.border}`,
              transition:"border-color .15s,transform .15s,background .15s",
            }}
            onMouseEnter={e=>{e.currentTarget.style.background=C.cardHover;e.currentTarget.style.transform="translateY(-2px)";}}
            onMouseLeave={e=>{e.currentTarget.style.background=C.card;e.currentTarget.style.transform="";}}>
              {s.isNew&&<div style={{position:"absolute",top:12,right:12}}><Pill label="NEW" color={C.frolly}/></div>}
              <div style={{fontWeight:400,fontSize:17,color:C.text,marginBottom:8,paddingRight:s.isNew?44:0,fontFamily:FF}}>{s.name}</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
                <Badge label={s.instrument} color={C.bermuda} small/>
                <Badge label={s.level} color={LEVEL_COLORS[s.level]} small/>
                {s.weekly&&<Badge label="Weekly" color={C.jupiter} small/>}
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.textSub,marginBottom:8}}>
                <span>📚 {s.lessons.length} lesson{s.lessons.length!==1?"s":""}</span>
                {days!==null
                  ?<span style={{color:days>=14?C.frolly:C.textSub,fontWeight:days>=14?700:400}}>🕐 {days}d ago</span>
                  :<span>No lessons yet</span>}
              </div>
              {s.skills?.achieved?.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:8}}>
                {s.skills.achieved.slice(0,3).map(t=>(
                  <span key={t} style={{fontSize:9,fontWeight:400,padding:"1px 7px",borderRadius:20,
                    background:C.jupiter+"22",color:C.jupiter,border:`1px solid ${C.jupiter}33`,fontFamily:FF}}>{t}</span>
                ))}
                {s.skills.achieved.length>3&&<span style={{fontSize:9,color:C.textMuted,fontFamily:FF,padding:"1px 4px"}}>+{s.skills.achieved.length-3}</span>}
              </div>}
              {ml?.nextFocus&&<div style={{fontSize:11,color:C.text,background:C.muted,borderRadius:7,
                padding:"6px 9px",lineHeight:1.4,borderLeft:`3px solid ${C.manhattan}`}}>
                <span style={{color:C.manhattan}}>Next: </span>
                <span style={{display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{ml.nextFocus}</span>
              </div>}
            </div>;
          })}
        </div>
      }
    </div>
  );
};

// ── Student Detail ────────────────────────────────────────────────
const StudentDetail = ({student,onBack,onEdit,onDelete,onAddLesson,onEditLesson,onDeleteLesson,onUpdateSkills,onAddSong,onToggleSong,onDeleteSong})=>{
  const mobile=useIsMobile();
  const [confirm,setConfirm]=useState(null);
  const [modal,setModal]=useState(null);
  const [promptModal,setPromptModal]=useState(false);
  const sorted=student.lessons.slice().sort((a,b)=>b.date.localeCompare(a.date));
  const latest=sorted[0]; const days=latest?daysSince(latest.date):null;

  return (
    <div style={{padding:"20px",maxWidth:1140,margin:"0 auto",fontFamily:FF}}>
      <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",
        color:C.textSub,fontSize:13,fontWeight:400,marginBottom:16,
        display:"flex",alignItems:"center",gap:5,padding:0,fontFamily:FF}}>← Back to Students</button>

      {/* Header card */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderLeft:`4px solid ${C.manhattan}`,
        borderRadius:14,padding:"20px 24px",marginBottom:18}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,marginBottom:14}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
              <div style={{fontWeight:400,fontSize:26,color:C.text,fontFamily:FF}}>{student.name}</div>
              {student.isNew&&<Pill label="NEW" color={C.frolly}/>}
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
              <Badge label={student.instrument} color={C.manhattan}/>
              <Badge label={student.level} color={LEVEL_COLORS[student.level]}/>
            </div>
            <div style={{fontSize:12,color:C.textSub,fontFamily:FF}}>
              Started {fmt(student.startDate)} · {student.lessons.length} lesson{student.lessons.length!==1?"s":""}
              {days!==null&&<span style={{color:days>=14?C.frolly:C.textSub}}> · Last seen {days}d ago</span>}
            </div>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",flexShrink:0}}>
            <Btn small variant="ghost" onClick={()=>setModal({type:"edit"})}>Edit Student</Btn>
            <Btn small variant="danger" onClick={()=>setConfirm({type:"student"})}>Delete</Btn>
          </div>
        </div>
        {/* Copy buttons row */}
        <div style={{display:"flex",gap:8,flexWrap:"wrap",paddingTop:12,borderTop:`1px solid ${C.border}`}}>
          <CopyBtn text={buildQuick(student)}  label="⚡ Quick Brief"  variant="copy"    small/>
          <CopyBtn text={buildFull(student)}   label="📋 Full Context" variant="primary" small/>
          <Btn small variant="ghost" onClick={()=>setPromptModal(true)}>📄 Lesson Prompt</Btn>
        </div>
      </div>

      {/* Main two-column layout */}
      <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"minmax(0,1fr) 340px",gap:18,alignItems:"start"}}>
        {/* Left column: focus/homework + notes + lesson history */}
        <div>
          {latest&&<div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"1fr 1fr",gap:14,marginBottom:16}}>
            <InfoPanel label="Next Lesson Focus" value={latest.nextFocus} accent={C.manhattan} icon="🎯"/>
            <InfoPanel label="Current Homework"  value={latest.homework}  accent={C.jupiter}   icon="📝"/>
          </div>}

          {student.notes&&<div style={{background:C.card,border:`1px solid ${C.border}`,
            borderLeft:`4px solid ${C.bermuda}`,borderRadius:12,padding:"13px 16px",marginBottom:16}}>
            <SectionHead label="Student Notes" color={C.bermuda} icon="📋"/>
            <div style={{fontSize:13,color:C.text,lineHeight:1.6,fontFamily:FF}}>{student.notes}</div>
          </div>}

          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontWeight:400,fontSize:17,color:C.text,fontFamily:FF}}>Lesson History</div>
            <Btn small onClick={()=>setModal({type:"addLesson"})}>+ Log Lesson</Btn>
          </div>
          {sorted.length===0
            ?<div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:24,
              textAlign:"center",color:C.textSub,fontSize:13,fontStyle:"italic",fontFamily:FF}}>
              No lessons logged yet. Add the first one!
            </div>
            :sorted.map((l,i)=>(
            <div key={l.id} style={{background:C.card,border:`1px solid ${C.border}`,
              borderLeft:`4px solid ${i===0?C.bermuda:C.mutedLight}`,
              borderRadius:12,padding:"16px 18px",marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontWeight:400,fontSize:13,color:C.text,fontFamily:FF}}>{fmt(l.date)}</span>
                  {i===0&&<Pill label="Latest" color={C.bermuda}/>}
                </div>
                <div style={{display:"flex",gap:6}}>
                  <Btn small variant="ghost" onClick={()=>setModal({type:"editLesson",data:{...l}})}>Edit</Btn>
                  <Btn small variant="danger" onClick={()=>setConfirm({type:"lesson",lessonId:l.id})}>Delete</Btn>
                </div>
              </div>
              <LR icon="🎸" label="Covered"    value={l.covered}   accent={C.bermuda}/>
              {l.homework  &&<LR icon="📝" label="Homework"   value={l.homework}   accent={C.jupiter}/>}
              {l.nextFocus &&<LR icon="🎯" label="Next Focus" value={l.nextFocus}  accent={C.manhattan}/>}
            </div>
          ))}
        </div>

        {/* Right column: skill tags + song list */}
        <div style={mobile?{}:{position:"sticky",top:116}}>
          <SkillTags
            skills={student.skills||{achieved:[],desired:[]}}
            onUpdate={onUpdateSkills}/>
          <SongList
            songs={student.songs||[]}
            onAdd={onAddSong}
            onToggle={onToggleSong}
            onDelete={onDeleteSong}/>
        </div>
      </div>

      {modal?.type==="edit"&&
        <Modal title="Edit Student" onClose={()=>setModal(null)}>
          <StudentForm initial={{...student}} onClose={()=>setModal(null)} onSave={d=>{onEdit(d);setModal(null);}}/>
        </Modal>}
      {modal?.type==="addLesson"&&
        <Modal title="Log Lesson" onClose={()=>setModal(null)} wide>
          <LessonForm onClose={()=>setModal(null)} onSave={d=>{onAddLesson(d);setModal(null);}}/>
        </Modal>}
      {modal?.type==="editLesson"&&
        <Modal title="Edit Lesson" onClose={()=>setModal(null)} wide>
          <LessonForm initial={modal.data} onClose={()=>setModal(null)} onSave={d=>{onEditLesson(modal.data.id,d);setModal(null);}}/>
        </Modal>}
      {promptModal&&
        <Modal title="Lesson Generation Prompt" onClose={()=>setPromptModal(false)} wide>
          <div style={{fontSize:12,color:C.textSub,marginBottom:12,lineHeight:1.6,fontFamily:FF}}>
            Copy into a new chat, then paste a student summary below it.
          </div>
          <pre style={{background:C.bgAlt,borderRadius:8,padding:14,fontSize:11,lineHeight:1.7,
            color:C.text,whiteSpace:"pre-wrap",wordBreak:"break-word",
            border:`1px solid ${C.border}`,fontFamily:"'Courier New',monospace",
            maxHeight:300,overflow:"auto",marginBottom:14}}>{LESSON_PROMPT}</pre>
          <CopyBtn text={LESSON_PROMPT} label="📄 Copy Full Prompt" variant="primary" full/>
        </Modal>}

      {confirm?.type==="student"&&
        <Confirm message={`Delete ${student.name} and all their lessons? This cannot be undone.`}
          onCancel={()=>setConfirm(null)} onConfirm={()=>{onDelete();setConfirm(null);}}/>}
      {confirm?.type==="lesson"&&
        <Confirm message="Delete this lesson? This cannot be undone."
          onCancel={()=>setConfirm(null)} onConfirm={()=>{onDeleteLesson(confirm.lessonId);setConfirm(null);}}/>}
    </div>
  );
};

const InfoPanel = ({label,value,accent,icon})=>(
  <div style={{background:C.card,border:`1px solid ${C.border}`,borderTop:`3px solid ${accent}`,
    borderRadius:12,padding:"13px 16px",minHeight:80}}>
    <div style={{fontSize:12,fontWeight:400,color:accent,textTransform:"uppercase",
      letterSpacing:"0.06em",marginBottom:6,fontFamily:FF}}>{icon} {label}</div>
    <div style={{fontSize:13,color:value?C.text:C.textMuted,lineHeight:1.5,
      fontStyle:value?"normal":"italic",fontFamily:FF}}>{value||"Not set"}</div>
  </div>
);
const SectionHead = ({label,color,icon})=>(
  <div style={{fontSize:13,fontWeight:400,color,textTransform:"uppercase",
    letterSpacing:"0.07em",marginBottom:8,fontFamily:FF}}>{icon} {label}</div>
);
const LR = ({icon,label,value,accent})=>(
  <div style={{marginBottom:6,display:"flex",gap:8,alignItems:"flex-start"}}>
    <span style={{fontSize:12,minWidth:16}}>{icon}</span>
    <div style={{fontSize:13,color:C.text,lineHeight:1.5,fontFamily:FF}}>
      <span style={{color:accent,marginRight:4,fontSize:14}}>{label}:</span>{value}
    </div>
  </div>
);

// ── Skill Tags ────────────────────────────────────────────────────
const TagGroup = ({label,accent,tags,input,setInput,onAdd,onRemove})=>(
  <div style={{marginBottom:14}}>
    <div style={{fontSize:12,fontWeight:400,color:accent,textTransform:"uppercase",
      letterSpacing:"0.06em",marginBottom:8,fontFamily:FF}}>{label}</div>
    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8,minHeight:24}}>
      {tags.length===0&&<span style={{fontSize:12,color:C.textMuted,fontStyle:"italic",fontFamily:FF}}>None yet</span>}
      {tags.map(t=>(
        <span key={t} style={{display:"inline-flex",alignItems:"center",gap:3,
          padding:"2px 6px 2px 10px",borderRadius:20,fontSize:11,fontWeight:400,
          background:accent+"22",color:accent,border:`1px solid ${accent}44`,fontFamily:FF}}>
          {t}
          <button onClick={()=>onRemove(t)} style={{background:"none",border:"none",cursor:"pointer",
            color:accent,fontSize:13,padding:"0 2px",lineHeight:1,opacity:0.6,fontFamily:FF}}
            onMouseEnter={e=>e.currentTarget.style.opacity="1"}
            onMouseLeave={e=>e.currentTarget.style.opacity="0.6"}>×</button>
        </span>
      ))}
    </div>
    <div style={{display:"flex",gap:8}}>
      <input value={input} onChange={e=>setInput(e.target.value)}
        onKeyDown={e=>{if(e.key==="Enter"){onAdd();e.preventDefault();}}}
        placeholder={`Add ${label.toLowerCase()} skill…`}
        style={{...inp,flex:1,padding:"6px 10px",fontSize:12}}/>
      <Btn small variant="ghost" onClick={onAdd} disabled={!input.trim()}>Add</Btn>
    </div>
  </div>
);

const SkillTags = ({skills,onUpdate})=>{
  const [achIn,setAchIn]=useState(""); const [desIn,setDesIn]=useState("");
  const achieved=(skills?.achieved||[]); const desired=(skills?.desired||[]);
  const addTag=(group,val)=>{
    const t=val.trim(); if(!t) return;
    const arr=group==="achieved"?achieved:desired;
    if(arr.includes(t)) return;
    onUpdate({achieved,desired,[group]:[...arr,t]});
  };
  const removeTag=(group,tag)=>{
    const arr=group==="achieved"?achieved:desired;
    onUpdate({achieved,desired,[group]:arr.filter(t=>t!==tag)});
  };
  return (
    <div style={{background:C.card,border:`1px solid ${C.border}`,
      borderLeft:`4px solid ${C.jupiter}`,borderRadius:12,padding:"14px 18px",marginBottom:16}}>
      <SectionHead label="Skill Tags" color={C.jupiter} icon="⭐"/>
      <TagGroup label="Achieved" accent={C.jupiter} tags={achieved}
        input={achIn} setInput={setAchIn}
        onAdd={()=>{addTag("achieved",achIn);setAchIn("");}}
        onRemove={t=>removeTag("achieved",t)}/>
      <TagGroup label="Desired" accent={C.manhattan} tags={desired}
        input={desIn} setInput={setDesIn}
        onAdd={()=>{addTag("desired",desIn);setDesIn("");}}
        onRemove={t=>removeTag("desired",t)}/>
    </div>
  );
};

// ── Song List ─────────────────────────────────────────────────────
const SongList = ({songs,onAdd,onToggle,onDelete})=>{
  const [title,setTitle]=useState(""); const [link,setLink]=useState("");
  const handleAdd=()=>{
    if(!title.trim()) return;
    onAdd({id:uid(),title:title.trim(),link:link.trim(),done:false});
    setTitle(""); setLink("");
  };
  return (
    <div style={{background:C.card,border:`1px solid ${C.border}`,
      borderLeft:`4px solid ${C.frolly}`,borderRadius:12,padding:"14px 18px",marginBottom:16}}>
      <SectionHead label="Song List" color={C.frolly} icon="🎵"/>
      {songs.length===0&&
        <div style={{fontSize:12,color:C.textMuted,fontStyle:"italic",marginBottom:12,fontFamily:FF}}>No songs added yet.</div>}
      {songs.map(song=>(
        <div key={song.id} style={{display:"flex",alignItems:"center",gap:8,
          padding:"7px 0",borderBottom:`1px solid ${C.border}`,
          opacity:song.done?0.45:1,transition:"opacity .15s"}}>
          <span onClick={()=>onToggle(song.id)} style={{
            flex:1,fontSize:13,color:C.text,cursor:"pointer",fontFamily:FF,
            textDecoration:song.done?"line-through":"none",userSelect:"none"}}
            onMouseEnter={e=>e.currentTarget.style.opacity="0.7"}
            onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
            {song.title}
          </span>
          {song.link&&
            <a href={song.link} target="_blank" rel="noopener noreferrer"
              style={{color:C.bermuda,fontSize:14,lineHeight:1,textDecoration:"none",flexShrink:0}}
              title="Open link">🔗</a>}
          <button onClick={()=>onDelete(song.id)} style={{background:"none",border:"none",
            cursor:"pointer",color:C.textMuted,fontSize:16,padding:"0 2px",lineHeight:1,flexShrink:0}}
            onMouseEnter={e=>e.currentTarget.style.color=C.frolly}
            onMouseLeave={e=>e.currentTarget.style.color=C.textMuted}>×</button>
        </div>
      ))}
      <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}>
        <input value={title} onChange={e=>setTitle(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter")handleAdd();}}
          placeholder="Song title…"
          style={{...inp,flex:"2 1 140px",padding:"6px 10px",fontSize:12}}/>
        <input value={link} onChange={e=>setLink(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter")handleAdd();}}
          placeholder="Link (optional, e.g. YouTube)…"
          style={{...inp,flex:"3 1 200px",padding:"6px 10px",fontSize:12}}/>
        <Btn small onClick={handleAdd} disabled={!title.trim()}>Add Song</Btn>
      </div>
    </div>
  );
};

// ── Students Tab ──────────────────────────────────────────────────
const StudentsTab = ({students,selectedId,onSelect,addStudent,editStudent,deleteStudent,addLesson,editLesson,deleteLesson,updateSkills,addSong,toggleSong,deleteSong})=>{
  const [addModal,setAddModal]=useState(false);
  const selected=students.find(s=>s.id===selectedId);
  if(selected) return <StudentDetail student={selected} onBack={()=>onSelect(null)}
    onEdit={d=>editStudent(selected.id,d)} onDelete={()=>deleteStudent(selected.id)}
    onAddLesson={d=>addLesson(selected.id,d)}
    onEditLesson={(lid,d)=>editLesson(selected.id,lid,d)}
    onDeleteLesson={lid=>deleteLesson(selected.id,lid)}
    onUpdateSkills={sk=>updateSkills(selected.id,sk)}
    onAddSong={song=>addSong(selected.id,song)}
    onToggleSong={songId=>toggleSong(selected.id,songId)}
    onDeleteSong={songId=>deleteSong(selected.id,songId)}/>;
  return <>
    <StudentGrid students={students} onSelect={onSelect} onAdd={()=>setAddModal(true)}/>
    {addModal&&<Modal title="Add Student" onClose={()=>setAddModal(false)}>
      <StudentForm onClose={()=>setAddModal(false)} onSave={d=>{addStudent(d);setAddModal(false);}}/>
    </Modal>}
  </>;
};

// ── Header ────────────────────────────────────────────────────────
const AppHeader = ()=>(
  <div style={{
    width:"100%", height:72,
    background:C.bg,
    display:"flex", alignItems:"center", justifyContent:"center",
    position:"relative", overflow:"hidden",
  }}>
    <div style={{position:"absolute",bottom:0,left:"5%",right:"5%",height:"2px",
      background:`linear-gradient(90deg,transparent,${C.manhattan}66,${C.jupiter}66,${C.bermuda}66,transparent)`}}/>
    <div style={{position:"relative",zIndex:2,display:"flex",alignItems:"center",gap:12}}>
      <span style={{fontSize:26}}>🎸</span>
      <div>
        <div style={{fontSize:22,fontWeight:400,color:C.text,fontFamily:FF,
          letterSpacing:"0.08em",textTransform:"uppercase",lineHeight:1}}>
          Guitar Student Tracker
        </div>
        <div style={{fontSize:9,fontWeight:400,color:C.textMuted,fontFamily:FF,
          letterSpacing:"0.18em",textTransform:"uppercase",marginTop:4}}>
          Lesson Planner &amp; Progress Log
        </div>
      </div>
    </div>
  </div>
);

// ── Auth Gate ─────────────────────────────────────────────────────
const AUTH_KEY  = "gst_auth_v1";
const AUTH_PASS = "foothillfrets"; // ← change this to your preferred password

const AuthGate = ({children})=>{
  const [authed,setAuthed]=useState(()=>localStorage.getItem(AUTH_KEY)==="1");
  const [pw,setPw]=useState("");
  const [err,setErr]=useState(false);

  if(authed) return children;

  const attempt=()=>{
    if(pw===AUTH_PASS){ localStorage.setItem(AUTH_KEY,"1"); setAuthed(true); }
    else { setErr(true); setPw(""); setTimeout(()=>setErr(false),2000); }
  };

  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",
      minHeight:"100vh",background:C.bg,fontFamily:FF,padding:20}}>
      <div style={{background:C.card,borderRadius:16,padding:"36px 32px",
        width:"100%",maxWidth:360,border:`1px solid ${C.border}`,
        boxShadow:"0 16px 48px #00000044",textAlign:"center"}}>
        <div style={{fontSize:36,marginBottom:12}}>🎸</div>
        <div style={{fontSize:22,fontWeight:400,color:C.text,letterSpacing:"0.06em",
          textTransform:"uppercase",marginBottom:6,fontFamily:FF}}>Guitar Student Tracker</div>
        <div style={{fontSize:12,color:C.textSub,marginBottom:28,fontFamily:FF}}>Enter your password to continue</div>
        <input
          type="password" value={pw}
          onChange={e=>setPw(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&attempt()}
          placeholder="Password"
          autoFocus
          style={{...inp,textAlign:"center",fontSize:15,padding:"10px 14px",
            borderColor:err?C.frolly:C.border,marginBottom:12,
            transition:"border-color .2s"}}/>
        {err&&<div style={{fontSize:12,color:C.frolly,marginBottom:10,fontFamily:FF}}>Incorrect password</div>}
        <Btn full onClick={attempt}>Enter</Btn>
      </div>
    </div>
  );
};

// ── App Root ──────────────────────────────────────────────────────
export default function App(){
  const [tab,setTab]=useState("dashboard");
  const [students,setStudents]=useState(null);
  const [selId,setSelId]=useState(null);
  const [ready,setReady]=useState(false);
  const [saveStatus,setSaveStatus]=useState("saved");
  const skipSave=React.useRef(true);

  useEffect(()=>{
    // d===null means API failed → fall back to SEED; d===[] means no students yet
    apiLoad().then(d=>{ setStudents(d !== null ? d : SEED); setReady(true); });
  },[]);

  useEffect(()=>{
    if(!ready||!students) return;
    // skip the first fire (initial data load) so we never overwrite the blob on mount
    if(skipSave.current){ skipSave.current=false; return; }
    setSaveStatus("saving");
    const t=setTimeout(()=>{
      apiSave(students)
        .then(()=>setSaveStatus("saved"))
        .catch(()=>setSaveStatus("error"));
    },600);
    return ()=>clearTimeout(t);
  },[students,ready]);

  const addStudent    =useCallback(d=>setStudents(p=>[...p,{...d,id:uid(),lessons:[],skills:{achieved:[],desired:[]},songs:[]}]),[]);
  const editStudent   =useCallback((id,d)=>setStudents(p=>p.map(s=>s.id===id?{...s,...d}:s)),[]);
  const deleteStudent =useCallback(id=>{setStudents(p=>p.filter(s=>s.id!==id));setSelId(null);setTab("students");},[]);
  const addLesson     =useCallback((sid,d)=>setStudents(p=>p.map(s=>s.id===sid?{...s,lessons:[...s.lessons,{...d,id:uid()}]}:s)),[]);
  const editLesson    =useCallback((sid,lid,d)=>setStudents(p=>p.map(s=>s.id===sid?{...s,lessons:s.lessons.map(l=>l.id===lid?{...l,...d}:l)}:s)),[]);
  const deleteLesson  =useCallback((sid,lid)=>setStudents(p=>p.map(s=>s.id===sid?{...s,lessons:s.lessons.filter(l=>l.id!==lid)}:s)),[]);
  const updateSkills  =useCallback((sid,sk)=>setStudents(p=>p.map(s=>s.id===sid?{...s,skills:sk}:s)),[]);
  const addSong       =useCallback((sid,song)=>setStudents(p=>p.map(s=>s.id===sid?{...s,songs:[...(s.songs||[]),song]}:s)),[]);
  const toggleSong    =useCallback((sid,songId)=>setStudents(p=>p.map(s=>s.id===sid?{...s,songs:(s.songs||[]).map(sg=>sg.id===songId?{...sg,done:!sg.done}:sg)}:s)),[]);
  const deleteSong    =useCallback((sid,songId)=>setStudents(p=>p.map(s=>s.id===sid?{...s,songs:(s.songs||[]).filter(sg=>sg.id!==songId)}:s)),[]);

  if(!ready) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",
      height:"100vh",background:C.bg,color:C.textSub,fontSize:14,fontFamily:FF,
      flexDirection:"column",gap:12}}>
      <span style={{fontSize:32}}>🎸</span>
      <span>Loading…</span>
    </div>
  );

  const statusColor = saveStatus==="saved"?C.jupiter:saveStatus==="saving"?C.textMuted:C.frolly;
  const statusLabel = saveStatus==="saved"?"● Saved":saveStatus==="saving"?"● Saving…":"● Save error";
  const TABS=[{id:"dashboard",label:"Dashboard"},{id:"students",label:"Students"}];

  return (
    <AuthGate>
    <div style={{fontFamily:FF,background:C.bg,minHeight:"100vh",color:C.text}}>
      <nav style={{background:C.nav,display:"flex",flexDirection:"column",
        position:"sticky",top:0,zIndex:100,borderBottom:`1px solid ${C.border}`}}>
        <AppHeader/>
        <div style={{display:"flex",alignItems:"stretch",justifyContent:"space-between",
          paddingLeft:4,height:40,background:C.bgAlt}}>
          <div style={{display:"flex",alignItems:"stretch"}}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>{setTab(t.id);if(t.id!=="students")setSelId(null);}} style={{
                background:"none",border:"none",cursor:"pointer",fontFamily:FF,
                color:tab===t.id?C.manhattan:C.textSub,
                fontWeight:400,fontSize:tab===t.id?14:13,
                padding:"0 20px",
                borderBottom:tab===t.id?`2px solid ${C.manhattan}`:"2px solid transparent",
                transition:"color .15s",
              }}>{t.label}</button>
            ))}
          </div>
          <div style={{padding:"0 16px",display:"flex",alignItems:"center"}}>
            <span style={{fontSize:saveStatus==="error"?12:10,color:statusColor,fontFamily:FF,fontWeight:400,transition:"color .3s"}}>{statusLabel}</span>
          </div>
        </div>
      </nav>
      {tab==="dashboard"&&<Dashboard students={students} onGoto={id=>{setSelId(id);setTab("students");}}/>}
      {tab==="students"&&<StudentsTab students={students} selectedId={selId} onSelect={setSelId}
        addStudent={addStudent} editStudent={editStudent} deleteStudent={deleteStudent}
        addLesson={addLesson} editLesson={editLesson} deleteLesson={deleteLesson}
        updateSkills={updateSkills} addSong={addSong} toggleSong={toggleSong} deleteSong={deleteSong}/>}
    </div>
    </AuthGate>
  );
}

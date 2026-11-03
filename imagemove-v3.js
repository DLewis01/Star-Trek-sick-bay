(() => {
  'use strict';
  const stage = document.getElementById('stage');
  const viewport = document.getElementById('viewport');
  const timeMode = document.getElementById('timeMode');
  const medical = document.getElementById('medical');
  const timeBackground = document.getElementById('timeBackground');
  const readout = document.getElementById('readout');
  const stardate = document.getElementById('stardate');
  let currentMode = 'time';

  function fitStage() {
    const scale = Math.min(viewport.clientWidth / 1280, viewport.clientHeight / 800);
    stage.style.transform = `scale(${scale})`;
    stage.style.left = `${(viewport.clientWidth - 1280 * scale) / 2}px`;
    stage.style.top = `${(viewport.clientHeight - 800 * scale) / 2}px`;
  }
  window.addEventListener('resize', fitStage);
  fitStage();

  // The supplied white needle is 50x50. Its pointed end is at x=3, y=25.
  // Align that point with the coloured vertical scale, not the image centre.
  const timeGauges = [
    {id:1,x:91,min:0,max:12,value:d=>{let h=d.getHours()%12;return h===0?12:h;},invert:true},
    {id:2,x:251,min:0,max:60,value:d=>d.getMinutes(),invert:true},
    {id:3,x:411,min:0,max:60,value:d=>d.getSeconds(),invert:true},
    {id:4,x:737,min:0,max:6,value:d=>d.getDay(),invert:true},
    {id:5,x:891,min:1,max:31,value:d=>d.getDate(),invert:true},
    {id:6,x:1052,min:1,max:12,value:d=>d.getMonth()+1,invert:true}
  ];
  const TOP=58, BOTTOM=515;
  function setPointer(id,x,value,min,max) {
    const fraction=(value-min)/(max-min);
    const y=BOTTOM-fraction*(BOTTOM-TOP);
    const el=document.getElementById('img'+id);
    el.style.left=`${x+27}px`;
    el.style.top=`${y-25}px`;
  }
  function updateTime() {
    const now=new Date();
    timeGauges.forEach(g=>setPointer(g.id,g.x,g.value(now),g.min,g.max));
    readout.textContent=now.toLocaleString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
    const yy=now.getFullYear()-1900;
    stardate.textContent=`${yy}${String(now.getMonth()+1).padStart(2,'0')}.${String(now.getDate()).padStart(2,'0')}`;
  }

  const medicalGauges = [
    {name:'TEMP',sub:'CORE TEMPERATURE',unit:'°C',min:34,max:42,start:37.0,range:[36.5,37.5]},
    {name:'BRAIN K3',sub:'NEURAL ACTIVITY',unit:'K3',min:0,max:100,start:72,range:[55,88]},
    {name:'LUNGS',sub:'RESPIRATION',unit:'%',min:0,max:100,start:96,range:[85,100]},
    {name:'CELL RATE',sub:'CELLULAR METABOLISM',unit:'%',min:0,max:100,start:68,range:[50,85]},
    {name:'BLOOD O₂',sub:'OXYGEN SATURATION',unit:'%',min:70,max:100,start:98,range:[94,100]},
    {name:'BLOOD T₂',sub:'COAGULATION INDEX',unit:'T2',min:0,max:100,start:42,range:[25,65]}
  ];
  const gaugeState=[];
  medicalGauges.forEach((g,i)=>{
    const card=document.createElement('div');card.className='medGauge';card.id=`medGauge${i}`;
    card.innerHTML=`<div class="gaugeTrack" id="medTrack${i}"><img class="medNeedle" id="medNeedle${i}" src="needle.png" alt=""></div><div class="medRead" id="medRead${i}"></div><div class="medScale"><span style="top:0">${g.max}</span><span style="top:25%">${Math.round(g.min+(g.max-g.min)*.75)}</span><span style="top:50%">${Math.round((g.min+g.max)/2)}</span><span style="top:75%">${Math.round(g.min+(g.max-g.min)*.25)}</span><span style="top:100%">${g.min}</span></div><div class="medSub">${g.sub}</div><div class="medTitle">${g.name}</div>`;
    medical.appendChild(card);
    const track=card.querySelector('.gaugeTrack');
    for(let n=0;n<=40;n++){
      const pct=n*2.5;
      const zone=(pct<30||pct>=80)?'red':(pct<43||pct>=67)?'yellow':'green';
      const tick=document.createElement('i');
      tick.className=`tick zone-${zone}`+(n%5===0?' major':'');
      tick.style.top=`${pct}%`;
      track.appendChild(tick);
    }
    gaugeState.push({...g,value:g.start,target:g.start,el:card.querySelector('.medNeedle'),read:card.querySelector('.medRead')});
  });
  function renderMedical() {
    gaugeState.forEach(g=>{
      // Keep the needle entirely out of the red warning zones.
      // Its travel is confined to the central yellow/green/yellow band.
      const safeMin=g.range[0], safeMax=g.range[1];
      const f=Math.max(0,Math.min(1,(g.value-safeMin)/(safeMax-safeMin)));
      const yPercent=80-f*50;
      g.el.style.top=`${yPercent}%`;
      g.el.style.left='27px';
      g.el.style.transform='translateY(-25px)';
      g.read.textContent=`${g.value.toFixed(g.unit==='°C'?1:0)} ${g.unit}`;
    });
  }
  function chooseTargets(){
    gaugeState.forEach(g=>{
      const span=g.max-g.min;
      const lo=Math.max(g.min,g.range[0]),hi=Math.min(g.max,g.range[1]);
      g.target=lo+Math.random()*(hi-lo);
      // Small, slow fluctuations; occasional broader but still plausible drift.
      if(Math.random()<.12)g.target=Math.max(g.min,Math.min(g.max,g.value+(Math.random()-.5)*span*.16));
    });
  }
  setInterval(()=>{
    if(currentMode!=='medical')return;
    gaugeState.forEach(g=>{g.value+=(g.target-g.value)*.018;});
    renderMedical();
  },250);
  setInterval(chooseTargets,4500);

  function setMode(mode){
    currentMode=mode;
    const isTime=mode==='time';
    timeMode.style.display=isTime?'block':'none';
    timeBackground.style.display=isTime?'block':'none';
    medical.style.display=isTime?'none':'grid';
    document.getElementById('medicalFooter').style.display=isTime?'none':'block';
    if(!isTime){chooseTargets();renderMedical();}
  }
  // A click anywhere on the display switches between Time/Date and Medical Bay.
  viewport.addEventListener('click',()=>setMode(currentMode==='time'?'medical':'time'));
  stage.tabIndex=0;
  stage.setAttribute('role','button');
  stage.setAttribute('aria-label','Click to switch between time and medical displays');
  stage.addEventListener('keydown',event=>{
    if(event.key==='Enter'||event.key===' '){event.preventDefault();setMode(currentMode==='time'?'medical':'time');}
  });
  updateTime();
  setInterval(updateTime,1000);
  chooseTargets();
  renderMedical();
})();

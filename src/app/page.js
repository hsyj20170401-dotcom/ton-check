"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import * as exifr from "exifr";
import { S } from "@/app/lib/season-data";

// ═══════════════════════════════════════════════════════════════════
//  COLOR SCIENCE (unchanged logic)
// ═══════════════════════════════════════════════════════════════════
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}
function rgbToLab(r, g, b) {
  let rr = r / 255, gg = g / 255, bb = b / 255;
  rr = rr > 0.04045 ? Math.pow((rr + 0.055) / 1.055, 2.4) : rr / 12.92;
  gg = gg > 0.04045 ? Math.pow((gg + 0.055) / 1.055, 2.4) : gg / 12.92;
  bb = bb > 0.04045 ? Math.pow((bb + 0.055) / 1.055, 2.4) : bb / 12.92;
  let x = (rr * 0.4124 + gg * 0.3576 + bb * 0.1805) / 0.95047;
  let y = (rr * 0.2126 + gg * 0.7152 + bb * 0.0722) / 1.00000;
  let z = (rr * 0.0193 + gg * 0.1192 + bb * 0.9505) / 1.08883;
  x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
  y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
  z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;
  return { L: (116 * y) - 16, a: 500 * (x - y), b: 200 * (y - z) };
}
function deltaE2000(lab1, lab2) {
  const L1=lab1.L,a1=lab1.a,b1=lab1.b,L2=lab2.L,a2=lab2.a,b2=lab2.b;
  const Lb=(L1+L2)/2,C1=Math.sqrt(a1*a1+b1*b1),C2=Math.sqrt(a2*a2+b2*b2),Cb=(C1+C2)/2;
  const G=0.5*(1-Math.sqrt(Math.pow(Cb,7)/(Math.pow(Cb,7)+Math.pow(25,7))));
  const ap1=a1*(1+G),ap2=a2*(1+G);
  const Cp1=Math.sqrt(ap1*ap1+b1*b1),Cp2=Math.sqrt(ap2*ap2+b2*b2),Cpb=(Cp1+Cp2)/2,dCp=Cp2-Cp1;
  let hp1=Math.atan2(b1,ap1)*180/Math.PI;if(hp1<0)hp1+=360;
  let hp2=Math.atan2(b2,ap2)*180/Math.PI;if(hp2<0)hp2+=360;
  let dhp;
  if(Math.abs(hp1-hp2)<=180)dhp=hp2-hp1;else if(hp2<=hp1)dhp=hp2-hp1+360;else dhp=hp2-hp1-360;
  const dHp=2*Math.sqrt(Cp1*Cp2)*Math.sin(dhp*Math.PI/360);
  let Hpb;if(Math.abs(hp1-hp2)<=180)Hpb=(hp1+hp2)/2;else Hpb=(hp1+hp2+360)/2;
  const T=1-0.17*Math.cos((Hpb-30)*Math.PI/180)+0.24*Math.cos((2*Hpb)*Math.PI/180)+0.32*Math.cos((3*Hpb+6)*Math.PI/180)-0.20*Math.cos((4*Hpb-63)*Math.PI/180);
  const SL=1+0.015*Math.pow(Lb-50,2)/Math.sqrt(20+Math.pow(Lb-50,2));
  const SC=1+0.045*Cpb,SH=1+0.015*Cpb*T;
  const RT=-2*Math.sqrt(Math.pow(Cpb,7)/(Math.pow(Cpb,7)+Math.pow(25,7)))*Math.sin(60*Math.exp(-Math.pow((Hpb-275)/25,2))*Math.PI/180);
  return Math.sqrt(Math.pow((L2-L1)/SL,2)+Math.pow(dCp/SC,2)+Math.pow(dHp/SH,2)+RT*(dCp/SC)*(dHp/SH));
}

// ═══════════════════════════════════════════════════════════════════
//  WHITE BALANCE + FACE DETECTION + SAMPLING (unchanged logic)
// ═══════════════════════════════════════════════════════════════════
function estimateWhiteBalance(imageData, w, h) {
  const d = imageData.data; let tR=0,tG=0,tB=0,c=0;
  for(let i=0;i<d.length;i+=16){const r=d[i],g=d[i+1],b=d[i+2],avg=(r+g+b)/3;if(avg>30&&avg<235){tR+=r;tG+=g;tB+=b;c++;}}
  if(!c)return{rScale:1,gScale:1,bScale:1,confidence:"neutral"};
  const aR=tR/c,aG=tG/c,aB=tB/c,gray=(aR+aG+aB)/3;
  const dev=Math.max(Math.abs(aR-gray)/gray,Math.abs(aG-gray)/gray,Math.abs(aB-gray)/gray);
  return{rScale:gray/aR,gScale:gray/aG,bScale:gray/aB,confidence:dev>0.02&&dev<0.45?"high":dev<0.02?"neutral":"uncertain"};
}
function applyWB(r,g,b,wb){
  const s=wb.confidence==="high"?0.85:wb.confidence==="uncertain"?0.65:0.6;
  return{r:Math.max(0,Math.min(255,Math.round(r*(1+(wb.rScale-1)*s)))),g:Math.max(0,Math.min(255,Math.round(g*(1+(wb.gScale-1)*s)))),b:Math.max(0,Math.min(255,Math.round(b*(1+(wb.bScale-1)*s))))}
}
function detectFace(imageData,w,h){
  const d=imageData.data,skin=new Uint8Array(w*h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,r=d[i],g=d[i+1],b=d[i+2];
    const yy=0.299*r+0.587*g+0.114*b,cb=128-0.169*r-0.331*g+0.5*b,cr=128+0.5*r-0.419*g-0.081*b;
    const hsl=rgbToHsl(r,g,b);skin[y*w+x]=(yy>50&&cb>75&&cb<130&&cr>130&&cr<180&&hsl.h<=50&&hsl.s>=12&&hsl.l>=15&&hsl.l<=88)?1:0;}
  const col=new Array(w).fill(0),row=new Array(h).fill(0);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(skin[y*w+x]){col[x]++;row[y]++;}
  let l=0,r2=w-1,t=0,bt=h-1;const ct=h*0.08,rt=w*0.08;
  for(let x=0;x<w;x++)if(col[x]>ct){l=x;break;}for(let x=w-1;x>=0;x--)if(col[x]>ct){r2=x;break;}
  for(let y=0;y<h;y++)if(row[y]>rt){t=y;break;}for(let y=h-1;y>=0;y--)if(row[y]>rt){bt=y;break;}
  const p=Math.floor(Math.min(r2-l,bt-t)*0.05);l=Math.max(0,l+p);r2=Math.min(w-1,r2-p);t=Math.max(0,t+p);bt=Math.min(h-1,bt-p);
  const fw=r2-l,fh=bt-t;let sc=0;for(let y=t;y<=bt;y++)for(let x=l;x<=r2;x++)if(skin[y*w+x])sc++;
  return{found:sc/(fw*fh||1)>0.15&&fw>20&&fh>20,bounds:{left:l,right:r2,top:t,bottom:bt},center:{x:l+fw/2,y:t+fh/2},fw,fh,skin};
}
function sampleSkin(imageData,w,h,face,wb){
  const d=imageData.data,{bounds:bn,center:cn,fw,fh,skin}=face;
  const regions=[
    {name:"이마",cx:cn.x,cy:bn.top+fh*0.20,rad:fw*0.12,wt:1.6},
    {name:"왼쪽 볼",cx:cn.x-fw*0.18,cy:cn.y+fh*0.05,rad:fw*0.10,wt:1.1},
    {name:"오른쪽 볼",cx:cn.x+fw*0.18,cy:cn.y+fh*0.05,rad:fw*0.10,wt:1.1},
    {name:"턱",cx:cn.x,cy:bn.bottom-fh*0.12,rad:fw*0.10,wt:0.7},
    {name:"코 옆",cx:cn.x-fw*0.08,cy:cn.y-fh*0.02,rad:fw*0.06,wt:0.9},
  ];
  const rr=[];let twR=0,twG=0,twB=0,tw=0;
  for(const rg of regions){let sR=0,sG=0,sB=0,cnt=0;const rd=Math.floor(rg.rad),cx=Math.floor(rg.cx),cy=Math.floor(rg.cy);
    for(let dy=-rd;dy<=rd;dy++)for(let dx=-rd;dx<=rd;dx++){if(dx*dx+dy*dy>rd*rd)continue;const x=cx+dx,y=cy+dy;
      if(x<0||x>=w||y<0||y>=h)continue;if(skin[y*w+x]){const i=(y*w+x)*4;let r=d[i],g=d[i+1],b=d[i+2];
        if(wb&&wb.confidence!=="neutral"){const c=applyWB(r,g,b,wb);r=c.r;g=c.g;b=c.b;}sR+=r;sG+=g;sB+=b;cnt++;}}
    if(cnt>5){const ar=sR/cnt,ag=sG/cnt,ab=sB/cnt;rr.push({name:rg.name,r:Math.round(ar),g:Math.round(ag),b:Math.round(ab),cnt,wt:rg.wt});twR+=ar*rg.wt;twG+=ag*rg.wt;twB+=ab*rg.wt;tw+=rg.wt;}}
  if(!tw)return null;
  const rawLab=rgbToLab(Math.round(twR/tw),Math.round(twG/tw),Math.round(twB/tw));
  let fR=0,fG=0,fB=0,fW=0;const valid=[];
  for(const r of rr){const rl=rgbToLab(r.r,r.g,r.b),diff=deltaE2000(rawLab,rl);if(diff<12){fR+=r.r*r.wt;fG+=r.g*r.wt;fB+=r.b*r.wt;fW+=r.wt;valid.push({...r,deltaE:diff.toFixed(1)});}}
  if(!fW)return null;
  const scores=valid.map(r=>deltaE2000(rawLab,rgbToLab(r.r,r.g,r.b)));
  const avgDE=scores.reduce((a,b)=>a+b,0)/scores.length;
  return{r:Math.round(fR/fW),g:Math.round(fG/fW),b:Math.round(fB/fW),regions:valid,consistencyScore:Math.max(0,Math.min(100,Math.round(100-avgDE*8))),wbApplied:wb&&wb.confidence!=="neutral"};
}

// ═══════════════════════════════════════════════════════════════════
//  DIAGNOSIS
// ═══════════════════════════════════════════════════════════════════
function diagnose(skinRgb) {
  const {r,g,b}=skinRgb,hsl=rgbToHsl(r,g,b),lab=rgbToLab(r,g,b);
  const bAxis=lab.b*1.5,aAxis=lab.a*0.4;
  let hueS=0;if(hsl.h<25)hueS=(25-hsl.h)*0.6;else if(hsl.h<45)hueS=3;else if(hsl.h>330)hueS=-(hsl.h-330)*0.5;else if(hsl.h>300)hueS=-8;
  const rbD=(r-b)*0.08,rgP=(r>g&&g>b)?3:(b>g&&g>r)?-3:0;
  const total=bAxis+aAxis+hueS+rbD+rgP;
  const warmS=Math.max(0,total),coolS=Math.max(0,-total),toneT=warmS+coolS;
  const warmR=toneT>0?warmS/toneT:0.5,isW=warmR>=0.54;
  const bright=lab.L,sat=hsl.s,chroma=Math.sqrt(lab.a*lab.a+lab.b*lab.b);
  const muted=sat<25||chroma<15,clear=sat>35&&chroma>22,hi=bright>65,lo=bright<48;
  let season,sub,conf=70;
  if(isW){if(hi||(bright>58&&!lo)){season="spring";if(bright>72){sub="light";conf+=10}else if(clear&&chroma>22){sub="bright";conf+=8}else{sub="warm";conf+=5}}
    else{season="autumn";if(lo){sub="deep";conf+=10}else if(muted){sub="soft";conf+=8}else{sub="warm";conf+=5}}}
  else{if(hi||(bright>55&&muted)){season="summer";if(bright>70){sub="light";conf+=10}else if(muted||sat<22){sub="soft";conf+=8}else{sub="cool";conf+=5}}
    else{season="winter";if(lo){sub="deep";conf+=10}else if(clear&&chroma>25){sub="bright";conf+=8}else{sub="cool";conf+=5}}}
  conf+=Math.round(Math.abs(warmR-0.5)*30);conf=Math.min(95,Math.max(40,conf));
  return{season,sub,isWarm:isW,warmR,skinColor:{r,g,b},confidence:conf,lab,hsl,chroma,scores:{w:warmS.toFixed(1),c:coolS.toFixed(1)}};
}

// ═══════════════════════════════════════════════════════════════════
//  SEASON DATA — 자연스러운 한국어 톤
// ═══════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════════════════
const font = "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const CSS = `
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
*{margin:0;padding:0;box-sizing:border-box}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes dotPulse{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}
.fade-up{animation:fadeUp .5s ease both}
.fade-up-1{animation-delay:.1s}.fade-up-2{animation-delay:.2s}.fade-up-3{animation-delay:.3s}.fade-up-4{animation-delay:.4s}
`;

// ═══════════════════════════════════════════════════════════════════
//  COMPONENTS
// ═══════════════════════════════════════════════════════════════════

// — Hero / Landing —
function Hero({ onStart }) {
  return (
    <div style={{ textAlign:"center", padding:"60px 20px 40px" }} className="fade-up">
      <div style={{ fontSize:42, marginBottom:20, lineHeight:1 }}>
        <span style={{ display:"inline-block", width:10, height:10, borderRadius:"50%", background:"#F28B82", marginRight:6 }}/>
        <span style={{ display:"inline-block", width:10, height:10, borderRadius:"50%", background:"#B39DDB", marginRight:6 }}/>
        <span style={{ display:"inline-block", width:10, height:10, borderRadius:"50%", background:"#A1887F", marginRight:6 }}/>
        <span style={{ display:"inline-block", width:10, height:10, borderRadius:"50%", background:"#42A5F5" }}/>
      </div>
      <h1 style={{ fontFamily:font, fontSize:26, fontWeight:700, color:"#1a1a1a", lineHeight:1.4, marginBottom:10 }}>
        나에게 어울리는<br/>컬러를 찾아보세요
      </h1>
      <p style={{ fontFamily:font, fontSize:15, color:"#888", lineHeight:1.7, maxWidth:340, margin:"0 auto 32px" }}>
        사진 한 장으로 피부톤을 분석하고<br/>당신만의 퍼스널 컬러를 진단해드려요
      </p>

      {/* 3-step process */}
      <div style={{ display:"flex", justifyContent:"center", gap:24, marginBottom:40, flexWrap:"wrap" }}>
        {[
          { step:"1", label:"사진 업로드", sub:"정면 셀피 한 장" },
          { step:"2", label:"피부톤 분석", sub:"약 3초 소요" },
          { step:"3", label:"결과 확인", sub:"컬러 팔레트 제공" },
        ].map((s,i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{
              width:32, height:32, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
              background:"#1a1a1a", color:"#fff", fontSize:13, fontWeight:600, fontFamily:font,
            }}>{s.step}</div>
            <div style={{ textAlign:"left" }}>
              <div style={{ fontSize:13, fontWeight:600, color:"#1a1a1a", fontFamily:font }}>{s.label}</div>
              <div style={{ fontSize:11, color:"#aaa", fontFamily:font }}>{s.sub}</div>
            </div>
            {i < 2 && <div style={{ width:20, height:1, background:"#ddd", margin:"0 4px" }} />}
          </div>
        ))}
      </div>

      <button
        onClick={onStart}
        style={{
          fontFamily:font, padding:"14px 48px", borderRadius:50, border:"none",
          background:"#1a1a1a", color:"#fff", fontSize:15, fontWeight:600,
          cursor:"pointer", transition:"all .2s", boxShadow:"0 2px 12px rgba(0,0,0,0.12)",
        }}
        onMouseEnter={e => { e.currentTarget.style.background="#333"; e.currentTarget.style.transform="translateY(-1px)"; }}
        onMouseLeave={e => { e.currentTarget.style.background="#1a1a1a"; e.currentTarget.style.transform="translateY(0)"; }}
      >
        컬러 찾으러 가기
      </button>

      <p style={{ fontFamily:font, fontSize:11, color:"#ccc", marginTop:24 }}>
        43,000명이 넘는 분들이 진단을 받았어요
      </p>
    </div>
  );
}

// — Upload —
function Upload({ onFile, busy }) {
  const ref = useRef(null);
  const [over, setOver] = useState(false);
  const pick = f => { if(!f||!f.type.startsWith("image/"))return;onFile(f); };
  return (
    <div className="fade-up" style={{ textAlign:"center", padding:"40px 20px" }}>
      <button onClick={() => window.history.back?.()} style={{
        position:"absolute", top:20, left:20, background:"none", border:"none", fontSize:14,
        color:"#aaa", cursor:"pointer", fontFamily:font,
      }}>← 뒤로</button>

      <h2 style={{ fontFamily:font, fontSize:20, fontWeight:600, color:"#1a1a1a", marginBottom:8 }}>
        셀피를 올려주세요
      </h2>
      <p style={{ fontFamily:font, fontSize:13, color:"#999", marginBottom:28, lineHeight:1.6 }}>
        자연광 · 노메이크업 · 정면이 가장 정확해요
      </p>

      <div
        onClick={() => !busy && ref.current?.click()}
        onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files[0]); }}
        style={{
          maxWidth:360, margin:"0 auto", padding:"56px 24px", borderRadius:20,
          border:`2px dashed ${over?"#1a1a1a":"#ddd"}`, cursor:busy?"wait":"pointer",
          background:over?"#fafafa":"#fff", transition:"all .2s",
        }}
      >
        <input ref={ref} type="file" accept="image/*" style={{ display:"none" }} onChange={e => pick(e.target.files[0])} />
        <div style={{ fontSize:40, marginBottom:12, opacity:.7 }}>
          {busy ? (
            <div style={{ width:40, height:40, border:"3px solid #eee", borderTopColor:"#1a1a1a", borderRadius:"50%", animation:"spin .8s linear infinite", margin:"0 auto" }} />
          ) : "+"}
        </div>
        <p style={{ fontFamily:font, fontSize:14, fontWeight:500, color:busy?"#999":"#1a1a1a" }}>
          {busy ? "분석 중이에요..." : "사진 선택하기"}
        </p>
        <p style={{ fontFamily:font, fontSize:11, color:"#ccc", marginTop:6 }}>또는 여기에 드래그</p>
      </div>

      <div style={{
        maxWidth:360, margin:"24px auto 0", display:"flex", flexDirection:"column", gap:8,
      }}>
        {[
          "자연광이 충분한 곳에서 찍은 사진이 좋아요",
          "너무 밝거나 어두운 사진은 피해주세요",
          "필터가 적용되지 않은 원본 사진을 추천해요",
        ].map((t,i) => (
          <div key={i} style={{ display:"flex", gap:8, alignItems:"center" }}>
            <div style={{ width:4, height:4, borderRadius:"50%", background:"#ddd", flexShrink:0 }} />
            <span style={{ fontFamily:font, fontSize:12, color:"#aaa" }}>{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// — Analysis Loading —
function Analyzing({ step }) {
  const steps = ["피부톤을 읽고 있어요", "조명 환경을 보정하고 있어요", "얼굴 영역을 찾고 있어요", "컬러를 분석하고 있어요", "결과를 정리하고 있어요"];
  return (
    <div className="fade-up" style={{ textAlign:"center", padding:"80px 20px" }}>
      <div style={{ marginBottom:32 }}>
        <div style={{
          width:56, height:56, margin:"0 auto", borderRadius:"50%",
          border:"3px solid #eee", borderTopColor:"#1a1a1a",
          animation:"spin 1s linear infinite",
        }}/>
      </div>
      <p style={{ fontFamily:font, fontSize:17, fontWeight:600, color:"#1a1a1a", marginBottom:8 }}>
        {steps[Math.min(step, steps.length - 1)]}
      </p>
      <div style={{ display:"flex", justifyContent:"center", gap:6, marginTop:16 }}>
        {steps.map((_, i) => (
          <div key={i} style={{
            width:8, height:8, borderRadius:"50%",
            background: i <= step ? "#1a1a1a" : "#e0e0e0",
            transition:"background .3s",
          }} />
        ))}
      </div>
    </div>
  );
}

// — Result —
function Result({ data, skinSample, imgUrl, onReset, onAddPhoto, kakaoReady, kakaoKey }) {
  const s = S[data.season];
  const sub = s.subs[data.sub];
  const [tab, setTab] = useState("best");
  const [showDetail, setShowDetail] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareMsg, setShareMsg] = useState(null);

  const handleShareImage = async (type) => {
    try {
      setShareBusy(true);
      setShareMsg(null);
      const blob = await renderShareCardBlob(type, data, sub, s);
      if (!blob) throw new Error("no-blob");
      const filename = `toncheck-${data.season}-${type}.png`;
      const file = new File([blob], filename, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "퍼스널컬러 결과",
          text: `${s.label}${sub ? ` · ${sub.label}` : ""}`,
          url: window.location.href,
        });
        setShareMsg("공유 시트를 열었어요.");
      } else {
        downloadBlob(blob, filename);
        setShareMsg("이미지를 저장했어요. 인스타에 업로드해주세요.");
      }
    } catch (err) {
      setShareMsg("공유에 실패했어요. 다시 시도해주세요.");
    } finally {
      setShareBusy(false);
    }
  };

  const handleDownload = async (type) => {
    try {
      setShareBusy(true);
      setShareMsg(null);
      const blob = await renderShareCardBlob(type, data, sub, s);
      if (!blob) throw new Error("no-blob");
      downloadBlob(blob, `toncheck-${data.season}-${type}.png`);
      setShareMsg("이미지를 저장했어요.");
    } catch (err) {
      setShareMsg("저장에 실패했어요. 다시 시도해주세요.");
    } finally {
      setShareBusy(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareMsg("링크를 복사했어요.");
    } catch (err) {
      setShareMsg("링크 복사에 실패했어요.");
    }
  };

  const kakaoLabel = !kakaoKey
    ? "카카오톡 공유 (키 필요)"
    : kakaoReady
      ? "카카오톡 공유"
      : "카카오톡 공유 (로딩 중)";

  const handleKakao = () => {
    try {
      if (!kakaoKey) {
        setShareMsg("카카오 공유를 위해 JavaScript 키를 설정해주세요.");
        return;
      }
      if (typeof window === "undefined" || !window.Kakao) {
        setShareMsg("카카오 SDK 로딩 중이에요. 잠시 후 다시 시도해주세요.");
        return;
      }
      if (!window.Kakao.isInitialized()) {
        window.Kakao.init(kakaoKey);
      }
      const base = window.location.origin;
      const shareUrl = window.location.href;
      const imageUrl = `${base}/share/og?season=${encodeURIComponent(data.season)}&sub=${encodeURIComponent(data.sub || "")}`;
      window.Kakao.Share.sendDefault({
        objectType: "feed",
        content: {
          title: `${s.label}${sub ? ` · ${sub.label}` : ""}`,
          description: "사진 한 장으로 피부톤 분석 + 컬러 팔레트 제공",
          imageUrl,
          link: {
            mobileWebUrl: shareUrl,
            webUrl: shareUrl,
          },
        },
        buttons: [
          {
            title: "결과 보기",
            link: {
              mobileWebUrl: shareUrl,
              webUrl: shareUrl,
            },
          },
        ],
      });
      setShareMsg("카카오톡 공유창을 열었어요.");
    } catch (err) {
      setShareMsg("카카오 공유에 실패했어요. 다시 시도해주세요.");
    }
  };

  return (
    <div style={{ paddingBottom:60 }}>
      {/* Season Header */}
      <div className="fade-up" style={{
        background:s.gradient, borderRadius:24, padding:"40px 24px",
        textAlign:"center", margin:"0 0 28px", position:"relative",
      }}>
        <p style={{ fontFamily:font, fontSize:13, color:"#999", letterSpacing:1, marginBottom:8, textTransform:"uppercase" }}>
          your personal color
        </p>
        <h2 style={{ fontFamily:font, fontSize:28, fontWeight:700, color:"#1a1a1a", marginBottom:4 }}>
          {s.label}
        </h2>
        <p style={{ fontFamily:font, fontSize:14, color:"#666", marginBottom:12 }}>{s.en}</p>
        {sub && (
          <span style={{
            fontFamily:font, display:"inline-block", padding:"5px 14px", borderRadius:20,
            background:"rgba(0,0,0,0.06)", fontSize:13, color:"#555", fontWeight:500,
          }}>{sub.label}</span>
        )}
      </div>

      {/* Tagline */}
      <div className="fade-up fade-up-1" style={{ textAlign:"center", marginBottom:28 }}>
        <p style={{ fontFamily:font, fontSize:18, fontWeight:600, color:"#1a1a1a", lineHeight:1.5 }}>
          "{s.tagline}"
        </p>
      </div>

      {/* Photo + Skin */}
      <div className="fade-up fade-up-2" style={{
        display:"flex", gap:16, marginBottom:28, alignItems:"start", flexWrap:"wrap", padding:"0 4px",
      }}>
        <img src={imgUrl} alt="" style={{
          width:120, height:120, objectFit:"cover", borderRadius:16,
          boxShadow:"0 2px 12px rgba(0,0,0,0.08)", flexShrink:0,
        }} />
        <div style={{ flex:1, minWidth:200 }}>
          {/* Skin color */}
          <div style={{
            display:"flex", gap:12, alignItems:"center", marginBottom:14,
            padding:"14px 16px", background:"#fff", borderRadius:14,
            boxShadow:"0 1px 4px rgba(0,0,0,0.04)",
          }}>
            <div style={{
              width:40, height:40, borderRadius:"50%",
              background:`rgb(${data.skinColor.r},${data.skinColor.g},${data.skinColor.b})`,
              border:"2px solid #fff", boxShadow:"0 1px 6px rgba(0,0,0,0.12)", flexShrink:0,
            }}/>
            <div>
              <p style={{ fontFamily:font, fontSize:13, fontWeight:500, color:"#1a1a1a" }}>내 피부톤</p>
              <p style={{ fontFamily:font, fontSize:11, color:"#bbb" }}>
                RGB {data.skinColor.r}, {data.skinColor.g}, {data.skinColor.b}
              </p>
            </div>
          </div>

          {/* Undertone bar */}
          <div style={{ padding:"0 2px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <span style={{ fontFamily:font, fontSize:11, color:"#999" }}>웜</span>
              <span style={{ fontFamily:font, fontSize:11, color:"#999" }}>쿨</span>
            </div>
            <div style={{ height:6, borderRadius:3, background:"#f0f0f0", overflow:"hidden" }}>
              <div style={{
                height:"100%", borderRadius:3, width:`${data.warmR*100}%`,
                background:"linear-gradient(90deg, #F28B82, #FFB74D)",
                transition:"width 1s ease",
              }}/>
            </div>
            <p style={{ fontFamily:font, fontSize:11, color:"#ccc", marginTop:4, textAlign:"center" }}>
              {data.warmR > 0.6 ? "웜톤" : data.warmR < 0.4 ? "쿨톤" : "뉴트럴"}에 가까워요
            </p>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="fade-up fade-up-2" style={{
        background:"#fff", borderRadius:16, padding:22,
        boxShadow:"0 1px 4px rgba(0,0,0,0.04)", marginBottom:20,
      }}>
        <p style={{ fontFamily:font, fontSize:14, color:"#444", lineHeight:1.8 }}>{s.desc}</p>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:14 }}>
          {s.mood.map((m,i) => (
            <span key={i} style={{
              fontFamily:font, padding:"4px 12px", borderRadius:20, fontSize:12,
              background:"#f7f7f7", color:"#777",
            }}>{m}</span>
          ))}
          <span style={{
            fontFamily:font, padding:"4px 12px", borderRadius:20, fontSize:12,
            background:"#f7f7f7", color:"#777",
          }}>{s.accessory}</span>
        </div>
      </div>

      {/* Styling Tip */}
      <div className="fade-up fade-up-3" style={{
        background:"#fafafa", borderRadius:16, padding:20, marginBottom:20,
        borderLeft:`3px solid ${s.accent}`,
      }}>
        <p style={{ fontFamily:font, fontSize:12, fontWeight:600, color:"#999", marginBottom:6, letterSpacing:.5 }}>STYLING TIP</p>
        <p style={{ fontFamily:font, fontSize:13, color:"#555", lineHeight:1.7 }}>{s.tip}</p>
      </div>

      {/* Sub-type detail */}
      {sub && (
        <div className="fade-up fade-up-3" style={{
          background:"#fff", borderRadius:16, padding:20,
          boxShadow:"0 1px 4px rgba(0,0,0,0.04)", marginBottom:20,
        }}>
          <p style={{ fontFamily:font, fontSize:15, fontWeight:600, color:"#1a1a1a", marginBottom:6 }}>
            {sub.label}
          </p>
          <p style={{ fontFamily:font, fontSize:13, color:"#777", lineHeight:1.6 }}>{sub.desc}</p>
        </div>
      )}

      {/* Color Palette Tabs */}
      <div className="fade-up fade-up-4">
        <div style={{ display:"flex", gap:0, marginBottom:16 }}>
          {[
            { key:"best", label:"어울리는 컬러" },
            { key:"avoid", label:"피해야 할 컬러" },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              fontFamily:font, flex:1, padding:"10px 0", border:"none", cursor:"pointer",
              background:"none", fontSize:13, fontWeight: tab===t.key ? 600 : 400,
              color: tab===t.key ? "#1a1a1a" : "#bbb",
              borderBottom: tab===t.key ? "2px solid #1a1a1a" : "2px solid #eee",
              transition:"all .2s",
            }}>{t.label}</button>
          ))}
        </div>

        <div style={{
          display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:12,
          padding:"4px 0",
        }}>
          {(tab === "best" ? s.colors : s.avoid).map((c,i) => (
            <div key={i} style={{ textAlign:"center" }}>
              <div style={{
                width:"100%", paddingBottom:"100%", borderRadius:14, background:c.hex,
                position:"relative", boxShadow:"0 2px 8px rgba(0,0,0,0.08)",
                cursor:"pointer", transition:"transform .2s",
              }}
              onMouseEnter={e => e.currentTarget.style.transform="scale(1.06)"}
              onMouseLeave={e => e.currentTarget.style.transform="scale(1)"}
              />
              <p style={{ fontFamily:font, fontSize:10, color:"#999", marginTop:6 }}>{c.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Confidence (collapsible detail) */}
      <div style={{ marginTop:24 }}>
        <button onClick={() => setShowDetail(!showDetail)} style={{
          fontFamily:font, width:"100%", padding:"12px 16px", borderRadius:12,
          border:"1px solid #eee", background:"#fff", cursor:"pointer",
          display:"flex", justifyContent:"space-between", alignItems:"center",
          fontSize:13, color:"#999",
        }}>
          <span>분석 상세 정보</span>
          <span style={{ transform: showDetail?"rotate(180deg)":"rotate(0)", transition:"transform .2s" }}>▾</span>
        </button>
        {showDetail && (
          <div style={{
            padding:16, background:"#fafafa", borderRadius:"0 0 12px 12px",
            borderTop:"none", fontSize:12, color:"#999", fontFamily:font,
          }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
              <span>진단 신뢰도</span>
              <span style={{ fontWeight:600, color: data.confidence > 75 ? "#4CAF50" : data.confidence > 55 ? "#FF9800" : "#f44336" }}>
                {data.confidence}%
              </span>
            </div>
            {skinSample?.consistencyScore !== undefined && (
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <span>영역 간 일관성</span>
                <span style={{ fontWeight:600 }}>{skinSample.consistencyScore}%</span>
              </div>
            )}
            {skinSample?.wbApplied && (
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <span>화이트밸런스 보정</span>
                <span style={{ fontWeight:600, color:"#4CAF50" }}>적용됨</span>
              </div>
            )}
            {skinSample?.regions && (
              <div style={{ marginTop:8, paddingTop:8, borderTop:"1px solid #eee" }}>
                <p style={{ marginBottom:6, fontWeight:500 }}>샘플링 영역</p>
                {skinSample.regions.map((rr,i) => (
                  <div key={i} style={{ display:"flex", gap:8, alignItems:"center", marginBottom:4 }}>
                    <div style={{ width:12, height:12, borderRadius:"50%", background:`rgb(${rr.r},${rr.g},${rr.b})`, border:"1px solid #eee" }}/>
                    <span>{rr.name}</span>
                    <span style={{ marginLeft:"auto", fontSize:10, color:"#ccc" }}>ΔE {rr.deltaE}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div style={{ display:"flex", gap:12, marginTop:32, justifyContent:"center", flexWrap:"wrap" }}>
        <button onClick={onReset} style={{
          fontFamily:font, padding:"12px 32px", borderRadius:50,
          background:"#1a1a1a", color:"#fff", fontSize:14, fontWeight:600,
          border:"none", cursor:"pointer", transition:"all .2s",
        }}
        onMouseEnter={e => e.currentTarget.style.background="#333"}
        onMouseLeave={e => e.currentTarget.style.background="#1a1a1a"}
        >
          다시 진단하기
        </button>
        <button onClick={onAddPhoto} style={{
          fontFamily:font, padding:"12px 32px", borderRadius:50,
          background:"#fff", color:"#1a1a1a", fontSize:14, fontWeight:500,
          border:"1px solid #ddd", cursor:"pointer", transition:"all .2s",
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor="#aaa"}
        onMouseLeave={e => e.currentTarget.style.borderColor="#ddd"}
        >
          사진 추가하기
        </button>
        <button onClick={() => setShareOpen(true)} style={{
          fontFamily:font, padding:"12px 32px", borderRadius:50,
          background:"#fff", color:"#1a1a1a", fontSize:14, fontWeight:600,
          border:"1px solid #ddd", cursor:"pointer", transition:"all .2s",
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor="#aaa"}
        onMouseLeave={e => e.currentTarget.style.borderColor="#ddd"}
        >
          공유하기
        </button>
      </div>

      <p style={{ fontFamily:font, textAlign:"center", fontSize:11, color:"#ddd", marginTop:20, lineHeight:1.5 }}>
        사진의 조명이나 화면 설정에 따라 결과가 달라질 수 있어요.<br/>
        더 정확한 결과를 원하시면 다른 환경의 사진을 추가해보세요.
      </p>

      {shareOpen && (
        <div style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,0.35)",
          display:"flex", justifyContent:"center", alignItems:"center", zIndex:50,
        }}>
          <div style={{
            width:"min(92vw, 420px)", background:"#fff", borderRadius:20, padding:20,
            boxShadow:"0 12px 40px rgba(0,0,0,0.18)", fontFamily:font,
          }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div style={{ fontSize:16, fontWeight:600, color:"#1a1a1a" }}>공유하기</div>
              <button onClick={() => setShareOpen(false)} style={{
                border:"none", background:"none", cursor:"pointer", fontSize:16, color:"#999",
              }}>✕</button>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:10 }}>
              <button onClick={() => handleKakao()} style={{
                padding:"12px 14px", borderRadius:12, border:"1px solid #eee", background:"#fff",
                textAlign:"left", cursor:"pointer", fontSize:13, color:"#1a1a1a",
              }}>{kakaoLabel}</button>
              <button disabled={shareBusy} onClick={() => handleShareImage("feed")} style={{
                padding:"12px 14px", borderRadius:12, border:"1px solid #eee", background:"#fff",
                textAlign:"left", cursor:shareBusy?"wait":"pointer", fontSize:13, color:"#1a1a1a",
              }}>인스타 공유용 이미지 (피드)</button>
              <button disabled={shareBusy} onClick={() => handleShareImage("story")} style={{
                padding:"12px 14px", borderRadius:12, border:"1px solid #eee", background:"#fff",
                textAlign:"left", cursor:shareBusy?"wait":"pointer", fontSize:13, color:"#1a1a1a",
              }}>인스타 공유용 이미지 (스토리)</button>
              <button disabled={shareBusy} onClick={() => handleDownload("og")} style={{
                padding:"12px 14px", borderRadius:12, border:"1px solid #eee", background:"#fff",
                textAlign:"left", cursor:shareBusy?"wait":"pointer", fontSize:13, color:"#1a1a1a",
              }}>카톡 미리보기 카드 저장</button>
              <button onClick={handleCopyLink} style={{
                padding:"12px 14px", borderRadius:12, border:"1px solid #eee", background:"#fff",
                textAlign:"left", cursor:"pointer", fontSize:13, color:"#1a1a1a",
              }}>링크 복사</button>
            </div>

            {shareMsg && (
              <div style={{
                marginTop:12, padding:"10px 12px", borderRadius:10, background:"#fafafa",
                fontSize:12, color:"#777",
              }}>
                {shareMsg}
              </div>
            )}

            <div style={{ marginTop:12, fontSize:11, color:"#bbb", lineHeight:1.5 }}>
              카카오 공유는 앱 키 등록과 도메인 등록이 필요해요.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  APP
// ═══════════════════════════════════════════════════════════════════
function getOrientedCanvasSize(width, height, orientation) {
  const swap = orientation === 5 || orientation === 6 || orientation === 7 || orientation === 8;
  return { width: swap ? height : width, height: swap ? width : height };
}

function applyOrientationTransform(ctx, orientation, width, height) {
  switch (orientation) {
    case 2: // mirror horizontal
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      break;
    case 3: // rotate 180
      ctx.translate(width, height);
      ctx.rotate(Math.PI);
      break;
    case 4: // mirror vertical
      ctx.translate(0, height);
      ctx.scale(1, -1);
      break;
    case 5: // mirror horizontal + rotate 90 CW
      ctx.rotate(0.5 * Math.PI);
      ctx.scale(1, -1);
      break;
    case 6: // rotate 90 CW
      ctx.translate(width, 0);
      ctx.rotate(0.5 * Math.PI);
      break;
    case 7: // mirror horizontal + rotate 90 CCW
      ctx.translate(width, height);
      ctx.rotate(0.5 * Math.PI);
      ctx.scale(-1, 1);
      break;
    case 8: // rotate 90 CCW
      ctx.translate(0, height);
      ctx.rotate(-0.5 * Math.PI);
      break;
    default:
      break;
  }
}

export default function App() {
  const [page, setPage] = useState("hero"); // hero | upload | analyzing | result
  const [imgUrl, setImgUrl] = useState(null);
  const [result, setResult] = useState(null);
  const [skinSample, setSkinSample] = useState(null);
  const [step, setStep] = useState(0);
  const [error, setError] = useState(null);
  const [kakaoReady, setKakaoReady] = useState(false);
  const canvas = useRef(null);
  const addRef = useRef(null);

  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

  useEffect(() => {
    if (!kakaoKey || typeof window === "undefined") return;
    if (window.Kakao?.isInitialized()) {
      setKakaoReady(true);
      return;
    }
    const existing = document.querySelector('script[data-kakao-sdk="true"]');
    if (existing) return;
    const script = document.createElement("script");
    script.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.9/kakao.min.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.dataset.kakaoSdk = "true";
    script.onload = () => {
      if (!window.Kakao?.isInitialized()) {
        window.Kakao.init(kakaoKey);
      }
      setKakaoReady(true);
    };
    document.body.appendChild(script);
  }, [kakaoKey]);

  const processImage = useCallback(async (file) => {
    if (!file) return;

    if (imgUrl) {
      URL.revokeObjectURL(imgUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    setImgUrl(previewUrl);
    setPage("analyzing");
    setStep(0);
    setError(null);

    let orientation = 1;
    try {
      const exifOrientation = await exifr.orientation(file);
      if (typeof exifOrientation === "number") {
        orientation = exifOrientation;
      }
    } catch (err) {
      orientation = 1;
    }

    const img = new Image();
    img.onload = () => {
      const cv = canvas.current, ctx = cv.getContext("2d", { willReadFrequently: true });
      const maxSz = 600; let w = img.width, h = img.height;
      if (w > maxSz || h > maxSz) { const r = Math.min(maxSz/w, maxSz/h); w = Math.floor(w*r); h = Math.floor(h*r); }

      const oriented = getOrientedCanvasSize(w, h, orientation);
      cv.width = oriented.width;
      cv.height = oriented.height;

      ctx.save();
      applyOrientationTransform(ctx, orientation, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      ctx.restore();
      const id = ctx.getImageData(0, 0, cv.width, cv.height);

      setTimeout(() => { setStep(1);
        const wb = estimateWhiteBalance(id, cv.width, cv.height);
        setTimeout(() => { setStep(2);
          const face = detectFace(id, cv.width, cv.height);
          if (!face.found) { setError("얼굴을 찾지 못했어요. 정면 셀피로 다시 시도해주세요."); setPage("upload"); return; }
          setTimeout(() => { setStep(3);
            const skin = sampleSkin(id, cv.width, cv.height, face, wb);
            if (!skin) { setError("피부톤 분석에 실패했어요. 다른 사진으로 시도해주세요."); setPage("upload"); return; }
            setTimeout(() => { setStep(4);
              const d = diagnose(skin);
              setResult(d); setSkinSample(skin);
              setTimeout(() => setPage("result"), 300);
            }, 250);
          }, 300);
        }, 300);
      }, 200);
    };
    img.onerror = () => { setError("이미지를 불러올 수 없어요."); setPage("upload"); };
    img.src = previewUrl;
  }, [imgUrl]);

  const reset = () => {
    if (imgUrl) {
      URL.revokeObjectURL(imgUrl);
    }
    setPage("hero");
    setImgUrl(null);
    setResult(null);
    setSkinSample(null);
    setError(null);
    setStep(0);
  };

  return (
    <div style={{
      minHeight:"100vh", fontFamily:font,
      background: page === "result" && result ? S[result.season].gradient : "linear-gradient(180deg, #fefefe 0%, #f8f8f8 100%)",
      transition:"background .6s ease",
    }}>
      <style>{CSS}</style>
      <canvas ref={canvas} style={{ display:"none" }}/>
      <input ref={addRef} type="file" accept="image/*" style={{ display:"none" }}
        onChange={e => { const f=e.target.files[0];if(!f)return;processImage(f);e.target.value="";}} />

      <div style={{ maxWidth:480, margin:"0 auto", padding:"0 16px", position:"relative" }}>

        {/* Nav */}
        {page !== "hero" && page !== "analyzing" && (
          <div style={{
            display:"flex", justifyContent:"space-between", alignItems:"center",
            padding:"16px 0", borderBottom:"1px solid #f0f0f0",
          }}>
            <button onClick={page==="result"?reset:()=>setPage("hero")} style={{
              background:"none", border:"none", fontFamily:font, fontSize:13,
              color:"#aaa", cursor:"pointer", padding:"4px 0",
            }}>← {page==="result"?"처음으로":"뒤로"}</button>
            <span style={{ fontFamily:font, fontSize:12, fontWeight:500, color:"#ccc", letterSpacing:.5 }}>TONCHECK</span>
          </div>
        )}

        {/* Error toast */}
        {error && (
          <div style={{
            margin:"16px 0", padding:"12px 16px", borderRadius:12,
            background:"#FFF3F3", border:"1px solid #FFE0E0",
            fontFamily:font, fontSize:13, color:"#D32F2F", textAlign:"center",
          }}>
            {error}
          </div>
        )}

        {/* Pages */}
        {page === "hero" && <Hero onStart={() => setPage("upload")} />}
        {page === "upload" && <Upload onFile={processImage} busy={false} />}
        {page === "analyzing" && <Analyzing step={step} />}
        {page === "result" && result && (
          <div style={{ padding:"20px 0" }}>
            <Result
              data={result}
              skinSample={skinSample}
              imgUrl={imgUrl}
              onReset={reset}
              onAddPhoto={() => addRef.current?.click()}
              kakaoReady={kakaoReady}
              kakaoKey={kakaoKey}
            />
          </div>
        )}

        {/* Footer */}
        {page === "hero" && (
          <div style={{ textAlign:"center", padding:"40px 0 20px" }}>
            <p style={{ fontFamily:font, fontSize:10, color:"#ddd", letterSpacing:.5 }}>TONCHECK</p>
          </div>
        )}
      </div>
    </div>
  );
}

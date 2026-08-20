import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import fs from "node:fs";
import path from "node:path";
import { requireUser } from "@/lib/auth";
import { getDb, uploadDirectory } from "@/lib/db";
import { routeError } from "@/lib/http";
import { conclusionForAnswers, recommendationsForAnswers } from "@/lib/visit-recommendations";
import { visitAreaLabel } from "@/lib/visit-areas";
import { criticalQuestionWeightForAnswerCount, isCriticalQuestionText } from "@/lib/logic";

export const runtime = "nodejs";

type VisitPdfRow = { id:string;score:number;completedAt:string;mpc:string;street:string;regionCode:string;employeeRef:string;photoPath:string|null;noReceiptReason:string|null };
type AnswerRow = { number:number;text:string;answer:number };
type AreaPdfRow = { id:string;areaKey:string;comment:string|null;photoPath:string|null };

function pdfFontPath() {
  return [
    process.env.PDF_FONT_REGULAR,
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "C:/Windows/Fonts/arial.ttf",
  ].find((candidate): candidate is string => Boolean(candidate && fs.existsSync(candidate)));
}

function drawBusinessStoreMark(doc:PDFKit.PDFDocument,x=500,y=213) {
  doc.circle(x,y,36).lineWidth(1.4).strokeColor("#ffffff").stroke();
  for(let index=0;index<4;index+=1)doc.roundedRect(x-20+index*10,y-13,9,11,2).fill("#ffffff");
  doc.rect(x-17,y-2,34,23).lineWidth(1.3).strokeColor("#ffffff").stroke();
  doc.rect(x-12,y+7,8,14).fill("#ffffff");
  doc.rect(x+3,y+4,10,8).lineWidth(1.1).strokeColor("#ffffff").stroke();
  doc.moveTo(x-23,y+22).lineTo(x+23,y+22).lineWidth(1.4).strokeColor("#ffffff").stroke();
}

function drawManagerReferenceHero(doc:PDFKit.PDFDocument) {
  const reference=path.resolve(process.cwd(),"public/demo-report-header.png");
  doc.rect(0,0,595,136).fill("#ddd8cf");
  if(!fs.existsSync(reference))return;
  doc.save();
  doc.rect(0,0,595,136).clip();
  doc.image(reference,0,0,{width:595});
  doc.restore();
  doc.save();
  doc.fillOpacity(.08).rect(0,0,595,136).fill("#12382c");
  doc.restore();
}

function drawAreaPage(doc:PDFKit.PDFDocument,visit:VisitPdfRow,area:AreaPdfRow) {
  const label=visitAreaLabel(area.areaKey);
  doc.addPage();
  doc.rect(0,0,595,92).fill("#075437");
  doc.fillColor("#d7b85a").rect(46,26,78,4).fill();
  doc.fillColor("#ffffff").fontSize(10).text("DOKUMENTACJA OBSZARU",46,39,{characterSpacing:.7});
  doc.fontSize(20).text(label,46,57,{width:503});
  doc.fillColor("#64716b").fontSize(8.5).text(`${visit.mpc} · ${visit.street} · ${visit.regionCode} · ${new Date(visit.completedAt).toLocaleString("pl-PL")}`,46,108,{width:503});
  const commentHeight=area.comment?Math.min(150,doc.fontSize(9.5).heightOfString(area.comment,{width:463,lineGap:3})+34):0;
  const imageY=132;
  const imageHeight=area.comment?Math.max(300,560-commentHeight):570;
  doc.roundedRect(46,imageY,503,imageHeight,12).fill("#f0f4f2");
  if(area.photoPath){
    const photo=path.join(/* turbopackIgnore: true */ uploadDirectory(),path.basename(area.photoPath));
    if(fs.existsSync(photo)){try{doc.image(photo,60,imageY+14,{fit:[475,imageHeight-28],align:"center",valign:"center"})}catch{doc.fillColor("#b42318").fontSize(10).text("Nie można osadzić zdjęcia obszaru.",66,imageY+32)}}
  }else{
    doc.fillColor("#7a8881").fontSize(11).text("Do tego obszaru dodano komentarz bez zdjęcia.",70,imageY+imageHeight/2-6,{width:455,align:"center"});
  }
  if(area.comment){
    const commentY=imageY+imageHeight+14;
    doc.roundedRect(46,commentY,503,commentHeight,10).fill("#edf6f1");
    doc.fillColor("#075437").fontSize(8).text("KOMENTARZ DO OBSZARU",62,commentY+11,{characterSpacing:.6});
    doc.fillColor("#17211d").fontSize(9.5).text(area.comment,62,commentY+28,{width:471,lineGap:3,height:commentHeight-36,ellipsis:true});
  }
}

export function renderVisitPdf(visit:VisitPdfRow, answers:AnswerRow[], areas:AreaPdfRow[]) {
  return new Promise<Buffer>((resolve,reject)=>{
    const doc=new PDFDocument({size:"A4",margin:46,bufferPages:true,info:{Title:`Szczegółowy raport wizyty - ${visit.mpc}`}});
    const chunks:Buffer[]=[];doc.on("data",chunk=>chunks.push(Buffer.from(chunk)));doc.on("end",()=>resolve(Buffer.concat(chunks)));doc.on("error",reject);
    const reportFont=pdfFontPath();
    if(!reportFont)throw new Error("Brak czcionki Unicode wymaganej do wygenerowania raportu PDF.");
    doc.font(reportFont);
    const roundedScore=Math.round(visit.score);
    const scoreColor=roundedScore>=83?"#138a58":roundedScore>=67?"#f59e0b":"#dc4c3f";
    drawManagerReferenceHero(doc);
    const titleGradient=doc.linearGradient(0,136,595,292).stop(0,"#075437").stop(1,"#003e2b");
    doc.rect(0,136,595,156).fill(titleGradient);
    doc.fillColor("#d7b85a").rect(0,136,595,1.5).fill();
    doc.rect(46,165,50,2).fill("#d7b85a");
    doc.fillColor("#ffffff").fontSize(28).text("SZCZEGÓŁOWY RAPORT",46,181,{width:390,lineBreak:false,characterSpacing:.5});
    doc.fillColor("#c8d9d3").fontSize(15).text("WIZYTY KONTROLNEJ",46,221,{width:390,characterSpacing:1.5});
    doc.fillColor("#ffffff").fontSize(10).text(`SKLEP ${visit.mpc}`,46,254,{width:250,characterSpacing:1.2,lineBreak:false});
    doc.fillColor("#dcece6").fontSize(8.5).text(visit.street,46,270,{width:315,ellipsis:true});
    drawBusinessStoreMark(doc,500,207);
    doc.fillColor("#ffffff").fontSize(8).text(`SKLEP ${visit.mpc}`,449,246,{width:102,align:"center",characterSpacing:.7,lineBreak:false});
    doc.fillColor("#dcece6").fontSize(6.5).text(visit.street,433,260,{width:132,align:"center",ellipsis:true});

    doc.roundedRect(46,316,318,100,12).fill("#f0f4f2");
    doc.fillColor("#64716b").fontSize(8).text("DANE WIZYTY",62,331,{characterSpacing:.8});
    doc.fillColor("#17211d").fontSize(9.5).text(`Sklep: ${visit.mpc}`,62,352);
    doc.text(`Ulica: ${visit.street}`,62,373,{width:146,ellipsis:true});
    doc.text(`Struktura: ${visit.regionCode}`,62,394);
    doc.text(`Data: ${new Date(visit.completedAt).toLocaleString("pl-PL")}`,222,352,{width:130});
    doc.text(`Kasjer: ${visit.employeeRef}`,222,373,{width:130,ellipsis:true});

    const ringX=466,ringY=366,segments=24,active=Math.round((visit.score/100)*segments);
    for(let index=0;index<segments;index+=1){const angle=(-Math.PI/2)+(index/segments)*Math.PI*2;doc.circle(ringX+Math.cos(angle)*39,ringY+Math.sin(angle)*39,4.2).fill(index<active?scoreColor:"#e2e8e5")}
    doc.fillColor("#64716b").fontSize(8).text("WYNIK",ringX-34,351,{width:68,align:"center"});
    doc.fillColor("#17211d").fontSize(22).text(`${Math.round(visit.score)}%`,ringX-38,366,{width:76,align:"center"});

    doc.fillColor("#17211d").fontSize(15).text("Pytania kontrolne",46,445);
    let y=472;
    const criticalWeight=criticalQuestionWeightForAnswerCount(answers.length);
    for(const answer of answers){
      const critical=isCriticalQuestionText(answer.text);
      const textHeight=doc.fontSize(9).heightOfString(answer.text,{width:336});
      const height=critical?Math.max(48,textHeight+30):Math.max(34,textHeight+14);
      if(y+height>752){
        doc.addPage();
        doc.rect(0,0,595,82).fill("#075437");
        doc.fillColor("#ffffff").fontSize(19).text("Pytania kontrolne - ciąg dalszy",46,31,{width:503});
        y=108;
      }
      doc.roundedRect(46,y,502,height,9).fill(critical?"#fff1ef":"#f0f4f2");
      doc.circle(65,y+height/2,9).fill(answer.answer?"#dff4e8":"#fee5e2");
      doc.fillColor(answer.answer?"#0b6b43":"#b42318").fontSize(9).text(String(answer.number),59,y+height/2-4,{width:12,align:"center"});
      if(critical){
        doc.fillColor("#b42318").fontSize(7.5).text(`KRYTYCZNE · ${criticalWeight}%`,84,y+8,{width:336,characterSpacing:.3});
        doc.fillColor("#4d1c18").fontSize(9).text(answer.text,84,y+21,{width:336});
      }else{
        doc.fillColor("#17211d").fontSize(9).text(answer.text,84,y+(height-textHeight)/2,{width:336});
      }
      doc.roundedRect(438,y+7,92,height-14,8).fill(answer.answer?"#c9efd9":"#f9c8c3");
      doc.fillColor(answer.answer?"#075437":"#a82016").fontSize(9).text(answer.answer?"TAK":"NIE",453,y+height/2-4,{width:62,align:"center"});
      y+=height+6;
    }

    const recommendations=recommendationsForAnswers(answers);
    const conclusion=conclusionForAnswers(answers,visit.score);
    const conclusionText=`${conclusion.status}\n${conclusion.strengths}\n${conclusion.improvements}`;
    const conclusionHeight=doc.fontSize(8.5).heightOfString(conclusionText,{width:470,lineGap:2})+22;
    const recommendationHeights=recommendations.map(item=>doc.fontSize(8.5).heightOfString(`${item.title}: ${item.text}`,{width:460,lineGap:1})+14);
    const recommendationsHeight=recommendationHeights.reduce((sum,height)=>sum+height+5,0);
    const criticalAnswer=answers.find(answer=>isCriticalQuestionText(answer.text));
    const criticalCalloutHeight=criticalAnswer?58:0;
    if(y+44+criticalCalloutHeight+conclusionHeight+recommendationsHeight>760){
      doc.addPage();
      doc.rect(0,0,595,82).fill("#075437");
      doc.fillColor("#ffffff").fontSize(19).text("Wnioski i rekomendacje",46,31,{width:503});
      y=108;
    }else{
      y+=15;
      doc.fillColor("#17211d").fontSize(15).text("Wnioski i rekomendacje",46,y);
      y+=30;
    }
    if(criticalAnswer){
      const criticalPassed=criticalAnswer.answer===1;
      const criticalColor=criticalPassed?"#075437":"#b42318";
      doc.roundedRect(46,y,502,48,10).fill(criticalPassed?"#e5f7ed":"#fff1ef");
      doc.fillColor(criticalColor).fontSize(7.5).text(`STANDARD KRYTYCZNY · ${criticalWeight}%`,62,y+9,{width:470,characterSpacing:.4});
      doc.fontSize(10).text(`Polecenie produktu dodatkowego: ${criticalPassed?"SPEŁNIONE":"NIESPEŁNIONE"}`,62,y+24,{width:470});
      y+=criticalCalloutHeight;
    }
    doc.roundedRect(46,y,502,conclusionHeight,10).fill("#f0f4f2");
    doc.fillColor("#17211d").fontSize(8.5).text(conclusionText,62,y+11,{width:470,lineGap:2});
    y+=conclusionHeight+10;
    for(let index=0;index<recommendations.length;index+=1){
      const item=recommendations[index],height=recommendationHeights[index];
      doc.roundedRect(46,y,502,height,9).fill("#f8faf9");
      doc.circle(63,y+height/2,4).fill(scoreColor);
      doc.fillColor("#075437").fontSize(8.5).text(`${item.title}:`,76,y+8,{continued:true});
      doc.fillColor("#17211d").text(` ${item.text}`,{width:454,lineGap:1});
      y+=height+5;
    }
    for(const area of areas) drawAreaPage(doc,visit,area);
    if(visit.photoPath){
      const photo=path.join(/* turbopackIgnore: true */ uploadDirectory(),path.basename(visit.photoPath));
      if(fs.existsSync(photo)){
        doc.addPage();
        doc.rect(0,0,595,82).fill("#075437");
        doc.fillColor("#ffffff").fontSize(20).text("Paragon - potwierdzenie wizyty",46,31,{width:503});
        doc.fillColor("#17211d").fontSize(10).text(`${visit.mpc} · ${visit.street} · ${visit.regionCode} · ${new Date(visit.completedAt).toLocaleString("pl-PL")}`,46,99,{width:503});
        try{doc.image(photo,46,126,{fit:[503,620],align:"center",valign:"center"})}catch{doc.fillColor("#b42318").fontSize(11).text("Nie można osadzić zdjęcia paragonu.",46,140)}
      }
    }else if(visit.noReceiptReason==="achievement_100"){
      const achievement=path.resolve(process.cwd(),"public/demo-achievement.png");
      if(fs.existsSync(achievement)){
        doc.addPage();
        doc.rect(0,0,595,842).fill("#fffdf5");
        doc.image(achievement,46,210,{fit:[503,503],align:"center",valign:"center"});
      }
    }else{
      if(y>650){doc.addPage();y=50}
      doc.roundedRect(46,y+10,502,54,8).fill("#feeceb");
      doc.fillColor("#b42318").fontSize(10).text("Brak paragonu w tej archiwalnej wizycie.",60,y+29,{width:474});
    }
    const pages=doc.bufferedPageRange();
    for(let page=0;page<pages.count;page+=1){doc.switchToPage(page);doc.fillColor("#7a8881").fontSize(7.5).text("Raport demonstracyjny - dane wewnętrzne wyłączone.",46,786,{width:360,lineBreak:false});doc.text(`Strona ${page+1} z ${pages.count}`,475,786,{width:74,align:"right",lineBreak:false})}
    doc.end();
  });
}

export async function GET(request:NextRequest,context:RouteContext<"/api/visits/[id]/pdf">){
  try{
    const user=requireUser(request);const {id}=await context.params;
    const access=user.role==="PARTNER"?"AND (v.conducted_by=? OR v.visited_region_id=?)":"";const args=user.role==="PARTNER"?[id,user.id,user.regionId]:[id];
    const visit=getDb().prepare(`SELECT v.id,v.score,COALESCE(v.employee_ref,'—') AS employeeRef,v.completed_at AS completedAt,v.no_receipt_reason AS noReceiptReason,s.mpc,s.street,r.code AS regionCode,p.path AS photoPath
      FROM visits v JOIN stores s ON s.id=v.store_id JOIN partner_regions r ON r.id=v.visited_region_id
      LEFT JOIN visit_photos p ON p.visit_id=v.id WHERE v.id=? ${access}`).get(...args) as VisitPdfRow|undefined;
    if(!visit)return NextResponse.json({error:"Nie znaleziono wizyty"},{status:404});
    const answers=getDb().prepare("SELECT question_number AS number,question_text AS text,answer FROM visit_answers WHERE visit_id=? ORDER BY id").all(id) as AnswerRow[];
    const areas=getDb().prepare(`SELECT id,area_key AS areaKey,comment,photo_path AS photoPath FROM visit_area_reviews WHERE visit_id=?
      ORDER BY CASE area_key WHEN 'warzywa_owoce' THEN 1 WHEN 'pieczywo' THEN 2 ELSE 3 END`).all(id) as AreaPdfRow[];
    const pdf=await renderVisitPdf(visit,answers,areas);
    return new NextResponse(new Uint8Array(pdf),{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="wizyta-${visit.mpc}-${visit.completedAt.slice(0,10)}.pdf"`}});
  }catch(error){return routeError(error)}
}

import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { audit, requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { routeError } from "@/lib/http";

const AssignmentInput = z.object({
  assigneeUserId: z.number().int().positive(),
  targetRegionId: z.number().int().positive(),
  storeIds: z.array(z.number().int().positive()).min(1).max(50),
});

type AssigneeRow = { id:number;login:string;role:"MANAGER"|"PARTNER";regionId:number|null };

export async function POST(request:NextRequest) {
  try {
    const user=requireUser(request);
    const input=AssignmentInput.parse(await request.json());
    const db=getDb();
    const assignee=db.prepare("SELECT id,login,role,region_id AS regionId FROM users WHERE id=?").get(input.assigneeUserId) as AssigneeRow|undefined;
    if(!assignee)return NextResponse.json({error:"Nie znaleziono użytkownika"},{status:404});
    if(["admin","administrator","demo.admin"].includes(assignee.login.toLowerCase()))return NextResponse.json({error:"Nie można zlecać wizyt na konto administratora"},{status:400});
    if(assignee.id===user.id)return NextResponse.json({error:"Nie można zaplanować wizyty samemu sobie"},{status:400});
    if(user.role==="PARTNER"&&input.targetRegionId!==user.regionId)return NextResponse.json({error:"Partner może planować wizyty tylko we własnej strukturze"},{status:403});
    if(assignee.role==="PARTNER"&&assignee.regionId===input.targetRegionId)return NextResponse.json({error:"Partner nie może wykonywać wizyty we własnej strukturze"},{status:400});

    const placeholders=input.storeIds.map(()=>"?").join(",");
    const stores=db.prepare(`SELECT id FROM stores WHERE region_id=? AND id IN (${placeholders})`).all(input.targetRegionId,...input.storeIds) as Array<{id:number}>;
    if(stores.length!==new Set(input.storeIds).size)return NextResponse.json({error:"Jeden lub więcej sklepów nie należy do wybranej struktury"},{status:400});

    const insert=db.prepare(`INSERT OR IGNORE INTO visit_assignments
      (id,assigned_by,assignee_user_id,target_region_id,store_id,status)
      VALUES (?,?,?,?,?,'PENDING')`);
    let created=0;
    db.transaction(()=>{
      for(const storeId of new Set(input.storeIds)){
        const result=insert.run(randomUUID(),user.id,input.assigneeUserId,input.targetRegionId,storeId);
        created+=result.changes;
      }
      audit(user.id,"visit_assignments_created","user",String(input.assigneeUserId));
    })();
    return NextResponse.json({ok:true,created,skipped:input.storeIds.length-created},{status:201});
  } catch(error) {
    if(error instanceof z.ZodError)return NextResponse.json({error:error.issues[0]?.message||"Nieprawidłowe dane"},{status:400});
    return routeError(error);
  }
}


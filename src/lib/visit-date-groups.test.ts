import { describe,expect,it } from "vitest";
import { groupVisitsByDate } from "./visit-date-groups";

describe("groupVisitsByDate",()=>{
  it("segreguje wizyty w rozłączne przedziały czasu",()=>{
    const now=new Date(2026,6,22,12);
    const ago=(days:number)=>({completedAt:new Date(now.getTime()-(days*86400000)).toISOString(),days});
    const groups=groupVisitsByDate([ago(1),ago(8),ago(20),ago(45),ago(75),ago(120),ago(240)],now);
    expect(groups.map(group=>[group.id,group.visits[0].days])).toEqual([
      ["week",1],["previous",8],["30",20],["60",45],["90",75],["180",120],["archive",240],
    ]);
  });

  it("nie pokazuje pustych sekcji",()=>{
    const now=new Date(2026,6,22,12);
    expect(groupVisitsByDate([{completedAt:now.toISOString()}],now).map(group=>group.id)).toEqual(["week"]);
  });
});

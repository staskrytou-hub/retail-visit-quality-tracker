export type DatedVisit = { completedAt:string };

export type VisitDateGroup<T> = {
  id:"week"|"previous"|"30"|"60"|"90"|"180"|"archive";
  label:string;
  visits:T[];
};

const DAY=24*60*60*1000;

export function groupVisitsByDate<T extends DatedVisit>(visits:T[],now=new Date()):VisitDateGroup<T>[] {
  const startOfToday=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const mondayOffset=(startOfToday.getDay()+6)%7;
  const startOfWeek=startOfToday.getTime()-(mondayOffset*DAY);
  const startOfPreviousWeek=startOfWeek-(7*DAY);
  const thresholds={
    days30:startOfToday.getTime()-(30*DAY),
    days60:startOfToday.getTime()-(60*DAY),
    days90:startOfToday.getTime()-(90*DAY),
    days180:startOfToday.getTime()-(180*DAY),
  };
  const groups:VisitDateGroup<T>[]=[
    {id:"week",label:"Wizyty w tym tygodniu",visits:[]},
    {id:"previous",label:"Wizyty w poprzednim tygodniu",visits:[]},
    {id:"30",label:"Pozostałe wizyty z ostatnich 30 dni",visits:[]},
    {id:"60",label:"Wizyty od 31 do 60 dni",visits:[]},
    {id:"90",label:"Wizyty od 61 do 90 dni",visits:[]},
    {id:"180",label:"Wizyty od 91 do 180 dni",visits:[]},
    {id:"archive",label:"Archiwum - starsze niż 180 dni",visits:[]},
  ];
  for(const visit of visits){
    const timestamp=new Date(visit.completedAt).getTime();
    const group=timestamp>=startOfWeek?groups[0]
      :timestamp>=startOfPreviousWeek?groups[1]
      :timestamp>=thresholds.days30?groups[2]
      :timestamp>=thresholds.days60?groups[3]
      :timestamp>=thresholds.days90?groups[4]
      :timestamp>=thresholds.days180?groups[5]
      :groups[6];
    group.visits.push(visit);
  }
  return groups.filter(group=>group.visits.length>0);
}

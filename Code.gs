// ============================================================
// Code.gs — Budget Dashboard API
// Sheet structure: Row 1 = Header, Row 2+ = Data
// ============================================================

// ── Spreadsheet cache ─────────────────────────────────────────
let _ss = null;
const _ws = {};
function getss() { if(!_ss) _ss=SpreadsheetApp.getActiveSpreadsheet(); return _ss; }
function getws(n) { if(!_ws[n]) _ws[n]=getss().getSheetByName(n); return _ws[n]; }

// ── Router ────────────────────────────────────────────────────
function doGet(e) {
  const p = (e&&e.parameter)||{};
  try {
    if(p.payload) {
      const b=JSON.parse(p.payload);
      return out(handlePost(b.action||'',b));
    }
    return out(handleGet(p.action||'dashboard'));
  } catch(err){ return out({error:err.message}); }
}

function doPost(e) {
  try {
    const b=JSON.parse(e.postData.contents);
    return out(handlePost(b.action||'',b));
  } catch(err){ return out({error:err.message}); }
}

function out(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleGet(action) {
  switch(action) {
    case 'dashboard': return {
      config: getConfig(),
      entries: getEntries(),
      daily: getDaily(),
      budgetTypes: getBudgetTypes(),
      planTypes: getPlanTypes(),
      cpd: getCpd()
    };
    case 'config':  return getConfig();
    case 'entries': return getEntries();
    case 'daily':   return getDaily();
    default: return {error:'Unknown: '+action};
  }
}

function handlePost(action, b) {
  switch(action) {
    // Data_Entry CRUD
    case 'addEntry':    return addEntry(b.data);
    case 'editEntry':   return editEntry(b.idx, b.data);
    case 'delEntry':    return delEntry(b.idx);
    case 'importEntry': return importEntry(b.rows, b.mode);
    // Daily_Payment CRUD
    case 'addDaily':    return addDaily(b.data);
    case 'editDaily':   return editDaily(b.idx, b.data);
    case 'delDaily':    return delDaily(b.idx);
    case 'importDaily': return importDaily(b.rows, b.mode);
    // Config
    case 'importCpd':   return importCpd(b.rows);
    case 'saveConfig':  return saveConfig(b.data);
    default: return {error:'Unknown: '+action};
  }
}

// ── Date helper ───────────────────────────────────────────────
function fd(v) {
  if(!v||v==='') return '';
  try {
    const d=(v instanceof Date)?v:new Date(v);
    if(isNaN(d.getTime())) return String(v);
    return Utilities.formatDate(d,'Asia/Bangkok','yyyy-MM-dd');
  } catch(e){ return String(v); }
}

// ── Read sheet ────────────────────────────────────────────────
// Template structure: Row1=Title, Row2=Header, Row3+=Data
// For new/empty sheets: Row1=Header, Row2+=Data
function readRows(name) {
  const s=getws(name);
  if(!s) return [];
  const last=s.getLastRow();
  if(last<2) return [];
  const cols=Math.max(s.getLastColumn(),1);
  // Read all rows from row1
  const all=s.getRange(1,1,last,cols).getValues();
  // Auto-detect data start: find first row where col A looks like a header keyword
  // If row1 or row2 is a header, skip it
  const HDRS=['record_id','payid','date','activity','typeid','planid','เดือน',
               'วันที่ทำรายการ','budget_type','plan_type','case_id','list_payment'];
  let skip=0;
  for(let i=0;i<Math.min(all.length,3);i++){
    const v=String(all[i][0]||'').toLowerCase().trim();
    // If cell looks like title (long merged text) or header keyword
    if(v.includes('data_entry')||v.includes('daily_payment')||v.includes('plan_cpd')) { skip=i+1; continue; }
    if(HDRS.some(h=>v===h||v.includes(h))) { skip=i+1; }
  }
  return all.slice(skip).filter(r=>r.some(c=>c!==''&&c!==null));
}

// ── Ensure sheet has header row ───────────────────────────────
function ensureSheet(name, headers) {
  let s=getss().getSheetByName(name);
  if(!s) {
    s=getss().insertSheet(name);
    s.getRange(1,1,1,headers.length).setValues([headers]);
    _ws[name]=s;
    return s;
  }
  // Check if row1 is header
  const r1=s.getLastRow()>=1?String(s.getRange(1,1).getValue()).trim():'';
  if(r1!==headers[0]) {
    s.insertRowBefore(1);
    s.getRange(1,1,1,headers.length).setValues([headers]);
  }
  _ws[name]=s;
  return s;
}

// ── Data_Entry ────────────────────────────────────────────────
const DE_H=['Record_ID','Date','Year','BudgetType','BudgetTypeID',
            'PlanType','Subplan','Activity','Unit',
            'Budget','Transfer','Disbursed','Remain','Status'];

function getEntries() {
  return readRows('Data_Entry').map((r,i)=>({
    _idx:i, id:String(r[0]||''), date:fd(r[1]), year:String(r[2]||''),
    budgettype:String(r[3]||''), budgetId:String(r[4]||''),
    plan:String(r[5]||''), subplan:String(r[6]||''), activity:String(r[7]||''),
    unit:String(r[8]||''), budget:Number(r[9])||0, transfer:Number(r[10])||0,
    disbursed:Number(r[11])||0, remain:Number(r[12])||0, status:String(r[13]||'')
  }));
}

// ── Get data start row (1-indexed) ────────────────────────────
function dataStartRow(name) {
  const s=getws(name); if(!s) return 2;
  const sample=s.getRange(1,1,Math.min(s.getLastRow(),3),1).getValues();
  const HDRS=['record_id','payid','date','activity','typeid','planid',
              'วันที่ทำรายการ','case_id','list_payment'];
  let row=2; // default: row1=header, data from row2
  for(let i=0;i<sample.length;i++){
    const v=String(sample[i][0]||'').toLowerCase().trim();
    if(v.includes('data_entry')||v.includes('daily_payment')||v.includes('plan_cpd')){row=i+2;continue;}
    if(HDRS.some(h=>v===h||v.includes(h))){row=i+2;}
  }
  return row;
}

function addEntry(d) {
  try {
    const s=ensureSheet('Data_Entry',DE_H);
    const id='DE'+String(s.getLastRow()).padStart(4,'0');
    const b=Number(d.budget)||0, dis=Number(d.disbursed)||0;
    s.appendRow([d.id||id,d.date,d.year,d.budgettype,d.budgetId||'',
      d.plan,d.subplan||'',d.activity,d.unit,b,Number(d.transfer)||0,
      dis,b-dis,d.status||(dis>=b&&b>0?'เบิกจ่ายแล้ว':dis>0?'เบิกจ่ายบางส่วน':'ยังไม่เบิกจ่าย')]);
    return {ok:true,id:d.id||id};
  } catch(e){return{error:e.message};}
}

function editEntry(idx,d) {
  try {
    const s=getws('Data_Entry'); if(!s) return{error:'ไม่พบ Sheet'};
    const row=dataStartRow('Data_Entry')+idx;
    const b=Number(d.budget)||0,dis=Number(d.disbursed)||0;
    s.getRange(row,1,1,14).setValues([[d.id,d.date,d.year,d.budgettype,d.budgetId||'',
      d.plan,d.subplan||'',d.activity,d.unit,b,Number(d.transfer)||0,dis,b-dis,d.status]]);
    return{ok:true};
  } catch(e){return{error:e.message};}
}

function delEntry(idx) {
  try { getws('Data_Entry').deleteRow(dataStartRow('Data_Entry')+idx); return{ok:true}; }
  catch(e){return{error:e.message};}
}

function importEntry(rows, mode) {
  try {
    const s=ensureSheet('Data_Entry',DE_H);
    if(mode==='replace' && rows.length>0) {
      const yr=String(rows[0].year||'');
      const last=s.getLastRow();
      if(last>=3 && yr) {
        const dsr=dataStartRow('Data_Entry');
        const col=s.getRange(dsr,3,last-dsr+1,1).getValues();
        for(let r=col.length-1;r>=0;r--)
          if(String(col[r][0])===yr) s.deleteRow(dsr+r);
      }
    }
    const start=s.getLastRow()+1;
    const today=fd(new Date());
    const vals=rows.map((d,i)=>{
      const b=Number(d.budget)||0,dis=Number(d.disbursed)||0;
      return [d.id||('DE'+String(start+i).padStart(4,'0')),
        d.date||today,d.year||'',d.budgettype||'',d.budgetId||'',
        d.plan||'',d.subplan||'',d.activity||'',d.unit||'',
        b,Number(d.transfer)||0,dis,b-dis,
        d.status||(dis>=b&&b>0?'เบิกจ่ายแล้ว':dis>0?'เบิกจ่ายบางส่วน':'ยังไม่เบิกจ่าย')];
    });
    if(vals.length) s.getRange(start,1,vals.length,14).setValues(vals);
    return{ok:true,imported:vals.length};
  } catch(e){return{error:e.message};}
}

// ── Daily_Payment ─────────────────────────────────────────────
const DP_H=['PayID','Date','Activity','Category','BudgetType',
            'PlanType','Unit','Officer','Amount','DocNumber','Status','Note'];

function getDaily() {
  return readRows('Daily_Payment').map((r,i)=>({
    _idx:i, id:String(r[0]||''), date:fd(r[1]),
    activity:String(r[2]||''), category:String(r[3]||''),
    budgettype:String(r[4]||''), plan:String(r[5]||''),
    unit:String(r[6]||''), officer:String(r[7]||''),
    amount:Number(r[8])||0, ref:String(r[9]||''),
    status:String(r[10]||'อนุมัติแล้ว'), note:String(r[11]||'')
  }));
}

function addDaily(d) {
  try {
    const s=ensureSheet('Daily_Payment',DP_H);
    const id='DP'+String(s.getLastRow()).padStart(4,'0');
    s.appendRow([d.id||id,d.date,d.activity,d.category||'',
      d.budgettype||'',d.plan||'',d.unit||'',d.officer||'',
      Number(d.amount)||0,d.ref||'',d.status||'อนุมัติแล้ว',d.note||'']);
    return{ok:true,id:d.id||id};
  } catch(e){return{error:e.message};}
}

function editDaily(idx,d) {
  try {
    const s=getws('Daily_Payment'); if(!s) return{error:'ไม่พบ Sheet'};
    s.getRange(dataStartRow('Daily_Payment')+idx,1,1,12).setValues([[d.id,d.date,d.activity,d.category||'',
      d.budgettype||'',d.plan||'',d.unit||'',d.officer||'',
      Number(d.amount)||0,d.ref||'',d.status||'อนุมัติแล้ว',d.note||'']]);
    return{ok:true};
  } catch(e){return{error:e.message};}
}

function delDaily(idx) {
  try { getws('Daily_Payment').deleteRow(dataStartRow('Daily_Payment')+idx); return{ok:true}; }
  catch(e){return{error:e.message};}
}

function importDaily(rows, mode) {
  try {
    const s=ensureSheet('Daily_Payment',DP_H);
    if(mode==='replace' && rows.length>0) {
      const mon=String(rows[0].date||'').substring(0,7);
      const last=s.getLastRow();
      if(last>=3 && mon) {
        const dsr=dataStartRow('Daily_Payment');
        const col=s.getRange(dsr,2,last-dsr+1,1).getValues();
        for(let r=col.length-1;r>=0;r--) {
          const dv=col[r][0];
          const ds=dv instanceof Date?fd(dv):String(dv);
          if(ds.substring(0,7)===mon) s.deleteRow(dataStartRow('Daily_Payment')+r);
        }
      }
    }
    const start=s.getLastRow()+1;
    const today=fd(new Date());
    const vals=rows.map((d,i)=>[
      d.id||('DP'+String(start+i).padStart(4,'0')),
      d.date||today,d.activity||'',d.category||'',
      d.budgettype||'',d.plan||'',d.unit||'',d.officer||'',
      Number(d.amount)||0,d.ref||'',d.status||'อนุมัติแล้ว',d.note||''
    ]);
    if(vals.length) s.getRange(start,1,vals.length,12).setValues(vals);
    return{ok:true,imported:vals.length};
  } catch(e){return{error:e.message};}
}

// ── Import CPD ───────────────────────────────────────────────
function importCpd(rows) {
  try {
    const s=getws('plan_cpd'); if(!s) return{error:'ไม่พบ Sheet: plan_cpd'};
    const all=s.getDataRange().getValues();
    let updated=0;
    (rows||[]).forEach(rec=>{
      const ri=all.findIndex((r,i)=>i>0&&String(r[0]).trim()===String(rec.month||'').trim());
      if(ri>=0){
        const row=ri+1;
        if(rec.target_m!==undefined) s.getRange(row,2).setValue(Number(rec.target_m)||0);
        if(rec.actual_m!=null)       s.getRange(row,4).setValue(Number(rec.actual_m));
        if(rec.note!==undefined)     s.getRange(row,8).setValue(rec.note||'');
        updated++;
      }
    });
    return{ok:true,imported:updated};
  }catch(e){return{error:e.message};}
}

// ── Masters ───────────────────────────────────────────────────
function getBudgetTypes() {
  const rows=readRows('Budget_Type');
  if(!rows.length) return [
    {id:'b01',name:'งบบุคลากร'},{id:'b02',name:'งบดำเนินงาน'},
    {id:'b03',name:'งบลงทุน'},{id:'b04',name:'เงินอุดหนุน'},{id:'b05',name:'งบรายจ่ายอื่น'}
  ];
  return rows.filter(r=>r[0]&&r[1]).map(r=>({id:String(r[0]),name:String(r[1])}));
}

function getPlanTypes() {
  const rows=readRows('Plan_Type');
  if(!rows.length) return [
    {id:'p101',name:'แผนงานบุคลากรภาครัฐ'},
    {id:'p102',name:'แผนงานพื้นฐานด้านการสร้างความสามารถในการแข่งขัน'},
    {id:'p103',name:'แผนงานยุทธศาสตร์เสริมสร้างพลังทางสังคม'},
    {id:'p104',name:'แผนงานยุทธศาสตร์พัฒนาและส่งเสริมเศรษฐกิจฐานราก'},
    {id:'p105',name:'แผนงานยุทธศาสตร์การเกษตรสร้างมูลค่า'}
  ];
  return rows.filter(r=>r[0]&&r[1]).map(r=>({id:String(r[0]),name:String(r[1])}));
}

function getCpd() {
  const MONTHS=['ต.ค.','พ.ย.','ธ.ค.','ม.ค.','ก.พ.','มี.ค.',
                'เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.'];
  // plan_cpd template: row1=title,row2=subtitle,row3=header,row4+=data
  const s=getws('plan_cpd'); if(!s) return [];
  const last=s.getLastRow(); if(last<4) return [];
  const rows=s.getRange(4,1,last-3,8).getValues();
  return rows.filter(r=>MONTHS.includes(String(r[0]).trim())).map(r=>({
    month:String(r[0]),target_m:Number(r[1])||0,target_c:Number(r[2])||0,
    actual_m:r[3]!==''?Number(r[3]):null,
    actual_c:r[4]!==''?Number(r[4]):null,
    note:String(r[7]||'')
  }));
}

// ── Config ────────────────────────────────────────────────────
function getConfig() {
  const p=PropertiesService.getScriptProperties();
  return {
    orgName:p.getProperty('orgName')||'สำนักงานส่งเสริมสหกรณ์กรุงเทพมหานคร พื้นที่ 1',
    year:   p.getProperty('year')||'2569'
  };
}

function saveConfig(d) {
  const p=PropertiesService.getScriptProperties();
  if(d.orgName) p.setProperty('orgName',d.orgName);
  if(d.year)    p.setProperty('year',d.year);
  return{ok:true};
}
